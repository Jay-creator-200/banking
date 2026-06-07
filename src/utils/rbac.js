/**
 * Core RBAC Engine helper utilities.
 * Used to protect frontend components/menus/buttons and backend endpoints.
 */

/**
 * Check if the user session matches one of the allowed role codes.
 *
 * @param {Object} session - NextAuth session object.
 * @param {string|Array<string>} roles - Role code or array of role codes (e.g., 'SUPER_ADMIN', 'CASHIER').
 * @returns {boolean}
 */
export function hasRole(session, roles) {
  if (!session?.user?.roleCode) return false;
  const allowed = Array.isArray(roles) ? roles : [roles];
  return allowed.map(r => r.toUpperCase()).includes(session.user.roleCode.toUpperCase());
}

/**
 * Check if the user session has a specific permission code assigned.
 * Super Admin bypasses all checks automatically.
 *
 * @param {Object} session - NextAuth session object.
 * @param {string} permission - Permission code (e.g., 'user.create').
 * @returns {boolean}
 */
export function hasPermission(session, permission) {
  if (!session?.user) return false;
  if (session.user.roleCode === 'SUPER_ADMIN') return true;
  if (!session.user.permissions) return false;
  return session.user.permissions.map(p => p.toLowerCase()).includes(permission.toLowerCase());
}

/**
 * Check access rights against multiple permissions.
 * Super Admin bypasses all checks automatically.
 *
 * @param {Object} session - NextAuth session object.
 * @param {Array<string>} permissions - List of permission codes.
 * @param {'AND'|'OR'} [logicalOperator='AND'] - Evaluation rule.
 * @returns {boolean}
 */
export function canAccess(session, permissions, logicalOperator = 'AND') {
  if (!session?.user) return false;
  if (session.user.roleCode === 'SUPER_ADMIN') return true;
  if (!session.user.permissions || !permissions || permissions.length === 0) return false;

  const userPermissions = session.user.permissions.map(p => p.toLowerCase());
  const check = (perm) => userPermissions.includes(perm.toLowerCase());

  if (logicalOperator.toUpperCase() === 'OR') {
    return permissions.some(check);
  }
  return permissions.every(check);
}
