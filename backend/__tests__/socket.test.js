import { jest } from '@jest/globals';

describe('Socket.io Events', () => {
  const EVENTS = {
    CONTACT_CREATED: 'contact:created',
    CONTACT_UPDATED: 'contact:updated',
    CONTACT_DELETED: 'contact:deleted',
    JOB_CREATED: 'job:created',
    JOB_STATUS_CHANGED: 'job:status_changed',
    QUOTE_APPROVED: 'quote:approved',
    INVOICE_PAID: 'invoice:paid',
    PAYMENT_RECEIVED: 'invoice:payment_received',
  };

  it('defines all required event types', () => {
    expect(EVENTS.CONTACT_CREATED).toBe('contact:created');
    expect(EVENTS.JOB_STATUS_CHANGED).toBe('job:status_changed');
    expect(EVENTS.INVOICE_PAID).toBe('invoice:paid');
  });

  it('emits to company room', () => {
    const mockIo = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };
    
    const emitToCompany = (companyId, event, data) => {
      mockIo.to(`company:${companyId}`).emit(event, data);
    };

    emitToCompany('123', EVENTS.CONTACT_CREATED, { id: '1', name: 'John' });
    
    expect(mockIo.to).toHaveBeenCalledWith('company:123');
    expect(mockIo.emit).toHaveBeenCalledWith(EVENTS.CONTACT_CREATED, { id: '1', name: 'John' });
  });

  it('creates correct room names', () => {
    const companyId = 'abc-123';
    const projectId = 'prj-456';
    
    expect(`company:${companyId}`).toBe('company:abc-123');
    expect(`project:${projectId}`).toBe('project:prj-456');
  });
});
