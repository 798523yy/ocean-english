#!/usr/bin/env python3
"""生成水彩风格海洋生物精灵图"""
import os, math, random, colorsys
from PIL import Image, ImageDraw, ImageFilter, ImageChops, ImageOps

OUTPUT_DIR = 'static/sprites'
SIZE = 400
SEED = 42

random.seed(SEED)

# ── 生物定义 ─────────────────────────────────────────
CREATURES = [
    {'id': 'clownfish', 'color': '#FF6B35', 'shape': 'fish', 'size_r': 0.55, 'accents': ['#FFFFFF', '#FF8C60']},
    {'id': 'seahorse', 'color': '#FFD93D', 'shape': 'seahorse', 'size_r': 0.50, 'accents': ['#FFE88A', '#E6C235']},
    {'id': 'starfish', 'color': '#FF8C94', 'shape': 'star', 'size_r': 0.60, 'accents': ['#FFB3B8', '#E07078']},
    {'id': 'jellyfish', 'color': '#C9B1FF', 'shape': 'jellyfish', 'size_r': 0.65, 'accents': ['#E8DBFF', '#B090EE']},
    {'id': 'pufferfish', 'color': '#7EC8E3', 'shape': 'puffer', 'size_r': 0.55, 'accents': ['#B3E2F0', '#5AB0CC']},
    {'id': 'turtle', 'color': '#5D8A5D', 'shape': 'turtle', 'size_r': 0.70, 'accents': ['#8BB88B', '#4A704A']},
    {'id': 'octopus', 'color': '#C44D7A', 'shape': 'octopus', 'size_r': 0.65, 'accents': ['#E88AAA', '#A03060']},
    {'id': 'stingray', 'color': '#8B7355', 'shape': 'ray', 'size_r': 0.72, 'accents': ['#B8A58A', '#6E5A40']},
    {'id': 'dolphin', 'color': '#5B9BD5', 'shape': 'dolphin', 'size_r': 0.72, 'accents': ['#9DC8ED', '#4A80B8']},
    {'id': 'whale', 'color': '#3C6E8C', 'shape': 'whale', 'size_r': 0.85, 'accents': ['#7AA8BD', '#2D5570']},
    {'id': 'shark', 'color': '#6B7B8D', 'shape': 'shark', 'size_r': 0.78, 'accents': ['#A8B6C2', '#556678']},
    {'id': 'seadragon', 'color': '#4ECDC4', 'shape': 'seadragon', 'size_r': 0.70, 'accents': ['#8EE4DE', '#3AA89E']},
    {'id': 'mermaid', 'color': '#FF6B9D', 'shape': 'mermaid', 'size_r': 0.78, 'accents': ['#FFB3CC', '#E05080']},
    {'id': 'narwhal', 'color': '#A8D8EA', 'shape': 'narwhal', 'size_r': 0.82, 'accents': ['#D4EEF5', '#80B8D0']},
    {'id': 'glow_jellyfish', 'color': '#00FFC8', 'shape': 'jellyfish', 'size_r': 0.65,
     'accents': ['#80FFE4', '#00D0A0', '#B3FFEE']},
]

# ── 水彩效果 ─────────────────────────────────────────

def make_paper_texture(size):
    """生成纸张纹理"""
    tex = Image.new('L', (size, size))
    pixels = tex.load()
    for y in range(size):
        for x in range(size):
            v = 240 + int(random.gauss(0, 8))
            pixels[x, y] = max(0, min(255, v))
    tex = tex.filter(ImageFilter.GaussianBlur(1.5))
    return tex


def watercolor_wash(draw, mask, color, opacity=180):
    """在mask区域内填充水彩效果"""
    w, h = mask.size

    # 多层颜色叠加
    for layer in range(3):
        r, g, b = hex_to_rgb(color)

        # 每层微调颜色
        hue_shift = random.uniform(-0.03, 0.03)
        sat_shift = random.uniform(-0.05, 0.05)
        val_shift = random.uniform(-0.08, 0.08)

        hsv = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
        new_h = max(0, min(1, hsv[0] + hue_shift))
        new_s = max(0, min(1, hsv[1] + sat_shift))
        new_v = max(0.3, min(1, hsv[2] + val_shift))
        nr, ng, nb = colorsys.hsv_to_rgb(new_h, new_s, new_v)
        layer_color = (int(nr * 255), int(ng * 255), int(nb * 255))

        # 每层微偏移
        ox = random.randint(-3, 3)
        oy = random.randint(-3, 3)

        layer_img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        layer_px = layer_img.load()
        mask_px = mask.load()

        for y in range(max(0, -oy), min(h, h - oy)):
            for x in range(max(0, -ox), min(w, w - ox)):
                m = mask_px[x + ox, y + oy] if 0 <= x + ox < w and 0 <= y + oy < h else 0
                if m > 30:
                    alpha = int(opacity * m / 255 * (0.3 + random.random() * 0.7))
                    layer_px[x, y] = (*layer_color, alpha)

        # 模糊模拟水彩扩散
        layer_img = layer_img.filter(ImageFilter.GaussianBlur(2.5))

        draw.bitmap((0, 0), layer_img)


