#!/usr/bin/env node
// Tes end-to-end Firestore Security Rules via REST API.
// Pakai ANONYMOUS token (lewat Firebase Auth) supaya request dievaluasi rules,
// sama seperti request dari web app tanpa login.
const fs = require('fs');
const os = require('os');
const path = require('path');
const https = require('https');

const PROJECT = 'catatan-bersama-app';
const API_KEY = 'AIzaSyD2BBIs8pr9gL2EEd-_4v8D4iFY-dak1_I';
const config = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json'), 'utf8'));
const OWNER_TOKEN = config.tokens.access_token;

const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

function api(method, urlPath, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'firestore.googleapis.com',
      path: urlPath,
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    }, (res) => {
      let d = '';
      res.on('data', (c) => { d += c; });
      res.on('end', () => resolve({ status: res.statusCode, data: d }));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function getAnonToken() {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ returnSecureToken: true });
    const req = https.request({
      hostname: 'identitytoolkit.googleapis.com',
      path: `/v1/accounts:signUp?key=${API_KEY}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, (res) => {
      let d = '';
      res.on('data', (c) => { d += c; });
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error('anon signup gagal: ' + d));
        resolve(JSON.parse(d).idToken);
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Bersihkan room test (pakai owner token yang bypass rules)
async function cleanup(roomId) {
  const list = await api('GET', `${BASE}/rooms/${roomId}/clips`, null, OWNER_TOKEN);
  if (list.status === 200 && list.data) {
    const docs = JSON.parse(list.data).documents || [];
    for (const d of docs) {
      const id = d.name.split('/').pop();
      await api('DELETE', `${BASE}/rooms/${roomId}/clips/${id}`, null, OWNER_TOKEN);
    }
  }
  await api('DELETE', `${BASE}/rooms/${roomId}`, null, OWNER_TOKEN);
}

function check(name, actual, expected) {
  const ok = actual === expected;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} → HTTP ${actual} (expected ${expected})`);
  return ok;
}

(async () => {
  const now = new Date().toISOString();
  const roomId = 'TEST01';
  const clipId = 'clip1';
  let allOk = true;

  await cleanup(roomId);
  await cleanup('INVALID');

  const TOKEN = await getAnonToken();
  console.log('Anonymous token didapat, mulai tes rules...\n');

  let r = await api('PATCH', `${BASE}/rooms/${roomId}?updateMask.fieldPaths=createdAt&updateMask.fieldPaths=lastActive`, {
    fields: { createdAt: { timestampValue: now }, lastActive: { timestampValue: now } }
  }, TOKEN);
  allOk &= check('create room valid', r.status, 200);

  r = await api('POST', `${BASE}/rooms/${roomId}/clips?documentId=${clipId}`, {
    fields: {
      text: { stringValue: 'test clip dari rules test' },
      createdAt: { timestampValue: now },
      device: { stringValue: 'laptop' },
      pinned: { booleanValue: false }
    }
  }, TOKEN);
  allOk &= check('add clip valid', r.status, 200);

  r = await api('GET', `${BASE}/rooms/${roomId}/clips`, null, TOKEN);
  allOk &= check('read clips', r.status, 200);

  r = await api('PATCH', `${BASE}/rooms/${roomId}/clips/${clipId}?updateMask.fieldPaths=text`, {
    fields: { text: { stringValue: 'diubah' } }
  }, TOKEN);
  allOk &= check('update text DITOLAK', r.status, 403);

  r = await api('PATCH', `${BASE}/rooms/${roomId}/clips/${clipId}?updateMask.fieldPaths=pinned`, {
    fields: { pinned: { booleanValue: true } }
  }, TOKEN);
  allOk &= check('update pinned diterima', r.status, 200);

  r = await api('POST', `${BASE}/rooms/${roomId}/clips?documentId=clip2`, {
    fields: {
      text: { stringValue: 'x'.repeat(10001) },
      createdAt: { timestampValue: now },
      device: { stringValue: 'laptop' },
      pinned: { booleanValue: false }
    }
  }, TOKEN);
  allOk &= check('clip >10000 DITOLAK', r.status, 403);

  r = await api('POST', `${BASE}/rooms/INVALID/clips?documentId=clip3`, {
    fields: {
      text: { stringValue: 'x' },
      createdAt: { timestampValue: now },
      device: { stringValue: 'laptop' },
      pinned: { booleanValue: false }
    }
  }, TOKEN);
  allOk &= check('roomId invalid DITOLAK', r.status, 403);

  r = await api('GET', `${BASE}/nomatch/xyz`, null, TOKEN);
  allOk &= check('path tanpa rule DITOLAK', r.status, 403);

  r = await api('DELETE', `${BASE}/rooms/${roomId}/clips/${clipId}`, null, TOKEN);
  allOk &= check('delete clip diterima', r.status, 200);

  r = await api('DELETE', `${BASE}/rooms/${roomId}`, null, TOKEN);
  allOk &= check('delete room DITOLAK', r.status, 403);

  await cleanup(roomId);
  await cleanup('INVALID');

  console.log(allOk ? '\nSEMUA TES LULUS' : '\nADA TES GAGAL');
  process.exit(allOk ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });