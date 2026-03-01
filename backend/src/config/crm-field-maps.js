/**
 * FACTORY MIGRATION - CRM Field Maps
 * Defines how each source CRM's export columns map to the Factory canonical schema.
 * 
 * Structure:
 *   canonical field name → array of possible source column names (case-insensitive)
 * 
 * Adding a new CRM: duplicate an existing block, update the source column names.
 */

// ─────────────────────────────────────────────
// CANONICAL SCHEMA
// These are the field names used internally by all Factory templates.
// ─────────────────────────────────────────────
export const CANONICAL_FIELDS = {
  // CONTACTS
  contacts: [
    'first_name',        // required
    'last_name',         // required
    'email',
    'phone',
    'address_street',
    'address_city',
    'address_state',
    'address_zip',
    'company',
    'type',              // lead | client | contact
    'status',
    'notes',
    'created_at',
    'tags',
  ],

  // JOBS / PROJECTS
  jobs: [
    'title',             // required
    'contact_email',     // FK → contacts.email
    'contact_name',      // fallback if no email
    'status',            // lead | active | completed | cancelled
    'type',              // service category
    'description',
    'start_date',
    'end_date',
    'value',             // total job value $
    'address_street',
    'address_city',
    'address_state',
    'address_zip',
    'notes',
    'created_at',
  ],

  // INVOICES
  invoices: [
    'invoice_number',
    'contact_email',
    'job_title',
    'amount',            // required
    'paid_amount',
    'status',            // draft | sent | paid | overdue
    'issue_date',
    'due_date',
    'paid_date',
    'notes',
  ],
};

// ─────────────────────────────────────────────
// JOBBER
// Export path: Jobber > Reports > Export
// ─────────────────────────────────────────────
export const JOBBER = {
  name: 'Jobber',
  logo: '/logos/jobber.svg',
  hasApi: true,
  apiAuthType: 'oauth2',
  exportInstructions: 'In Jobber, go to Reports → choose Clients, Jobs, or Invoices → Export to CSV.',
  entities: {
    contacts: {
      'first_name':     ['First Name', 'first_name', 'Client First Name'],
      'last_name':      ['Last Name', 'last_name', 'Client Last Name'],
      'email':          ['Email', 'Email Address', 'client_email'],
      'phone':          ['Phone', 'Phone Number', 'Mobile'],
      'address_street': ['Street', 'Address', 'Address Line 1'],
      'address_city':   ['City'],
      'address_state':  ['Province', 'State'],
      'address_zip':    ['Postal Code', 'Zip', 'Zip Code'],
      'company':        ['Company', 'Company Name'],
      'notes':          ['Notes', 'Client Notes'],
      'created_at':     ['Created At', 'Date Created'],
      'tags':           ['Tags', 'Labels'],
    },
    jobs: {
      'title':          ['Job Title', 'Title', 'Job'],
      'contact_email':  ['Client Email', 'Email'],
      'contact_name':   ['Client Name', 'Client'],
      'status':         ['Status', 'Job Status'],
      'type':           ['Job Type', 'Type', 'Work Type'],
      'description':    ['Job Description', 'Description', 'Instructions'],
      'start_date':     ['Start Date', 'Scheduled Start'],
      'end_date':       ['End Date', 'Scheduled End', 'Completion Date'],
      'value':          ['Job Total', 'Total', 'Amount'],
      'address_street': ['Property Street', 'Service Address'],
      'address_city':   ['Property City'],
      'address_state':  ['Property Province', 'Property State'],
      'address_zip':    ['Property Postal Code', 'Property Zip'],
      'notes':          ['Notes', 'Job Notes'],
      'created_at':     ['Created At'],
    },
    invoices: {
      'invoice_number': ['Invoice #', 'Invoice Number'],
      'contact_email':  ['Client Email', 'Email'],
      'job_title':      ['Job Title', 'Subject'],
      'amount':         ['Invoice Total', 'Total', 'Amount'],
      'paid_amount':    ['Amount Paid', 'Paid Amount'],
      'status':         ['Status', 'Invoice Status'],
      'issue_date':     ['Invoice Date', 'Issue Date', 'Date'],
      'due_date':       ['Due Date'],
      'paid_date':      ['Paid Date', 'Payment Date'],
      'notes':          ['Notes', 'Invoice Notes'],
    },
  },
};

