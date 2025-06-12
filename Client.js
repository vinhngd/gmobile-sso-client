// oidc-client-sample/index.js

import express from 'express';
import axios from 'axios';
import open from 'open';
import qs from 'querystring';
import crypto from 'crypto';

const app = express();
const port = 4000;

// In-memory store for state and nonce (should be per-session in real app)
const store = new Map();

// Config
const config = {
  client_id: 'Edukid',
  client_secret: 'aatom@123',
  redirect_uri: 'http://localhost:4000/callback',
  authorize_endpoint: 'https://sandbox-sso.g99.vn/auth',
  token_endpoint: 'https://sandbox-sso.g99.vn/token',
  userinfo_endpoint: 'https://sandbox-sso.g99.vn/me',
  scope: 'openid profile number',
};

// Step 1: Redirect user to authorization endpoint
app.get('/login', (req, res) => {
  const state = crypto.randomBytes(8).toString('hex');
  const nonce = crypto.randomBytes(8).toString('hex');
  store.set(state, { nonce });

  const url = `${config.authorize_endpoint}?client_id=${config.client_id}&redirect_uri=${encodeURIComponent(
    config.redirect_uri
  )}&response_type=code&scope=${encodeURIComponent(
    config.scope
  )}&state=${state}&nonce=${nonce}`;

  console.log(url);
  res.redirect(url);
});

// Step 2: Receive authorization code and exchange for tokens
app.get('/callback', async (req, res) => {
  const { code, state } = req.query;
  if (!code || !state || !store.has(state)) {
    return res.status(400).send('Invalid state or missing code');
  }

  try {
    const tokenRes = await axios.post(
      config.token_endpoint,
      qs.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: config.redirect_uri,
        client_id: config.client_id,
        client_secret: config.client_secret,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token, id_token } = tokenRes.data;
    console.log('✅ Access Token:', access_token);
    console.log('✅ ID Token:', id_token);

    // Step 3: Use access token to call protected API
    const userinfo = await axios.get(config.userinfo_endpoint, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    console.log('👤 Userinfo:', userinfo.data);
    res.send(`<pre>${JSON.stringify(userinfo.data, null, 2)}</pre>`);
  } catch (err) {
    console.error('❌ Error:', err.response?.data || err.message);
    res.status(500).send('Token exchange failed');
  } finally {
    store.delete(state);
  }
});

app.listen(port, () => {
  console.log(`OIDC client running at http://localhost:${port}`);
  open(`http://localhost:${port}/login`);
});