def add_edge_darkening(img, mask):
    """边缘加深（水彩 pooling 效果）"""
    # 膨胀mask得到边缘
    dilated = mask.filter(ImageFilter.MaxFilter(5))
    eroded = mask.filter(ImageFilter.MinFilter(5))
    edge = ImageChops.subtract(dilated, eroded)
    edge = edge.filter(ImageFilter.GaussianBlur(4))

    overlay = Image.new('RGBA', img.size, (0, 0, 0, 0))
    ov_px = overlay.load()
    edge_px = edge.load()

    for y in range(img.height):
        for x in range(img.width):
            e = edge_px[x, y]
            if e > 20:
                intensity = int(e * 0.6)
                ov_px[x, y] = (30, 15, 10, intensity)

    img.alpha_composite(overlay)


def add_splatter(img, mask, color, count=30):
    """添加颜料飞溅点"""
    w, h = img.size
    r, g, b = hex_to_rgb(color)
    splash = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    spx = splash.load()
    mp = mask.load()

    for _ in range(count):
        # 在mask边缘附近随机散布
        for attempt in range(20):
            ex = random.randint(30, w - 31)
            ey = random.randint(30, h - 31)
            if mp[ex, ey] > 50:
                continue
            # 检查附近是否有mask区域
            near = False
            for dx in range(-20, 21, 4):
                for dy in range(-20, 21, 4):
                    nx, ny = ex + dx, ey + dy
                    if 0 <= nx < w and 0 <= ny < h and mp[nx, ny] > 80:
                        near = True
                        break
                if near:
                    break
            if not near:
                continue

            # 画飞溅点
            dot_size = random.uniform(1, 4)
            dot_alpha = random.randint(40, 120)
            for dy in range(-int(dot_size), int(dot_size) + 1):
                for dx in range(-int(dot_size), int(dot_size) + 1):
                    px, py = ex + dx, ey + dy
                    if 0 <= px < w and 0 <= py < h:
                        dist = math.sqrt(dx ** 2 + dy ** 2)
                        if dist <= dot_size:
                            a = dot_alpha * (1 - dist / dot_size) * random.uniform(0.5, 1)
                            spx[px, py] = (r, g, b, int(a))
            break

    img.alpha_composite(splash)


def add_highlight(img, mask):
    """添加高光"""
    w, h = img.size
    hl = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    hlp = hl.load()
    mp = mask.load()

    # 从左上方加柔和高光
    for y in range(h):
        for x in range(w):
            m = mp[x, y]
            if m > 80:
                # 越靠近左上越亮
                fx = 1 - x / w
                fy = 1 - y / h
                brightness = (fx * 0.3 + fy * 0.5)
                a = int(brightness * m * 0.35)
                hlp[x, y] = (255, 255, 255, a)

    img.alpha_composite(hl)


# ── 形状绘制 ─────────────────────────────────────────

def hex_to_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def draw_fish_shape(size):
    """小丑鱼/鱼形"""
    img = Image.new('L', (SIZE, SIZE), 0)
    d = ImageDraw.Draw(img)
    cx, cy = SIZE // 2, SIZE // 2
    s = size // 2

    # 椭圆身体
    body_x = cx - int(s * 1.3)
    body_y = cy - int(s * 0.35)
    d.ellipse([body_x, body_y, body_x + int(s * 2.6), body_y + int(s * 0.7)], fill=255)

    # 尾巴
    tail_tip = body_x - int(s * 0.1)
    tail_top = cy - int(s * 0.5)
    tail_bot = cy + int(s * 0.5)
    tail_end = body_x - int(s * 0.8)
    d.polygon([(tail_tip, cy), (tail_end, tail_top), (tail_end, tail_bot)], fill=255)

    return img


