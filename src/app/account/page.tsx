'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/integrations/supabase/browser';
import { useExpenses } from '@/features/expenses/hooks/useExpenses';
import AppShell from '@/app/_components/AppShell';
import BackupPanel from '@/features/export/components/BackupPanel';
import ExportModal from '@/features/export/components/ExportModal';
import { useDailyBudget } from '@/features/analytics/hooks/useDailyBudget';
import { INPUT, LABEL } from '@/app/_components/AuthCard';
import { LogOutIcon, TrashIcon } from '@/lib/icons';

const CARD = 'bg-panel border border-line rounded-lg p-6';
const BUTTON = 'px-4 py-2 rounded-full text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

export default function AccountPage() {
  const router = useRouter();
  const { expenses, isLoading } = useExpenses();
  const { dailyBudget, setDailyBudget } = useDailyBudget();
  const [exportOpen, setExportOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [passwordNote, setPasswordNote] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getSupabaseBrowser()
      .auth.getUser()
      .then(({ data }) => !cancelled && setEmail(data.user?.email ?? null));
    return () => {
      cancelled = true;
    };
  }, []);

  const signOut = async () => {
    await getSupabaseBrowser().auth.signOut();
    router.replace('/login');
    router.refresh();
  };

  const changePassword = async (event: FormEvent) => {
    event.preventDefault();
    if (password.length < 8) {
      setPasswordNote('Use at least 8 characters.');
      return;
    }
    const { error } = await getSupabaseBrowser().auth.updateUser({ password });
    setPasswordNote(error ? error.message : 'Password updated.');
    if (!error) setPassword('');
  };

  const deleteAccount = async () => {
    setDeleting(true);
    setDeleteError(null);
    const res = await fetch('/api/account', { method: 'DELETE' }).catch(() => null);
    if (!res?.ok) {
      setDeleting(false);
      setDeleteError("Couldn't delete your account. Please try again.");
      return;
    }
    await getSupabaseBrowser().auth.signOut();
    router.replace('/login?deleted=1');
    router.refresh();
  };

  return (
    <AppShell loading={isLoading}>
        <div className="max-w-xl mx-auto space-y-6">
          <h1 className="text-2xl font-semibold text-ink">Account</h1>

          <section className={CARD}>
            <p className="text-xs uppercase tracking-widest text-ink-muted mb-1">Signed in as</p>
            <p className="text-ink">{email ?? '…'}</p>
            <p className="mt-1 text-sm text-ink-muted">{expenses.length} expenses saved to your account.</p>
            <button type="button" onClick={() => void signOut()} className={`${BUTTON} mt-4 border border-line text-ink-soft hover:border-accent hover:text-accent flex items-center gap-2`}>
              <LogOutIcon className="w-4 h-4" />
              Sign out
            </button>
          </section>

          <BackupPanel
            expenses={expenses}
            dailyBudget={dailyBudget}
            onRestoreBudget={setDailyBudget}
            onOpenExport={() => setExportOpen(true)}
          />

          <section className={CARD}>
            <h2 className="text-lg font-semibold text-ink mb-3">Change password</h2>
            <form onSubmit={(e) => void changePassword(e)} className="space-y-3">
              <div>
                <label htmlFor="new-password" className={LABEL}>New password</label>
                <input id="new-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={INPUT} />
              </div>
              {passwordNote && <p className="text-sm text-ink-soft">{passwordNote}</p>}
              <button type="submit" disabled={!password} className={`${BUTTON} bg-accent text-accent-ink hover:bg-accent-strong`}>
                Update password
              </button>
            </form>
          </section>

          <section className="bg-panel border border-red-500/30 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-ink mb-1">Delete account</h2>
            <p className="text-sm text-ink-muted mb-3">
              Permanently deletes your account, all {expenses.length} expenses, your settings and any bank connections. This
              can&apos;t be undone; download a backup above first if you want a copy.
            </p>
            <label htmlFor="confirm-delete" className={LABEL}>Type DELETE to confirm</label>
            <input id="confirm-delete" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className={INPUT} />
            {deleteError && <p className="mt-2 text-sm text-red-400">{deleteError}</p>}
            <button
              type="button"
              onClick={() => void deleteAccount()}
              disabled={confirmText !== 'DELETE' || deleting}
              className={`${BUTTON} mt-3 bg-red-600 text-white hover:bg-red-700 flex items-center gap-2`}
            >
              <TrashIcon className="w-4 h-4" />
              {deleting ? 'Deleting…' : 'Delete my account'}
            </button>
          </section>
        </div>
        <ExportModal isOpen={exportOpen} onClose={() => setExportOpen(false)} expenses={expenses} />
    </AppShell>
  );
}
