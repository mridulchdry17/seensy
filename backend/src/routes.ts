import { Router } from "./app/router";
import { getMe, health, listActivity, signInWithGoogle } from "./controllers/account.controller";
import { attachThread, listEmails, registerEmail } from "./controllers/emails.controller";
import { clickRedirect, openPixel, recordSelfView } from "./controllers/tracking.controller";

export const router = new Router()
  // Public tracking endpoints (hit by recipients' mail clients and browsers)
  .on("GET", "/o/:file", openPixel)
  .on("GET", "/c/:lid", clickRedirect)
  .on("GET", "/health", health)
  .on("POST", "/api/auth/google", signInWithGoogle)
  // Extension API (Bearer session token)
  .on("GET", "/api/me", getMe)
  .on("POST", "/api/emails", registerEmail)
  .on("GET", "/api/emails", listEmails)
  .on("PATCH", "/api/emails/:tid", attachThread)
  .on("POST", "/api/self-views", recordSelfView)
  .on("GET", "/api/activity", listActivity);
