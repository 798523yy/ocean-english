#!/usr/bin/env python3
"""用 AI 生成水彩海洋生物精灵图 + 透明背景处理"""
import urllib.request, os, time, json, sys
from PIL import Image, ImageFilter, ImageDraw

OUTPUT_DIR = 'static/sprites'

CREATURES = [
    ('clownfish', 'cute clownfish watercolor painting, orange white stripes, hand-painted illustration, childrens book style, isolated on white background'),
    ('seahorse', 'seahorse watercolor painting, yellow golden, hand-painted illustration, delicate, isolated on white background'),
    ('starfish', 'starfish watercolor painting, pink coral red, five arms, hand-painted illustration, isolated on white background'),
    ('jellyfish', 'jellyfish watercolor painting, purple translucent dome tentacles, ethereal hand-painted, isolated on white background'),
    ('pufferfish', 'pufferfish watercolor painting, round spiky blue teal, cute hand-painted illustration, isolated on white background'),
    ('turtle', 'sea turtle watercolor painting, green brown shell, swimming gracefully, hand-painted illustration, isolated on white background'),
    ('octopus', 'octopus watercolor painting, pink magenta eight tentacles, hand-painted illustration, isolated on white background'),
    ('stingray', 'stingray watercolor painting, brown grey flat diamond shape, graceful hand-painted, isolated on white background'),
    ('dolphin', 'dolphin watercolor painting, blue grey sleek, jumping smiling, hand-painted illustration, isolated on white background'),
    ('whale', 'whale watercolor painting, deep blue large majestic, hand-painted illustration, isolated on white background'),
    ('shark', 'shark watercolor painting, grey blue sleek predator, hand-painted illustration, isolated on white background'),
    ('seadragon', 'seadragon watercolor painting, teal cyan leafy appendages, delicate hand-painted, isolated on white background'),
    ('mermaid', 'mermaid watercolor painting, pink hair fish tail, graceful feminine hand-painted illustration, isolated on white background'),
    ('narwhal', 'narwhal watercolor painting, pale blue grey whale long spiral tusk, arctic hand-painted, isolated on white background'),
    ('glow_jellyfish', 'glowing bioluminescent jellyfish watercolor painting, neon cyan green, ethereal dark hand-painted, isolated on dark background'),
]

def fetch_image(url, timeout=60):
    """下载图片，带重试"""
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    for attempt in range(3):
        try:
            resp = urllib.request.urlopen(req, timeout=timeout)
            return resp.read()
        except Exception as e:
            if attempt == 2:
                raise
            print(f'    Retry {attempt+1}: {e}')
            time.sleep(3)

def remove_white_bg(img, threshold=230, feather=3):
    """移除白色背景，转为透明PNG (纯PIL实现)"""
    img = img.convert('RGBA')
    w, h = img.size
    pixels = img.load()

    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            # 白色像素 → 透明
            if r > threshold and g > threshold and b > threshold:
                pixels[x, y] = (r, g, b, 0)
            # 近白色 → 半透明渐变
            elif r > threshold - 40 and g > threshold - 40 and b > threshold - 40:
                whiteness = ((r + g + b) / 3 - (threshold - 40)) / 40
                new_alpha = int(255 * (1 - whiteness))
                pixels[x, y] = (r, g, b, max(0, min(255, new_alpha)))

    # 边缘柔化
    if feather > 0:
        alpha = img.split()[3]
        alpha = alpha.filter(ImageFilter.GaussianBlur(feather))
        r, g, b, _ = img.split()
        img = Image.merge('RGBA', (r, g, b, alpha))

    return img

def crop_to_content(img, pad=10):
    """裁切到内容边界"""
    alpha = img.split()[3]
    bbox = alpha.getbbox()
    if not bbox:
        return img
    bbox = (max(0, bbox[0] - pad), max(0, bbox[1] - pad),
            min(img.width, bbox[2] + pad), min(img.height, bbox[3] + pad))
    return img.crop(bbox)

def generate_one(cid, prompt):
    """生成一个精灵"""
    encoded = urllib.request.quote(prompt)
    url = f'https://image.pollinations.ai/prompt/{encoded}?width=400&height=400'
    print(f'  Downloading...')

    data = fetch_image(url)
    tmp_path = os.path.join(OUTPUT_DIR, f'_tmp_{cid}.jpg')
    with open(tmp_path, 'wb') as f:
        f.write(data)

    # 加载并处理
    img = Image.open(tmp_path)
    print(f'    Size: {img.size}, removing white bg...')

    # 对于发光水母使用不同阈值（深色背景）
    if cid == 'glow_jellyfish':
        img = remove_white_bg(img, threshold=60, feather=2)
    else:
        img = remove_white_bg(img, threshold=210, feather=3)

    # 裁切
    img = crop_to_content(img, pad=8)

    # 保存
    out_path = os.path.join(OUTPUT_DIR, f'{cid}.png')
    img.save(out_path, 'PNG', optimize=True)

    size_kb = os.path.getsize(out_path) / 1024
    os.remove(tmp_path)
    print(f'    -> {out_path} ({img.width}x{img.height}, {size_kb:.0f}KB)')
    return True

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    total = len(CREATURES)

    for i, (cid, prompt) in enumerate(CREATURES):
        print(f'[{i+1}/{total}] {cid}')
        try:
            generate_one(cid, prompt)
        except Exception as e:
            print(f'    FAILED: {e}')
            # 如果失败，保留已有的PIL生成的版本
            print(f'    Keeping existing {cid}.png')

        # 请求间隔，避免被限流
        if i < total - 1:
            time.sleep(2)

    print(f'\nDone!')

if __name__ == '__main__':
    main()