def draw_seahorse_shape(size):
    """海马形"""
    img = Image.new('L', (SIZE, SIZE), 0)
    d = ImageDraw.Draw(img)
    cx, cy = SIZE // 2, SIZE // 2
    s = size // 2

    points = []
    base_x = cx - s * 0.3
    # 从头部开始，顺时针
    # 头部（上方弯曲）
    for angle in range(180, -20, -3):
        rad = math.radians(angle)
        r = s * (0.45 + 0.05 * math.sin(rad * 3))
        points.append((base_x + int(math.cos(rad) * r * 0.8), cy - int(s * 0.7) + int(math.sin(rad) * r)))

    # 身体右侧（凸出）
    for angle in range(-20, 160, 3):
        rad = math.radians(angle)
        r = s * (0.55 + 0.15 * math.sin(rad * 1.5))
        points.append((base_x + int(math.cos(rad) * r * 0.6), cy + int(s * 0.8) - int(math.sin(rad) * r * 1.2)))

    # 卷曲尾巴
    tail_cx = base_x - int(s * 0.1)
    tail_cy = cy + int(s * 0.9)
    for angle in range(180, -90, -5):
        rad = math.radians(angle)
        r = s * 0.25
        points.append((tail_cx + int(math.cos(rad) * r), tail_cy + int(math.sin(rad) * r)))

    if len(points) > 3:
        d.polygon(points, fill=255)

    # 加粗
    img = img.filter(ImageFilter.GaussianBlur(3))
    img = img.point(lambda x: 255 if x > 50 else 0)

    return img


def draw_starfish_shape(size):
    """海星形 - 五角星"""
    img = Image.new('L', (SIZE, SIZE), 0)
    d = ImageDraw.Draw(img)
    cx, cy = SIZE // 2, SIZE // 2
    s = size // 2

    points = []
    for i in range(10):
        angle = math.radians(i * 36 - 90)
        r = s if i % 2 == 0 else s * 0.45
        points.append((cx + int(math.cos(angle) * r), cy + int(math.sin(angle) * r)))

    d.polygon(points, fill=255)
    img = img.filter(ImageFilter.GaussianBlur(1))
    img = img.point(lambda x: 255 if x > 60 else 0)
    return img


def draw_jellyfish_shape(size):
    """水母形"""
    img = Image.new('L', (SIZE, SIZE), 0)
    d = ImageDraw.Draw(img)
    cx, cy = SIZE // 2, SIZE // 2
    s = size // 2

    # 伞状头部
    dome_top = cy - int(s * 0.75)
    dome_bot = cy + int(s * 0.15)
    d.ellipse([cx - int(s * 0.65), dome_top, cx + int(s * 0.65), dome_bot], fill=255)
    # 下半部分更宽
    d.ellipse([cx - int(s * 0.7), cy - int(s * 0.15), cx + int(s * 0.7), cy + int(s * 0.2)], fill=255)

    # 触手
    for i in range(6):
        tx = cx - int(s * 0.4) + i * int(s * 0.16)
        tentacle_top = cy + int(s * 0.1)
        tentacle_bot = cy + int(s * 0.6 + random.uniform(-0.1, 0.15) * s)
        # 波浪触手
        wave_pts = []
        segs = 5
        for j in range(segs + 1):
            frac = j / segs
            wx = tx + int(math.sin(frac * math.pi * 2 + i * 0.7) * s * 0.15)
            wy = tentacle_top + int(frac * (tentacle_bot - tentacle_top))
            wave_pts.append((wx, wy))
        d.line(wave_pts, fill=255, width=max(3, int(s * 0.06)))

    img = img.filter(ImageFilter.GaussianBlur(2))
    img = img.point(lambda x: 255 if x > 40 else 0)
    return img


