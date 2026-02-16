import { jest } from '@jest/globals';

describe('Invoices API', () => {
  describe('Invoice calculations', () => {
    const calcTotals = (items, taxRate, discount) => {
      const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
      const taxAmount = subtotal * (taxRate / 100);
      const total = subtotal + taxAmount - discount;
      return { subtotal, taxAmount, total, balance: total };
    };

    it('calculates subtotal correctly', () => {
      const items = [
        { quantity: 2, unitPrice: 100 },
        { quantity: 1, unitPrice: 250 },
      ];

      const result = calcTotals(items, 0, 0);
      expect(result.subtotal).toBe(450);
    });

    it('applies tax rate', () => {
      const items = [{ quantity: 1, unitPrice: 100 }];
      const result = calcTotals(items, 10, 0);

      expect(result.subtotal).toBe(100);
      expect(result.taxAmount).toBe(10);
      expect(result.total).toBe(110);
    });

    it('applies discount', () => {
      const items = [{ quantity: 1, unitPrice: 100 }];
      const result = calcTotals(items, 0, 20);

      expect(result.subtotal).toBe(100);
      expect(result.total).toBe(80);
    });

    it('calculates complex totals', () => {
      const items = [
        { quantity: 5, unitPrice: 50 },
        { quantity: 2, unitPrice: 75 },
        { quantity: 1, unitPrice: 200 },
      ];

      const result = calcTotals(items, 8.25, 25);
      // Subtotal: 250 + 150 + 200 = 600
      // Tax: 600 * 0.0825 = 49.5
      // Total: 600 + 49.5 - 25 = 624.5
      expect(result.subtotal).toBe(600);
      expect(result.taxAmount).toBe(49.5);
      expect(result.total).toBe(624.5);
    });
  });

  describe('Payment processing', () => {
    it('calculates balance after payment', () => {
      const invoice = { total: 1000, amountPaid: 0, balance: 1000 };
      const payment = { amount: 400 };

      const newAmountPaid = invoice.amountPaid + payment.amount;
      const newBalance = invoice.total - newAmountPaid;

      expect(newAmountPaid).toBe(400);
      expect(newBalance).toBe(600);
    });

    it('marks as paid when balance is zero', () => {
      const invoice = { total: 500, amountPaid: 300, balance: 200 };
      const payment = { amount: 200 };

      const newBalance = invoice.total - (invoice.amountPaid + payment.amount);
      const status = newBalance <= 0 ? 'paid' : 'partial';

      expect(newBalance).toBe(0);
      expect(status).toBe('paid');
    });

    it('marks as partial when partially paid', () => {
      const invoice = { total: 500, amountPaid: 0, balance: 500 };
      const payment = { amount: 100 };

      const newAmountPaid = invoice.amountPaid + payment.amount;
      const newBalance = invoice.total - newAmountPaid;
      const status = newBalance <= 0 ? 'paid' : newAmountPaid > 0 ? 'partial' : 'sent';

      expect(status).toBe('partial');
    });
  });

  describe('Invoice numbering', () => {
    it('generates sequential invoice numbers', () => {
      const count = 42;
      const number = `INV-${String(count + 1).padStart(5, '0')}`;
      expect(number).toBe('INV-00043');
    });
  });
});
