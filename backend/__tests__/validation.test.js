import { z } from 'zod';

// Import validation schemas (we'll test the patterns)
describe('Validation Schemas', () => {
  describe('Email schema', () => {
    const emailSchema = z.string().trim().toLowerCase().email();

    test('validates correct email', () => {
      expect(() => emailSchema.parse('test@example.com')).not.toThrow();
    });

    test('normalizes email to lowercase', () => {
      expect(emailSchema.parse('TEST@EXAMPLE.COM')).toBe('test@example.com');
    });

    test('trims whitespace', () => {
      expect(emailSchema.parse('  test@example.com  ')).toBe('test@example.com');
    });

    test('rejects invalid email', () => {
      expect(() => emailSchema.parse('notanemail')).toThrow();
    });
  });

  describe('Phone schema', () => {
    const phoneSchema = z.string().regex(/^[\d\s\-\+\(\)]+$/).optional().nullable();

    const validPhones = [
      '555-123-4567',
      '(555) 123-4567',
      '+1 555 123 4567',
      '5551234567',
    ];

    const invalidPhones = [
      'abc-def-ghij',
      '555.123.4567', // dots not allowed in this regex
    ];

    test.each(validPhones)('accepts valid phone: %s', (phone) => {
      expect(() => phoneSchema.parse(phone)).not.toThrow();
    });

    test.each(invalidPhones)('rejects invalid phone: %s', (phone) => {
      expect(() => phoneSchema.parse(phone)).toThrow();
    });

    test('accepts null', () => {
      expect(phoneSchema.parse(null)).toBeNull();
    });

    test('accepts undefined', () => {
      expect(phoneSchema.parse(undefined)).toBeUndefined();
    });
  });

  describe('Money schema', () => {
    const moneySchema = z.number().nonnegative().multipleOf(0.01);

    test('accepts valid money amounts', () => {
      expect(() => moneySchema.parse(100)).not.toThrow();
      expect(() => moneySchema.parse(100.50)).not.toThrow();
      expect(() => moneySchema.parse(0)).not.toThrow();
    });

    test('rejects negative amounts', () => {
      expect(() => moneySchema.parse(-100)).toThrow();
    });

    test('rejects invalid precision', () => {
      expect(() => moneySchema.parse(100.999)).toThrow();
    });
  });

  describe('Pagination schema', () => {
    const paginationSchema = z.object({
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().min(1).max(100).default(25),
    });

    test('uses defaults when not provided', () => {
      const result = paginationSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(25);
    });

    test('coerces string to number', () => {
      const result = paginationSchema.parse({ page: '2', limit: '50' });
      expect(result.page).toBe(2);
      expect(result.limit).toBe(50);
    });

    test('rejects invalid page', () => {
      expect(() => paginationSchema.parse({ page: 0 })).toThrow();
      expect(() => paginationSchema.parse({ page: -1 })).toThrow();
    });

    test('rejects limit over 100', () => {
      expect(() => paginationSchema.parse({ limit: 101 })).toThrow();
    });
  });

  describe('Contact schema', () => {
    const contactSchema = z.object({
      type: z.enum(['lead', 'client', 'subcontractor', 'vendor']),
      name: z.string().min(1).max(100).trim(),
      email: z.string().email().optional().nullable(),
    });

    test('validates complete contact', () => {
      const contact = {
        type: 'lead',
        name: 'John Doe',
        email: 'john@example.com',
      };
      expect(() => contactSchema.parse(contact)).not.toThrow();
    });

    test('requires name', () => {
      const contact = {
        type: 'lead',
        name: '',
      };
      expect(() => contactSchema.parse(contact)).toThrow();
    });

    test('validates contact type', () => {
      const contact = {
        type: 'invalid',
        name: 'John Doe',
      };
      expect(() => contactSchema.parse(contact)).toThrow();
    });

    test('allows optional email', () => {
      const contact = {
        type: 'client',
        name: 'John Doe',
      };
      expect(() => contactSchema.parse(contact)).not.toThrow();
    });
  });

  describe('Date validation', () => {
    const dateSchema = z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/));

    test('accepts ISO datetime', () => {
      expect(() => dateSchema.parse('2024-01-15T10:30:00Z')).not.toThrow();
    });

    test('accepts date string', () => {
      expect(() => dateSchema.parse('2024-01-15')).not.toThrow();
    });

    test('rejects invalid date format', () => {
      expect(() => dateSchema.parse('01/15/2024')).toThrow();
      expect(() => dateSchema.parse('2024-1-15')).toThrow();
    });
  });

  describe('Line item schema', () => {
    const lineItemSchema = z.object({
      description: z.string().min(1).max(500).trim(),
      quantity: z.number().positive().default(1),
      unitPrice: z.number().nonnegative().default(0),
    });

    test('validates line item', () => {
      const item = {
        description: 'Labor - 8 hours',
        quantity: 8,
        unitPrice: 75.00,
      };
      const result = lineItemSchema.parse(item);
      expect(result.description).toBe('Labor - 8 hours');
      expect(result.quantity).toBe(8);
      expect(result.unitPrice).toBe(75.00);
    });

    test('uses defaults', () => {
      const item = {
        description: 'Item',
      };
      const result = lineItemSchema.parse(item);
      expect(result.quantity).toBe(1);
      expect(result.unitPrice).toBe(0);
    });

    test('requires description', () => {
      const item = {
        description: '',
        quantity: 1,
      };
      expect(() => lineItemSchema.parse(item)).toThrow();
    });
  });
});

describe('Input sanitization', () => {
  const sanitize = (str) => {
    if (typeof str !== 'string') return str;
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/javascript:/gi, '')
      .trim();
  };

  test('removes script tags', () => {
    const input = 'Hello <script>alert("xss")</script> World';
    expect(sanitize(input)).toBe('Hello  World');
  });

  test('removes event handlers', () => {
    const input = '<img onerror="alert(1)" src="x">';
    expect(sanitize(input)).toBe('<img  src="x">');
  });

  test('removes javascript: protocol', () => {
    const input = '<a href="javascript:alert(1)">Click</a>';
    expect(sanitize(input)).toBe('<a href="alert(1)">Click</a>');
  });

  test('preserves normal text', () => {
    const input = 'Hello, World!';
    expect(sanitize(input)).toBe('Hello, World!');
  });

  test('trims whitespace', () => {
    const input = '  Hello  ';
    expect(sanitize(input)).toBe('Hello');
  });
});