// ─────────────────────────────────────────────
// BUILDERTREND
// Export path: Reports → Custom Report → Export
// ─────────────────────────────────────────────
export const BUILDERTREND = {
  name: 'BuilderTrend',
  logo: '/logos/buildertrend.svg',
  hasApi: true,
  apiAuthType: 'oauth2',
  exportInstructions: 'In BuilderTrend, go to Reports → Custom Reports. Create a report for Leads/Contacts, Jobs, or Invoices → Export.',
  entities: {
    contacts: {
      'first_name':     ['First Name', 'Owner First Name'],
      'last_name':      ['Last Name', 'Owner Last Name'],
      'email':          ['Email', 'Owner Email'],
      'phone':          ['Phone', 'Cell Phone', 'Home Phone'],
      'address_street': ['Address', 'Street Address'],
      'address_city':   ['City'],
      'address_state':  ['State'],
      'address_zip':    ['Zip', 'Zip Code', 'Postal Code'],
      'company':        ['Business Name', 'Company'],
      'status':         ['Lead Status', 'Status'],
      'notes':          ['Notes', 'Lead Notes'],
      'created_at':     ['Date Created', 'Created'],
    },
    jobs: {
      'title':          ['Job Name', 'Project Name', 'Name'],
      'contact_email':  ['Owner Email', 'Customer Email'],
      'contact_name':   ['Owner Name', 'Customer Name'],
      'status':         ['Job Status', 'Status'],
      'type':           ['Job Type', 'Project Type'],
      'description':    ['Description', 'Scope'],
      'start_date':     ['Start Date', 'Project Start'],
      'end_date':       ['Completion Date', 'End Date', 'Project End'],
      'value':          ['Contract Amount', 'Job Value', 'Total Amount'],
      'address_street': ['Job Address', 'Project Address', 'Street'],
      'address_city':   ['City', 'Job City'],
      'address_state':  ['State', 'Job State'],
      'address_zip':    ['Zip', 'Job Zip'],
      'notes':          ['Notes', 'Description'],
      'created_at':     ['Date Created'],
    },
    invoices: {
      'invoice_number': ['Invoice Number', 'Invoice #', 'Bill Number'],
      'contact_email':  ['Owner Email', 'Customer Email'],
      'job_title':      ['Job Name', 'Project Name'],
      'amount':         ['Amount', 'Invoice Amount', 'Total'],
      'paid_amount':    ['Amount Paid', 'Paid'],
      'status':         ['Status', 'Invoice Status'],
      'issue_date':     ['Invoice Date', 'Date'],
      'due_date':       ['Due Date'],
      'paid_date':      ['Date Paid', 'Payment Date'],
      'notes':          ['Notes'],
    },
  },
};

