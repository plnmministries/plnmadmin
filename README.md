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
  - `uploads/` — images uploaded in the editor, served at `/media/…`
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

## Deploying (Render)

This repo includes `render.yaml`. In Render: **New → Blueprint →** pick `plnmadmin`.
It creates a Starter web service in Singapore with a 1 GB disk at `/var/data` (where all content is stored).
During setup Render asks for:

- `ADMIN_PASSWORD`: the starter password for the editor (change it later under **Account & login**)
- `SITE_URL`: the public website address (e.g. `https://plnm.vercel.app`); can be filled in after the website is deployed

`SESSION_SECRET` and `REVALIDATE_SECRET` are generated automatically. Copy `REVALIDATE_SECRET`
into the website's Vercel project so Publish refreshes the site instantly.

Content is served to the public website (repo `plnm`) at `/api/public/content`.
Back up the disk regularly from the Render dashboard.
