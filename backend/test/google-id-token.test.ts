import { describe, expect, it } from "vitest";
import { HttpError } from "../src/app/http";
import { identityFromClaims } from "../src/services/google-id-token";

const NONCE = "n0nce-n0nce-n0nce-1234";
const claims = {
  sub: "1234567890",
  email: "Mridul17.Work@gmail.com",
  email_verified: true,
  name: "Mridul Chaudhary",
  nonce: NONCE,
};

describe("identityFromClaims", () => {
  it("returns the Google identity with a normalised email", () => {
    expect(identityFromClaims(claims, NONCE)).toEqual({
      sub: "1234567890",
      email: "mridul17.work@gmail.com",
      name: "Mridul Chaudhary",
    });
  });

  it("rejects a token issued for a different sign-in request (nonce mismatch)", () => {
    expect(() => identityFromClaims(claims, "another-nonce-123456")).toThrow(HttpError);
  });

  it("rejects an unverified email", () => {
    expect(() => identityFromClaims({ ...claims, email_verified: false }, NONCE)).toThrow(/isn't verified/);
  });

  it("rejects a token without an email", () => {
    const { email: _omit, ...withoutEmail } = claims;
    expect(() => identityFromClaims(withoutEmail, NONCE)).toThrow(/no Google account/);
  });

  it("allows a missing display name", () => {
    const { name: _omit, ...withoutName } = claims;
    expect(identityFromClaims(withoutName, NONCE).name).toBe("");
  });
});
