# Catatan Bersama

> Satu buku catatan, dua tangan menulisnya — sinkron teks real-time dua arah antara HP dan laptop, tanpa login.

![Firebase](https://img.shields.io/badge/Firebase-Firestore%20%2B%20Hosting-FFCA28?logo=firebase&logoColor=black)
![PWA](https://img.shields.io/badge/PWA-Installable-5A0FC8?logo=pwa&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla-F7DF1E?logo=javascript&logoColor=black)
![Status](https://img.shields.io/badge/status-live-success)

**Live app:** https://catatan-bersama-app.web.app

---

## Tentang

Prompt dan teks sering diambil dari HP, lalu dipakai ngoding di laptop. Transfer manual lewat chat atau email itu ribet. Catatan Bersama menyelesaikannya dengan satu tempat sinkron real-time, dua arah, dan gratis — cukup satu kode room untuk menyambungkan semua device.

## Fitur

| Fitur | Keterangan |
|-------|------------|
| Sinkron real-time | Dua arah via `onSnapshot`, bukan polling |
| Riwayat catatan | Urut terbaru di atas, 50 per batch + load more |
| Copy / Hapus | Sekali klik per catatan |
| Pairing kode room | 6 karakter alfanumerik, acak kriptografis |
| QR pairing | Generate di laptop, scan di HP (Google Lens, kamera bawaan, atau scanner in-app) |
| Indikator koneksi | Online / offline / syncing |
| Responsif | Nyaman di layar HP maupun laptop |
| PWA | Add to Home Screen tanpa publish ke Play Store |

## Cara Kerja

1. Buka app di laptop, klik **Buat ruang baru** — muncul kode 6 karakter beserta QR code
2. Di HP, masuk lewat tiga cara: scan QR dengan Google Lens atau kamera bawaan, scan QR lewat tombol **Scan QR** di dalam app, atau ketik kode manual
3. Kode tersimpan di `localStorage` tiap device — tidak perlu input ulang
4. Tempel teks di device mana pun, langsung muncul di device lain secara real-time

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Database | Firebase Firestore (real-time listener) |
| Hosting | Firebase Hosting |
| PWA | `manifest.json` + service worker |
| Frontend | Vanilla JS / HTML / CSS, tanpa framework |
| QR | `qrcodejs` (generate) + `jsQR` (scan), self-host di `public/vendor/` |

## Model Data

```
rooms/{roomId}                    // roomId = 6 karakter, contoh "XK92P4"
  ├── createdAt: timestamp
  ├── lastActive: timestamp
  └── clips/{clipId}              // clipId = auto ID Firestore
        ├── text: string          // 1..10000 karakter
        ├── createdAt: timestamp
        ├── device: string        // "HP" | "laptop" | nama custom
        └── pinned: boolean
```

## Struktur Proyek

```
├── firebase.json            # config Hosting + Firestore + emulator
├── firestore.rules          # security rules
├── firestore.indexes.json   # composite index
├── public/                  # root hosting
│   ├── index.html           # landing: buat/gabung room + QR
│   ├── room.html            # halaman room: composer + riwayat
│   ├── css/style.css        # design system
│   ├── js/                  # firebase-init, utils, home, room
│   ├── vendor/              # SDK Firebase + library QR (self-host)
│   ├── manifest.json        # PWA manifest
│   └── sw.js                # service worker
├── scripts/                 # util: generate icon, tes rules via emulator
└── plans/rencana-teknis.md  # rencana teknis
```

## Menjalankan Lokal

1. Isi config Firebase di `public/js/firebase-init.js` — ambil dari Firebase Console, menu Project settings, Your apps, Web app. Nilai config ini bersifat publik; keamanan data dijaga oleh security rules.

2. Jalankan emulator untuk tes lokal:

```bash
firebase emulators:start
```

3. Tes security rules via emulator:

```bash
node scripts/test-rules-emulator.js
```

## Deploy

```bash
firebase deploy
```

Saat ada update, naikkan nilai `VERSION` di `public/sw.js` agar cache PWA ter-invalidate.

## Keamanan

- Baca/tulis hanya diizinkan jika tahu `roomId` yang valid (6 karakter alfanumerik)
- Batas ukuran teks 10.000 karakter + recency check `createdAt` untuk mencegah spam
- Update clip hanya pada field `pinned` — teks tidak bisa diubah setelah terkirim
- Kode room dibuat dengan `crypto.getRandomValues`, bukan `Math.random()`
- Data tidak dienkripsi end-to-end di v1 — cukup untuk prompt dan teks kerja biasa

## Roadmap

**v1.5**

- Pin catatan penting agar tidak ter-auto-hapus
- Auto-expire catatan lama (7 hari, kecuali yang di-pin)
- Search/filter di riwayat
- Dark mode
- Label device custom

**v2**

- Kirim file via Firebase Storage
- Preview gambar di riwayat
- Multi-room (pisah kerjaan vs pribadi)
- Share room ke device ketiga