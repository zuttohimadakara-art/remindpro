const express = require('express');
const router = express.Router();
const auth = require('./auth');
const airtable = require('./airtable');
const lemonSqueezy = require('./lemonsqueezy');
const email = require('./email');

router.get('/', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('landing');
});

router.get('/signup', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('signup');
});

router.post('/signup', async (req, res) => {
  const { name, email, password, confirm } = req.body;
  if (!name || !email || !password) {
    req.session.error = 'All fields are required.';
    return res.redirect('/signup');
  }
  if (password !== confirm) {
    req.session.error = 'Passwords do not match.';
    return res.redirect('/signup');
  }
  if (password.length < 6) {
    req.session.error = 'Password must be at least 6 characters.';
    return res.redirect('/signup');
  }
  let result;
  try {
    result = await auth.registerUser(name, email, password);
  } catch (err) {
    req.session.error = 'Signup failed. Check your Airtable setup.';
    return res.redirect('/signup');
  }
  if (!result.success) {
    req.session.error = result.error;
    return res.redirect('/signup');
  }
  req.session.user = { id: result.user.id, Name: result.user.Name, Email: result.user.Email, SubscriptionStatus: 'trial' };
  req.session.success = 'Account created! You\'re on a 14-day free trial.';
  res.redirect('/dashboard');
});

router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('login');
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    req.session.error = 'Email and password are required.';
    return res.redirect('/login');
  }
  const result = await auth.loginUser(email, password);
  if (!result.success) {
    req.session.error = result.error;
    return res.redirect('/login');
  }
  req.session.user = result.user;
  res.redirect('/dashboard');
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// Dashboard
router.get('/dashboard', auth.requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const invoices = await airtable.getInvoices(userId);
    const clients = await airtable.getClients(userId);

    const totalInvoices = invoices.length;
    const paidInvoices = invoices.filter(i => i.Status === 'paid').length;
    const pendingInvoices = invoices.filter(i => i.Status === 'pending');
    const overdueInvoices = pendingInvoices.filter(i => {
      if (!i.DueDate) return false;
      return new Date(i.DueDate) < new Date();
    });

    const totalOutstanding = pendingInvoices.reduce((sum, i) => sum + parseFloat(i.Amount || 0), 0);
    const totalCollected = invoices.filter(i => i.Status === 'paid').reduce((sum, i) => sum + parseFloat(i.Amount || 0), 0);

    const recentReminders = await airtable.getReminders(userId);
    const recentInvoices = invoices.slice(0, 5);

    res.render('dashboard', {
      totalInvoices, paidInvoices, pending: pendingInvoices.length,
      overdue: overdueInvoices.length, totalOutstanding, totalCollected,
      recentInvoices, recentReminders, clientsCount: clients.length,
      page: 'dashboard'
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    req.session.error = 'Something went wrong loading your dashboard.';
    res.redirect('/login');
  }
});

// Clients
router.get('/clients', auth.requireAuth, async (req, res) => {
  const clients = await airtable.getClients(req.session.user.id);
  res.render('clients', { clients, page: 'clients' });
});

router.get('/clients/add', auth.requireAuth, (req, res) => {
  res.render('client-form', { client: null, page: 'clients' });
});

router.post('/clients/add', auth.requireAuth, async (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) {
    req.session.error = 'Name and email are required.';
    return res.redirect('/clients/add');
  }
  await airtable.createClient({
    Name: name,
    Email: email,
    UserID: req.session.user.id
  });
  req.session.success = 'Client added successfully!';
  res.redirect('/clients');
});

router.get('/clients/:id/edit', auth.requireAuth, async (req, res) => {
  const client = await airtable.getClient(req.params.id);
  if (!client || client.UserID !== req.session.user.id) {
    req.session.error = 'Client not found.';
    return res.redirect('/clients');
  }
  res.render('client-form', { client, page: 'clients' });
});

