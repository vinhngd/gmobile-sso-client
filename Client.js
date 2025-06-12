// oidc-client-sample/index.js

import express from 'express';
import axios from 'axios';
import open from 'open';
import qs from 'querystring';

const app = express();
const port = 4000;

// Config
const config = {
  client_id: 'dummy',
  client_secret: 'dummy',
  redirect_uri: 'http://localhost:4000/callback',
  authorize_endpoint: 'https://sandbox-sso.g99.vn/auth',
  token_endpoint: 'https://sandbox-sso.g99.vn/token',
  userinfo_endpoint: 'https://sandbox-sso.g99.vn/me',
  scope: 'openid profile',
};

// Step 1: Redirect user to authorization endpoint
app.get('/login', (req, res) => {
  const state = 'abc123';
  const nonce = 'xyz456';
  const url = `${config.authorize_endpoint}?client_id=${config.client_id}&redirect_uri=${encodeURIComponent(
    config.redirect_uri
  )}&response_type=code&scope=${encodeURIComponent(
    config.scope
  )}&state=${state}&nonce=${nonce}`;

  res.redirect(url);
});

// Step 2: Receive authorization code and exchange for tokens
app.get('/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.send('Missing code');

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
  }
});

app.listen(port, () => {
  console.log(`OIDC client running at http://localhost:${port}`);
  open(`http://localhost:${port}/login`);
});
