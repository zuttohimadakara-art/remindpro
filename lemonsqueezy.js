const axios = require('axios');

const API_KEY = process.env.LEMONSQUEEZY_API_KEY;
const STORE_ID = process.env.LEMONSQUEEZY_STORE_ID;
const VARIANT_ID = process.env.LEMONSQUEEZY_VARIANT_ID;

const api = axios.create({
  baseURL: 'https://api.lemonsqueezy.com/v1',
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }
});

async function createCheckout(userId, userEmail, siteUrl) {
  if (!API_KEY || !STORE_ID || !VARIANT_ID) {
    console.warn('Lemon Squeezy not configured. Checkout will return a placeholder URL.');
    return { url: '/subscribe?error=not_configured' };
  }

  try {
    const { data } = await api.post('/checkouts', {
      data: {
        type: 'checkouts',
        attributes: {
          product_options: {
            redirect_url: `${siteUrl}/subscribe/success`,
            receipt_button_text: 'Go to Dashboard',
            receipt_link_url: `${siteUrl}/dashboard`
          },
          checkout_data: {
            email: userEmail,
            custom: { user_id: userId }
          }
        },
        relationships: {
          store: { data: { type: 'stores', id: STORE_ID } },
          variant: { data: { type: 'variants', id: VARIANT_ID } }
        }
      }
    });

    return { url: data.data.attributes.url };
  } catch (err) {
    console.error('Lemon Squeezy checkout error:', err.response?.data || err.message);
    throw err;
  }
}

function getCustomerPortalUrl(userEmail) {
  return `https://remindpro.lemonsqueezy.com/billing?email=${encodeURIComponent(userEmail)}`;
}

function verifyWebhook(rawBody, signature) {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) return true;

  const crypto = require('crypto');
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(rawBody).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

module.exports = { createCheckout, getCustomerPortalUrl, verifyWebhook };