router.post('/clients/:id/edit', auth.requireAuth, async (req, res) => {
  const { name, email } = req.body;
  await airtable.updateClient(req.params.id, { Name: name, Email: email });
  req.session.success = 'Client updated.';
  res.redirect('/clients');
});

router.post('/clients/:id/delete', auth.requireAuth, async (req, res) => {
  await airtable.deleteClient(req.params.id);
  req.session.success = 'Client deleted.';
  res.redirect('/clients');
});

// Invoices
router.get('/invoices', auth.requireAuth, async (req, res) => {
  const invoices = await airtable.getInvoices(req.session.user.id);
  const clients = await airtable.getClients(req.session.user.id);
  const clientMap = {};
  clients.forEach(c => { clientMap[c.id] = c.Name; });

  const enriched = invoices.map(inv => ({
    ...inv,
    ClientName: clientMap[inv.ClientID] || 'Unknown Client'
  }));

  res.render('invoices', { invoices: enriched, page: 'invoices' });
});

router.get('/invoices/add', auth.requireAuth, async (req, res) => {
  const clients = await airtable.getClients(req.session.user.id);
  res.render('invoice-form', { invoice: null, clients, page: 'invoices' });
});

router.post('/invoices/add', auth.requireAuth, async (req, res) => {
  const { client_id, amount, due_date, notes } = req.body;
  if (!client_id || !amount || !due_date) {
    req.session.error = 'Client, amount, and due date are required.';
    return res.redirect('/invoices/add');
  }
  await airtable.createInvoice({
    ClientID: client_id,
    UserID: req.session.user.id,
    Amount: parseFloat(amount),
    DueDate: due_date,
    Status: 'pending',
    ReminderCount: 0,
    Notes: notes || ''
  });
  req.session.success = 'Invoice added!';
  res.redirect('/invoices');
});

router.get('/invoices/:id/edit', auth.requireAuth, async (req, res) => {
  const invoice = await airtable.getInvoice(req.params.id);
  if (!invoice || invoice.UserID !== req.session.user.id) {
    req.session.error = 'Invoice not found.';
    return res.redirect('/invoices');
  }
  const clients = await airtable.getClients(req.session.user.id);
  res.render('invoice-form', { invoice, clients, page: 'invoices' });
});

router.post('/invoices/:id/edit', auth.requireAuth, async (req, res) => {
  const { client_id, amount, due_date, status, notes } = req.body;
  await airtable.updateInvoice(req.params.id, {
    ClientID: client_id, Amount: parseFloat(amount), DueDate: due_date,
    Status: status || 'pending', Notes: notes || ''
  });
  req.session.success = 'Invoice updated.';
  res.redirect('/invoices');
});

router.post('/invoices/:id/mark-paid', auth.requireAuth, async (req, res) => {
  await airtable.updateInvoice(req.params.id, { Status: 'paid' });
  req.session.success = 'Invoice marked as paid!';
  res.redirect('/invoices');
});

router.post('/invoices/:id/delete', auth.requireAuth, async (req, res) => {
  await airtable.deleteInvoice(req.params.id);
  req.session.success = 'Invoice deleted.';
  res.redirect('/invoices');
});

