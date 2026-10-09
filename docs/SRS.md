# Software Requirements Specification (SRS)

**Project:** `bestbefore`, a LINE OA food-expiry tracker with a web app at parity
**Version:** 1.0
**Date:** 2026-10-08
**Status:** Baselined for v1

> **Revision history**
> - **1.0 (2026-10-08):** First baseline. Decisions taken during design: photos are added
>   through the web app (LIFF) rather than by sending images into chats; the group bot is
>   read-and-act only (list, used, delete) plus an opportunistic "piggyback" reminder; bot
>   replies are in Thai; the AI reader is Gemini Flash-Lite on the free tier with no fallback
>   provider; the web app must have full parity with the bot and adds Web Push reminders.

## 1. Purpose and scope

A household keeps forgetting what is about to expire. This system lets any member photograph
a product, have the expiry read off the label, and later see the pantry sorted by what expires
first, either by @-mentioning the bot in the family LINE group or by opening the web app.

Out of scope for v1: multiple households per deployment, barcodes, quantities, shopping lists,
and any LINE message that is not a reply to a webhook event.

## 2. Actors and channels

| Actor | How they reach the system |
|---|---|
| Member | A LINE user who follows the OA. Uses the web app (inside LINE as a LIFF app, as an installed PWA, or on desktop) and the bot in 1:1 chat. |
| Group participant | Anyone in a LINE group or multi-person chat the OA has joined. Can read the list and press buttons; cannot add items unless they are also a member. |
| LINE Platform | Delivers webhooks, accepts reply messages, verifies LIFF ID tokens. |
| Gemini API | Reads product name and expiry off photos (free tier). |

## 3. Hard constraints

- **C-1 No push quota.** The only LINE messages the system sends are replies to a webhook
  event, using that event's reply token, within one minute of receipt. No `push`, `multicast`,
  `broadcast`, and no cron that sends to LINE.
- **C-2 Free AI.** The only model provider is Google AI Studio's free tier, model
  `gemini-3.5-flash-lite` (overridable by env). No fallback provider. When it fails or is
  throttled the user types the date by hand.
- **C-3 Thai bot, bilingual web.** Bot replies are Thai only; a shared group chat gets one
  language regardless of who asks. The web UI defaults to Thai and offers English per device
  (`src/lib/i18n.tsx`), with dates as Buddhist-era (`15 ต.ค. 2569`) or Gregorian (`15 Oct
  2026`) to match, plus a relative phrase (`อีก 3 วัน` / `3 days left`).
- **C-4 Calendar dates.** An expiry is a `YYYY-MM-DD` string. "Today" is computed in
  Asia/Bangkok (fixed UTC+7). No instants, no midnight bugs.
- **C-5 One pantry.** A deployment is one household. Membership is "currently follows the
  OA". `liff.getContext()` no longer exposes a group id, so the pantry cannot be scoped per
  group from the web app.
- **C-6 Parity.** Every pantry operation exists on both channels (see §5.6). Nothing in the
  matrix is deferred.

## 4. Data model (Convex)

| Table | Fields (besides `_id`, `_creationTime`) | Indexes |
|---|---|---|
| `settings` | `reminderDays` (3), `piggybackDays` (2) | singleton |
| `members` | `lineUserId`, `displayName?`, `pictureUrl?`, `status` following/left, `followedAt` | `by_lineUserId` |
| `sessions` | `token`, `memberId`, `expiresAt` (90 d), `userAgent?` | `by_token`, `by_memberId` |
| `sources` | `lineSourceId`, `sourceType` group/room, `displayName?`, `active`, `piggybackEnabled`, `lastPiggybackOn?` | `by_lineSourceId` |
| `items` | `name`, `expiresOn?`, `note?`, `status` active/used/deleted, `archivedAt?`, `addedBy`, `guess?` | `by_status_and_expiresOn`, `by_status_and_archivedAt` |
| `photos` | `itemId`, `storageId`, `position` | `by_itemId` |
| `pushSubscriptions` | `endpoint`, `keys`, `memberId`, `userAgent?` | `by_endpoint`, `by_memberId` |
| `webhookEvents` | `webhookEventId`, `receivedAt` | `by_webhookEventId`, `by_receivedAt` |
| `notifications` | `kind` push/piggyback, `sentAt`, `itemCount`, `detail`, `error?` | `by_sentAt` |

