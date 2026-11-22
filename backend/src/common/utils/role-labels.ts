/** User-facing role labels. */
export const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Agency Admin',
  STAFF: 'Staff',
  GATE: 'Gate Officer',
};

export function roleLabel(role?: string | null): string {
  if (!role) return 'Unknown';
  return ROLE_LABEL[role] || role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