router.post('/invoices/:id/send-reminder', auth.requireAuth, async (req, res) => {
  try {
    const invoice = await airtable.getInvoice(req.params.id);
    if (!invoice || invoice.UserID !== req.session.user.id) {
      req.session.error = 'Invoice not found.';
      return res.redirect('/invoices');
    }
    if (invoice.Status === 'paid') {
      req.session.error = 'This invoice is already paid.';
      return res.redirect('/invoices');
    }

    const client = await airtable.getClient(invoice.ClientID);
    if (!client || !client.Email) {
      req.session.error = 'Client has no email address on file.';
      return res.redirect('/invoices');
    }

    const count = (invoice.ReminderCount || 0) + 1;
    const subject = `Invoice Reminder: $${invoice.Amount} due ${invoice.DueDate}`;
    const message = `Hi ${client.Name},\n\nThis is a reminder that invoice $${invoice.Amount} (due ${invoice.DueDate}) is still pending. Please arrange payment at your earliest convenience.\n\nThank you,\n${req.session.user.Name || 'Your Service Provider'}`;

    const result = await email.sendEmail(client.Email, subject, message);

    await airtable.updateInvoice(invoice.id, {
      ReminderCount: count,
      LastReminderSent: new Date().toISOString()
    });

    await airtable.createReminder({
      InvoiceID: invoice.id,
      UserID: req.session.user.id,
      SentTo: client.Email,
      Message: message,
      Status: result.success ? 'sent' : 'failed',
      SentAt: new Date().toISOString(),
      Error: result.error || ''
    });

    if (result.success) {
      req.session.success = `Email reminder sent to ${client.Name}!`;
    } else {
      req.session.error = `Failed to send email: ${result.error}`;
    }
  } catch (err) {
    console.error('Send reminder error:', err);
    req.session.error = 'Failed to send reminder.';
  }
  res.redirect('/invoices');
});

// Reminder log
router.get('/reminders', auth.requireAuth, async (req, res) => {
  const reminders = await airtable.getReminders(req.session.user.id);
  const invoices = await airtable.getInvoices(req.session.user.id);
  const clients = await airtable.getClients(req.session.user.id);
  const clientMap = {};
  clients.forEach(c => { clientMap[c.id] = c.Name; });
  const invoiceMap = {};
  invoices.forEach(inv => {
    invoiceMap[inv.id] = { amount: inv.Amount, clientName: clientMap[inv.ClientID] || 'Unknown' };
  });

  const enriched = reminders.map(r => ({
    ...r,
    InvoiceAmount: invoiceMap[r.InvoiceID]?.amount || '',
    ClientName: invoiceMap[r.InvoiceID]?.clientName || ''
  }));

  res.render('reminders', { reminders: enriched, page: 'reminders' });
});

// Subscription
router.get('/subscribe', auth.requireAuth, (req, res) => {
  if (req.session.user.SubscriptionStatus === 'active') {
    return res.redirect('/manage-subscription');
  }
  res.render('subscribe');
});

router.post('/subscribe/checkout', auth.requireAuth, async (req, res) => {
  try {
    const siteUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;
    const result = await lemonSqueezy.createCheckout(
      req.session.user.id,
      req.session.user.Email,
      siteUrl
    );
    res.redirect(result.url);
  } catch (err) {
    console.error('Checkout error:', err);
    req.session.error = 'Could not create checkout. Make sure Lemon Squeezy is configured.';
    res.redirect('/subscribe');
  }
});

router.get('/subscribe/success', auth.requireAuth, async (req, res) => {
  req.session.success = 'Subscription active! You can now send reminders.';
  res.redirect('/dashboard');
});

router.get('/manage-subscription', auth.requireAuth, async (req, res) => {
  res.render('manage-sub');
});

router.post('/manage-subscription/portal', auth.requireAuth, async (req, res) => {
  const portalUrl = lemonSqueezy.getCustomerPortalUrl(req.session.user.Email);
  res.redirect(portalUrl);
});

// Lemon Squeezy webhook
router.post('/lemonsqueezy-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-signature'];
    const rawBody = req.body.toString();

    if (signature && !lemonSqueezy.verifyWebhook(rawBody, signature)) {
      return res.status(400).send('Invalid signature');
    }

    const event = JSON.parse(rawBody);
    const meta = event.meta;

    if (meta.event_name === 'subscription_cancelled' || meta.event_name === 'subscription_expired') {
      const customData = meta.custom_data || {};
      const userId = customData.user_id;
      if (userId) {
        await airtable.updateUser(userId, { SubscriptionStatus: 'cancelled' });
      }
    }

    if (meta.event_name === 'order_created' || meta.event_name === 'subscription_created') {
      const customData = meta.custom_data || {};
      const userId = customData.user_id;
      if (userId) {
        await airtable.updateUser(userId, { SubscriptionStatus: 'active' });
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(400).send('Webhook error');
  }
});

module.exports = router;
