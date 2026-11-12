"""Pikselitaiteen jälkikäsittely: ääriviivat, pelin paletti, järjestetty pistekuviointi, elinvoima."""
import numpy as np
from PIL import Image
PAL = '''0b1018 141c28 1f2a38 2c3a4a 46566a 22191c 33242a 4a3330 6a4440 2a1d16 45301f 6a4a30 8f6a44 b88a58
5e321e a8602f d99a5b f3d08a 16262e 2d4a55 4f7d86 9fd3d6 24391c 3f6a26 79a83a c2df6a 8a7d68 c9bc9c efe6cc
103540 1d6a78 5fc7d0 ffcf7a fff0c0 1d5c58 34b8ac a8fbee 5a1f4a c4428f ffa6d6 6b2e12 d9702a ffc46a
3a1f5a 8a4ad0 d6b0ff 1b2a4a 3a3a5e 7a4a5a d9845a 6ae07a 3b3a33 55524a 77705f 23272a 2e322e 3c4239 4e5448 646a5c
7a4438 5a3028 c9a46a a8865a e0504a
1e1a30 2e2648 4a3f78 7a6cc0 c0b4f4'''.split()
pal = np.array([[int(h[i:i+2], 16) for i in (0, 2, 4)] for h in PAL], np.float32)
B = np.array([[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]], np.float32) / 16 - 0.47

def process(col_p, id_p, vit=1.0, dith=8, sat=1.2):
    c = np.asarray(Image.open(col_p).convert('RGBA')).astype(np.float32)
    idm = np.asarray(Image.open(id_p).convert('RGBA')).astype(np.float32)
    rgb, a = c[..., :3], c[..., 3]
    l = rgb.mean(-1, keepdims=True); rgb = np.clip((rgb - l) * sat + l, 0, 255)
    idv = idm[..., 0] + idm[..., 1] * 0.37 + idm[..., 2] * 0.11
    H, W = idv.shape
    edge = np.zeros((H, W), bool)
    for dy, dx in ((-1, 0), (0, -1)):
        sh = np.roll(np.roll(idv, -dy, 0), -dx, 1); edge |= np.abs(sh - idv) > 6
    edge[0, :] = False; edge[:, 0] = False
    rgb[edge] *= 0.6
    solid = a > 100
    out = np.zeros((H, W), bool)
    for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)): out |= np.roll(np.roll(solid, dy, 0), dx, 1) & ~solid
    d = np.tile(B, (H // 4 + 1, W // 4 + 1))[:H, :W][..., None] * dith
    x = rgb + d; w = np.array([0.35, 0.5, 0.25], np.float32)
    q = pal[(((x[:, :, None, :] - pal[None, None]) ** 2) * w).sum(-1).argmin(-1)]
    if vit < 1:
        L = 0.3 * q[..., 0] + 0.59 * q[..., 1] + 0.11 * q[..., 2]; s = 0.1 + 0.9 * vit; br = 0.6 + 0.4 * vit
        for k, t in enumerate((0.9, 1.0, 0.84)): q[..., k] = np.clip((L * t + (q[..., k] - L * t) * s) * br, 0, 255)
    res = np.zeros((H, W, 4), np.uint8); res[..., :3] = q.astype(np.uint8); res[..., 3] = np.where(solid, 255, 0)
    res[out] = (11, 16, 24, 255)
    return Image.fromarray(res, 'RGBA')
