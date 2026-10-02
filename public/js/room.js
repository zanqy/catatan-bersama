// ============================================================
// Halaman room — composer + riwayat real-time
// ============================================================

// ---------- Resolusi roomId ----------
const pathRoom = (location.pathname.match(/^\/room\/([A-Za-z0-9]{6})/) || [])[1] || null;
const storedRoom = localStorage.getItem('roomId');
let roomId = pathRoom || storedRoom;

if (!roomId) {
  location.replace('/');
} else {
  roomId = roomId.toUpperCase();
  if (roomId !== storedRoom) localStorage.setItem('roomId', roomId);
  if (!pathRoom) location.replace(`/room/${roomId}`);
}

// ---------- Elemen ----------
const roomCodeEl = document.getElementById('roomCode');
const statusPill = document.getElementById('statusPill');
const statusLabel = document.getElementById('statusLabel');
const composer = document.getElementById('composer');
const sendBtn = document.getElementById('sendBtn');
const charCount = document.getElementById('charCount');
const historyList = document.getElementById('historyList');
const historyCount = document.getElementById('historyCount');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const changeRoomBtn = document.getElementById('changeRoomBtn');
const deviceRadios = document.querySelectorAll('input[name="device"]');

roomCodeEl.textContent = formatRoomCode(roomId);

// ---------- Device ----------
const device = getDevice();
deviceRadios.forEach(r => { r.checked = (r.value === device); });
deviceRadios.forEach(r => r.addEventListener('change', () => setDevice(r.value)));

// ---------- Status koneksi ----------
let online = navigator.onLine;
let pending = false;

function updateStatus() {
  statusPill.className = 'status';
  if (!online) {
    statusPill.classList.add('offline');
    statusLabel.textContent = 'Offline';
  } else if (pending) {
    statusPill.classList.add('syncing');
    statusLabel.textContent = 'Sinkron…';
  } else {
    statusLabel.textContent = 'Tersambung';
  }
}

window.addEventListener('online', () => { online = true; updateStatus(); });
window.addEventListener('offline', () => { online = false; updateStatus(); });

// ---------- Composer ----------
const DRAFT_KEY = `draft:${roomId}`;
let draftTimer;

composer.value = localStorage.getItem(DRAFT_KEY) || '';
charCount.textContent = `${composer.value.length} karakter`;

composer.addEventListener('input', () => {
  charCount.textContent = `${composer.value.length} karakter`;
  clearTimeout(draftTimer);
  draftTimer = setTimeout(() => localStorage.setItem(DRAFT_KEY, composer.value), 300);
});

// Paste → auto-send
composer.addEventListener('paste', () => setTimeout(send, 50));

// Ctrl+Enter / Cmd+Enter → kirim
composer.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    send();
  }
});

// Blur dengan teks non-kosong → commit
composer.addEventListener('blur', () => {
  if (composer.value.trim()) send();
});

sendBtn.addEventListener('click', send);

function send() {
  const text = composer.value.trim();
  if (!text) return;
  db.collection('rooms').doc(roomId).collection('clips').add({
    text,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    device: getDevice(),
    pinned: false
  });
  composer.value = '';
  charCount.textContent = '0 karakter';
  localStorage.removeItem(DRAFT_KEY);
}

// ---------- Riwayat real-time ----------
const PAGE_SIZE = 50;
let entries = [];      // 50 terbaru dari onSnapshot
let extraDocs = [];    // hasil "muat lebih banyak"
let lastDoc = null;
let loadingMore = false;
let roomMissing = false;

const clipsRef = db.collection('rooms').doc(roomId).collection('clips');

clipsRef.orderBy('createdAt', 'desc').limit(PAGE_SIZE).onSnapshot((snap) => {
  entries = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  lastDoc = snap.docs[snap.docs.length - 1] || null;
  pending = snap.metadata.hasPendingWrites;
  updateStatus();
  render();
  loadMoreBtn.style.display = (snap.docs.length === PAGE_SIZE) ? '' : 'none';
}, (err) => {
  console.error('Gagal mendengarkan riwayat:', err);
  statusPill.className = 'status offline';
  statusLabel.textContent = 'Error';
});

