# Seensy

See who opened your email and which links they clicked (résumé, LinkedIn, anything),
right inside Gmail, without counting your own views.

- **Backend:** Cloudflare Worker `seensy-api` + D1 database `seensy` (`backend/`)
- **Extension:** Chrome MV3 extension built on InboxSDK (`frontend/extension/`)
- **Contract:** types and rules shared by both (`shared/contracts.ts`)

Engineering rules, layout and verdict logic: [CLAUDE.md](CLAUDE.md).

## Run it in your Gmail

1. **Get an InboxSDK app ID** (free): sign in at https://register.inboxsdk.com with your
   personal Google account, create an app named `seensy` (letters and digits only), and put
   the ID in `frontend/extension/src/config.ts` (`INBOXSDK_APP_ID`).
2. **Build the extension:**
   ```sh
   cd frontend/extension
   npm install
   npm run build        # or: npm run dev   (rebuilds on save)
   ```
3. **Load it in Chrome:** open `chrome://extensions`, turn on **Developer mode**, click
   **Load unpacked**, and choose `frontend/extension/dist`.
4. **Sign in:** click the Seensy icon in Chrome's toolbar and choose **Sign in with Google** with
   the account you send from. Or open Gmail, compose, and click the Seensy switch: it signs that
   Gmail account in.
5. **Reload Gmail.** Every new email shows a ✓✓ switch next to Send.

### One-time Google sign-in setup (owner only)

Create an OAuth client in Google Cloud (type **Web application**) with the authorized redirect URI
`https://dkhlnebppjkpdpmcfbjmadnjmlgfkeha.chromiumapp.org/`, then put its client ID in both
`backend/wrangler.toml` (`GOOGLE_CLIENT_ID`) and `frontend/extension/src/config.ts`, deploy the
backend and rebuild the extension.

## How a tracked email works

1. On **Send**, the extension rewrites each link to `/c/<link-id>` and adds a 1×1 pixel
   `/o/<email-id>.gif`, then registers the email with the API (retried if offline).
2. When the recipient opens it, the pixel loads and the API logs an **open**. Clicking a link
   logs a **click** and redirects to the real page.
3. When **you** open your own sent email, the extension removes the pixel and tells the API,
   so your view is recorded as `self` and never counted. Your own clicks are recognised by a
   cookie the extension sets.
4. Hits in the first 60 s are labelled `early` (often security scanners); known scanners
   are labelled `scanner`.

## Backend commands

```sh
cd backend
npm install
npm run check                              # typecheck + unit tests
npm run db:migrate                         # apply D1 migrations
npm run deploy                             # check, then deploy the Worker
```

## API

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/o/:tid.gif` | – | open pixel |
| GET | `/c/:lid` | – | click redirect |
| GET | `/health` | – | liveness |
| POST | `/api/auth/google` | – | exchange a Google ID token for a session |
| GET | `/api/me` | Bearer | account + owner key |
| POST | `/api/emails` | Bearer | register a sent email and its links |
| GET | `/api/emails?threadIds=a,b` | Bearer | summaries (opens, early, clicks) |
| PATCH | `/api/emails/:tid` | Bearer | attach Gmail thread id |
| POST | `/api/self-views` | Bearer | "I'm viewing my own email" |
| GET | `/api/activity?since=ms` | Bearer | opens/clicks by real people |
