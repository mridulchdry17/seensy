import { Router } from "./app/router";
import { getBoard, getTimeline, listUserLinks, removeUserLink, saveUserLink, setStage } from "./controllers/board.controller";
import { getMe, health, listActivity, signInWithGoogle } from "./controllers/account.controller";
import { attachThread, listEmails, registerEmail } from "./controllers/emails.controller";
import { recordSiteEvent } from "./controllers/site-event.controller";
import { clickRedirect, openPixel, recordSelfView } from "./controllers/tracking.controller";
import { joinWaitlist } from "./controllers/waitlist.controller";

export const router = new Router()
  // Public tracking endpoints (hit by recipients' mail clients and browsers)
  .on("GET", "/o/:file", openPixel)
  .on("GET", "/c/:lid", clickRedirect)
  .on("GET", "/health", health)
  .on("POST", "/api/auth/google", signInWithGoogle)
  .on("POST", "/api/waitlist", joinWaitlist)
  .on("POST", "/api/site-events", recordSiteEvent)
  // Extension API (Bearer session token; the web app uses these too)
  .on("GET", "/api/me", getMe)
  .on("POST", "/api/emails", registerEmail)
  .on("GET", "/api/emails", listEmails)
  .on("PATCH", "/api/emails/:tid", attachThread)
  .on("POST", "/api/self-views", recordSelfView)
  .on("GET", "/api/activity", listActivity)
  // Web app API (Bearer session token)
  .on("GET", "/api/board", getBoard)
  .on("GET", "/api/emails/:tid/timeline", getTimeline)
  .on("PUT", "/api/emails/:tid/stage", setStage)
  .on("GET", "/api/links", listUserLinks)
  .on("POST", "/api/links", saveUserLink)
  .on("DELETE", "/api/links/:id", removeUserLink);
