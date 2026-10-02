#!/usr/bin/env node
// Inisialisasi konfigurasi Firebase Auth (Identity Toolkit) untuk project.
const fs = require('fs');
const os = require('os');
const path = require('path');
const https = require('https');

const PROJECT = 'catatan-bersama-app';
const config = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json'), 'utf8'));
const TOKEN = config.tokens.access_token;

const body = JSON.stringify({ signIn: { allowDuplicateEmails: true } });
const req = https.request({
  hostname: 'identitytoolkit.googleapis.com',
  path: `/admin/v2/projects/${PROJECT}/config`,
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  }
}, (res) => {
  let d = '';
  res.on('data', (c) => { d += c; });
  res.on('end', () => {
    console.log('HTTP', res.statusCode);
    console.log(d.slice(0, 300));
    process.exit(res.statusCode >= 200 && res.statusCode < 300 ? 0 : 1);
  });
});
req.on('error', (e) => { console.error(e); process.exit(1); });
req.write(body);
req.end();