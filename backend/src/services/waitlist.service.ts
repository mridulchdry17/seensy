import type { WaitlistRequest } from "../../../shared/contracts";
import { waitlistModel } from "../models/waitlist.model";

export const waitlistService = {
  async join(db: D1Database, input: WaitlistRequest): Promise<void> {
    await waitlistModel.add(db, input.email.trim().toLowerCase(), input.source ?? "", Date.now());
  },
};