`guess` records what the model returned (`name`, `expiresOn`, `basis` printed/estimated/none,
`confidence`, `note`, `model`) next to what the member actually saved.

## 5. Functional requirements

### 5.1 Membership and auth

- **FR-AUTH-1** A `follow` webhook event creates or reactivates a member; the bot replies with
  a Thai welcome and buttons to the app. The profile name and picture are fetched afterwards.
- **FR-AUTH-2** An `unfollow` event marks the member `left` and deletes their sessions and push
  subscriptions.
- **FR-AUTH-3** The web app obtains a LIFF ID token (inside LINE automatically; in a browser via
  `liff.login()`), sends it to `auth.login`, which verifies it against LINE's
  `oauth2/v2.1/verify` with the LINE Login channel id and mints a 256-bit session token for a
  member whose status is `following`. Non-members see an "add the bot as a friend" screen.
- **FR-AUTH-4** Every web query and mutation takes the session token; `requireMember` resolves
  it or throws a Thai message. Expired tokens (90 days) are rejected.
- **FR-AUTH-5** An invalid ID token (typically expired after one hour in an external browser)
  triggers one LIFF logout-and-login cycle before surfacing an error.

### 5.2 Adding items (web only)

- **FR-ADD-1** The add page accepts up to 4 photos from camera or gallery, downscales each to
  1600 px JPEG client-side, uploads them to Convex storage, and calls `ai.guess`.
- **FR-ADD-2** `ai.guess` sends the photos and a Thai-aware prompt to Gemini Flash-Lite with a
  JSON response schema. The prompt covers EXP/BBE/หมดอายุ labels, MFG vs EXP, Buddhist-era
  years, and DD/MM order. It returns `{name, expiresOn, basis, confidence, note}`.
- **FR-ADD-3** On HTTP 429 the action waits 3 s and retries once. Any other failure, or a second
  429, returns `unavailable` and the form opens empty for manual entry. The item still saves.
- **FR-ADD-4** The form shows the guess with its confidence and basis; nothing is saved until
  the member presses บันทึก. An item may be saved without a date (`expiresOn` absent).
- **FR-ADD-5** Items can also be added with no photos at all.

### 5.3 Bot (LINE)

- **FR-BOT-1** In a group or room the bot reacts only to text messages whose mentionees include
  the bot itself (`isSelf: true`). `@all` never triggers it. In the 1:1 chat every text message
  is a command.
- **FR-BOT-2** Commands after stripping the mention: empty / `รายการ` / `list` → all active
  items; `ใกล้หมด` → expired, today, and within `reminderDays`; `หมดแล้ว` → expired and today;
  `ประวัติ` → used/deleted items; `ช่วย` or anything else → help.
- **FR-BOT-3** The list reply is one Flex bubble: title, count, up to 10 rows each with name,
  relative days in an urgency colour, the BE date, and buttons ใช้แล้ว (postback), แก้ไข (opens
  the item in the app), ลบ (postback). Footer buttons open เพิ่มของ and the app. Overflow is
  stated as "และอีก N รายการ".
- **FR-BOT-4** Postbacks: `a=used` archives the item as used; `a=del` replies with a quick-reply
  confirm; `a=delok` archives as deleted; `a=cancel` acknowledges. Item ids are normalised
  server-side; unknown ids get "ไม่พบรายการนี้แล้ว".
- **FR-BOT-5** A photo sent into the 1:1 chat is answered with a button to the add page (the
  model runs in the app, not on chat images).
- **FR-BOT-6** `join` registers the source with piggyback enabled and replies with a short
  intro; `leave` marks it inactive.
- **FR-BOT-7** Every webhook event id is stored; duplicates (redeliveries) are ignored.

### 5.4 Piggyback reminder (group)

- **FR-PIG-1** For any message in an active source with `piggybackEnabled`, if
  `lastPiggybackOn` is not today and at least one active item has `expiresOn ≤ today +
  piggybackDays` (expired items included), the bot replies once with a bulleted Thai warning
  and sets `lastPiggybackOn = today`. Command messages are answered with the command result
  instead and do not consume the daily piggyback.
