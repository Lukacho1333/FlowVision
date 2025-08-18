import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { prisma } from './prisma';

export type Role = 'ADMIN' | 'LEADER' | 'VIEWER';
export type Permission =
  | 'manage_users'
  | 'view_all_initiatives'
  | 'delete_initiatives'
  | 'manage_teams'
  | 'view_audit_logs'
  | 'export_data'
  | 'system_settings';

// Define role permissions
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: [
    'manage_users',
    'view_all_initiatives',
    'delete_initiatives',
    'manage_teams',
    'view_audit_logs',
    'export_data',
    'system_settings',
  ],
  LEADER: ['view_all_initiatives', 'export_data'],
  VIEWER: [], // Viewers have minimal permissions by default
};

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  return user;
}

export async function hasPermission(permission: Permission): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  const userPermissions = ROLE_PERMISSIONS[user.role] || [];
  return userPermissions.includes(permission);
}

export async function requirePermission(permission: Permission) {
  const hasAccess = await hasPermission(permission);
  if (!hasAccess) {
    throw new Error(`Access denied: Missing permission '${permission}'`);
  }
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    throw new Error('Admin access required');
  }
  return user;
}

export function getPermissionsForRole(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

// Client-side permission checking
export function usePermissions() {
  return {
    hasPermission: (permission: Permission, userRole?: Role) => {
      if (!userRole) return false;
      const permissions = ROLE_PERMISSIONS[userRole] || [];
      return permissions.includes(permission);
    },
    isAdmin: (userRole?: Role) => userRole === 'ADMIN',
    isLeader: (userRole?: Role) => userRole === 'LEADER',
  };
}
