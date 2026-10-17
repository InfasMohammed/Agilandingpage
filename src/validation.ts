export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;
export function receiptError(file: Pick<File, 'size' | 'type'>): string | null {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return 'Please upload a JPG, PNG or WebP image.';
  if (file.size === 0 || file.size > MAX_RECEIPT_BYTES) return 'Please choose an image between 1 byte and 5 MB.';
  return null;
}

export type RegistrationDetails = { name: string; email: string; phone: string; peopleCount: string };
export function registrationErrors(values: RegistrationDetails): Partial<Record<keyof RegistrationDetails, string>> {
  const errors: Partial<Record<keyof RegistrationDetails, string>> = {};
  if (values.name.trim().length < 2 || values.name.trim().length > 100) errors.name = 'Enter a name between 2 and 100 characters.';
  if (values.email.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = 'Enter a valid email address.';
  const digits = values.phone.replace(/\D/g, '');
  if (!/^[+\d\s()\-]{7,25}$/.test(values.phone.trim()) || digits.length < 7 || digits.length > 15) errors.phone = 'Enter a valid phone number with 7–15 digits.';
  if (!/^\d+$/.test(values.peopleCount) || Number(values.peopleCount) < 1 || Number(values.peopleCount) > 100) errors.peopleCount = 'Enter a whole number from 1 to 100, including yourself.';
  return errors;
}

export function registrationReady(details: RegistrationDetails, receipt: Pick<File, 'size' | 'type'> | null, agreed: boolean): boolean {
  return agreed && receipt !== null && receiptError(receipt) === null && Object.keys(registrationErrors(details)).length === 0;
}
