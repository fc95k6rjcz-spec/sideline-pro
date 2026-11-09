import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ONBOARDING_TEXT } from "@/lib/contracts/onboarding";
const mock = vi.hoisted(() => ({ admin: vi.fn(), notify: vi.fn(), update: vi.fn(), read: vi.fn(), save: vi.fn(), eq: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mock.admin }));
vi.mock("@/lib/notify-founders", () => ({ notifyFounders: mock.notify }));
import { POST } from "./route";
const row = { id: "proposal-1", token: "example-token-long", status: "sent", title: "Test only", club_name: "Example", terms: ONBOARDING_TEXT, pricing: [], includes: [], valid_until: null };
const body = { name: "Demo signer", role: "President", email: "demo@example.com", agree: true, reviewedTerms: ONBOARDING_TEXT, onboardingAgree: true };
const request = (change = {}) => new NextRequest("https://example.com/api/proposals/public/example-token-long/accept", { method: "POST", body: JSON.stringify({ ...body, ...change }) });
const ctx = { params: Promise.resolve({ token: "example-token-long" }) };
beforeEach(() => {
  vi.resetAllMocks();
  mock.read.mockResolvedValue({ data: row });
  mock.save.mockResolvedValue({ data: { ...row, status: "accepted" } });
  const readChain = { eq: () => readChain, maybeSingle: mock.read, single: mock.read };
  const saveChain = { eq: mock.eq, neq: () => saveChain, select: () => saveChain, maybeSingle: mock.save };
  mock.eq.mockReturnValue(saveChain);
  mock.update.mockReturnValue(saveChain);
  mock.admin.mockReturnValue({ from: () => ({ select: () => readChain, update: mock.update }) });
});
describe("proposal acceptance requirements", () => {
  it("rejects a missing onboarding acknowledgement without writing or notifying", async () => {
    expect((await POST(request({ onboardingAgree: false }), ctx)).status).toBe(400);
    expect(mock.update).not.toHaveBeenCalled(); expect(mock.notify).not.toHaveBeenCalled();
  });
  it("rejects stale displayed terms", async () => {
    expect((await POST(request({ reviewedTerms: "old" }), ctx)).status).toBe(409);
    expect(mock.update).not.toHaveBeenCalled();
  });
  it("records acknowledgement and guards against concurrently changed terms", async () => {
    expect((await POST(request(), ctx)).status).toBe(200);
    expect(mock.update.mock.calls[0][0].accepted_note).toContain("Acknowledged at proposal acceptance");
    expect(mock.eq).toHaveBeenCalledWith("terms", ONBOARDING_TEXT);
  });
  it("does not overwrite an already accepted proposal", async () => {
    mock.read.mockResolvedValue({ data: { ...row, status: "accepted" } });
    expect((await POST(request(), ctx)).status).toBe(200);
    expect(mock.update).not.toHaveBeenCalled(); expect(mock.notify).not.toHaveBeenCalled();
  });
});
