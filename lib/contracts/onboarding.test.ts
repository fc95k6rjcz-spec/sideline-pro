import { describe, expect, it } from "vitest";
import { ONBOARDING_TEXT, onboardingAcceptanceNote, requiresOnboardingAcknowledgement } from "./onboarding";

describe("onboarding acknowledgement", () => {
  it("keeps older proposals unaffected", () => {
    expect(requiresOnboardingAcknowledgement(null)).toBe(false);
    expect(onboardingAcceptanceNote("Existing terms", false, "Call the treasurer")).toBe("Call the treasurer");
  });
  it("requires an explicit boolean, not a missing or truthy value", () => {
    for (const value of [undefined, null, false, "true", 1]) expect(() => onboardingAcceptanceNote(ONBOARDING_TEXT, value, "")).toThrow();
  });
  it("retains the acknowledgement separately from the customer's note", () => {
    const result = onboardingAcceptanceNote(ONBOARDING_TEXT, true, "Waiting for export");
    expect(result).toContain("Acknowledged at proposal acceptance:");
    expect(result).toContain("does not confirm that every item has already been supplied");
    expect(result).toContain("Customer note: Waiting for export");
  });
});
