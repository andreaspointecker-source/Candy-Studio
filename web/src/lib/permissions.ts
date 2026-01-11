/**
 * Permissions-System
 * 
 * Stellt ein RBAC (Role-Based Access Control) System bereit
 * für Zugriffskontrolle auf Ressourcen
 */

export enum Permission {
  WORKFLOW_READ = "workflow:read",
  WORKFLOW_WRITE = "workflow:write",
  WORKFLOW_DELETE = "workflow:delete",
  WORKFLOW_EXECUTE = "workflow:execute",
  TASK_READ = "task:read",
  TASK_WRITE = "task:write",
  TASK_DELETE = "task:delete",
  TASK_EXECUTE = "task:execute",
  AGENT_READ = "agent:read",
  AGENT_WRITE = "agent:write",
  AGENT_DELETE = "agent:delete",
  PROJECT_READ = "project:read",
  PROJECT_WRITE = "project:write",
  PROJECT_DELETE = "project:delete",
  PROJECT_ADMIN = "project:admin",
}

export enum Role {
  ADMIN = "admin",
  OWNER = "owner",
  EDITOR = "editor",
  VIEWER = "viewer",
  GUEST = "guest",
}

export type PermissionType = Permission;

export interface Resource {
  type: "workflow" | "task" | "agent" | "project";
  id: string;
  ownerId?: string;
}

export interface RoleDefinition {
  name: string;
  permissions: PermissionType[];
}

export interface AccessResult {
  granted: boolean;
  reason?: string;
}

export class PermissionManager {
  private roles: Map<string, RoleDefinition> = new Map();
  private userRoles: Map<string, string> = new Map();
  private resourceOwners: Map<string, string> = new Map();

  constructor() {
    this.initializeDefaultRoles();
  }

  private initializeDefaultRoles(): void {
    const allPermissions: PermissionType[] = Object.values(Permission);

    this.roles.set(Role.ADMIN, {
      name: Role.ADMIN,
      permissions: allPermissions,
    });

    this.roles.set(Role.OWNER, {
      name: Role.OWNER,
      permissions: allPermissions,
    });

    this.roles.set(Role.EDITOR, {
      name: Role.EDITOR,
      permissions: [
        Permission.WORKFLOW_READ,
        Permission.WORKFLOW_WRITE,
        Permission.WORKFLOW_EXECUTE,
        Permission.TASK_READ,
        Permission.TASK_WRITE,
        Permission.TASK_EXECUTE,
        Permission.AGENT_READ,
        Permission.AGENT_WRITE,
        Permission.PROJECT_READ,
        Permission.PROJECT_WRITE,
      ],
    });

    this.roles.set(Role.VIEWER, {
      name: Role.VIEWER,
      permissions: [
        Permission.WORKFLOW_READ,
        Permission.TASK_READ,
        Permission.AGENT_READ,
        Permission.PROJECT_READ,
      ],
    });

    this.roles.set(Role.GUEST, {
      name: Role.GUEST,
      permissions: [
        Permission.WORKFLOW_READ,
        Permission.PROJECT_READ,
      ],
    });
  }

  defineRole(name: string, permissions: PermissionType[]): void {
    this.roles.set(name, { name, permissions });
  }

  setUserRole(userId: string, role: string): void {
    this.userRoles.set(userId, role);
  }

  removeUserRole(userId: string): void {
    this.userRoles.delete(userId);
  }

  setResourceOwner(resourceId: string, userId: string): void {
    this.resourceOwners.set(resourceId, userId);
  }

  removeResourceOwner(resourceId: string): void {
    this.resourceOwners.delete(resourceId);
  }

  checkAccess(userId: string, resource: Resource, permission: Permission): AccessResult {
    const userRole = this.userRoles.get(userId) || Role.GUEST;
    const roleDefinition = this.roles.get(userRole);

    if (!roleDefinition) {
      return {
        granted: false,
        reason: `Role ${userRole} not found`,
      };
    }

    if (resource.ownerId && resource.ownerId === userId) {
      return {
        granted: true,
      reason: "User is resource owner",
      };
    }

    if (!roleDefinition.permissions.includes(permission)) {
      return {
        granted: false,
        reason: `Role ${userRole} does not have permission ${permission}`,
      };
    }

    return {
      granted: true,
    };
  }

  hasPermission(userId: string, permission: Permission): boolean {
    const userRole = this.userRoles.get(userId) || Role.GUEST;
    const roleDefinition = this.roles.get(userRole);

    if (!roleDefinition) return false;
    return roleDefinition.permissions.includes(permission);
  }

  hasPermissions(userId: string, permissions: Permission[], requireAll: boolean = true): boolean {
    const userRole = this.userRoles.get(userId) || Role.GUEST;
    const roleDefinition = this.roles.get(userRole);

    if (!roleDefinition) return false;

    return requireAll
      ? permissions.every((p) => this.hasPermission(userId, p))
      : permissions.some((p) => this.hasPermission(userId, p));
  }

  getRolePermissions(role: string): PermissionType[] {
    const roleDefinition = this.roles.get(role);
    return roleDefinition?.permissions || [];
  }

  getAllRoles(): RoleDefinition[] {
    return Array.from(this.roles.values());
  }

  getAllUserRoles(): Map<string, string> {
    return new Map(this.userRoles);
  }

  hasRole(userId: string, role: string): boolean {
    return this.userRoles.get(userId) === role;
  }

  isAdmin(userId: string): boolean {
    return this.hasRole(userId, Role.ADMIN);
  }

  clearRoles(): void {
    this.roles.clear();
    this.initializeDefaultRoles();
  }

  clearUserRoles(): void {
    this.userRoles.clear();
  }

  clearResourceOwners(): void {
    this.resourceOwners.clear();
  }

  getStats(): {
    totalRoles: number;
    totalUsers: number;
    totalResources: number;
    usersByRole: Record<string, number>;
  } {
    const usersByRole: Record<string, number> = {};

    for (const role of this.userRoles.values()) {
      usersByRole[role] = (usersByRole[role] || 0) + 1;
    }

    return {
      totalRoles: this.roles.size,
      totalUsers: this.userRoles.size,
      totalResources: this.resourceOwners.size,
      usersByRole,
    };
  }
}

let instance: PermissionManager | null = null;

export function getPermissionManager(): PermissionManager {
  if (!instance) {
    instance = new PermissionManager();
  }
  return instance;
}
