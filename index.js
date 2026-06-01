require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');
const cron = require('node-cron');

const auth = require('./auth');
const routes = require('./routes');
const scheduler = require('./scheduler');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'change-this-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.success = req.session.success;
  res.locals.error = req.session.error;
  req.session.success = null;
  req.session.error = null;
  res.locals.currentPath = req.path;
  next();
});

app.use('/', routes);

cron.schedule('0 */2 * * *', () => {
  console.log('[Cron] Running reminder check...');
  scheduler.checkOverdueReminders();
});

app.listen(PORT, () => {
  console.log(`App running on http://localhost:${PORT}`);
  console.log(`Press Ctrl+C to stop`);
});
