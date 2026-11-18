import 'server-only';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { BankConnectionView } from '@/features/imports/lib/protocol';

/*
 * Bank connections, stored on the server only. Access tokens never reach the browser.
 *
 * FileConnectionStore keeps them in .data/bank-connections.json (gitignored), which suits
 * the single-process `next start` deployment. When the app gets a database, implement
 * ConnectionStore against it; nothing else changes. Tokens are encrypted with AES-256-GCM
 * when BANK_TOKEN_KEY is set, and a live (non-sandbox) provider refuses to store them otherwise.
 */

export interface StoredConnection extends BankConnectionView {
  userId: string;
  /** Encrypted ("enc:...") or, for sandbox providers without a key, plain. */
  accessToken: string;
  /** Sync cursor the browser last acknowledged; the next sync starts after it. */
  cursor: string | null;
}

export interface ConnectionStore {
  list(userId: string): Promise<StoredConnection[]>;
  get(userId: string, id: string): Promise<StoredConnection | null>;
  save(connection: StoredConnection): Promise<void>;
  remove(userId: string, id: string): Promise<void>;
}

export const toView = ({ id, provider, institution, accounts, createdAt, lastSyncedAt }: StoredConnection): BankConnectionView => ({
  id,
  provider,
  institution,
  accounts,
  createdAt,
  lastSyncedAt,
});

// ---------- Token encryption ----------

function key(): Buffer | null {
  const secret = process.env.BANK_TOKEN_KEY;
  return secret ? createHash('sha256').update(secret).digest() : null;
}

export function sealToken(token: string, live: boolean): string {
  const k = key();
  if (!k) {
    if (live) throw new Error('BANK_TOKEN_KEY must be set before storing real bank tokens.');
    return token;
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', k, iv);
  const data = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return `enc:${Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64')}`;
}

export function openToken(stored: string): string {
  if (!stored.startsWith('enc:')) return stored;
  const k = key();
  if (!k) throw new Error('BANK_TOKEN_KEY is needed to read stored bank tokens.');
  const raw = Buffer.from(stored.slice(4), 'base64');
  const decipher = createDecipheriv('aes-256-gcm', k, raw.subarray(0, 12));
  decipher.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8');
}

// ---------- File-backed store ----------

class FileConnectionStore implements ConnectionStore {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly file: string) {}

  private async readAll(): Promise<StoredConnection[]> {
    try {
      return JSON.parse(await readFile(this.file, 'utf8')) as StoredConnection[];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }
  }

  private async writeAll(connections: StoredConnection[]) {
    await mkdir(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    await writeFile(tmp, JSON.stringify(connections, null, 2), { mode: 0o600 });
    await rename(tmp, this.file);
  }

  /** Serialize read-modify-write cycles so concurrent requests can't lose updates. */
  private exclusive<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.queue.then(fn, fn);
    this.queue = run.catch(() => undefined);
    return run;
  }

  async list(userId: string) {
    return (await this.readAll()).filter((c) => c.userId === userId);
  }

  async get(userId: string, id: string) {
    return (await this.list(userId)).find((c) => c.id === id) ?? null;
  }

  save(connection: StoredConnection) {
    return this.exclusive(async () => {
      const all = (await this.readAll()).filter((c) => !(c.userId === connection.userId && c.id === connection.id));
      await this.writeAll([...all, connection]);
    });
  }

  remove(userId: string, id: string) {
    return this.exclusive(async () => {
      await this.writeAll((await this.readAll()).filter((c) => !(c.userId === userId && c.id === id)));
    });
  }
}

let store: ConnectionStore | null = null;

export function getConnectionStore(): ConnectionStore {
  store ??= new FileConnectionStore(process.env.BANK_CONNECTIONS_FILE ?? path.join(process.cwd(), '.data', 'bank-connections.json'));
  return store;
}
