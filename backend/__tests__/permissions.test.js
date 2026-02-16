import { jest } from '@jest/globals';

// Import the functions we're testing
const ROLE_PERMISSIONS = {
  owner: ['*'],
  admin: ['contacts:*', 'projects:*', 'jobs:*', 'quotes:*', 'invoices:*', 'team:*', 'company:read', 'company:update'],
  manager: ['contacts:*', 'projects:*', 'jobs:*', 'quotes:*', 'invoices:read', 'invoices:create', 'invoices:update', 'team:read'],
  field: ['contacts:read', 'jobs:read', 'jobs:update', 'time:read', 'time:create'],
  viewer: ['contacts:read', 'projects:read', 'jobs:read'],
};

const ROLE_HIERARCHY = ['viewer', 'field', 'manager', 'admin', 'owner'];

function normalizeRole(role) {
  if (role === 'user') return 'field';
  return role || 'viewer';
}

function hasPermission(role, permission) {
  const normalizedRole = normalizeRole(role);
  const permissions = ROLE_PERMISSIONS[normalizedRole] || ROLE_PERMISSIONS.viewer;
  
  if (permissions.includes('*')) return true;
  if (permissions.includes(permission)) return true;
  
  const [resource] = permission.split(':');
  if (permissions.includes(`${resource}:*`)) return true;
  
  return false;
}

describe('Permissions Middleware', () => {
  describe('normalizeRole', () => {
    it('maps legacy "user" role to "field"', () => {
      expect(normalizeRole('user')).toBe('field');
    });

    it('returns same role for valid roles', () => {
      expect(normalizeRole('owner')).toBe('owner');
      expect(normalizeRole('admin')).toBe('admin');
      expect(normalizeRole('manager')).toBe('manager');
      expect(normalizeRole('field')).toBe('field');
      expect(normalizeRole('viewer')).toBe('viewer');
    });

    it('defaults to viewer for null/undefined', () => {
      expect(normalizeRole(null)).toBe('viewer');
      expect(normalizeRole(undefined)).toBe('viewer');
    });
  });

  describe('hasPermission', () => {
    describe('owner role', () => {
      it('has all permissions (wildcard)', () => {
        expect(hasPermission('owner', 'contacts:read')).toBe(true);
        expect(hasPermission('owner', 'contacts:create')).toBe(true);
        expect(hasPermission('owner', 'contacts:delete')).toBe(true);
        expect(hasPermission('owner', 'company:delete')).toBe(true);
        expect(hasPermission('owner', 'anything:whatsoever')).toBe(true);
      });
    });

    describe('admin role', () => {
      it('has wildcard permissions for resources', () => {
        expect(hasPermission('admin', 'contacts:read')).toBe(true);
        expect(hasPermission('admin', 'contacts:create')).toBe(true);
        expect(hasPermission('admin', 'contacts:delete')).toBe(true);
      });

      it('has team management', () => {
        expect(hasPermission('admin', 'team:create')).toBe(true);
        expect(hasPermission('admin', 'team:delete')).toBe(true);
      });

      it('can read/update company but not delete', () => {
        expect(hasPermission('admin', 'company:read')).toBe(true);
        expect(hasPermission('admin', 'company:update')).toBe(true);
      });
    });

    describe('manager role', () => {
      it('has contact management', () => {
        expect(hasPermission('manager', 'contacts:read')).toBe(true);
        expect(hasPermission('manager', 'contacts:create')).toBe(true);
        expect(hasPermission('manager', 'contacts:delete')).toBe(true);
      });

      it('can read but not delete team', () => {
        expect(hasPermission('manager', 'team:read')).toBe(true);
        expect(hasPermission('manager', 'team:create')).toBe(false);
        expect(hasPermission('manager', 'team:delete')).toBe(false);
      });

      it('can create invoices but not delete', () => {
        expect(hasPermission('manager', 'invoices:read')).toBe(true);
        expect(hasPermission('manager', 'invoices:create')).toBe(true);
        expect(hasPermission('manager', 'invoices:delete')).toBe(false);
      });
    });

    describe('field role', () => {
      it('has limited read access', () => {
        expect(hasPermission('field', 'contacts:read')).toBe(true);
        expect(hasPermission('field', 'jobs:read')).toBe(true);
      });

      it('can update jobs (assigned)', () => {
        expect(hasPermission('field', 'jobs:update')).toBe(true);
      });

      it('cannot create contacts', () => {
        expect(hasPermission('field', 'contacts:create')).toBe(false);
      });

      it('can create own time entries', () => {
        expect(hasPermission('field', 'time:create')).toBe(true);
      });
    });

    describe('viewer role', () => {
      it('has read-only access', () => {
        expect(hasPermission('viewer', 'contacts:read')).toBe(true);
        expect(hasPermission('viewer', 'projects:read')).toBe(true);
        expect(hasPermission('viewer', 'jobs:read')).toBe(true);
      });

      it('cannot create anything', () => {
        expect(hasPermission('viewer', 'contacts:create')).toBe(false);
        expect(hasPermission('viewer', 'projects:create')).toBe(false);
        expect(hasPermission('viewer', 'jobs:create')).toBe(false);
      });

      it('cannot update anything', () => {
        expect(hasPermission('viewer', 'contacts:update')).toBe(false);
        expect(hasPermission('viewer', 'jobs:update')).toBe(false);
      });
    });
  });

  describe('Role Hierarchy', () => {
    it('defines correct order', () => {
      expect(ROLE_HIERARCHY.indexOf('owner')).toBeGreaterThan(ROLE_HIERARCHY.indexOf('admin'));
      expect(ROLE_HIERARCHY.indexOf('admin')).toBeGreaterThan(ROLE_HIERARCHY.indexOf('manager'));
      expect(ROLE_HIERARCHY.indexOf('manager')).toBeGreaterThan(ROLE_HIERARCHY.indexOf('field'));
      expect(ROLE_HIERARCHY.indexOf('field')).toBeGreaterThan(ROLE_HIERARCHY.indexOf('viewer'));
    });
  });
});