loadMoreBtn.addEventListener('click', async () => {
  if (loadingMore || !lastDoc) return;
  loadingMore = true;
  loadMoreBtn.disabled = true;
  loadMoreBtn.textContent = 'Memuat…';
  try {
    const snap = await clipsRef.orderBy('createdAt', 'desc').startAfter(lastDoc).limit(PAGE_SIZE).get();
    extraDocs.push(...snap.docs.map(d => ({ id: d.id, ...d.data() })));
    lastDoc = snap.docs[snap.docs.length - 1] || null;
    render();
    loadMoreBtn.style.display = (snap.docs.length === PAGE_SIZE) ? '' : 'none';
  } finally {
    loadingMore = false;
    loadMoreBtn.disabled = false;
    loadMoreBtn.textContent = 'Muat lebih banyak';
  }
});

// ---------- Render ----------
function render() {
  if (roomMissing) {
    historyList.innerHTML = '<li class="empty">Room ini tidak ditemukan. Gunakan "Ganti Room" untuk membuat atau membuka room lain.</li>';
    return;
  }

  const seen = new Set();
  const all = [];
  for (const e of [...entries, ...extraDocs]) {
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    all.push(e);
  }

  historyCount.textContent = `(${all.length})`;
  historyList.innerHTML = '';

  if (all.length === 0) {
    historyList.innerHTML = '<li class="empty">Belum ada catatan. Tulis sesuatu di sebelah kiri.</li>';
    return;
  }

  for (const e of all) {
    const li = document.createElement('li');
    li.className = 'entry';
    li.dataset.id = e.id;

    const top = document.createElement('div');
    top.className = 'entry-top';
    const from = document.createElement('span');
    from.className = 'from';
    from.textContent = `dari ${e.device || '?'}`;
    const time = document.createElement('span');
    time.dataset.time = e.createdAt ? e.createdAt.toMillis() : Date.now();
    time.textContent = timeAgo(e.createdAt);
    top.append(from, time);

    const text = document.createElement('p');
    text.className = 'entry-text';
    text.textContent = e.text;

    const actions = document.createElement('div');
    actions.className = 'entry-actions';
    const copyBtn = document.createElement('button');
    copyBtn.dataset.action = 'copy';
    copyBtn.textContent = 'Salin';
    const delBtn = document.createElement('button');
    delBtn.dataset.action = 'delete';
    delBtn.className = 'danger';
    delBtn.textContent = 'Hapus';
    actions.append(copyBtn, delBtn);

    li.append(top, text, actions);
    historyList.appendChild(li);
  }
}

// Refresh label waktu tiap menit
setInterval(() => {
  document.querySelectorAll('[data-time]').forEach(el => {
    el.textContent = timeAgo(Number(el.dataset.time));
  });
}, 60000);

// ---------- Aksi: salin / hapus ----------
historyList.addEventListener('click', async (ev) => {
  const btn = ev.target.closest('button');
  if (!btn) return;
  const li = btn.closest('li.entry');
  if (!li) return;
  const id = li.dataset.id;
  const entry = [...entries, ...extraDocs].find(e => e.id === id);
  if (!entry) return;

  if (btn.dataset.action === 'copy') {
    try {
      await copyText(entry.text);
      btn.textContent = 'Tersalin';
      setTimeout(() => { btn.textContent = 'Salin'; }, 1200);
    } catch (err) {
      btn.textContent = 'Gagal';
      setTimeout(() => { btn.textContent = 'Salin'; }, 1200);
    }
  }

  if (btn.dataset.action === 'delete') {
    try {
      await db.collection('rooms').doc(roomId).collection('clips').doc(id).delete();
    } catch (err) {
      console.error('Gagal menghapus:', err);
    }
  }
});

// ---------- Salin kode room ----------
roomCodeEl.addEventListener('click', async () => {
  try {
    await copyText(roomId);
    roomCodeEl.textContent = 'Tersalin!';
    setTimeout(() => { roomCodeEl.textContent = formatRoomCode(roomId); }, 1200);
  } catch (err) { /* abaikan */ }
});

// ---------- Ganti room ----------
changeRoomBtn.addEventListener('click', () => {
  localStorage.removeItem('roomId');
  location.href = '/';
});

// ---------- Cek room valid ----------
db.collection('rooms').doc(roomId).get().then((snap) => {
  if (!snap.exists) {
    roomMissing = true;
    composer.disabled = true;
    sendBtn.disabled = true;
    render();
  }
}).catch(() => { /* offline — biarkan snapshot menangani */ });