def draw_pufferfish_shape(size):
    """河豚形 - 圆形带刺"""
    img = Image.new('L', (SIZE, SIZE), 0)
    d = ImageDraw.Draw(img)
    cx, cy = SIZE // 2, SIZE // 2
    s = size // 2

    # 圆形身体
    d.ellipse([cx - int(s * 0.9), cy - int(s * 0.8), cx + int(s * 0.9), cy + int(s * 0.8)], fill=255)

    # 小尾巴
    tail_x = cx - int(s * 0.85)
    d.polygon([(tail_x, cy), (tail_x - int(s * 0.3), cy - int(s * 0.25)),
               (tail_x - int(s * 0.3), cy + int(s * 0.25))], fill=255)

    # 小刺
    for angle in range(0, 360, 30):
        rad = math.radians(angle)
        sx = cx + int(math.cos(rad) * s * 0.85)
        sy = cy + int(math.sin(rad) * s * 0.78)
        ex = cx + int(math.cos(rad) * s * 1.05)
        ey = cy + int(math.sin(rad) * s * 0.95)
        d.line([(sx, sy), (ex, ey)], fill=255, width=3)

    img = img.filter(ImageFilter.GaussianBlur(1.5))
    img = img.point(lambda x: 255 if x > 50 else 0)
    return img


def draw_turtle_shape(size):
    """海龟形"""
    img = Image.new('L', (SIZE, SIZE), 0)
    d = ImageDraw.Draw(img)
    cx, cy = SIZE // 2, SIZE // 2
    s = size // 2

    # 椭圆壳
    d.ellipse([cx - int(s * 1.0), cy - int(s * 0.55), cx + int(s * 1.0), cy + int(s * 0.55)], fill=255)

    # 头部
    head_x = cx + int(s * 0.85)
    d.ellipse([head_x - int(s * 0.18), cy - int(s * 0.2), head_x + int(s * 0.35), cy + int(s * 0.2)], fill=255)

    # 前鳍
    for flip_y, flip_dir in [(cy - int(s * 0.35), -1), (cy + int(s * 0.35), 1)]:
        f_points = [
            (cx + int(s * 0.4), flip_y),
            (cx + int(s * 0.9), flip_y + flip_dir * int(s * 0.45)),
            (cx + int(s * 0.3), flip_y + flip_dir * int(s * 0.15)),
        ]
        d.polygon(f_points, fill=255)

    # 后鳍
    for flip_y, flip_dir in [(cy - int(s * 0.3), -1), (cy + int(s * 0.3), 1)]:
        f_points = [
            (cx - int(s * 0.4), flip_y),
            (cx - int(s * 0.7), flip_y + flip_dir * int(s * 0.35)),
            (cx - int(s * 0.2), flip_y + flip_dir * int(s * 0.1)),
        ]
        d.polygon(f_points, fill=255)

    img = img.filter(ImageFilter.GaussianBlur(2))
    img = img.point(lambda x: 255 if x > 45 else 0)
    return img


def draw_octopus_shape(size):
    """章鱼形"""
    img = Image.new('L', (SIZE, SIZE), 0)
    d = ImageDraw.Draw(img)
    cx, cy = SIZE // 2, SIZE // 2
    s = size // 2

    # 头部
    d.ellipse([cx - int(s * 0.55), cy - int(s * 0.7), cx + int(s * 0.55), cy + int(s * 0.25)], fill=255)

    # 8条触手
    for i in range(8):
        angle_base = -math.pi * 0.8 + i * math.pi * 1.6 / 7
        start_x = cx + int(math.cos(angle_base) * s * 0.4)
        start_y = cy + int(math.sin(angle_base) * s * 0.2) + int(s * 0.1)

        tentacle_pts = [(start_x, start_y)]
        for j in range(1, 5):
            frac = j / 4
            angle = angle_base + math.sin(frac * math.pi * 2 + i) * 0.5
            tx = start_x + int(math.cos(angle) * s * 0.7 * frac)
            ty = start_y + int(math.sin(angle) * s * 0.4 * frac) + int(s * 0.3 * frac)
            tentacle_pts.append((tx, ty))

        d.line(tentacle_pts, fill=255, width=max(4, int(s * 0.1)))

    img = img.filter(ImageFilter.GaussianBlur(2.5))
    img = img.point(lambda x: 255 if x > 40 else 0)
    return img


