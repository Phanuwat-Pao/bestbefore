# bestbefore

A household expiry tracker that lives in LINE and on the web. Photograph a product, Gemini
reads the expiry off the label, confirm it, and from then on `@BestBefore` in the family group
lists everything nearest-expiry first. The web app does everything the bot does and adds Web
Push reminders.

Full spec: [`docs/SRS.md`](docs/SRS.md) (v1.0).

## Stack

- **Frontend:** Vite + React + TanStack Router, installable PWA, runs as a LIFF app inside LINE
  and as a normal site outside it
- **Auth:** LINE Login via LIFF ID token, verified server-side; membership = follows the OA
- **Backend:** Convex (DB, file storage, HTTP webhook, scheduler, crons)
- **AI:** Gemini Flash-Lite on the Google AI Studio free tier (`@google/genai`)
- **LINE:** Messaging API replies only (no push quota), Flex messages, postbacks
- **Reminders:** piggyback reply in the group, Web Push daily digest from a cron
- **Tooling:** Ultracite preset driving oxlint + oxfmt, TypeScript 7, lefthook

## How it fits together

LINE webhook → `convex/http.ts` (signature check) → `line/ingest.ts` (one mutation: dedupe,
members, sources, commands, postbacks, piggyback decision) → `line/send.ts` replies with the
event's reply token.

Web app → LIFF ID token → `auth.login` → session token → `items.*` queries and mutations. The
add page uploads photos to Convex storage and calls `ai.guess`, which runs Gemini and returns a
structured guess the member confirms.

Crons: Web Push digest at 09:00 Bangkok, purge of archived items after 30 days, purge of webhook
dedupe rows after 7 days. Nothing scheduled ever sends to LINE.

## Prerequisites

Node 20+ with pnpm (`corepack enable pnpm`), a [Convex](https://convex.dev) account, a LINE
Developers provider with a **Messaging API** channel and a **LINE Login** channel, and a Google
AI Studio API key.

## Setup

```bash
pnpm install
cp .env.example .env.local        # fill in the VITE_* values
pnpm exec convex dev              # creates the deployment, generates convex/_generated
pnpm dev                          # Vite, in another terminal
```

### 1. Convex

`pnpm exec convex dev` prints the deployment URL → `VITE_CONVEX_URL`. The HTTP webhook is served
on the `.convex.site` domain.

### 2. LINE Messaging API channel (the bot)

- Enable the Messaging API, turn **off** the default auto-reply, allow the bot to **join group
  chats**.
- Webhook URL: `https://<deployment>.convex.site/line/webhook`, webhook on.
- Convex env:

```bash
pnpm exec convex env set LINE_CHANNEL_SECRET <channel secret>
pnpm exec convex env set LINE_CHANNEL_ACCESS_TOKEN <long-lived channel access token>
```

- In LINE Official Account Manager, create a rich menu with one button whose action is the URL
  `https://liff.line.me/<LIFF_ID>/add` (label it เพิ่มของ). Optionally a second button to
  `https://liff.line.me/<LIFF_ID>` (เปิดแอป).

### 3. LINE Login channel + LIFF app (the web app)

- Create a LINE Login channel under the **same provider**. Its channel ID goes to Convex:

```bash
pnpm exec convex env set LINE_LOGIN_CHANNEL_ID <login channel id>
```

- Add a LIFF app: endpoint URL = where you deploy the web app (Vercel URL), size Full, scopes
  `openid` and `profile`, "Add friend option" on. Copy the LIFF ID into both places:

```bash
pnpm exec convex env set LIFF_ID <liff id>
# and VITE_LIFF_ID in .env.local
```

### 4. Gemini

Create a key at Google AI Studio (free tier, no card) and set it:

```bash
pnpm exec convex env set GEMINI_API_KEY <key>
# optional: pnpm exec convex env set GEMINI_MODEL gemini-3.5-flash-lite
```

Free-tier content may be used by Google to improve its products. Photos here are of packaging.

### 5. Web Push (VAPID)

```bash
pnpm exec web-push generate-vapid-keys
pnpm exec convex env set VAPID_PUBLIC_KEY <publicKey>
pnpm exec convex env set VAPID_PRIVATE_KEY <privateKey>
pnpm exec convex env set VAPID_SUBJECT mailto:you@example.com
```

Put the public key in `.env.local` as `VITE_VAPID_PUBLIC_KEY` too. Enable notifications from
Settings in a real browser (not the LIFF browser). On iOS, Add to Home Screen first.

### 6. Deploy

`vercel.json` is set up for Vite. Deploy, then point the LIFF endpoint URL at the deployment.

## Using it

- Add the OA as a friend. That makes you a member; the bot says hello with an เพิ่มของ button.
- Invite the OA to the family group. Type `@BestBefore` (or `@BestBefore ใกล้หมด`) to get the
  list. Each row has ใช้แล้ว / แก้ไข / ลบ.
- When something is within `piggybackDays` of expiry, the bot adds a warning once a day on the
  back of any message in the group. Turn it off per group in Settings.
- Open the web app from the rich menu, from a bot reply, or at its URL in any browser. It has
  the full list, filters, search, history with restore, photos, and reminder settings.

## Scripts

| Script                         | What it does                                             |
| ------------------------------ | -------------------------------------------------------- |
| `pnpm dev` / `pnpm dev:convex` | Vite dev server / Convex dev deployment                  |
| `pnpm build`                   | Production build (also generates `src/routeTree.gen.ts`) |
| `pnpm typecheck`               | `tsc` for the app and for `convex/`                      |
| `pnpm check` / `pnpm fix`      | Ultracite lint + format check / fix                      |

Pre-commit runs lint-fix, typecheck, and workspace lint via lefthook.
