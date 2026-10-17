export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;
export function receiptError(file: Pick<File, 'size' | 'type'>): string | null {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return 'Please upload a JPG, PNG or WebP image.';
  if (file.size === 0 || file.size > MAX_RECEIPT_BYTES) return 'Please choose an image between 1 byte and 5 MB.';
  return null;
}