def draw_ray_shape(size):
    """鳐鱼形 - 菱形/飞毯"""
    img = Image.new('L', (SIZE, SIZE), 0)
    d = ImageDraw.Draw(img)
    cx, cy = SIZE // 2, SIZE // 2
    s = size // 2

    # 菱形身体
    points = [
        (cx, cy - int(s * 0.25)),  # 顶部
        (cx + int(s * 1.2), cy + int(s * 0.3)),  # 右
        (cx + int(s * 0.8), cy + int(s * 0.15)),  # 右内
        (cx, cy + int(s * 0.1)),  # 底部
        (cx - int(s * 0.8), cy + int(s * 0.15)),  # 左内
        (cx - int(s * 1.2), cy + int(s * 0.3)),  # 左
    ]
    d.polygon(points, fill=255)

    # 尾巴
    tail_start = cx
    tail_end = cx + int(s * 0.8)
    d.line([(tail_start, cy - int(s * 0.05)), (tail_end, cy - int(s * 0.22))], fill=255, width=5)

    img = img.filter(ImageFilter.GaussianBlur(2))
    img = img.point(lambda x: 255 if x > 45 else 0)
    return img


def draw_dolphin_shape(size):
    """海豚形"""
    img = Image.new('L', (SIZE, SIZE), 0)
    d = ImageDraw.Draw(img)
    cx, cy = SIZE // 2, SIZE // 2
    s = size // 2

    # 流线型身体
    points = [
        (cx - int(s * 1.2), cy),  # 尾
        (cx - int(s * 0.8), cy - int(s * 0.15)),  # 尾上
        (cx - int(s * 0.3), cy - int(s * 0.4)),  # 背脊
        (cx + int(s * 0.4), cy - int(s * 0.2)),  # 头顶
        (cx + int(s * 1.0), cy - int(s * 0.05)),  # 嘴尖
        (cx + int(s * 0.3), cy + int(s * 0.05)),  # 嘴下
        (cx - int(s * 0.4), cy + int(s * 0.3)),  # 腹
        (cx - int(s * 0.8), cy + int(s * 0.15)),  # 尾下
    ]
    d.polygon(points, fill=255)

    # 背鳍
    df_points = [
        (cx - int(s * 0.1), cy - int(s * 0.35)),
        (cx + int(s * 0.1), cy - int(s * 0.75)),
        (cx + int(s * 0.3), cy - int(s * 0.25)),
    ]
    d.polygon(df_points, fill=255)

    img = img.filter(ImageFilter.GaussianBlur(2))
    img = img.point(lambda x: 255 if x > 45 else 0)
    return img


def draw_whale_shape(size):
    """鲸鱼形"""
    img = Image.new('L', (SIZE, SIZE), 0)
    d = ImageDraw.Draw(img)
    cx, cy = SIZE // 2, SIZE // 2
    s = size // 2

    # 大椭圆身体
    d.ellipse([cx - int(s * 1.1), cy - int(s * 0.5), cx + int(s * 0.9), cy + int(s * 0.5)], fill=255)

    # 尾鳍
    tail_x = cx - int(s * 1.0)
    d.polygon([(tail_x, cy), (tail_x - int(s * 0.4), cy - int(s * 0.5)),
               (tail_x - int(s * 0.35), cy + int(s * 0.5))], fill=255)

    # 小背鳍
    df_x = cx - int(s * 0.2)
    d.polygon([(df_x, cy - int(s * 0.45)), (df_x + int(s * 0.2), cy - int(s * 0.8)),
               (df_x + int(s * 0.3), cy - int(s * 0.4))], fill=255)

    img = img.filter(ImageFilter.GaussianBlur(2))
    img = img.point(lambda x: 255 if x > 45 else 0)
    return img


def draw_shark_shape(size):
    """鲨鱼形"""
    img = Image.new('L', (SIZE, SIZE), 0)
    d = ImageDraw.Draw(img)
    cx, cy = SIZE // 2, SIZE // 2
    s = size // 2

    points = [
        (cx - int(s * 1.0), cy),  # 尾
        (cx - int(s * 0.6), cy - int(s * 0.15)),
        (cx - int(s * 0.3), cy - int(s * 0.4)),  # 背
        (cx + int(s * 0.5), cy - int(s * 0.25)),  # 头
        (cx + int(s * 1.2), cy),  # 鼻尖
        (cx + int(s * 0.5), cy + int(s * 0.1)),
        (cx - int(s * 0.5), cy + int(s * 0.25)),  # 腹
        (cx - int(s * 0.7), cy + int(s * 0.12)),
    ]
    d.polygon(points, fill=255)

    # 背鳍
    df_x = cx - int(s * 0.2)
    d.polygon([(df_x, cy - int(s * 0.25)), (df_x + int(s * 0.3), cy - int(s * 0.75)),
               (df_x + int(s * 0.5), cy - int(s * 0.2))], fill=255)

    # 胸鳍
    d.polygon([(cx + int(s * 0.1), cy + int(s * 0.05)), (cx - int(s * 0.15), cy + int(s * 0.4)),
               (cx + int(s * 0.3), cy + int(s * 0.15))], fill=255)

    img = img.filter(ImageFilter.GaussianBlur(2))
    img = img.point(lambda x: 255 if x > 45 else 0)
    return img