// ─────────────────────────────────────────────
// JOBNIMBUS
// ─────────────────────────────────────────────
export const JOBNIMBUS = {
  name: 'JobNimbus',
  logo: '/logos/jobnimbus.svg',
  hasApi: true,
  apiAuthType: 'apikey',
  exportInstructions: 'In JobNimbus, go to Reports → Export. Export Contacts, Jobs, and Tasks separately.',
  entities: {
    contacts: {
      'first_name':     ['First Name'],
      'last_name':      ['Last Name'],
      'email':          ['Email'],
      'phone':          ['Phone', 'Mobile Phone', 'Home Phone'],
      'address_street': ['Address Line 1', 'Street'],
      'address_city':   ['City'],
      'address_state':  ['State'],
      'address_zip':    ['Zip Code', 'Postal Code'],
      'company':        ['Company'],
      'status':         ['Status'],
      'type':           ['Type', 'Record Type'],
      'notes':          ['Description', 'Notes'],
      'created_at':     ['Date Created'],
      'tags':           ['Tags'],
    },
    jobs: {
      'title':          ['Name', 'Job Name'],
      'contact_email':  ['Contact Email', 'Customer Email'],
      'contact_name':   ['Contact Name', 'Customer'],
      'status':         ['Status'],
      'type':           ['Type', 'Job Type'],
      'description':    ['Description'],
      'start_date':     ['Date Start', 'Start Date'],
      'end_date':       ['Date End', 'End Date'],
      'value':          ['Amount Invoiced', 'Revenue', 'Value'],
      'address_street': ['Address'],
      'address_city':   ['City'],
      'address_state':  ['State'],
      'address_zip':    ['Zip'],
      'notes':          ['Notes'],
      'created_at':     ['Date Created'],
    },
    invoices: {
      'invoice_number': ['Number', 'Invoice Number'],
      'contact_email':  ['Contact Email'],
      'job_title':      ['Job', 'Job Name'],
      'amount':         ['Total', 'Amount'],
      'paid_amount':    ['Paid', 'Amount Paid'],
      'status':         ['Status'],
      'issue_date':     ['Date', 'Invoice Date'],
      'due_date':       ['Due Date'],
      'notes':          ['Notes'],
    },
  },
};

// ─────────────────────────────────────────────
// ACCULYNX (Roofing focused)
// ─────────────────────────────────────────────
export const ACCULYNX = {
  name: 'AccuLynx',
  logo: '/logos/acculynx.svg',
  hasApi: false,
  exportInstructions: 'In AccuLynx, go to Reports → Export. You can export leads and jobs as CSV.',
  entities: {
    contacts: {
      'first_name':     ['First Name', 'Customer First Name'],
      'last_name':      ['Last Name', 'Customer Last Name'],
      'email':          ['Email', 'Customer Email'],
      'phone':          ['Phone', 'Cell', 'Primary Phone'],
      'address_street': ['Address', 'Street Address'],
      'address_city':   ['City'],
      'address_state':  ['State'],
      'address_zip':    ['Zip', 'Zip Code'],
      'status':         ['Lead Status', 'Status'],
      'notes':          ['Notes', 'Comments'],
      'created_at':     ['Date Added', 'Created Date'],
    },
    jobs: {
      'title':          ['Job Name', 'Project'],
      'contact_email':  ['Customer Email', 'Email'],
      'contact_name':   ['Customer Name', 'Homeowner'],
      'status':         ['Job Status', 'Status'],
      'type':           ['Trade', 'Job Type'],
      'start_date':     ['Start Date'],
      'end_date':       ['Completion Date'],
      'value':          ['Contracted Amount', 'Job Value'],
      'address_street': ['Job Address', 'Property Address'],
      'address_city':   ['Job City'],
      'address_state':  ['Job State'],
      'address_zip':    ['Job Zip'],
      'notes':          ['Notes'],
      'created_at':     ['Date Created'],
    },
    invoices: {
      'invoice_number': ['Invoice #'],
      'contact_email':  ['Customer Email'],
      'amount':         ['Amount', 'Total'],
      'status':         ['Status'],
      'issue_date':     ['Date'],
      'due_date':       ['Due Date'],
    },
  },
};

// ─────────────────────────────────────────────
// GENERIC / CUSTOM CSV
// For any CRM not listed — manual column mapping
// ─────────────────────────────────────────────
export const GENERIC = {
  name: 'Other / Custom CSV',
  logo: null,
  hasApi: false,
  exportInstructions: 'Export your contacts, jobs, and invoices from your current CRM as CSV files. We\'ll help you map the columns.',
  entities: {
    contacts: {},
    jobs: {},
    invoices: {},
  },
};

// ─────────────────────────────────────────────
// REGISTRY — all supported CRMs
// ─────────────────────────────────────────────
export const CRM_REGISTRY = {
  jobber:       JOBBER,
  buildertrend: BUILDERTREND,
  jobnimbus:    JOBNIMBUS,
  acculynx:     ACCULYNX,
  generic:      GENERIC,
};

export default CRM_REGISTRY;
