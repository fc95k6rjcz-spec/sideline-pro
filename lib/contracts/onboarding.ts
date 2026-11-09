export const ONBOARDING_MARKER = "SIDELINEPRO ONBOARDING REQUIREMENTS · v2026-11-09";

export const ONBOARDING_ITEMS = [
  ["Club identity", "Legal club name, ABN if applicable, authorised signatory, billing contact, and the person responsible for approving launch."],
  ["Branding and content", "High-resolution logo, primary and secondary colours, approved website copy, 10–20 suitable photos where available, sponsor logos and links. Confirm permission to use all supplied material and identifiable people’s images."],
  ["Competition system access", "For PlayHQ: nominate the club’s authorised administrator and arrange a permitted participant/registration export and fixtures, or approved delegated access. CSV exports are an alternative. API access is subject to provider approval; a club admin login does not grant private API access. Never send passwords, MFA codes or secret API keys in this form or by ordinary email."],
  ["Member and team data", "Agree the minimum data needed for selected features: players, parents/guardians, teams, coaches, managers, umpires and committee, with relevant email/mobile contacts. Confirm authority to share the data and use the agreed secure transfer method. Do not upload unnecessary health or other sensitive information."],
  ["People and permissions", "Identify system admins and super admins, coaches/team managers missing from exports, a communications owner, and the safeguarding/escalation contact. Confirm role permissions before inviting members."],
  ["Policies and consent", "Provide the club’s privacy notice, code of conduct, grading and relevant safeguarding policies. Agree the under-18/guardian consent approach, communications rules and photo permissions before enabling the relevant features."],
  ["Domain and contact details", "Choose the website address; arrange authorised DNS changes if using your own domain. Provide public contact inboxes and social links. Retain club ownership of club domain and accounts."],
  ["Scope and historical records", "Confirm day-one features, later phases, historical data to import, format/quality checks, and who approves the imported records. Only the accepted proposal’s scope is included."],
  ["Payments, if included", "Nominate the treasurer; confirm programs, prices, GST treatment, refund policy and payment-to-player matching rules. Arrange provider onboarding and payout verification directly with the payment provider. Agree how unmatched payments, refunds and chargebacks will be reviewed. Never send card or online banking credentials to SidelinePro."],
  ["Launch and training", "Agree target launch date, data/access delivery dates, training attendees and test/approval steps. Confirm any app-store account requirements for the agreed delivery model. Delayed inputs or third-party approvals may require an agreed revised launch date."],
] as const;

export const ONBOARDING_ACKNOWLEDGEMENT = "I have reviewed the onboarding requirements in this proposal and will arrange the club’s applicable information, permissions and access through the agreed secure channels. This acknowledges the requirements; it does not confirm that every item has already been supplied.";

export const ONBOARDING_TEXT = `${ONBOARDING_MARKER}\n\nWhat we need from your club\nWe will confirm which items apply to your agreed scope and who is responsible for each.\n\n${ONBOARDING_ITEMS.map(([title, detail], i) => `${i + 1}. ${title}\n${detail}`).join("\n\n")}\n\n${ONBOARDING_ACKNOWLEDGEMENT}`;

export function requiresOnboardingAcknowledgement(terms: string | null | undefined) {
  return Boolean(terms?.includes(ONBOARDING_MARKER));
}

export function onboardingAcceptanceNote(terms: string | null, acknowledged: unknown, note: string): string | null {
  if (!requiresOnboardingAcknowledgement(terms)) return note || null;
  if (acknowledged !== true) throw new Error("Please acknowledge the club onboarding requirements.");
  return `${ONBOARDING_MARKER}\nAcknowledged at proposal acceptance: ${ONBOARDING_ACKNOWLEDGEMENT}${note ? `\n\nCustomer note: ${note}` : ""}`;
}
