# Erzeugt die Erweiterungs-Icons (abgerundetes Quadrat mit Funken) ohne externe Libs.
import math, struct, zlib

def png(path, size):
    ss = 4  # Supersampling für weiche Kanten
    rows = []
    for y in range(size):
        row = bytearray([0])
        for x in range(size):
            acc = [0.0, 0.0, 0.0, 0.0]
            for sy in range(ss):
                for sx in range(ss):
                    u = (x + (sx + .5) / ss) / size
                    v = (y + (sy + .5) / ss) / size
                    # abgerundetes Quadrat
                    r = .22
                    dx = max(abs(u - .5) - (.5 - r), 0); dy = max(abs(v - .5) - (.5 - r), 0)
                    if math.hypot(dx, dy) > r: continue
                    t = (u + v) / 2
                    col = (229 + (201 - 229) * t, 139 + (98 - 139) * t, 107 + (63 - 107) * t)
                    # Funke (4-zackiger Stern)
                    px, py = abs(u - .5), abs(v - .5)
                    star = (px ** .55 + py ** .55) ** (1 / .55) < .30
                    if star: col = (255, 255, 255)
                    acc[0] += col[0]; acc[1] += col[1]; acc[2] += col[2]; acc[3] += 255
            n = ss * ss
            a = acc[3] / n
            if a: row += bytes([int(acc[0] / (acc[3] / 255)), int(acc[1] / (acc[3] / 255)), int(acc[2] / (acc[3] / 255)), int(a)])
            else: row += bytes(4)
        rows.append(bytes(row))
    raw = zlib.compress(b"".join(rows), 9)
    def chunk(t, d): return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
    with open(path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)) + chunk(b"IDAT", raw) + chunk(b"IEND", b""))

for s in (16, 32, 48, 128):
    png(f"extension/icons/{s}.png", s)
print("icons ok")
