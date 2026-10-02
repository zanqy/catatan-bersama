#!/usr/bin/env node
// Aktifkan Google API untuk project, pakai token dari firebase CLI login.
// Usage: node scripts/enable-firestore-api.js <projectId> <serviceName>
const fs = require('fs');
const os = require('os');
const path = require('path');
const https = require('https');

const projectId = process.argv[2] || 'catatan-bersama-app';
const serviceName = process.argv[3] || 'firestore.googleapis.com';
const configPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');

if (!fs.existsSync(configPath)) {
  console.error('Config firebase-tools tidak ditemukan di', configPath);
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const tokens = config.tokens || {};
const accessToken = tokens.access_token;

if (!accessToken) {
  console.error('access_token tidak ada di config. Jalankan: firebase login');
  process.exit(1);
}

const body = JSON.stringify({});
const req = https.request({
  hostname: 'serviceusage.googleapis.com',
  path: `/v1/projects/${projectId}/services/${serviceName}:enable`,
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  }
}, (res) => {
  let data = '';
  res.on('data', (c) => { data += c; });
  res.on('end', () => {
    console.log('HTTP', res.statusCode);
    console.log(data.slice(0, 400));
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log('Firestore API enabled untuk', projectId);
    } else {
      process.exitCode = 1;
    }
  });
});
req.on('error', (e) => { console.error('Error:', e.message); process.exit(1); });
req.write(body);
req.end();