def draw_seadragon_shape(size):
    """海龙形"""
    img = Image.new('L', (SIZE, SIZE), 0)
    d = ImageDraw.Draw(img)
    cx, cy = SIZE // 2, SIZE // 2
    s = size // 2

    # 长身体
    body_pts = []
    for i in range(20):
        frac = i / 19
        bx = cx - int(s * 1.0) + int(frac * s * 2.0)
        by = cy + int(math.sin(frac * math.pi * 2) * s * 0.2)
        body_pts.append((bx, by))
    d.line(body_pts, fill=255, width=max(8, int(s * 0.25)))

    # 叶状附肢
    for i in range(4):
        frac = i / 3
        lx = cx - int(s * 0.6) + int(frac * s * 1.2)
        ly = cy + int(math.sin(frac * math.pi * 2) * s * 0.2)
        # 上方叶片
        leaf_pts = [(lx, ly - int(s * 0.1)), (lx - int(s * 0.1), ly - int(s * 0.4)),
                    (lx + int(s * 0.15), ly - int(s * 0.35)), (lx + int(s * 0.05), ly - int(s * 0.05))]
        d.polygon(leaf_pts, fill=255)
        # 下方叶片
        leaf_pts2 = [(lx, ly + int(s * 0.1)), (lx + int(s * 0.1), ly + int(s * 0.35)),
                     (lx - int(s * 0.15), ly + int(s * 0.3)), (lx - int(s * 0.05), ly + int(s * 0.05))]
        d.polygon(leaf_pts2, fill=255)

    img = img.filter(ImageFilter.GaussianBlur(2))
    img = img.point(lambda x: 255 if x > 40 else 0)
    return img


def draw_mermaid_shape(size):
    """美人鱼形"""
    img = Image.new('L', (SIZE, SIZE), 0)
    d = ImageDraw.Draw(img)
    cx, cy = SIZE // 2, SIZE // 2
    s = size // 2

    # 头部
    head_cy = cy - int(s * 0.55)
    d.ellipse([cx - int(s * 0.15), head_cy - int(s * 0.18), cx + int(s * 0.15), head_cy + int(s * 0.18)], fill=255)

    # 身体/躯干
    body_top = head_cy + int(s * 0.15)
    d.polygon([
        (cx - int(s * 0.1), body_top),
        (cx + int(s * 0.1), body_top),
        (cx + int(s * 0.15), cy - int(s * 0.05)),
        (cx - int(s * 0.15), cy - int(s * 0.05)),
    ], fill=255)

    # 鱼尾
    tail_pts = []
    for i in range(21):
        frac = i / 20
        tx = cx + int(math.sin(frac * math.pi * 1.2) * s * 0.2)
        ty = cy + int(frac * s * 0.7)
        tail_pts.append((tx, ty))
    d.line(tail_pts, fill=255, width=max(10, int(s * 0.3)))

    # 尾鳍
    tip_x = tail_pts[-1][0]
    tip_y = tail_pts[-1][1]
    d.polygon([(tip_x, tip_y), (tip_x - int(s * 0.35), tip_y - int(s * 0.2)),
               (tip_x - int(s * 0.3), tip_y), (tip_x - int(s * 0.35), tip_y + int(s * 0.2))], fill=255)

    # 头发（简化）
    d.ellipse([cx - int(s * 0.22), head_cy - int(s * 0.12), cx + int(s * 0.22), head_cy + int(s * 0.05)], fill=200)

    img = img.filter(ImageFilter.GaussianBlur(2))
    img = img.point(lambda x: 255 if x > 50 else 0)
    return img


