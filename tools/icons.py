"""Render the code-native Compás geometric mark as PNG with Python stdlib."""
from pathlib import Path
import struct,zlib
ROOT=Path(__file__).resolve().parents[1]/'server/pwa/icons'
def icon(size,name):
    colors=[(120,96,204),(238,233,247),(199,184,235),(255,255,255)]
    pixels=bytearray()
    # Supersample the same concentric-circle geometry as icon.svg.
    for y in range(size):
        pixels.append(0)
        for x in range(size):
            sums=[0,0,0]
            for dy in (.25,.75):
                for dx in (.25,.75):
                    px=(x+dx)*512/size-256;py=(y+dy)*512/size-256
                    c=colors[0]
                    if px*px+py*py<=142*142:c=colors[1 if py<0 else 2]
                    if px*px+py*py<=80*80:c=colors[3 if px>=0 else 0]
                    for k in range(3):sums[k]+=c[k]
            pixels.extend(round(v/4) for v in sums)
    def chunk(t,data):return struct.pack('!I',len(data))+t+data+struct.pack('!I',zlib.crc32(t+data)&0xffffffff)
    png=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('!2I5B',size,size,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(pixels))+chunk(b'IEND',b'')
    (ROOT/name).write_bytes(png)
for size,name in [(192,'icon-192.png'),(512,'icon-512.png'),(512,'icon-maskable-512.png'),(180,'apple-touch-icon.png')]:icon(size,name)
