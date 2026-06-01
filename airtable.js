const Airtable = require('airtable');

const apiKey = process.env.AIRTABLE_PAT;
const baseId = process.env.AIRTABLE_BASE_ID;

if (!apiKey || !baseId) {
  console.warn('WARNING: AIRTABLE_API_KEY or AIRTABLE_BASE_ID not set in .env');
}

const base = new Airtable({ apiKey }).base(baseId);

const TABLES = {
  USERS: 'Users',
  CLIENTS: 'Clients',
  INVOICES: 'Invoices',
  REMINDERS: 'Reminders',
  SETTINGS: 'Settings'
};

function toList(records) {
  return records.map(r => ({ id: r.id, ...r.fields }));
}

async function findUserByEmail(email) {
  try {
    const records = await base(TABLES.USERS).select({
      filterByFormula: `{Email} = '${email.replace(/'/g, "\\'")}'`,
      maxRecords: 1
    }).all();
    return records.length > 0 ? { id: records[0].id, ...records[0].fields } : null;
  } catch (err) {
    console.error('Airtable findUserByEmail error:', err);
    return null;
  }
}

async function createUser(fields) {
  try {
    const record = await base(TABLES.USERS).create(fields);
    return { id: record.id, ...record.fields };
  } catch (err) {
    console.error('Airtable createUser error:', err);
    throw err;
  }
}

async function updateUser(userId, fields) {
  try {
    await base(TABLES.USERS).update(userId, fields);
  } catch (err) {
    console.error('Airtable updateUser error:', err);
  }
}

async function getClients(userId) {
  try {
    const records = await base(TABLES.CLIENTS).select({
      filterByFormula: `{UserID} = '${userId.replace(/'/g, "\\'")}'`,
      sort: [{ field: 'CreatedAt', direction: 'desc' }]
    }).all();
    return toList(records);
  } catch (err) {
    console.error('Airtable getClients error:', err);
    return [];
  }
}

async function getClient(clientId) {
  try {
    const record = await base(TABLES.CLIENTS).find(clientId);
    return { id: record.id, ...record.fields };
  } catch (err) {
    return null;
  }
}

async function createClient(fields) {
  try {
    const record = await base(TABLES.CLIENTS).create(fields);
    return { id: record.id, ...record.fields };
  } catch (err) {
    console.error('Airtable createClient error:', err);
    throw err;
  }
}

async function updateClient(clientId, fields) {
  try {
    await base(TABLES.CLIENTS).update(clientId, fields);
  } catch (err) {
    console.error('Airtable updateClient error:', err);
  }
}

async function deleteClient(clientId) {
  try {
    await base(TABLES.CLIENTS).destroy(clientId);
  } catch (err) {
    console.error('Airtable deleteClient error:', err);
  }
}

async function getInvoices(userId) {
  try {
    const records = await base(TABLES.INVOICES).select({
      filterByFormula: `{UserID} = '${userId.replace(/'/g, "\\'")}'`,
      sort: [{ field: 'CreatedAt', direction: 'desc' }]
    }).all();
    return toList(records);
  } catch (err) {
    console.error('Airtable getInvoices error:', err);
    return [];
  }
}

async function getInvoice(invoiceId) {
  try {
    const record = await base(TABLES.INVOICES).find(invoiceId);
    return { id: record.id, ...record.fields };
  } catch (err) {
    return null;
  }
}

async function createInvoice(fields) {
  try {
    const record = await base(TABLES.INVOICES).create(fields);
    return { id: record.id, ...record.fields };
  } catch (err) {
    console.error('Airtable createInvoice error:', err);
    throw err;
  }
}

async function updateInvoice(invoiceId, fields) {
  try {
    await base(TABLES.INVOICES).update(invoiceId, fields);
  } catch (err) {
    console.error('Airtable updateInvoice error:', err);
  }
}

async function deleteInvoice(invoiceId) {
  try {
    await base(TABLES.INVOICES).destroy(invoiceId);
  } catch (err) {
    console.error('Airtable deleteInvoice error:', err);
  }
}

async function getInvoicesForClient(clientId) {
  try {
    const records = await base(TABLES.INVOICES).select({
      filterByFormula: `{ClientID} = '${clientId.replace(/'/g, "\\'")}'`
    }).all();
    return toList(records);
  } catch (err) {
    return [];
  }
}

async function createReminder(fields) {
  try {
    const record = await base(TABLES.REMINDERS).create(fields);
    return { id: record.id, ...record.fields };
  } catch (err) {
    console.error('Airtable createReminder error:', err);
  }
}

async function getReminders(userId) {
  try {
    const records = await base(TABLES.REMINDERS).select({
      filterByFormula: `{UserID} = '${userId.replace(/'/g, "\\'")}'`,
      sort: [{ field: 'SentAt', direction: 'desc' }],
      maxRecords: 50
    }).all();
    return toList(records);
  } catch (err) {
    return [];
  }
}

async function findByStripeCustomerId(customerId) {
  try {
    const records = await base(TABLES.USERS).select({
      filterByFormula: `{StripeCustomerID} = '${customerId.replace(/'/g, "\\'")}'`,
      maxRecords: 1
    }).all();
    return records.length > 0 ? { id: records[0].id, ...records[0].fields } : null;
  } catch (err) {
    console.error('Airtable findByStripeCustomerId error:', err);
    return null;
  }
}

async function getOverdueInvoices() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const records = await base(TABLES.INVOICES).select({
      filterByFormula: `AND({Status} = 'pending', {DueDate} < '${today}')`
    }).all();
    return toList(records);
  } catch (err) {
    console.error('Airtable getOverdueInvoices error:', err);
    return [];
  }
}

module.exports = {
  TABLES,
  findUserByEmail,
  createUser,
  updateUser,
  getClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
  getInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  getInvoicesForClient,
  createReminder,
  getReminders,
  getOverdueInvoices,
  findByStripeCustomerId
};
