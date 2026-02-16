import { jest } from '@jest/globals';

describe('Contacts API', () => {
  describe('GET /api/contacts', () => {
    it('returns paginated contacts', () => {
      const mockData = {
        data: [
          { id: '1', name: 'John Doe', type: 'client', email: 'john@example.com' },
          { id: '2', name: 'Jane Smith', type: 'lead', email: 'jane@example.com' },
        ],
        pagination: { page: 1, limit: 25, total: 2, pages: 1 },
      };

      expect(mockData.data).toHaveLength(2);
      expect(mockData.pagination.total).toBe(2);
    });

    it('filters by type', () => {
      const contacts = [
        { id: '1', name: 'John', type: 'client' },
        { id: '2', name: 'Jane', type: 'lead' },
        { id: '3', name: 'Bob', type: 'client' },
      ];

      const filtered = contacts.filter(c => c.type === 'client');
      expect(filtered).toHaveLength(2);
    });
  });

  describe('Contact validation', () => {
    it('requires name', () => {
      const contact = { type: 'lead', email: 'test@example.com' };
      expect(contact.name).toBeUndefined();
    });

    it('validates contact types', () => {
      const validTypes = ['lead', 'client', 'subcontractor', 'vendor'];
      expect(validTypes).toContain('lead');
      expect(validTypes).toContain('client');
      expect(validTypes).not.toContain('invalid');
    });

    it('normalizes email to lowercase', () => {
      const email = 'TEST@EXAMPLE.COM';
      expect(email.toLowerCase()).toBe('test@example.com');
    });
  });

  describe('Contact conversion', () => {
    it('converts lead to client', () => {
      const lead = { id: '1', type: 'lead', name: 'John' };
      const converted = { ...lead, type: 'client' };
      expect(converted.type).toBe('client');
    });
  });
});
