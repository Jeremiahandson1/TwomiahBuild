import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create demo company
  const company = await prisma.company.create({
    data: {
      name: 'Demo Construction Co',
      slug: 'demo-construction',
      email: 'info@democonstruction.com',
      phone: '(555) 123-4567',
      address: '123 Builder Street',
      city: 'Construction City',
      state: 'CA',
      zip: '90210',
      primaryColor: '#ec7619',
      enabledFeatures: [
        'contacts', 'projects', 'jobs', 'quotes', 'invoices', 'scheduling',
        'team', 'time_tracking', 'expenses', 'rfis', 'change_orders',
        'punch_lists', 'daily_logs', 'inspections', 'bids', 'documents'
      ],
    },
  });

  // Create admin user
  const passwordHash = await bcrypt.hash('demo1234', 12);
  
  // Create owner (company creator)
  const owner = await prisma.user.create({
    data: {
      email: 'owner@democonstruction.com',
      passwordHash,
      firstName: 'Owner',
      lastName: 'Demo',
      phone: '(555) 111-1111',
      role: 'owner',
      companyId: company.id,
    },
  });

  // Create admin
  const admin = await prisma.user.create({
    data: {
      email: 'admin@democonstruction.com',
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      phone: '(555) 123-4567',
      role: 'admin',
      companyId: company.id,
    },
  });

  // Create manager
  const manager = await prisma.user.create({
    data: {
      email: 'manager@democonstruction.com',
      passwordHash,
      firstName: 'Manager',
      lastName: 'Smith',
      phone: '(555) 222-2222',
      role: 'manager',
      companyId: company.id,
    },
  });

  // Create field worker
  const fieldUser = await prisma.user.create({
    data: {
      email: 'field@democonstruction.com',
      passwordHash,
      firstName: 'Mike',
      lastName: 'Johnson',
      role: 'field',
      companyId: company.id,
    },
  });

  // Create viewer (read-only)
  const viewer = await prisma.user.create({
    data: {
      email: 'viewer@democonstruction.com',
      passwordHash,
      firstName: 'Viewer',
      lastName: 'ReadOnly',
      role: 'viewer',
      companyId: company.id,
    },
  });

  // Create contacts
  const contacts = await Promise.all([
    prisma.contact.create({ data: { type: 'client', name: 'John Smith', company: 'Smith Holdings', email: 'john@smithholdings.com', phone: '(555) 234-5678', address: '456 Client Ave', city: 'Los Angeles', state: 'CA', zip: '90001', companyId: company.id } }),
    prisma.contact.create({ data: { type: 'client', name: 'Sarah Johnson', email: 'sarah@email.com', phone: '(555) 345-6789', address: '789 Residential Blvd', city: 'Santa Monica', state: 'CA', zip: '90401', companyId: company.id } }),
    prisma.contact.create({ data: { type: 'lead', name: 'Mike Williams', company: 'Williams Corp', email: 'mike@williamscorp.com', phone: '(555) 456-7890', source: 'website', companyId: company.id } }),
    prisma.contact.create({ data: { type: 'subcontractor', name: 'ABC Plumbing', company: 'ABC Plumbing LLC', email: 'contact@abcplumbing.com', phone: '(555) 567-8901', companyId: company.id } }),
    prisma.contact.create({ data: { type: 'vendor', name: 'BuildMart Supply', company: 'BuildMart', email: 'orders@buildmart.com', phone: '(555) 678-9012', companyId: company.id } }),
  ]);

  // Create projects
  const projects = await Promise.all([
    prisma.project.create({ data: { number: 'PRJ-0001', name: 'Smith Office Renovation', description: 'Complete renovation of 3rd floor office space', status: 'active', type: 'commercial', address: '456 Client Ave', city: 'Los Angeles', state: 'CA', zip: '90001', startDate: new Date('2025-01-15'), endDate: new Date('2025-06-30'), estimatedValue: 450000, budget: 425000, progress: 35, contactId: contacts[0].id, companyId: company.id } }),
    prisma.project.create({ data: { number: 'PRJ-0002', name: 'Johnson Residence Remodel', description: 'Kitchen and bathroom remodel', status: 'active', type: 'residential', address: '789 Residential Blvd', city: 'Santa Monica', state: 'CA', zip: '90401', startDate: new Date('2025-02-01'), estimatedValue: 85000, budget: 80000, progress: 20, contactId: contacts[1].id, companyId: company.id } }),
    prisma.project.create({ data: { number: 'PRJ-0003', name: 'New Warehouse Build', description: 'Ground-up warehouse construction', status: 'planning', type: 'commercial', estimatedValue: 2500000, contactId: contacts[2].id, companyId: company.id } }),
  ]);

  // Create jobs
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(); nextWeek.setDate(nextWeek.getDate() + 7);
  
  await Promise.all([
    prisma.job.create({ data: { number: 'JOB-00001', title: 'Demolition - Phase 1', description: 'Remove existing walls and fixtures', status: 'completed', priority: 'high', scheduledDate: new Date('2025-01-20'), estimatedHours: 16, actualHours: 18, projectId: projects[0].id, contactId: contacts[0].id, assignedToId: fieldUser.id, companyId: company.id, completedAt: new Date('2025-01-21') } }),
    prisma.job.create({ data: { number: 'JOB-00002', title: 'Electrical Rough-In', description: 'Install electrical wiring and boxes', status: 'in_progress', priority: 'normal', scheduledDate: new Date(), estimatedHours: 24, projectId: projects[0].id, contactId: contacts[0].id, assignedToId: fieldUser.id, companyId: company.id } }),
    prisma.job.create({ data: { number: 'JOB-00003', title: 'Plumbing Rough-In', description: 'Install plumbing lines', status: 'scheduled', priority: 'normal', scheduledDate: tomorrow, estimatedHours: 16, projectId: projects[0].id, contactId: contacts[0].id, companyId: company.id } }),
    prisma.job.create({ data: { number: 'JOB-00004', title: 'Kitchen Cabinet Install', description: 'Install new kitchen cabinets', status: 'scheduled', priority: 'normal', scheduledDate: nextWeek, estimatedHours: 8, projectId: projects[1].id, contactId: contacts[1].id, assignedToId: fieldUser.id, companyId: company.id } }),
    prisma.job.create({ data: { number: 'JOB-00005', title: 'Site Survey', description: 'Initial site survey and measurements', status: 'scheduled', priority: 'high', scheduledDate: nextWeek, estimatedHours: 4, projectId: projects[2].id, contactId: contacts[2].id, companyId: company.id } }),
  ]);

  // Create quotes
  const quote1 = await prisma.quote.create({
    data: {
      number: 'QT-00001',
      name: 'Smith Office Renovation',
      status: 'approved',
      issueDate: new Date('2025-01-10'),
      expiryDate: new Date('2025-02-10'),
      subtotal: 425000,
      taxRate: 8.25,
      taxAmount: 35062.50,
      total: 460062.50,
      notes: 'Price includes all materials and labor',
      contactId: contacts[0].id,
      projectId: projects[0].id,
      companyId: company.id,
      approvedAt: new Date('2025-01-12'),
      lineItems: {
        create: [
          { description: 'Demolition and Removal', quantity: 1, unitPrice: 25000, total: 25000, sortOrder: 0 },
          { description: 'Framing and Drywall', quantity: 1, unitPrice: 85000, total: 85000, sortOrder: 1 },
          { description: 'Electrical Work', quantity: 1, unitPrice: 65000, total: 65000, sortOrder: 2 },
          { description: 'Plumbing', quantity: 1, unitPrice: 45000, total: 45000, sortOrder: 3 },
          { description: 'HVAC', quantity: 1, unitPrice: 75000, total: 75000, sortOrder: 4 },
          { description: 'Finishes and Fixtures', quantity: 1, unitPrice: 130000, total: 130000, sortOrder: 5 },
        ]
      }
    }
  });

  const quote2 = await prisma.quote.create({
    data: {
      number: 'QT-00002',
      name: 'Johnson Kitchen & Bath Remodel',
      status: 'sent',
      issueDate: new Date('2025-01-25'),
      expiryDate: new Date('2025-02-25'),
      subtotal: 80000,
      taxRate: 8.25,
      taxAmount: 6600,
      total: 86600,
      contactId: contacts[1].id,
      projectId: projects[1].id,
      companyId: company.id,
      sentAt: new Date('2025-01-26'),
      lineItems: {
        create: [
          { description: 'Kitchen Cabinets', quantity: 1, unitPrice: 25000, total: 25000, sortOrder: 0 },
          { description: 'Countertops', quantity: 1, unitPrice: 12000, total: 12000, sortOrder: 1 },
          { description: 'Appliances', quantity: 1, unitPrice: 15000, total: 15000, sortOrder: 2 },
          { description: 'Bathroom Renovation', quantity: 1, unitPrice: 18000, total: 18000, sortOrder: 3 },
          { description: 'Labor', quantity: 1, unitPrice: 10000, total: 10000, sortOrder: 4 },
        ]
      }
    }
  });

  // Create invoices
  await prisma.invoice.create({
    data: {
      number: 'INV-00001',
      status: 'partial',
      issueDate: new Date('2025-01-15'),
      dueDate: new Date('2025-02-15'),
      subtotal: 115000,
      taxRate: 8.25,
      taxAmount: 9487.50,
      total: 124487.50,
      amountPaid: 50000,
      notes: 'First progress payment - 25%',
      contactId: contacts[0].id,
      projectId: projects[0].id,
      companyId: company.id,
      lineItems: {
        create: [
          { description: 'Demolition Complete', quantity: 1, unitPrice: 25000, total: 25000, sortOrder: 0 },
          { description: 'Framing - 50%', quantity: 1, unitPrice: 42500, total: 42500, sortOrder: 1 },
          { description: 'Materials Deposit', quantity: 1, unitPrice: 47500, total: 47500, sortOrder: 2 },
        ]
      },
      payments: {
        create: [
          { amount: 50000, method: 'check', reference: 'Check #1234', paidAt: new Date('2025-01-20') }
        ]
      }
    }
  });

  // Create RFIs
  await prisma.rFI.create({ data: { number: 'RFI-001', subject: 'Electrical Panel Location', question: 'Please confirm the exact location for the new 200A electrical panel. Drawing shows two possible locations.', status: 'open', priority: 'high', dueDate: new Date('2025-02-15'), projectId: projects[0].id, companyId: company.id } });
  await prisma.rFI.create({ data: { number: 'RFI-002', subject: 'Window Specifications', question: 'Please provide specifications for the conference room windows. Energy rating requirements?', status: 'answered', priority: 'normal', response: 'Use Anderson 400 Series, minimum U-factor 0.27', respondedAt: new Date('2025-01-28'), projectId: projects[0].id, companyId: company.id } });

  // Create change orders
  await prisma.changeOrder.create({
    data: {
      number: 'CO-001',
      title: 'Additional Electrical Outlets',
      description: 'Client requested 12 additional outlets in conference rooms',
      status: 'approved',
      reason: 'owner_request',
      amount: 3600,
      daysAdded: 2,
      projectId: projects[0].id,
      companyId: company.id,
      approvedDate: new Date('2025-01-25'),
      approvedBy: 'John Smith',
      lineItems: {
        create: [
          { description: 'Electrical outlets (12)', quantity: 12, unitPrice: 200, total: 2400, sortOrder: 0 },
          { description: 'Labor', quantity: 8, unitPrice: 150, total: 1200, sortOrder: 1 },
        ]
      }
    }
  });

  // Create punch list items
  await prisma.punchListItem.create({ data: { number: 'PL-001', description: 'Touch up paint in conference room A', location: 'Conference Room A', status: 'open', priority: 'normal', projectId: projects[0].id, companyId: company.id } });
  await prisma.punchListItem.create({ data: { number: 'PL-002', description: 'Adjust door closer tension', location: 'Main entrance', status: 'completed', priority: 'low', completedAt: new Date('2025-01-30'), projectId: projects[0].id, companyId: company.id } });

  // Create team members
  await prisma.teamMember.create({ data: { name: 'Mike Johnson', email: 'mike@democonstruction.com', phone: '(555) 111-2222', role: 'Foreman', department: 'Field', hourlyRate: 45, skills: ['Framing', 'Drywall', 'Project Management'], companyId: company.id } });
  await prisma.teamMember.create({ data: { name: 'Sarah Lee', email: 'sarah.lee@democonstruction.com', phone: '(555) 222-3333', role: 'Electrician', department: 'Field', hourlyRate: 55, skills: ['Electrical', 'Low Voltage', 'Solar'], companyId: company.id } });
  await prisma.teamMember.create({ data: { name: 'Tom Garcia', email: 'tom@democonstruction.com', phone: '(555) 333-4444', role: 'Laborer', department: 'Field', hourlyRate: 25, skills: ['General Labor', 'Demolition'], companyId: company.id } });

  // Create bids
  await prisma.bid.create({ data: { number: 'BID-0001', projectName: 'City Library Expansion', client: 'City of Construction City', status: 'submitted', bidType: 'lump_sum', dueDate: new Date('2025-03-01'), estimatedValue: 1200000, bidAmount: 1150000, bondRequired: true, scope: '15,000 sq ft addition to existing library', companyId: company.id, submittedAt: new Date('2025-02-15') } });
  await prisma.bid.create({ data: { number: 'BID-0002', projectName: 'Restaurant Build-Out', client: 'Good Eats LLC', status: 'draft', bidType: 'lump_sum', dueDate: new Date('2025-03-15'), estimatedValue: 350000, scope: 'Complete restaurant build-out in existing shell', companyId: company.id } });

  // Create time entries
  await prisma.timeEntry.create({ data: { date: new Date('2025-01-28'), hours: 8, hourlyRate: 45, description: 'Framing work - west wall', billable: true, approved: true, userId: fieldUser.id, projectId: projects[0].id, companyId: company.id } });
  await prisma.timeEntry.create({ data: { date: new Date('2025-01-29'), hours: 8, hourlyRate: 45, description: 'Framing work - east wall', billable: true, approved: true, userId: fieldUser.id, projectId: projects[0].id, companyId: company.id } });
  await prisma.timeEntry.create({ data: { date: new Date('2025-01-30'), hours: 6, hourlyRate: 45, description: 'Drywall installation', billable: true, approved: false, userId: fieldUser.id, projectId: projects[0].id, companyId: company.id } });

  // Create expenses
  await prisma.expense.create({ data: { date: new Date('2025-01-25'), category: 'materials', vendor: 'BuildMart Supply', description: 'Lumber and framing materials', amount: 4500, billable: true, projectId: projects[0].id, companyId: company.id } });
  await prisma.expense.create({ data: { date: new Date('2025-01-27'), category: 'equipment', vendor: 'Tool Rental Co', description: 'Scaffolding rental - 1 week', amount: 350, billable: true, projectId: projects[0].id, companyId: company.id } });

  // Create daily logs
  await prisma.dailyLog.create({ data: { date: new Date('2025-01-29'), weather: 'Sunny', temperature: 72, conditions: 'sunny', crewSize: 4, hoursWorked: 32, workPerformed: 'Completed framing for east wall. Started electrical rough-in.', materials: 'Used 24 sheets drywall, 50 2x4s', equipment: 'Scaffolding, nail guns, saws', delays: 'None', safetyNotes: 'All crew wore PPE. No incidents.', projectId: projects[0].id, userId: admin.id, companyId: company.id } });

  console.log('✓ Database seeded successfully!');
  console.log('\nDemo login credentials:');
  console.log('  Email: admin@democonstruction.com');
  console.log('  Password: demo1234');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
