# Seensy — store listing (Edge Add-ons; reuse for Chrome Web Store)

Package: `npm run build:store` → `frontend/extension/seensy-store.zip`

## Before you submit (in this order)

1. **Publish the Google OAuth app** — Google Cloud → Google Auth Platform → Audience → **Publish app**.
   Reviewers sign in with their own Google account; while the app is in "Testing" only listed test users can.
   Keep the scopes to `openid`, `email`, `profile` and add no logo, so no verification is needed.
2. **Upload the zip as a draft** in Partner Center and copy the extension ID it shows.
3. **Add the redirect URI** for that ID in Google Cloud → Clients → Seensy extension → Authorized redirect URIs:
   `https://<edge-extension-id>.chromiumapp.org/` (keep the existing one).
4. Fill in the fields below, add screenshots, and submit.

## Store fields

| Field | Value |
|---|---|
| Name | Seensy |
| Short description (from manifest) | See who opened your email and which links they clicked, without counting your own views. |
| Category | Productivity |
| Language | English |
| Website | https://seensy.vercel.app |
| Privacy policy URL | https://seensy.vercel.app/privacy |
| Support contact | mridul17chaudhary@gmail.com |
| Store logo (300×300) | `store-assets/logo-300.png` |
| Small promotional tile (440×280) | `store-assets/promo-tile-440x280.png` |
| Marquee promo tile (1400×560, Chrome) | `store-assets/marquee-1400x560.png` |
| Screenshots (1280×800 or 640×480, up to 6) | Compose window with the ✓✓ switch · Sent folder with ✓✓ ticks · Seensy popup with activity |

### Search terms (max 7)
email tracker · gmail tracking · read receipt · resume tracker · job search · email open tracking · link tracking

### Description

Know when they read it.

Seensy tells you when a recruiter, founder or client opens your email and clicks the links in it — your résumé, LinkedIn, portfolio or anything else — right inside Gmail. Follow up with the people who looked instead of guessing.

HOW IT WORKS
• Sign in with Google. Seensy only receives your name and email address.
• Write and send email in Gmail as usual. A ✓✓ switch next to Send tracks that email; switch it off for any email you don't want tracked.
• See ✓✓ ticks in your Sent folder, a live feed of opens and clicks in the Seensy popup, and desktop notifications.

WHAT MAKES IT DIFFERENT
• Your own views never count. Reading your own sent email or clicking your own links is recognised and left out.
• Every link, automatically. Links are tracked when you press Send, labelled by the text you wrote ("Résumé", "LinkedIn").
• Scanners filtered out. Corporate security filters that open every email instantly are labelled, not counted as a reader.
• Multiple Gmail accounts. Each signed-in account is tracked separately.

PRIVACY
Seensy works inside the Gmail page in your browser and never asks Google for permission to read, send or delete your email. It stores the subject, recipients and links of emails you track and when they were opened or clicked — never the email body. Privacy policy: https://seensy.vercel.app/privacy

Free during early access.

## Privacy page (Partner Center → Privacy)

**Single purpose description**
Seensy tells the user when an email they sent from Gmail on the web is opened and when the links in it are clicked, by adding an open-tracking image and tracked links to emails they choose to track.

**Are you using remote code?** No, I am not using remote code. (All code, including the InboxSDK library, is bundled in the package; nothing is loaded from a server.)

**What user data do you collect?** (tick these)
- Personally identifiable information: the user's Google email address and name (from Google sign-in), and recipient email addresses of tracked emails.
- Personal communications: subject line, recipients and link addresses of emails the user chooses to track. Never the email body.
- Authentication information: a session token for the Seensy API, stored in extension storage.

**Certify:** tick all three — data is not sold to third parties; not used or transferred for purposes unrelated to the extension's single purpose; not used to determine creditworthiness or for lending.

**Privacy policy URL:** https://seensy.vercel.app/privacy

**Permission justification:** use the "Permissions" list in the certification notes below (one line per permission).

## Notes for certification (paste into "Notes for certification")

Seensy adds open and link-click tracking to emails sent from Gmail on the web (https://mail.google.com).

To test:
1. Install the extension, click the Seensy toolbar icon and choose "Sign in with Google" (any Google account; the extension requests only openid, email and profile).
2. Open Gmail with the same account and click Compose. A ✓✓ "Seensy: tracking on" button appears in the compose toolbar.
3. Write an email with a link (e.g. https://example.com) and send it to another address you can open on a different device or browser.
4. Open that email elsewhere and click the link. Within about a minute the Seensy popup shows the open and the click, and the email shows "✓✓ 1×" in the Sent folder after a refresh.

Permissions:
• storage — the user's settings, session and a queue of pending API calls.
• alarms — checks for new opens and retries queued calls once a minute.
• notifications — "X opened your email" notifications.
• cookies — sets one cookie on the Seensy API domain so the user's own link clicks are not counted.
• identity — Google sign-in via launchWebAuthFlow.
• scripting — required by InboxSDK (the Gmail integration library) to load its page script in Gmail.
• Host access to mail.google.com (Gmail integration) and the Seensy API (tracking and sign-in).

No remote code is executed; all extension code is in the package.
