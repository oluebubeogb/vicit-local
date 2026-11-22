/**
 * v33: Vicit is a single-agency intranet product. The agency is ORGANIZATION_CODE
 * (SINGLE_AGENCY_CODE still overrides it if set). Creating agencies, shared sites and the
 * agency switcher on the login page are off; lists are scoped to this agency.
 */
export function singleAgencyCode(): string | null {
  const v = String(process.env.SINGLE_AGENCY_CODE || process.env.ORGANIZATION_CODE || '').trim().toUpperCase().slice(0, 16);
  return v || null;
}

export function isSingleAgency() {
  return !!singleAgencyCode();
}
