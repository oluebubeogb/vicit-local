/** Display labels. */
export const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Agency Admin',
  STAFF: 'Staff',
  GATE: 'Gate Officer',
};

export function roleLabel(role?: string | null): string {
  if (!role) return 'Unknown';
  return ROLE_LABEL[role] || String(role).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function isPlatformAdmin(role?: string | null) {
  return role === 'SUPER_ADMIN';
}

export function isGateRole(role?: string | null) {
  return role === 'GATE';
}

export function canInviteGuests(role?: string | null) {
  return ['SUPER_ADMIN', 'ADMIN', 'STAFF', 'GATE'].includes(String(role || ''));
}