- **FR-PIG-2** The toggle is per source and lives on the web settings page.

### 5.5 Web app

- **FR-WEB-1** List page: active items nearest expiry first, undated last; chips ทั้งหมด /
  ใกล้หมด / หมดแล้ว / ยังไม่ระบุวัน; name search; ใช้แล้ว on each row; `?filter=soon` deep link
  used by push notifications.
- **FR-WEB-2** Item page: photo gallery with add/remove (max 6), edit name, date, note; ใช้แล้ว;
  ลบ with an in-page confirm; กู้คืน for archived items; the stored AI guess for reference.
- **FR-WEB-3** History page: used and deleted items, most recent first, each restorable.
- **FR-WEB-4** Settings: profile and logout; Web Push enable/disable for this device plus the
  member's device list; `reminderDays` and `piggybackDays`; per-group piggyback toggles;
  household member list.
- **FR-WEB-5** Help page mirroring the bot's help text.
- **FR-WEB-6** Installable PWA with a custom service worker handling push and notification
  click. The LIFF browser cannot receive Web Push; the settings page says so and points at
  Safari/Chrome + Add to Home Screen.

### 5.6 Parity matrix

| Operation | LINE | Web |
|---|---|---|
| Add item with photos + AI guess | LIFF (opens the web add page) | Add page |
| Add item without photos | LIFF | Add page |
| List nearest-expiry-first | Flex reply on mention | List page |
| Filter soon / expired | `ใกล้หมด`, `หมดแล้ว` | Chips |
| Mark used | Postback button | Button |
| Edit name / date / note / photos | แก้ไข button opens item page | Item page |
| Delete (with confirm) | Postback + quick-reply confirm | Button + in-page confirm |
| History and restore | `ประวัติ` (list) + app link | History page with กู้คืน |
| Help | `ช่วย` | Help page |
| Reminders | Piggyback reply in group | Web Push daily digest |

### 5.7 Reminders and retention (crons; never LINE)

- **FR-CRON-1** 02:00 UTC (09:00 Bangkok): `push.digest.sendDigest` sends one Web Push per
  subscription listing active items with `daysLeft ≤ reminderDays` (expired included). 404/410
  endpoints are pruned. An audit row is written either way.
- **FR-CRON-2** 02:30 UTC: items archived more than 30 days ago are deleted with their photo
  bytes.
- **FR-CRON-3** 02:45 UTC: webhook event ids older than 7 days are deleted.

## 6. Non-functional requirements

- **NFR-1 Reply latency.** Ingest is one mutation; the reply is a scheduled action run
  immediately after commit. Target under 2 s end to end, well inside LINE's reply-token window.
- **NFR-2 Signature.** Every webhook is verified with HMAC-SHA256 over the raw body in constant
  time. Bad signatures get 401 and nothing is stored.
- **NFR-3 Privacy.** Free-tier Gemini content may be used by Google to improve its products.
  Photos are of packaging; the household accepted this. Photos are deleted with the item.
- **NFR-4 Bounded queries.** Every table read uses an index and `take(n)`; the pantry is
  capped at 500 active items per list call.
- **NFR-5 Types at the boundary.** Webhook JSON, LINE API responses, Gemini output, and upload
  responses are `unknown` until narrowed by a parser. No `as` casts outside two documented
  earned casts (ISO date brand, Convex upload storage id).

## 7. Configuration

Frontend (`.env.local`): `VITE_CONVEX_URL`, `VITE_LIFF_ID`, `VITE_VAPID_PUBLIC_KEY`, optional
`VITE_LINE_ADD_FRIEND_URL`.

Convex env: `LINE_CHANNEL_SECRET`, `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_LOGIN_CHANNEL_ID`,
`LIFF_ID`, `GEMINI_API_KEY`, optional `GEMINI_MODEL`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
`VAPID_SUBJECT`.

LINE console: a Messaging API channel (webhook `https://<deployment>.convex.site/line/webhook`,
auto-reply off, allow joining groups) and a LINE Login channel under the same provider with a
LIFF app (endpoint = the web app URL, scopes `openid` + `profile`, "Add friend option" on, and
a rich menu in the OA with one button opening `https://liff.line.me/<LIFF_ID>/add`).
