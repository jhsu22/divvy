# Divvy

Receipt scanning uses Gemini 3.5 Flash-Lite by default. “Retry difficult receipt” in receipt review makes one explicit Gemini 3.8 Flash request and replaces the scanned data. No automatic fallback requests are made. Item assignment and shared bill viewing do not call Google.

## Share your scanning quota with friends on Cloudflare Pages

The `/api/scan` Pages Function keeps your Google key on the server. Friends enter a separate scan code; they never receive your key. Personal API keys remain an optional alternative.

1. In Cloudflare **Workers & Pages → your Pages project → Settings → Variables and Secrets**, add these **secrets** to the Production environment:
   - `GEMINI_API_KEY`: your Google AI Studio key.
   - `DIVVY_SCAN_CODE`: a long, random code you share privately with friends. Changing it revokes the old code.
   - Add a plain variable `DAILY_SCAN_LIMIT` (optional, defaults to `30`). This is the total shared requests per UTC day, including retries and failed upstream attempts. It is separate from Google's quotas and does not increase them.
2. Create a Cloudflare D1 database (for example `divvy-scan-quota`). In its Console, execute:

   ```sql
   CREATE TABLE IF NOT EXISTS scan_quota (
     day TEXT PRIMARY KEY,
     requests INTEGER NOT NULL DEFAULT 0
   );
   ```

3. In your Pages project's **Settings → Bindings**, add a **D1 database** binding named `SCAN_QUOTA`, selecting that database. Counters update atomically across server instances. Scanning fails closed until the secrets and database are configured.
4. Deploy the repository with Cloudflare Pages Git integration. Build command: `npm run build`; output directory: `dist`. The root `functions/` directory must be included in the deployment source. A static-only drag-and-drop upload of `dist` will not install the function. Set the same bindings/secrets separately for Preview if you want scanning there.
5. Share the website URL and the scan code privately. Friends enter it once per browser session and upload receipts. The optional personal-key checkbox uses that person's quota instead.

Never prefix the Google secret with `VITE_`: Vite variables are public browser code. Never commit keys or scan codes. A scan code is a shared password, not individual user accounts; anyone given it can spend the shared daily allowance. Rotate it if it spreads. The API only allows the two scanner models, fixes the extraction prompt, rejects cross-origin browser requests, and caps payload size. Origin checks alone are not authentication; the code provides access control and the D1 cap bounds shared usage.

If Google rejects a request because its own quota is exhausted, users can try later, use a personal key, or enter items manually. Quota is reserved before sending to Google and isn't refunded on upstream errors, preventing concurrent retries from bypassing the cap. The daily cap resets at midnight UTC; Google's own daily quota may reset at a different time.

## Local development

`npm ci`, then `npm run dev` for the frontend. Personal-key scanning works with Vite alone; shared scanning needs the Pages Functions runtime. With Wrangler installed, build and run `wrangler pages dev dist --d1 SCAN_QUOTA=<database-id>`, initialize the local database with `functions/schema.sql`, and place `GEMINI_API_KEY` and `DIVVY_SCAN_CODE` in a gitignored `.dev.vars` file. Use the local Pages URL for both the website and `/api/scan`. Google requests still consume quota.

## Checks

- `npm test`: calculation and scanning tests using mocked Google requests; no live quota used.
- `npm run build`: type checks the client and Pages Function, then produces `dist`.
