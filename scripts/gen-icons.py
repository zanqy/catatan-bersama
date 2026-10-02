#!/usr/bin/env python3
"""Generate PWA icons (motif asterism ⁂) tanpa dependensi eksternal."""
import struct
import zlib

PAPER = (244, 239, 225)  # #F4EFE1
WINE = (122, 36, 48)     # #7A2430


def chunk(typ, data):
    return (struct.pack('>I', len(data)) + typ + data
            + struct.pack('>I', zlib.crc32(typ + data) & 0xFFFFFFFF))


def make_png(size, out):
    cx = cy = size / 2
    r = size * 0.085
    pts = [
        (cx, cy - size * 0.22),
        (cx - size * 0.19, cy + size * 0.16),
        (cx + size * 0.19, cy + size * 0.16),
    ]
    rows = []
    for y in range(size):
        row = bytearray([0])  # filter: None
        for x in range(size):
            color = PAPER
            for px, py in pts:
                if (x - px) ** 2 + (y - py) ** 2 <= r * r:
                    color = WINE
                    break
            row += bytes(color)
        rows.append(bytes(row))
    raw = b''.join(rows)
    ihdr = struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)
    png = (b'\x89PNG\r\n\x1a\n'
           + chunk(b'IHDR', ihdr)
           + chunk(b'IDAT', zlib.compress(raw, 9))
           + chunk(b'IEND', b''))
    with open(out, 'wb') as f:
        f.write(png)
    print(f'{out}: {size}x{size} OK')


make_png(192, 'public/icons/icon-192.png')
make_png(512, 'public/icons/icon-512.png')