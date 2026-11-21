/**
 * v32 standalone install for one agency (e.g. SINGLE_AGENCY_CODE=DHQ or NA).
 * Multi-agency features (Super Admin II, creating agencies, shared sites, the agency switcher
 * on the login page) are switched off and lists are scoped to this agency.
 */
export function singleAgencyCode(): string | null {
  const v = String(process.env.SINGLE_AGENCY_CODE || '').trim().toUpperCase();
  return v || null;
}

export function isSingleAgency() {
  return !!singleAgencyCode();
}