def draw_narwhal_shape(size):
    """独角鲸形 - 类似鲸鱼但更修长 + 长角"""
    img = Image.new('L', (SIZE, SIZE), 0)
    d = ImageDraw.Draw(img)
    cx, cy = SIZE // 2, SIZE // 2
    s = size // 2

    # 修长身体
    d.ellipse([cx - int(s * 0.9), cy - int(s * 0.35), cx + int(s * 0.8), cy + int(s * 0.35)], fill=255)

    # 尾鳍
    tail_x = cx - int(s * 0.85)
    d.polygon([(tail_x, cy), (tail_x - int(s * 0.3), cy - int(s * 0.35)),
               (tail_x - int(s * 0.25), cy + int(s * 0.35))], fill=255)

    # 长角
    tusk_base_x = cx + int(s * 0.6)
    tusk_base_y = cy + int(s * 0.05)
    tusk_tip_x = cx + int(s * 1.4)
    tusk_tip_y = cy - int(s * 0.2)
    d.line([(tusk_base_x, tusk_base_y), (tusk_tip_x, tusk_tip_y)], fill=255, width=6)

    # 小鳍
    d.polygon([(cx + int(s * 0.1), cy + int(s * 0.3)), (cx - int(s * 0.15), cy + int(s * 0.55)),
               (cx + int(s * 0.3), cy + int(s * 0.2))], fill=255)

    img = img.filter(ImageFilter.GaussianBlur(2))
    img = img.point(lambda x: 255 if x > 45 else 0)
    return img


# ── 主体生成逻辑 ─────────────────────────────────────

SHAPE_FUNCS = {
    'fish': draw_fish_shape,
    'seahorse': draw_seahorse_shape,
    'star': draw_starfish_shape,
    'jellyfish': draw_jellyfish_shape,
    'puffer': draw_pufferfish_shape,
    'turtle': draw_turtle_shape,
    'octopus': draw_octopus_shape,
    'ray': draw_ray_shape,
    'dolphin': draw_dolphin_shape,
    'whale': draw_whale_shape,
    'shark': draw_shark_shape,
    'seadragon': draw_seadragon_shape,
    'mermaid': draw_mermaid_shape,
    'narwhal': draw_narwhal_shape,
}


def generate_sprite(creature):
    """生成单个精灵图"""
    cid = creature['id']
    color = creature['color']
    shape = creature['shape']
    size_r = creature['size_r']
    accents = creature['accents']
    size_px = int(SIZE * size_r)

    print(f'  Generating {cid}...')

    # 创建透明画布
    img = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # 生成形状mask
    shape_func = SHAPE_FUNCS.get(shape, draw_fish_shape)
    mask = shape_func(size_px)
    mask = mask.filter(ImageFilter.GaussianBlur(1))

    # 纸张纹理
    paper = make_paper_texture(SIZE)

    # 水彩底色 wash
    watercolor_wash(draw, mask, color, opacity=220)

    # 强调色 wash
    for accent in accents[:2]:
        watercolor_wash(draw, mask, accent, opacity=100)

    # 边缘加深
    add_edge_darkening(img, mask)

    # 高光
    add_highlight(img, mask)

    # 飞溅点
    add_splatter(img, mask, color, count=random.randint(15, 35))
    add_splatter(img, mask, accents[-1], count=random.randint(8, 20))

    # 纸张纹理叠加
    tex_overlay = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    tex_px = tex_overlay.load()
    paper_px = paper.load()
    mask_px = mask.load()
    for y in range(SIZE):
        for x in range(SIZE):
            if mask_px[x, y] > 20:
                t = paper_px[x, y]
                variation = (t - 245) * 0.3
                tex_px[x, y] = (int(variation), int(variation), int(variation), int(abs(variation) * 1.5))
    img.alpha_composite(tex_overlay)

    # 整体柔化
    alpha = img.split()[3]
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.7))
    r, g, b, _ = img.split()
    img = Image.merge('RGBA', (r, g, b, alpha))

    # 裁切到实际内容
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
        # 保持一些留白
        pad = 15
        new_img = Image.new('RGBA',
                            (img.width + pad * 2, img.height + pad * 2),
                            (0, 0, 0, 0))
        new_img.paste(img, (pad, pad))
        img = new_img

    # 保存
    path = os.path.join(OUTPUT_DIR, f'{cid}.png')
    img.save(path, 'PNG', optimize=True)
    size_kb = os.path.getsize(path) / 1024
    print(f'    -> {path} ({size_kb:.0f}KB)')
    return path


# ── 主入口 ───────────────────────────────────────────

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print(f'Generating {len(CREATURES)} watercolor sprites...\n')

    for creature in CREATURES:
        generate_sprite(creature)

    print(f'\nDone! {len(CREATURES)} sprites saved to {OUTPUT_DIR}/')


if __name__ == '__main__':
    main()
