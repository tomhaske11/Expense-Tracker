import type { ReceiptRequest } from '@/features/expenses/lib/quickAdd';

/*
 * Browser-only: shrink a receipt photo before upload. Phone photos are often 4000px+ and
 * several MB; Claude downscales anything larger than ~1568px on the long edge anyway, so
 * resizing first keeps uploads small and fast without losing readable detail.
 */

const MAX_EDGE = 1568;
const JPEG_QUALITY = 0.85;
const MAX_INPUT_BYTES = 25 * 1024 * 1024;

export class ReceiptImageError extends Error {}

export async function prepareReceiptImage(file: File): Promise<ReceiptRequest['image']> {
  if (!file.type.startsWith('image/')) {
    throw new ReceiptImageError('Choose a photo of the receipt (JPEG, PNG, HEIC…).');
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new ReceiptImageError('That photo is over 25 MB. Try a smaller one.');
  }

  let bitmap: ImageBitmap;
  try {
    // Applies the EXIF rotation, so sideways phone photos come out upright.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new ReceiptImageError("This browser can't open that image. Try a JPEG or PNG.");
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext('2d');
  if (!context) throw new ReceiptImageError("Couldn't process the image in this browser.");
  // White background so transparent PNGs don't turn black as JPEG.
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  const data = dataUrl.slice(dataUrl.indexOf(',') + 1);
  if (!data) throw new ReceiptImageError("Couldn't process the image in this browser.");
  return { mediaType: 'image/jpeg', data };
}
