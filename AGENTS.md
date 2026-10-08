# bestbefore

LINE OA food-expiry tracker with a web app at full parity. Spec: `docs/SRS.md`.

Hard rules from the owner:

- Bot replies only. Never add a LINE push/multicast/broadcast or a cron that sends to LINE.
- AI is Gemini Flash-Lite on the free tier only. No fallback provider, no paid model.
- Bot replies and the web UI are Thai. Dates are `YYYY-MM-DD` strings; "today" is Asia/Bangkok.
- Parity: anything the bot can do, the web can do, and the reverse. Do not defer matrix items.

Layout: `convex/line/` (webhook ingest + reply), `convex/push/` (Web Push), `convex/lib/` (pure
helpers shared with the frontend: dates, commands, flex builders, event parser), `src/routes/`
(TanStack file routes), `src/lib/` (LIFF, session, upload).

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
