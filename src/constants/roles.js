export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  BRANCH_MANAGER: 'BRANCH_MANAGER',
  TELLER: 'TELLER',
  AUDITOR: 'AUDITOR',
  CUSTOMER: 'CUSTOMER',
};

export const ROLE_NAMES = {
  [ROLES.SUPER_ADMIN]: 'Super Administrator',
  [ROLES.ADMIN]: 'System Administrator',
  [ROLES.BRANCH_MANAGER]: 'Branch Manager',
  [ROLES.TELLER]: 'Teller / Cashier',
  [ROLES.AUDITOR]: 'Financial Auditor',
  [ROLES.CUSTOMER]: 'Member / Customer',
};

export default ROLES;
