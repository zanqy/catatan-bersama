// ============================================================
// Utilitas bersama — kode room, waktu, clipboard, device
// ============================================================

// ---------- Kode room ----------
// Karakter tanpa yang gampang ketuker (I, O, 0, 1)
const ROOM_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// Generate 6 karakter acak kriptografis
function generateRoomCode() {
  const arr = new Uint32Array(6);
  crypto.getRandomValues(arr);
  let out = '';
  for (let i = 0; i < 6; i++) out += ROOM_CHARS[arr[i] % ROOM_CHARS.length];
  return out;
}

// Tampilkan dengan dash: XK92P4 → XK9-2P4
function formatRoomCode(code) {
  return code.slice(0, 3) + '-' + code.slice(3);
}

// Normalisasi input user: uppercase, buang non-alfanumerik
function normalizeRoomCode(input) {
  return String(input).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function isValidRoomCode(code) {
  return /^[A-Z0-9]{6}$/.test(code);
}

// ---------- Waktu relatif ----------
function timeAgo(ts) {
  const ms = ts && ts.toMillis ? ts.toMillis() : (ts || Date.now());
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 10) return 'baru saja';
  if (s < 60) return `${s} detik lalu`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} hari lalu`;
  return new Date(ms).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

// ---------- Clipboard (dengan fallback) ----------
async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
}

// ---------- Device ----------
function detectDevice() {
  return /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'HP' : 'laptop';
}

function getDevice() {
  return localStorage.getItem('device') || detectDevice();
}

function setDevice(d) {
  localStorage.setItem('device', d);
}