# Connect your event website to Supabase

## 1. Create the project

1. Open https://supabase.com/dashboard and sign in.
2. Choose **New project**, select your organisation, and name it `asi-global-event`.
3. Generate a strong database password and keep it in your password manager. Do not send it in chat.
4. Pick a region near your audience and wait for the project to finish provisioning.
5. In the project’s **Connect** dialog or **Settings → API Keys**, copy the **Project URL** and **publishable key**. The older `anon` key also works. These are public frontend configuration, unlike the private secret/service role keys.

You can share just the project URL and publishable key here so the frontend can be connected. Never share the database password, secret key, service role key or access token in chat.

## 2. Create the tables and private receipt bucket

Open the project’s **SQL Editor**, create a new query, run all SQL files in `supabase/migrations/` in filename order once. This creates:

- `registration`: guest contact information, people count, private receipt path, review status, and IP hash for throttling. Emails are normalized and unique.
- `payment-receipts`: a private image bucket with a 5 MB limit.

Do not add public table access or public bucket policies. The browser submits through the Edge Function.

Alternatively, use the CLI migration flow below; choose one method, not both.

## 3. Deploy the registration function

From a terminal on your own trusted computer, in the project directory:

```sh
npx supabase login
npx supabase link --project-ref jkbrwuqugzkvzsaizqja
# Run this only if you did NOT already run the migration in SQL Editor:
npx supabase db push
npx supabase secrets set ALLOWED_ORIGIN=https://YOUR-REAL-WEBSITE-DOMAIN REGISTRATION_ENABLED=true
npx supabase functions deploy register --no-verify-jwt
```

The project reference is the identifier in the project URL: `https://jkbrwuqugzkvzsaizqja.supabase.co`.

`ALLOWED_ORIGIN` must exactly match the frontend origin, with `https://` and no trailing slash. For local development use `http://localhost:5173`; use `http://localhost:4173` if testing the production preview. Change it to the real website origin before launch. A comma-separated list of exact origins is supported. When unset, localhost ports 5173 and 4173 are allowed for development only.

The function is public because guests register without logging in. It checks the allowed origin, form fields, consent, file signature and size, and applies a basic IP limit. Never deploy your service role key to the website. Supabase automatically supplies the service credentials within its hosted Edge Function.

## 4. Configure the website

Copy `.env.example` to `.env` and set:

```dotenv
VITE_SUPABASE_URL=https://jkbrwuqugzkvzsaizqja.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_PUBLISHABLE_KEY
```

The organiser’s supplied account details are in `src/bank.ts`. The corrected details have been supplied by the organiser, with Wio Bank identified by SWIFT `WIOBAEADXXX`. The IBAN uses the standard Latin `AE` prefix. Any other `VITE_BANK_*` setting overrides the corresponding account detail.

Registration availability is controlled on the server. Set the Edge Function secret `REGISTRATION_ENABLED=false` to pause registrations; set it to `true` to reopen. The old `VITE_PAYMENTS_ENABLED` frontend flag is no longer used. After editing frontend environment settings, restart/rebuild:

```sh
npm ci
npm run build
npm run preview -- --port 4173
```

For static hosting, set the same frontend variables in the host’s build settings and deploy the `dist` folder. These variables are compiled into the website; changing them requires a fresh build.

## 5. Test before opening registration

Submit a test registration with a small PNG/JPG/WebP receipt. You can use a clearly labelled test image to test the system; do not treat this as a verified payment.

- The website must display a reference only after the function saves the registration.
- In **Table Editor → registration**, find the matching `pending` record.
- In **Storage → payment-receipts**, verify that its receipt exists and is private.
- Confirm the team can open the receipt through the authenticated dashboard.
- Verify an unauthenticated request cannot list registrations or view private receipt URLs.
- Remove the test record and receipt after testing.

For real guests, check the bank transfer, update status to `confirmed`, and contact the guest manually. The website does not automatically reconcile payments or send confirmation emails.

If the function returns an error, inspect **Edge Functions → register → Logs** without logging guests’ contact data or receipt contents. A 403 usually means `ALLOWED_ORIGIN` does not match; a 503 means `REGISTRATION_ENABLED` is not `true`. The browser’s Network panel shows the function response.

## Current connected project

The single `registration` table, private receipt bucket, and `register` Edge Function are now provisioned in `agiweb` (`jkbrwuqugzkvzsaizqja`). Do not rerun the initial table migration there. The browser has public defaults for that project's URL and publishable key; `VITE_SUPABASE_*` settings can override them. Only the Edge Function uses service-role credentials.

Submission is enabled unless the server secret `REGISTRATION_ENABLED` is explicitly `false`. Localhost ports 5173 and 4173 are allowed by default; set `ALLOWED_ORIGIN` to the actual production origin before deploying the website. Submit is disabled only while saving. Backend errors are shown in the form, and a reference appears only after saving succeeds.

## Single-table registration rules

`registration` is the only application table. The consolidation migration preserves existing paid registrations, defaults their people count to 1, removes the empty legacy landing table, and removes the old attempt-log table. New records require a whole-number `people_count` from 1 to 100, including the person booking. Normalized email uniqueness is enforced by Postgres and the Edge Function; duplicates return HTTP 409 without creating another booking. IP throttling counts recent successful bookings in this same table.

The form validates contact fields and group size and requires a valid receipt and agreement before enabling Submit. The server repeats validation; unchecking agreement disables Submit again.

## Vercel production

Project `asi-global-event` is hosted at https://asi-global-event.vercel.app (also available at https://asi-global-event-aitiontechsl-2319s-projects.vercel.app). Both exact origins and the two local development origins are included in the function's default allowlist. An explicitly set `ALLOWED_ORIGIN` secret overrides these defaults; include the production origin in that value when using it. Additional custom domains must be explicitly added before registration works on them.
