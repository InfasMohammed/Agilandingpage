import { describe, expect, it } from 'vitest';
import { receiptError, MAX_RECEIPT_BYTES } from './validation';
describe('receipt upload validation', () => {
  it('accepts all supported image formats at the size limit', () => {
    for (const type of ['image/jpeg','image/png','image/webp']) expect(receiptError({type,size:MAX_RECEIPT_BYTES})).toBeNull();
  });
  it('rejects PDFs and active SVG documents', () => {
    for (const type of ['application/pdf','image/svg+xml']) expect(receiptError({type,size:1000})).toContain('JPG');
  });
  it('rejects empty and oversized images', () => {
    for (const size of [0,MAX_RECEIPT_BYTES+1]) expect(receiptError({type:'image/png',size})).toContain('5 MB');
  });
});
