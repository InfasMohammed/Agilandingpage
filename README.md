# ASI Global event landing page

A responsive React + TypeScript landing page for the C.A.V. Personal Branding & Professional Portfolio event. Includes an accessible registration dialog, bank receipt image validation, WhatsApp contact, and a Supabase Edge Function with private receipt storage.

## Local development

Node.js 22+ is recommended (verified with Node 24).

```sh
npm ci
npm run dev
npm test
npm run build
```

The project opens without backend credentials. Until configuration is complete, registration displays a setup notice and submission is disabled. It never simulates a successful registration. Use the existing isolated checkout; no additional Git worktree is needed.

## Event details to confirm

- Date: **22 November 2026**, confirmed by the customer.
- Time: 2–5 pm, Gulf Standard Time (Dubai).
- Venue: Holiday Inn Express Al Safa, Dubai.
- Package: AED 499, taken from the reference.
- WhatsApp: +971 56 472 3822. The link pre-fills “I want to know more about the event”.
- The organiser supplied the account holder, account number, IBAN and SWIFT code; these are in `src/bank.ts`. The IBAN prefix was normalised from Greek-looking characters to Latin `AE`, and its checksum passes. The organiser has supplied corrected details. Wio Bank is identified by the supplied SWIFT code. Details appear inside the popup, but guests are asked to wait until registration opens before transferring.
- The SVG brand mark is a recreation. Replace `public/mark.svg` with the supplied production logo asset for an exact match. The hero and audience photography are generated editorial artwork, not photographs of confirmed event speakers or guests. The Dubai skyline is a local vector illustration. Font files are served by Google Fonts with local system fallbacks. Confirm customer approval before publication.

## Connect Supabase

Follow [SUPABASE-SETUP.md](SUPABASE-SETUP.md) for step-by-step dashboard and CLI instructions.

Create a Supabase project. Copy `.env.example` to `.env` and set the public project URL and publishable key. Never put a service role key in Vite variables or frontend files.

Using the Supabase CLI and your own authenticated account:

```sh
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
supabase secrets set ALLOWED_ORIGIN=https://your-event-domain.example REGISTRATION_ENABLED=true
supabase functions deploy register
```

For local Vite testing, use `ALLOWED_ORIGIN=http://localhost:5173`. Set it to the exact production origin before publishing. This is a public guest registration endpoint; JWT verification is intentionally disabled in `supabase/config.toml`. The handler validates the origin, input, image signature and size, and limits requests to five attempts per IP per ten minutes. CORS is not authentication. For high-traffic campaigns add a bot challenge and gateway rate limiting before launch.

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are supplied to hosted Edge Functions by Supabase. The browser calls the function; it cannot directly read/write registration rows or private receipts. No public SELECT or storage policies are created. Review guests in the Supabase Table Editor (`registrations`), review receipts in the private `payment-receipts` bucket, and change status manually after verification. Confirmation emails and automatic bank reconciliation are not implemented.

Bank account details are displayed only within the registration popup, alongside the receipt upload. The corrected supplied details are in `src/bank.ts`; optional `VITE_BANK_*` values override the supplied account details and set `VITE_PAYMENTS_ENABLED=true`. Restart Vite or rebuild after changing Vite environment variables. Frontend readiness and the server's `REGISTRATION_ENABLED` switch are independent. Keep both disabled until ready to take bookings.

## Deployment and verification

`npm run build` writes `dist/` for any static host. Configure the Vite variables at build time. The backend must be deployed separately to Supabase. No credentials are included in this repository.

Before accepting bookings, submit a real test image using a test guest and verify:

1. The browser shows a registration reference only after a successful response.
2. A matching row appears with `pending` status and the private receipt exists.
3. An anonymous client cannot list registrations or access receipt URLs.
4. Invalid images, missing consent, unsupported origin and excessive attempts are rejected.
5. The team can view the receipt, verify payment, and contact the guest.

These live backend checks require your Supabase project and have not been run against a hosted project. Set a retention policy for contact information/receipts. Periodically delete `registration_attempts` older than 24 hours; review and delete registration data in accordance with your business retention policy. Do not place analytics or sensitive receipt details in public logs.
