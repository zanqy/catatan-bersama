#!/usr/bin/env node
// Tes Firestore Security Rules terhadap EMULATOR lokal (localhost:8080).
// Emulator mengevaluasi rules persis seperti produksi, tanpa perlu Auth.
const http = require('http');

const PROJECT = 'catatan-bersama-app';
const BASE = `http://localhost:8080/v1/projects/${PROJECT}/databases/(default)/documents`;

function api(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: 'localhost',
      port: 8080,
      path: urlPath,
      method,
      headers: {
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

function check(name, actual, expected) {
  const ok = actual === expected;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} → HTTP ${actual} (expected ${expected})`);
  return ok;
}

(async () => {
  const now = new Date().toISOString();
  const roomId = 'T' + String(Date.now() % 100000).padStart(5, '0'); // unik per run, 6 karakter
  const clipId = 'clip1';
  let allOk = true;

  let r = await api('PATCH', `${BASE}/rooms/${roomId}?updateMask.fieldPaths=createdAt&updateMask.fieldPaths=lastActive`, {
    fields: { createdAt: { timestampValue: now }, lastActive: { timestampValue: now } }
  });
  allOk &= check('create room valid', r.status, 200);

  r = await api('POST', `${BASE}/rooms/${roomId}/clips?documentId=${clipId}`, {
    fields: {
      text: { stringValue: 'test clip dari rules test' },
      createdAt: { timestampValue: now },
      device: { stringValue: 'laptop' },
      pinned: { booleanValue: false }
    }
  });
  allOk &= check('add clip valid', r.status, 200);

  r = await api('GET', `${BASE}/rooms/${roomId}/clips`);
  allOk &= check('read clips', r.status, 200);

  r = await api('PATCH', `${BASE}/rooms/${roomId}/clips/${clipId}?updateMask.fieldPaths=text`, {
    fields: { text: { stringValue: 'diubah' } }
  });
  allOk &= check('update text DITOLAK', r.status, 403);

  r = await api('PATCH', `${BASE}/rooms/${roomId}/clips/${clipId}?updateMask.fieldPaths=pinned`, {
    fields: { pinned: { booleanValue: true } }
  });
  allOk &= check('update pinned diterima', r.status, 200);

  r = await api('POST', `${BASE}/rooms/${roomId}/clips?documentId=clip2`, {
    fields: {
      text: { stringValue: 'x'.repeat(10001) },
      createdAt: { timestampValue: now },
      device: { stringValue: 'laptop' },
      pinned: { booleanValue: false }
    }
  });
  allOk &= check('clip >10000 DITOLAK', r.status, 403);

  r = await api('POST', `${BASE}/rooms/INVALID/clips?documentId=clip3`, {
    fields: {
      text: { stringValue: 'x' },
      createdAt: { timestampValue: now },
      device: { stringValue: 'laptop' },
      pinned: { booleanValue: false }
    }
  });
  allOk &= check('roomId invalid DITOLAK', r.status, 403);

  r = await api('GET', `${BASE}/nomatch/xyz`);
  allOk &= check('path tanpa rule DITOLAK', r.status, 403);

  r = await api('DELETE', `${BASE}/rooms/${roomId}/clips/${clipId}`);
  allOk &= check('delete clip diterima', r.status, 200);

  r = await api('DELETE', `${BASE}/rooms/${roomId}`);
  allOk &= check('delete room DITOLAK', r.status, 403);

  console.log(allOk ? '\nSEMUA TES LULUS' : '\nADA TES GAGAL');
  process.exit(allOk ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });