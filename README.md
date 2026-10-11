# Paralokanestham Ministries — website + visual editor

Next.js 16 site with a built-in, Shopify-style visual editor at `/admin`.

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
```

Admin: `http://localhost:3000/admin`. Starter login: `ADMIN_USERNAME` / `ADMIN_PASSWORD` from `.env.local`.
After signing in, open **Account & login** (person icon at the bottom of the left rail) to set your own login ID and password.
They're then stored hashed in `data/admin.json` and the `.env.local` values stop working. Changing them signs out every other device.
`SESSION_SECRET` must be a long random string.

## How content works

- Everything editable lives in `data/` (created on first run from `src/lib/seed.ts` and `src/lib/seed-translations.ts`):
  - `published.json` — what visitors see
  - `draft.json` — the editor's autosaved working copy (unpublished changes)
  - `revisions/` — a snapshot of every publish (restore from **History** in the editor)
  - `uploads/` — images uploaded in the editor, served at `/media/…` (or Cloudflare R2 when configured, see below)
- Back up the `data/` folder; it *is* the website content.

## The editor (`/admin`)

- Click any text on the live canvas to edit it in place; click a section for its settings on the right.
- Drag to reorder sections, hide/show, duplicate, add from the section library.
- Desktop / tablet / mobile preview, undo/redo (⌘Z / ⇧⌘Z), ⌘K command palette, autosave, Publish with version history.
- **Sermons**: "Sync new videos from YouTube" pulls the latest uploads + live streams with auto-guessed category/date, or paste any YouTube link.
- **Events** hide automatically after their date. **Giving** generates a UPI QR from the UPI ID (or upload your own QR).
- **Get connected** forms open WhatsApp with a pre-filled message once the WhatsApp number is set.
- **Site health** lists what still needs finishing (UPI ID, event timings…).
- **Languages:** English, Telugu and Hindi. Visitors pick one from the globe button (top right); the choice is remembered.
  In the editor, switch EN / తె / हि in the top bar and click text to edit that language, or use the **Translations** panel.
  Anything not translated falls back to English. Links can force a language with `?lang=te`.
- **Give (UPI):** add the UPI ID under **Giving**. PhonePe / Google Pay / Paytm buttons open that app with the UPI ID filled in
  (Android and iPhone); a QR code is generated from the same ID.
- **WhatsApp forms:** any button linked to `#form:prayer`, `#form:baptism` or `#form:volunteer` opens that form;
  submitting opens WhatsApp to the church number with the answers already typed in.

## Deploying (Render free + Neon)

Storage: when `DATABASE_URL` is set, content, publish history, uploaded photos and the login are
stored in Postgres (Neon) instead of `./data`, so the app works on hosts without a disk.

1. **Neon:** in Vercel → *Storage* → *Create Database* → **Neon** (free). Copy its `DATABASE_URL`
   (the pooled one). Or create it at neon.tech.
2. **Render:** *New → Blueprint →* pick `plnmadmin` (uses `render.yaml`: free plan, Singapore).
   Fill in `ADMIN_PASSWORD`, `DATABASE_URL` and `SITE_URL` (can be added after the website is live).
   `SESSION_SECRET` and `REVALIDATE_SECRET` are generated; copy `REVALIDATE_SECRET` into Vercel.

The free plan sleeps after 15 minutes without use, so the first visit to the editor takes about a minute.
Visitors are not affected: the public website reads straight from the database.

### Cloudflare R2 (uploaded images)

When the `R2_*` variables are set (see `.env.example`), images uploaded in the editor go to Cloudflare R2
under `media/{name}` and the content references them at `R2_PUBLIC_URL/media/…` directly; the database and
`./data/uploads` stay as fallbacks and `/media/…` keeps serving the older images (anything else redirects to R2).
The check-in selfies in the mobile-app admin area are read from R2 through signed URLs and disappear after 15 days.

The Cloudflare setup (buckets, API token, custom domain `media.paralokanestham.in`, lifecycle rule) is written up
in the public site's README → "Cloudflare R2". Afterwards, copy the images already in the database once:

```bash
npm run migrate-media        # copies every plnm_media row to R2 and prints what it did; rows are kept
```
