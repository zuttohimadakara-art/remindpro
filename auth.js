const bcrypt = require('bcryptjs');
const airtable = require('./airtable');

const SALT_ROUNDS = 10;

async function registerUser(name, email, password) {
  const existing = await airtable.findUserByEmail(email);
  if (existing) {
    return { success: false, error: 'An account with this email already exists.' };
  }
  const hashed = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await airtable.createUser({
    Name: name,
    Email: email,
    Password: hashed,
    SubscriptionStatus: 'trial'
  });
  return { success: true, user };
}

async function loginUser(email, password) {
  const user = await airtable.findUserByEmail(email);
  if (!user) {
    return { success: false, error: 'Invalid email or password.' };
  }
  const match = await bcrypt.compare(password, user.Password);
  if (!match) {
    return { success: false, error: 'Invalid email or password.' };
  }
  return { success: true, user: { id: user.id, Name: user.Name, Email: user.Email, SubscriptionStatus: user.SubscriptionStatus } };
}

function requireAuth(req, res, next) {
  if (!req.session.user) {
    req.session.error = 'Please log in first.';
    return res.redirect('/login');
  }
  next();
}

function requireSubscription(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  const status = req.session.user.SubscriptionStatus;
  if (status !== 'active' && status !== 'trial') {
    return res.redirect('/subscribe');
  }
  next();
}

module.exports = { registerUser, loginUser, requireAuth, requireSubscription };
