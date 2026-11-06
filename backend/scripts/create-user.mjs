// Creates a Seensy user and prints their API token once.
// Usage: npm run user:create -- you@gmail.com
// The token is saved to backend/.secrets/<email>.token (gitignored); only its hash is stored in D1.
import { execFileSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";

const email = process.argv[2]?.trim().toLowerCase();
if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error("Usage: npm run user:create -- you@gmail.com");
  process.exit(1);
}

const id = randomBytes(9).toString("base64url");
const token = `sy_${randomBytes(32).toString("base64url")}`;
const tokenHash = createHash("sha256").update(token).digest("hex");
const ownerKey = randomBytes(16).toString("hex");
const sql = `INSERT INTO users (id, email, api_token_hash, owner_key, created_at) VALUES ('${id}', '${email.replace(/'/g, "''")}', '${tokenHash}', '${ownerKey}', ${Date.now()});`;

execFileSync("npx", ["wrangler", "d1", "execute", "seensy", "--remote", "--command", sql], { stdio: "inherit" });

mkdirSync(".secrets", { recursive: true });
const file = `.secrets/${email}.token`;
writeFileSync(file, `${token}\n`, { mode: 0o600 });
console.log(`\nCreated ${email}. API token saved to backend/${file} — paste it into the extension popup.`);
