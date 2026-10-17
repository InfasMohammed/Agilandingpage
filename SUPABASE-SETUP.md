# Connect your event website to Supabase

## 1. Create the project

1. Open https://supabase.com/dashboard and sign in.
2. Choose **New project**, select your organisation, and name it `asi-global-event`.
3. Generate a strong database password and keep it in your password manager. Do not send it in chat.
4. Pick a region near your audience and wait for the project to finish provisioning.
5. In the project’s **Connect** dialog or **Settings → API Keys**, copy the **Project URL** and **publishable key**. The older `anon` key also works. These are public frontend configuration, unlike the private secret/service role keys.

You can share just the project URL and publishable key here so the frontend can be connected. Never share the database password, secret key, service role key or access token in chat.

## 2. Create the tables and private receipt bucket

Open the project’s **SQL Editor**, create a new query, paste the full contents of `supabase/migrations/202610170001_registrations.sql`, and run it once. This creates:

- `registrations`: guest contact information, private receipt path, and review status.
- `registration_attempts`: request throttling records.
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

`ALLOWED_ORIGIN` must exactly match the frontend origin, with `https://` and no trailing slash. For local development use `http://localhost:5173`; use `http://localhost:4173` if testing the production preview. Change it to the real website origin before launch. Only one origin is supported at a time.

The function is public because guests register without logging in. It checks the allowed origin, form fields, consent, file signature and size, and applies a basic IP limit. Never deploy your service role key to the website. Supabase automatically supplies the service credentials within its hosted Edge Function.

## 4. Configure the website

Copy `.env.example` to `.env` and set:

```dotenv
VITE_SUPABASE_URL=https://jkbrwuqugzkvzsaizqja.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_PUBLISHABLE_KEY
VITE_PAYMENTS_ENABLED=false
```

The organiser’s supplied account details are in `src/bank.ts`. The corrected details have been supplied by the organiser, with Wio Bank identified by SWIFT `WIOBAEADXXX`. The IBAN uses the standard Latin `AE` prefix. Any other `VITE_BANK_*` setting overrides the corresponding account detail.

Keep `VITE_PAYMENTS_ENABLED=false` until the account details and backend deployment are confirmed. Then set it to `true` and restart/rebuild:

```sh
npm ci
npm run build
npm run preview -- --port 4173
```

For static hosting, set the same frontend variables in the host’s build settings and deploy the `dist` folder. These variables are compiled into the website; changing them requires a fresh build.

## 5. Test before opening registration

Submit a test registration with a small PNG/JPG/WebP receipt. You can use a clearly labelled test image to test the system; do not treat this as a verified payment.

- The website must display a reference only after the function saves the registration.
- In **Table Editor → registrations**, find the matching `pending` record.
- In **Storage → payment-receipts**, verify that its receipt exists and is private.
- Confirm the team can open the receipt through the authenticated dashboard.
- Verify an unauthenticated request cannot list registrations or view private receipt URLs.
- Remove the test record and receipt after testing.

For real guests, check the bank transfer, update status to `confirmed`, and contact the guest manually. The website does not automatically reconcile payments or send confirmation emails.

If the function returns an error, inspect **Edge Functions → register → Logs** without logging guests’ contact data or receipt contents. A 403 usually means `ALLOWED_ORIGIN` does not match; a 503 means `REGISTRATION_ENABLED` is not `true`. The browser’s Network panel shows the function response.
