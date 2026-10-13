// Human-friendly names for role codes. "Operator" is presented everywhere as
// "Bus Owner / Association" so the account model matches how Sri Lankan bus
// owners and their associations are actually described.
export const ROLE_LABELS = {
  PASSENGER: 'Passenger',
  OPERATOR: 'Bus Owner / Association',
  DRIVER: 'Driver',
  CONDUCTOR: 'Conductor',
  ADMIN: 'Admin',
}

export function roleLabel(code) {
  if (!code) return ''
  return ROLE_LABELS[String(code).toUpperCase()] || code
}

export function rolesLabel(roles = []) {
  return (roles || []).map(roleLabel).join(' · ')
}
