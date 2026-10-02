// ============================================================
// Landing — buat room baru / gabung room
// ============================================================

const createBtn = document.getElementById('createBtn');
const createResult = document.getElementById('createResult');
const newCode = document.getElementById('newCode');
const enterNew = document.getElementById('enterNew');
const joinCode = document.getElementById('joinCode');
const joinBtn = document.getElementById('joinBtn');
const existingRoom = document.getElementById('existingRoom');
const existingLink = document.getElementById('existingLink');
const existingEnter = document.getElementById('existingEnter');
const qrWrap = document.getElementById('qrWrap');
const qrCode = document.getElementById('qrCode');
const scanBtn = document.getElementById('scanBtn');
const scanModal = document.getElementById('scanModal');
const scanVideo = document.getElementById('scanVideo');
const scanCanvas = document.getElementById('scanCanvas');
const scanClose = document.getElementById('scanClose');
const scanStatus = document.getElementById('scanStatus');

// Sudah punya room? Tampilkan jalan pintas masuk.
const savedRoom = localStorage.getItem('roomId');
if (savedRoom && isValidRoomCode(savedRoom)) {
  existingRoom.classList.add('show');
  existingLink.textContent = formatRoomCode(savedRoom);
  existingLink.href = `/room/${savedRoom}`;
  existingEnter.href = `/room/${savedRoom}`;
}

// ---------- Buat room baru ----------
createBtn.addEventListener('click', async () => {
  createBtn.disabled = true;
  createBtn.textContent = 'Membuat…';
  try {
    const code = generateRoomCode();
    await db.collection('rooms').doc(code).set({
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastActive: firebase.firestore.FieldValue.serverTimestamp()
    });
    localStorage.setItem('roomId', code);
    newCode.textContent = formatRoomCode(code);
    enterNew.href = `/room/${code}`;
    createResult.classList.add('show');
    // QR hanya untuk laptop — HP cukup pakai kode manual
    if (detectDevice() === 'laptop') {
      renderQR(code);
    }
  } catch (err) {
    console.error('Gagal membuat room:', err);
    alert('Gagal membuat ruang. Periksa koneksi lalu coba lagi.');
  } finally {
    createBtn.disabled = false;
    createBtn.textContent = 'Buat ruang baru';
  }
});

// ---------- Gabung room ----------
// Auto-format input: XK92P4 → XK9-2P4
joinCode.addEventListener('input', () => {
  const raw = normalizeRoomCode(joinCode.value).slice(0, 6);
  joinCode.value = raw.length > 3 ? `${raw.slice(0, 3)}-${raw.slice(3)}` : raw;
  joinBtn.disabled = raw.length !== 6;
});

joinCode.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !joinBtn.disabled) joinBtn.click();
});

joinBtn.addEventListener('click', async () => {
  const code = normalizeRoomCode(joinCode.value);
  if (!isValidRoomCode(code)) return;
  joinBtn.disabled = true;
  joinBtn.textContent = 'Memeriksa…';
  try {
    const snap = await db.collection('rooms').doc(code).get();
    if (!snap.exists) {
      alert('Kode ruang tidak ditemukan. Periksa kembali.');
      joinBtn.disabled = false;
      joinBtn.textContent = 'Masuk →';
      return;
    }
    localStorage.setItem('roomId', code);
    location.href = `/room/${code}`;
  } catch (err) {
    console.error('Gagal memeriksa kode:', err);
    alert('Gagal memeriksa kode. Periksa koneksi lalu coba lagi.');
    joinBtn.disabled = false;
    joinBtn.textContent = 'Masuk →';
  }
});

// ---------- QR code (generate, laptop) ----------
function renderQR(code) {
  if (typeof QRCode === 'undefined') return;
  qrCode.innerHTML = '';
  new QRCode(qrCode, {
    text: `${location.origin}/room/${code}`,
    width: 180,
    height: 180,
    colorDark: '#241F18',
    colorLight: '#F4EFE1'
  });
  qrWrap.classList.add('show');
}

// ---------- Scanner QR (in-app, HP) ----------
let scannerStream = null;
let scannerRunning = false;

scanBtn.addEventListener('click', openScanner);
scanClose.addEventListener('click', closeScanner);
scanModal.addEventListener('click', (e) => {
  if (e.target === scanModal) closeScanner();
});

async function openScanner() {
  if (typeof jsQR === 'undefined') {
    scanStatus.textContent = 'Scanner tidak tersedia. Scan pakai Google Lens / kamera bawaan, atau ketik kode manual.';
    return;
  }
  scanModal.classList.add('show');
  scanStatus.textContent = 'Mengakses kamera…';
  try {
    scannerStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }
    });
    scanVideo.srcObject = scannerStream;
    await scanVideo.play();
    scannerRunning = true;
    scanStatus.textContent = 'Arahkan kamera ke QR code…';
    requestAnimationFrame(scanFrame);
  } catch (err) {
    console.error('Kamera gagal:', err);
    scanStatus.textContent = 'Kamera tidak bisa diakses. Izinkan akses kamera, atau scan pakai Google Lens / ketik kode manual.';
  }
}

function closeScanner() {
  scannerRunning = false;
  if (scannerStream) {
    scannerStream.getTracks().forEach(t => t.stop());
    scannerStream = null;
  }
  scanModal.classList.remove('show');
}

function scanFrame() {
  if (!scannerRunning) return;
  if (scanVideo.readyState === scanVideo.HAVE_ENOUGH_DATA) {
    const ctx = scanCanvas.getContext('2d', { willReadFrequently: true });
    scanCanvas.width = scanVideo.videoWidth;
    scanCanvas.height = scanVideo.videoHeight;
    ctx.drawImage(scanVideo, 0, 0, scanCanvas.width, scanCanvas.height);
    const img = ctx.getImageData(0, 0, scanCanvas.width, scanCanvas.height);
    const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
    if (code && code.data) {
      const roomId = extractRoomIdFromQr(code.data);
      if (roomId) {
        closeScanner();
        localStorage.setItem('roomId', roomId);
        location.href = `/room/${roomId}`;
        return;
      }
    }
  }
  requestAnimationFrame(scanFrame);
}

// QR berisi URL room atau kode langsung — dua-duanya diterima
function extractRoomIdFromQr(data) {
  try {
    const u = new URL(data);
    const m = u.pathname.match(/^\/room\/([A-Za-z0-9]{6})/);
    if (m) return m[1].toUpperCase();
  } catch (e) { /* bukan URL */ }
  const raw = normalizeRoomCode(data);
  return isValidRoomCode(raw) ? raw : null;
}