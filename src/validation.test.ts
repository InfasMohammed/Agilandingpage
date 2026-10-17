import { describe, expect, it } from 'vitest';
import { receiptError, MAX_RECEIPT_BYTES, registrationErrors, registrationReady } from './validation';
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

describe('registration form validation', () => {
  const valid = { name: 'Susan Test', email: 'susan@example.com', phone: '+971 50 123 4567', peopleCount: '2' };
  it('accepts complete contact details and an integer group size', () => {
    expect(registrationErrors(valid)).toEqual({});
  });
  it('rejects missing or malformed contact details', () => {
    expect(registrationErrors({ name: ' ', email: 'bad-email', phone: '-------', peopleCount: '2' })).toHaveProperty('name');
    expect(registrationErrors({ ...valid, email: 'bad-email' })).toHaveProperty('email');
    expect(registrationErrors({ ...valid, phone: '-------' })).toHaveProperty('phone');
  });
  it('rejects empty, fractional, negative, zero, and excessive group sizes', () => {
    for (const peopleCount of ['', '0', '-1', '1.5', '101', 'abc']) expect(registrationErrors({ ...valid, peopleCount })).toHaveProperty('peopleCount');
  });
});

describe('submit button readiness', () => {
  const details = { name: 'Susan Test', email: 'susan@example.com', phone: '+971 50 123 4567', peopleCount: '2' };
  const receipt = { type: 'image/png', size: 100 };
  it('requires agreement and becomes unavailable again when unchecked', () => {
    expect(registrationReady(details, receipt, false)).toBe(false);
    expect(registrationReady(details, receipt, true)).toBe(true);
    expect(registrationReady(details, receipt, false)).toBe(false);
  });
  it('never enables for invalid fields or a missing or invalid receipt', () => {
    expect(registrationReady({ ...details, peopleCount: '0' }, receipt, true)).toBe(false);
    expect(registrationReady(details, null, true)).toBe(false);
    expect(registrationReady(details, { type: 'application/pdf', size: 100 }, true)).toBe(false);
  });
});
