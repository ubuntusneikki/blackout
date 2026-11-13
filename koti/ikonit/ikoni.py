# Aja: python3 koti/ikonit/ikoni.py koti/ikonit  (vaatii Pillow)
# Solmu-ikoni: siniheltta pikseleinä 32x32, skaalattu kokonaisluvulla
import sys
from PIL import Image
out=sys.argv[1]
N=32
BG=(11,16,24); BG2=(20,28,40)
D=(0x1d,0x5c,0x58); M=(0x34,0xb8,0xac); L=(0xa8,0xfb,0xee)
ST0=(0x8a,0x7d,0x68); ST1=(0xc9,0xbc,0x9c); ST2=(0xef,0xe6,0xcc)
SO1=(0x2a,0x1d,0x16); SO2=(0x45,0x30,0x1f)
A1=(0xe8,0xa0,0x2a); A2=(0xff,0xe0,0x8a)
im=Image.new('RGB',(N,N),BG); p=im.load()
def put(x,y,c):
    if 0<=x<N and 0<=y<N: p[x,y]=c
# hehku: pyöreä hämy taustalla
import math
for y in range(N):
  for x in range(N):
    d=math.hypot(x-15.5,y-13.5)
    if d<13: 
      t=(13-d)/13; b=[(1-t*0.35)*BG[i]+t*0.35*D[i] for i in range(3)]
      # järjestetty pistekuviointi
      bay=[[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]][y%4][x%4]/16
      p[x,y]=tuple(int(v) for v in (b if t*1.6>bay else BG))
# maa
for x in range(6,26):
  for y in range(24,27):
    put(x,y,SO2 if y==24 else SO1)
# jalka
for y in range(15,24):
  for x in range(14,18):
    put(x,y,ST2 if x==14 else (ST1 if x<17 else ST0))
# lakki (puolikupu)
cx,cy,rx,ry=15.5,15,9.5,8
for y in range(5,16):
  for x in range(4,28):
    if ((x-cx)/rx)**2+((y-cy)/ry)**2<=1:
      c=M
      if ((x-cx+2)/rx)**2+((y-cy+2)/ry)**2>1.0 and y>8: c=D
      if ((x-cx+3)/(rx-3))**2+((y-cy+4)/(ry-3))**2<=1: c=L if (y<=8 and x<18) or (y==9 and x<13) else M
      put(x,y,c)
# heltat
for x in range(7,25):
  put(x,15,D)
  if x%2==0: put(x,16,D) if 9<x<22 else None
# valopisteet lakissa
for (x,y) in [(20,9),(22,11),(18,12)]: put(x,y,L)
# itiöt leijuvat (meripihka = pelattavaa)
for (x,y,c) in [(5,6,A2),(26,5,A1),(27,18,A2),(4,19,A1),(24,2,A2)]: put(x,y,c)

im.resize((192,192),Image.NEAREST).save(out+'/ikoni-192.png')
im.resize((512,512),Image.NEAREST).save(out+'/ikoni-512.png')
im.crop((1,1,31,31)).resize((180,180),Image.NEAREST).save(out+'/apple-touch-icon.png')
