# RemindPro - Setup Guide

## Step 1: Create Your Accounts (Free)

### 1. GitHub
1. Go to https://github.com/signup
2. Create a free account
3. Verify your email

### 2. Airtable (Your Database)
1. Go to https://airtable.com/signup
2. Create a free account
3. Click **"Create a base"** (start from scratch)
4. Name it **"RemindPro"**
5. Create these 4 tables:

   **Table 1: "Users"** (click "+" to add fields)
   | Field Name | Field Type |
   |-----------|-----------|
   | Name | Single line text |
   | Email | Email |
   | Password | Single line text |
   | StripeCustomerID | Single line text |
   | SubscriptionStatus | Single line text |
   | SubscriptionID | Single line text |
   | CreatedAt | Date |

   **Table 2: "Clients"**
   | Field Name | Field Type |
   |-----------|-----------|
   | Name | Single line text |
   | Phone | Single line text |
   | Email | Email |
   | UserID | Single line text |
   | CreatedAt | Date |

   **Table 3: "Invoices"**
   | Field Name | Field Type |
   |-----------|-----------|
   | ClientID | Single line text |
   | UserID | Single line text |
   | Amount | Number (format: Currency) |
   | DueDate | Date |
   | Status | Single line text |
   | ReminderCount | Number |
   | LastReminderSent | Date |
   | Notes | Single line text |
   | CreatedAt | Date |

   **Table 4: "Reminders"**
   | Field Name | Field Type |
   |-----------|-----------|
   | InvoiceID | Single line text |
   | UserID | Single line text |
   | SentTo | Single line text |
   | Message | Long text |
   | Status | Single line text |
   | SentAt | Date |
   | Error | Long text |

6. Go to https://airtable.com/account and copy your **API Key**
7. Go to https://airtable.com/api — click your "RemindPro" base — copy the **Base ID**

### 3. SMTP Email (For sending email reminders)
Choose one:

**Option A: Gmail (free, easiest)**
1. Go to https://myaccount.google.com/apppasswords (you need 2-Step Verification enabled)
2. Create an app named "RemindPro"
3. Copy the 16-character app password
4. Your SMTP settings:
   - Host: `smtp.gmail.com`
   - Port: `587`
   - User: your Gmail address
   - Pass: the app password

**Option B: SendGrid (free tier: 100 emails/day)**
1. Go to https://signup.sendgrid.com and create an account
2. Go to **Settings** → **API Keys** → **Create API Key**
3. Choose "Full Access" and copy the key
4. Your SMTP settings:
   - Host: `smtp.sendgrid.net`
   - Port: `587`
   - User: `apikey`
   - Pass: the API key you copied

### 4. Lemon Squeezy (For Payments — works globally)
1. Go to https://lemonsqueezy.com and create an account
2. Go to **Settings** → **API** → generate an **API Key** → copy it
3. Go to **Settings** → **Stores** → click your store → the **Store ID** is in the URL
4. Go to **Products** → **Create a Product**:
   - Name: "RemindPro Monthly"
   - Set price: **$29/month** (recurring/subscription)
   - Click **Save**
5. Click into the product variant → copy the **Variant ID** from the URL
6. Go to **Settings** → **Webhooks** → **Add Webhook**:
   - URL: `https://YOUR-RAILWAY-URL.railway.app/lemonsqueezy-webhook`
   - Events: `order_created`, `subscription_created`, `subscription_cancelled`, `subscription_expired`
   - Copy the **Signing Secret**

---

## Step 2: Deploy to Railway

1. Go to https://railway.app/login
2. Sign in with GitHub
3. Click **"New Project"** → **"Deploy from GitHub repo"**
4. If you haven't pushed the code yet:

   **Push to GitHub first:**
   - Create a new repo at https://github.com/new (name it "remindpro")
   - Open a terminal and run:
   ```
   cd "C:\Users\Admin\Documents\game dev\trades-invoice-reminder"
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/remindpro.git
   git push -u origin main
   ```

5. Back in Railway, select your "remindpro" repo
6. Go to your project's **Variables** tab and add these:

| Variable | Value |
|----------|-------|
| `AIRTABLE_PERSONAL_ACCESS_TOKEN` | Your Airtable PAT (starts with `pat`) |
| `AIRTABLE_BASE_ID` | Your Airtable Base ID (starts with `app`) |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | Your Gmail address |
| `SMTP_PASS` | Your Gmail app password |
| `SMTP_FROM_NAME` | `RemindPro` |
| `LEMONSQUEEZY_API_KEY` | Your Lemon Squeezy API Key |
| `LEMONSQUEEZY_STORE_ID` | Your Store ID (a number) |
| `LEMONSQUEEZY_VARIANT_ID` | Your Variant ID (a number) |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | Your webhook signing secret |
| `SESSION_SECRET` | Type a random string like `jk43hj2k4h2k34hk2` |
| `APP_URL` | Leave blank for now (Railway will give you a URL) |

7. Railway will auto-deploy. Wait 2-3 minutes.
8. Click **"Generate Domain"** in the Railway dashboard
9. Copy that URL (like `https://remindpro.up.railway.app`)
10. Add/update the Railway variable: `APP_URL` = your Railway URL

### Lemon Squeezy Webhook (already done if you followed step 4)
Already covered in step 4 above.

---

## Your App Is Live!

Visit your Railway URL. Sign up, add clients, add invoices, and start sending SMS reminders.

### Test it:
1. Create an account at your app URL
2. Add a client with your own phone number
3. Add an invoice for that client (past due date)
4. Click **"SMS Reminder"** — should text you!

---

## Monthly Costs Once Live

| Service | Cost |
|---------|------|
| Railway hosting | $5-10/mo (free tier available) |
| Gmail SMTP | Free |
| Lemon Squeezy fees | 5% + $0.50 per transaction |
| Airtable | Free tier fine for start |

**Total: ~$5-10/mo** (before any revenue)
