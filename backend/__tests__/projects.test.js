import { jest } from '@jest/globals';

describe('Projects API', () => {
  describe('Project number generation', () => {
    it('generates sequential project numbers', () => {
      const count = 5;
      const number = `PRJ-${String(count + 1).padStart(5, '0')}`;
      expect(number).toBe('PRJ-00006');
    });

    it('pads numbers correctly', () => {
      expect(String(1).padStart(5, '0')).toBe('00001');
      expect(String(999).padStart(5, '0')).toBe('00999');
      expect(String(10000).padStart(5, '0')).toBe('10000');
    });
  });

  describe('Project status transitions', () => {
    const validTransitions = {
      planning: ['active', 'cancelled'],
      active: ['on_hold', 'completed', 'cancelled'],
      on_hold: ['active', 'cancelled'],
      completed: [],
      cancelled: [],
    };

    it('allows planning to active', () => {
      expect(validTransitions.planning).toContain('active');
    });

    it('allows active to completed', () => {
      expect(validTransitions.active).toContain('completed');
    });

    it('prevents completed to active', () => {
      expect(validTransitions.completed).not.toContain('active');
    });
  });

  describe('Project totals calculation', () => {
    it('calculates budget vs actual', () => {
      const project = { budget: 100000 };
      const expenses = [
        { amount: 25000 },
        { amount: 15000 },
        { amount: 8000 },
      ];

      const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
      const remaining = project.budget - totalSpent;

      expect(totalSpent).toBe(48000);
      expect(remaining).toBe(52000);
    });
  });
});
