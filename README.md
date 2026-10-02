# Catatan Bersama

> Satu buku catatan, dua tangan menulisnya — sinkron teks real-time dua arah antara HP dan laptop, tanpa login.

**Live:** https://catatan-bersama-app.web.app

## Fitur

- Tempel/ketik teks → tersimpan otomatis ke Firestore
- Sinkron real-time dua arah (`onSnapshot`, bukan polling)
- Riwayat catatan (urut terbaru di atas, 50 per batch + load more)
- Tombol **Copy** / **Hapus** per catatan
- Pairing pakai kode room 6 karakter (generate + input manual)
- **QR code pairing**: generate di laptop, scan di HP (Google Lens / kamera bawaan / scanner in-app)
- Indikator status koneksi (online / offline / syncing)
- Tampilan responsif (HP + laptop)
- PWA — "Add to Home Screen" di HP tanpa publish ke Play Store

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Database | Firebase Firestore (real-time listener) |
| Hosting | Firebase Hosting |
| PWA | `manifest.json` + service worker |
| Frontend | Vanilla JS / HTML / CSS (tanpa framework) |
| QR | `qrcodejs` (generate) + `jsQR` (scan) — self-host di `public/vendor/` |

## Model Data

```
rooms/{roomId}                    // roomId = 6 karakter, e.g. "XK92P4"
  ├── createdAt: timestamp
  ├── lastActive: timestamp
  └── clips/{clipId}              // clipId = auto ID Firestore
        ├── text: string          // 1..10000 karakter
        ├── createdAt: timestamp
        ├── device: string        // "HP" | "laptop" | nama custom
        └── pinned: boolean
```

## Struktur

```
├── firebase.json            ← config Hosting + Firestore + emulator
├── firestore.rules          ← security rules (wajib)
├── firestore.indexes.json   ← composite index
├── public/                  ← root hosting
│   ├── index.html           ← landing (buat/gabung room + QR)
│   ├── room.html            ← halaman room (composer + riwayat)
│   ├── css/style.css        ← design system
│   ├── js/                  ← firebase-init, utils, home, room
│   ├── vendor/              ← SDK Firebase + library QR (self-host)
│   ├── manifest.json        ← PWA manifest
│   └── sw.js                ← service worker
├── scripts/                 ← util: gen icons, tes rules (emulator)
└── plans/rencana-teknis.md  ← rencana teknis
```

## Setup Lokal

1. **Isi config Firebase** di `public/js/firebase-init.js` (nilai publik dari Firebase Console → Project settings → Your apps → Web app)
2. **Tes lokal** (emulator Firestore + hosting):
   ```bash
   firebase emulators:start
   ```
3. **Tes security rules** via emulator:
   ```bash
   node scripts/test-rules-emulator.js
   ```

## Deploy

```bash
firebase deploy
```

Catatan: bump `VERSION` di `public/sw.js` saat ada update biar cache PWA ter-invalidate.

## Keamanan

- Firestore Security Rules: baca/tulis cuma kalau tahu `roomId` valid (6 karakter alfanumerik)
- Batasi ukuran teks (10.000 karakter) + recency check `createdAt`
- Update clip cuma `pinned` (teks gak bisa diubah post-hoc)
- Kode room acak kriptografis (`crypto.getRandomValues`)
- Data gak dienkripsi end-to-end di v1 (cukup buat prompt/teks kerja biasa)