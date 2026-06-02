# 水族馆生物形象升级 & 动画特效增强 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将水族馆从纯 Canvas 几何绘图升级为水彩精灵图 + 6大动画特效系统

**Architecture:** 将 500 行的 aquarium.js 拆分为 7 个独立模块（sprites/swim-ai/particles/lighting/environment/interaction/aquarium），通过全局对象暴露接口，由 Aquarium 主控制器统一调度

**Tech Stack:** Vanilla JavaScript (ES6+), Canvas 2D API, PNG sprites

---

## File Structure

```
static/
├── sprites/                    # NEW: 用户提供的水彩精灵图
│   ├── clownfish.png
│   ├── seahorse.png
│   ├── ...                     # (共15张)
│   └── placeholder.png         # NEW: 临时占位图（1x1透明PNG）
├── js/
│   ├── sprites.js              # NEW: 精灵加载/缓存/绘制
│   ├── swim-ai.js              # NEW: 智能游动AI
│   ├── particles.js            # NEW: 粒子特效系统
│   ├── lighting.js             # NEW: 光影系统
│   ├── environment.js          # NEW: 环境装饰
│   ├── interaction.js          # NEW: 增强交互
│   ├── aquarium.js             # MODIFY: 重构为轻量主控制器
│   ├── api.js                  # UNCHANGED
│   ├── state.js                # UNCHANGED
│   ├── app.js                  # UNCHANGED
│   ├── tasks.js                # UNCHANGED
│   └── blindbox.js             # UNCHANGED
├── css/
│   └── main.css                # MODIFY: 新增 creature-info-card 样式
└── index.html                  # MODIFY: 更新 script 引入顺序
data/
└── creatures.json              # MODIFY: 新增 sprite_scale 字段
```

---

### Task 1: 创建目录结构与占位精灵

**Files:**
- Create: `static/sprites/.gitkeep`
- Modify: `data/creatures.json`

- [ ] **Step 1: 创建 sprites 目录**

```bash
mkdir -p "c:/Users/wei/Desktop/English aquarium/static/sprites"
```

- [ ] **Step 2: 为 creatures.json 中每种生物添加 sprite_scale 字段**

读取 `data/creatures.json`，为每个生物条目添加 `"sprite_scale": 1.0`。体型大的生物（whale, shark, narwhal）设为 1.2-1.4，小型生物（clownfish, seahorse）设为 0.8-0.9。

具体修改：在 `data/creatures.json` 中，每个 creature 对象添加 `"sprite_scale"` 字段：

```json
{
  "id": "clownfish",     ... "sprite_scale": 0.85 },
{ "id": "seahorse",      ... "sprite_scale": 0.8 },
{ "id": "starfish",      ... "sprite_scale": 0.9 },
{ "id": "jellyfish",     ... "sprite_scale": 1.0 },
{ "id": "pufferfish",    ... "sprite_scale": 0.85 },
{ "id": "turtle",        ... "sprite_scale": 1.1 },
{ "id": "octopus",       ... "sprite_scale": 1.0 },
{ "id": "stingray",      ... "sprite_scale": 1.15 },
{ "id": "dolphin",       ... "sprite_scale": 1.2 },
{ "id": "whale",         ... "sprite_scale": 1.4 },
{ "id": "shark",         ... "sprite_scale": 1.3 },
{ "id": "seadragon",     ... "sprite_scale": 1.0 },
{ "id": "mermaid",       ... "sprite_scale": 1.2 },
{ "id": "narwhal",       ... "sprite_scale": 1.35 },
{ "id": "glow_jellyfish",... "sprite_scale": 1.0 }
```

- [ ] **Step 3: Commit**

```bash
cd "c:/Users/wei/Desktop/English aquarium"
git add static/sprites/.gitkeep data/creatures.json
git commit -m "feat: add sprite directory and sprite_scale to creatures.json"
```

---

### Task 2: 创建精灵加载与渲染模块 (sprites.js)

**Files:**
- Create: `static/js/sprites.js`

- [ ] **Step 1: 创建 sprites.js**

```javascript
// sprites.js - 精灵图片加载、缓存、绘制
const SpriteManager = {
    sprites: {},          // id → Image
    loadedCount: 0,
    totalCount: 0,
    allLoaded: false,
    fallbackCache: {},    // id → fallback draw function

    /**
     * 预加载所有生物精灵图
     * @param {Array} creatureIds - 生物ID列表
     * @returns {Promise}
     */
    async preload(creatureIds) {
        this.totalCount = creatureIds.length;
        this.loadedCount = 0;
        this.allLoaded = false;

        const promises = creatureIds.map(id => {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    this.sprites[id] = img;
                    this.loadedCount++;
                    resolve(true);
                };
                img.onerror = () => {
                    // 加载失败，保持为 null，后续使用 fallback
                    this.sprites[id] = null;
                    this.loadedCount++;
                    resolve(false);
                };
                img.src = `/sprites/${id}.png`;
            });
        });

        await Promise.all(promises);
        this.allLoaded = true;
    },

    /**
     * 检查指定生物精灵是否已加载
     */
    isLoaded(id) {
        return this.sprites[id] != null;
    },

    /**
     * 获取加载进度
     */
    getProgress() {
        if (this.totalCount === 0) return 0;
        return this.loadedCount / this.totalCount;
    },

    /**
     * 绘制生物精灵（主方法）
     * @param {CanvasRenderingContext2D} ctx
     * @param {Object} creature - creatures.json 中的生物对象
     * @param {number} x - 画布坐标 x
     * @param {number} y - 画布坐标 y
     * @param {number} scale - 基础缩放
     * @param {number} alpha - 透明度 (0-1, 用于淡入)
     * @param {number} t - 时间（用于 fallback 动画）
     */
    draw(ctx, creature, x, y, scale, alpha, t) {
        const img = this.sprites[creature.id];
        const spriteScale = creature.sprite_scale || 1.0;
        const finalScale = scale * spriteScale;
        const size = (creature.size || 50) * finalScale;

        ctx.save();
        ctx.globalAlpha = alpha || 1.0;

        if (img) {
            // 精灵已加载：绘制图片，以图片中心为锚点
            ctx.translate(x, y);
            ctx.drawImage(img, -size / 2, -size / 2, size, size);
        } else {
            // 回退：绘制简化的几何图形
            this.drawFallback(ctx, creature, x, y, finalScale, t);
        }

        ctx.restore();
    },

    /**
     * 回退几何图形绘制（精灵未加载时使用）
     * 保留原 aquarium.js 的精简版绘制逻辑
     */
    drawFallback(ctx, creature, x, y, scale, t) {
        const size = (creature.size || 50) * scale;
        ctx.save();
        ctx.translate(x, y);

        // 根据形状绘制简化图形
        switch (creature.shape) {
            case 'fish':
                ctx.fillStyle = creature.color;
                ctx.beginPath();
                ctx.ellipse(0, 0, size * 0.35, size * 0.2, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(-size * 0.35, 0);
                ctx.lineTo(-size * 0.55, -size * 0.2);
                ctx.lineTo(-size * 0.55, size * 0.2);
                ctx.closePath();
                ctx.fill();
                break;
            case 'jellyfish':
                ctx.fillStyle = creature.color + '99';
                ctx.beginPath();
                ctx.ellipse(0, -size * 0.1, size * 0.4, size * 0.3, 0, Math.PI, 0);
                ctx.fill();
                ctx.fillStyle = creature.color;
                ctx.beginPath();
                ctx.arc(0, -size * 0.1, size * 0.4, Math.PI, 0);
                ctx.fill();
                break;
            case 'star':
                ctx.fillStyle = creature.color;
                ctx.beginPath();
                for (let i = 0; i < 5; i++) {
                    const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
                    const ox = Math.cos(a) * size * 0.35;
                    const oy = Math.sin(a) * size * 0.35;
                    const ix = Math.cos(a + Math.PI / 5) * size * 0.14;
                    const iy = Math.sin(a + Math.PI / 5) * size * 0.14;
                    if (i === 0) ctx.moveTo(ox, oy);
                    else ctx.lineTo(ox, oy);
                    ctx.lineTo(ix, iy);
                }
                ctx.closePath();
                ctx.fill();
                break;
            default:
                // 通用圆形回退
                ctx.fillStyle = creature.color;
                ctx.beginPath();
                ctx.arc(0, 0, size * 0.35, 0, Math.PI * 2);
                ctx.fill();
                break;
        }
        ctx.restore();
    }
};
```

- [ ] **Step 2: Commit**

```bash
cd "c:/Users/wei/Desktop/English aquarium"
git add static/js/sprites.js
git commit -m "feat: add SpriteManager for sprite loading and fallback rendering"
```

---

### Task 3: 创建智能游动 AI 模块 (swim-ai.js)

**Files:**
- Create: `static/js/swim-ai.js`

- [ ] **Step 1: 创建 swim-ai.js**

```javascript
// swim-ai.js - 智能游动状态机
const SwimAI = {
    states: {},          // creature_id → state object
    feedingTarget: null,
    feedingTimer: 0,
    canvasWidth: 0,
    canvasHeight: 0,

    /**
     * 初始化所有生物的AI状态
     */
    init(layout, creatures, width, height) {
        this.canvasWidth = width;
        this.canvasHeight = height;
        this.states = {};

        layout.forEach((item, index) => {
            const creature = creatures.find(c => c.id === item.creature_id);
            if (!creature) return;

            const behavior = this.getBehavior(creature);
            this.states[`${item.creature_id}_${index}`] = {
                id: `${item.creature_id}_${index}`,
                creatureId: item.creature_id,
                x: (item.x / 100) * width,
                y: (item.y / 100) * (height - 80),
                angle: Math.random() * Math.PI * 2,
                speed: behavior.speedRange[0] + Math.random() * (behavior.speedRange[1] - behavior.speedRange[0]),
                targetX: null,
                targetY: null,
                state: 'free',       // free | moving | pausing | turning
                stateTimer: 0,
                pauseDuration: 0,
                baseSpeed: behavior.speedRange[0] + Math.random() * (behavior.speedRange[1] - behavior.speedRange[0]),
                turnRate: behavior.turnRate,
                pauseChance: behavior.pauseChance,
                schooling: behavior.schooling,
                wobblePhase: Math.random() * Math.PI * 2,
            };
        });
    },

    /**
     * 获取生物行为参数
     */
    getBehavior(creature) {
        const defaults = {
            speedRange: [0.2, 0.6],
            turnRate: 0.03,
            pauseChance: 0.005,
            schooling: false,
        };

        // 按生物类型定制
        const overrides = {
            dolphin:     { speedRange: [0.5, 1.2], turnRate: 0.05, pauseChance: 0.003 },
            whale:       { speedRange: [0.15, 0.35], turnRate: 0.015, pauseChance: 0.01 },
            shark:       { speedRange: [0.4, 0.9], turnRate: 0.04, pauseChance: 0.004 },
            turtle:      { speedRange: [0.2, 0.4], turnRate: 0.02, pauseChance: 0.008 },
            jellyfish:   { speedRange: [0.08, 0.2], turnRate: 0.01, pauseChance: 0.02 },
            clownfish:   { speedRange: [0.4, 0.8], turnRate: 0.06, pauseChance: 0.005, schooling: true },
            seahorse:    { speedRange: [0.05, 0.15], turnRate: 0.02, pauseChance: 0.015 },
            pufferfish:  { speedRange: [0.15, 0.35], turnRate: 0.04, pauseChance: 0.01 },
            octopus:     { speedRange: [0.1, 0.25], turnRate: 0.03, pauseChance: 0.012 },
            stingray:    { speedRange: [0.3, 0.6], turnRate: 0.025, pauseChance: 0.006 },
            starfish:    { speedRange: [0.02, 0.06], turnRate: 0.01, pauseChance: 0.05 },
            seadragon:   { speedRange: [0.08, 0.2], turnRate: 0.015, pauseChance: 0.015 },
            mermaid:     { speedRange: [0.3, 0.7], turnRate: 0.04, pauseChance: 0.004 },
            narwhal:     { speedRange: [0.2, 0.45], turnRate: 0.02, pauseChance: 0.008 },
            glow_jellyfish: { speedRange: [0.06, 0.15], turnRate: 0.01, pauseChance: 0.025 },
        };

        return { ...defaults, ...(overrides[creature.id] || {}) };
    },

    /**
     * 每帧更新所有生物位置
     */
    update(dt) {
        if (!dt || dt > 100) dt = 16; // 防止跳帧

        const stateIds = Object.keys(this.states);
        const schoolGroups = this.buildSchoolGroups();

        for (const stateId of stateIds) {
            const s = this.states[stateId];
            s.stateTimer += dt;

            switch (s.state) {
                case 'free':
                    this.updateFree(s, dt, schoolGroups);
                    break;
                case 'moving':
                    this.updateMoving(s, dt);
                    break;
                case 'pausing':
                    this.updatePausing(s, dt);
                    break;
                case 'turning':
                    this.updateTurning(s, dt);
                    break;
                case 'feeding':
                    this.updateFeeding(s, dt);
                    break;
            }

            // 边界检测
            this.checkBounds(s);
        }

        // 投喂计时器
        if (this.feedingTimer > 0) {
            this.feedingTimer -= dt;
            if (this.feedingTimer <= 0) {
                this.endFeeding();
            }
        }
    },

    updateFree(s, dt, schoolGroups) {
        // 随机选择新目标
        if (!s.targetX || Math.random() < 0.002) {
            s.targetX = 100 + Math.random() * (this.canvasWidth - 200);
            s.targetY = 80 + Math.random() * (this.canvasHeight - 200);
            s.state = 'moving';
            return;
        }

        // 随机暂停
        if (Math.random() < s.pauseChance) {
            s.state = 'pausing';
            s.pauseDuration = 1000 + Math.random() * 3000;
            s.stateTimer = 0;
            return;
        }

        // 同群行为：与群友保持松散一致
        if (s.schooling && schoolGroups[s.creatureId]) {
            const group = schoolGroups[s.creatureId];
            if (group.length >= 2 && Math.random() < 0.01) {
                // 跟随群友的平均方向
                let avgAngle = 0;
                group.forEach(member => {
                    if (member !== s.id) {
                        const other = this.states[member];
                        if (other) avgAngle += other.angle;
                    }
                });
                avgAngle /= (group.length - 1);
                s.targetX = s.x + Math.cos(avgAngle) * 200;
                s.targetY = s.y + Math.sin(avgAngle) * 200;
                s.state = 'moving';
                return;
            }
        }

        // 自由漂移
        s.x += Math.cos(s.angle) * s.speed * 0.3;
        s.y += Math.sin(s.angle) * s.speed * 0.3;
        s.angle += (Math.random() - 0.5) * s.turnRate * 0.1;
    },

    updateMoving(s, dt) {
        if (!s.targetX) {
            s.state = 'free';
            return;
        }

        const dx = s.targetX - s.x;
        const dy = s.targetY - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 20) {
            s.state = 'free';
            s.targetX = null;
            s.targetY = null;
            return;
        }

        // Ease towards target
        const targetAngle = Math.atan2(dy, dx);
        const angleDiff = targetAngle - s.angle;
        // 标准化到 [-PI, PI]
        const normalizedDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
        s.angle += normalizedDiff * s.turnRate * (dt / 16);

        const speedFactor = Math.min(1, dist / 150);
        s.speed = s.baseSpeed * (0.5 + 0.5 * speedFactor);
        s.x += Math.cos(s.angle) * s.speed * (dt / 16);
        s.y += Math.sin(s.angle) * s.speed * (dt / 16);
    },

    updatePausing(s, dt) {
        // 轻微原地摆动
        s.x += Math.sin(s.stateTimer * 0.003 + s.wobblePhase) * 0.1;
        s.y += Math.cos(s.stateTimer * 0.004 + s.wobblePhase) * 0.1;

        if (s.stateTimer > s.pauseDuration) {
            s.state = 'free';
        }
    },

    updateTurning(s, dt) {
        s.angle += s.turnRate * 0.5 * (dt / 16);
        s.x += Math.cos(s.angle) * s.speed * 0.2 * (dt / 16);
        s.y += Math.sin(s.angle) * s.speed * 0.2 * (dt / 16);

        if (s.stateTimer > 1500) {
            s.state = 'free';
        }
    },

    updateFeeding(s, dt) {
        if (!this.feedingTarget) {
            s.state = 'free';
            return;
        }
        const dx = this.feedingTarget.x - s.x;
        const dy = this.feedingTarget.y - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const targetAngle = Math.atan2(dy, dx);
        const angleDiff = targetAngle - s.angle;
        s.angle += Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff)) * s.turnRate * 1.5;

        const speed = Math.min(s.baseSpeed * 2, dist * 0.02);
        s.x += Math.cos(s.angle) * speed;
        s.y += Math.sin(s.angle) * speed;

        if (dist < 30) {
            s.state = 'pausing';
            s.pauseDuration = 2000;
            s.stateTimer = 0;
        }
    },

    checkBounds(s) {
        const margin = 60;
        let needsTurn = false;

        if (s.x < margin) { s.x = margin; needsTurn = true; }
        if (s.x > this.canvasWidth - margin) { s.x = this.canvasWidth - margin; needsTurn = true; }
        if (s.y < margin) { s.y = margin; needsTurn = true; }
        if (s.y > this.canvasHeight - 120) { s.y = this.canvasHeight - 120; needsTurn = true; }

        if (needsTurn && s.state !== 'turning') {
            s.state = 'turning';
            s.stateTimer = 0;
            s.angle += Math.PI * (0.5 + Math.random());
        }
    },

    buildSchoolGroups() {
        const groups = {};
        for (const stateId of Object.keys(this.states)) {
            const s = this.states[stateId];
            if (s.schooling) {
                if (!groups[s.creatureId]) groups[s.creatureId] = [];
                groups[s.creatureId].push(stateId);
            }
        }
        return groups;
    },

    /**
     * 投喂：鱼群游向指定位置
     */
    feed(x, y) {
        this.feedingTarget = { x, y };
        this.feedingTimer = 4000;

        for (const stateId of Object.keys(this.states)) {
            const s = this.states[stateId];
            const dist = Math.sqrt((s.x - x) ** 2 + (s.y - y) ** 2);
            if (dist < 400) {
                s.state = 'feeding';
            }
        }
    },

    endFeeding() {
        this.feedingTarget = null;
        for (const stateId of Object.keys(this.states)) {
            if (this.states[stateId].state === 'feeding') {
                this.states[stateId].state = 'free';
            }
        }
    },

    /**
     * 获取生物变换信息用于渲染
     */
    getTransform(stateId) {
        const s = this.states[stateId];
        if (!s) return { x: 0, y: 0, angle: 0 };
        return { x: s.x, y: s.y, angle: s.angle, speed: s.speed };
    },

    /**
     * 获取所有状态用于渲染遍历
     */
    getAllStates() {
        return Object.values(this.states);
    },

    /**
     * 更新画布尺寸
     */
    resize(width, height) {
        const oldW = this.canvasWidth || width;
        const oldH = this.canvasHeight || height;
        this.canvasWidth = width;
        this.canvasHeight = height;

        // 按比例更新生物位置
        if (oldW > 0 && oldH > 0) {
            for (const s of Object.values(this.states)) {
                s.x = (s.x / oldW) * width;
                s.y = (s.y / oldH) * height;
            }
        }
    }
};
```

- [ ] **Step 2: Commit**

```bash
cd "c:/Users/wei/Desktop/English aquarium"
git add static/js/swim-ai.js
git commit -m "feat: add SwimAI with state machine and boids-inspired schooling"
```

---

### Task 4: 创建粒子特效系统 (particles.js)

**Files:**
- Create: `static/js/particles.js`

- [ ] **Step 1: 创建 particles.js**

```javascript
// particles.js - 粒子特效管理器
const ParticleManager = {
    particles: [],
    maxPlankton: 30,
    maxBubbles: 25,
    planktonCount: 0,
    bubbleCount: 0,

    /**
     * 初始化基础环境粒子
     */
    init(width, height) {
        this.particles = [];

        // 初始浮游光点
        for (let i = 0; i < this.maxPlankton; i++) {
            this.spawnPlankton(width, height);
        }

        // 初始气泡
        for (let i = 0; i < this.maxBubbles / 2; i++) {
            this.spawnBubble(width, height);
        }
    },

    spawnPlankton(width, height) {
        this.particles.push({
            type: 'plankton',
            x: Math.random() * width,
            y: Math.random() * height,
            size: 1 + Math.random() * 3,
            alpha: 0.3 + Math.random() * 0.5,
            alphaPhase: Math.random() * Math.PI * 2,
            speedX: (Math.random() - 0.5) * 0.15,
            speedY: -0.05 - Math.random() * 0.15,
            life: Infinity,
        });
        this.planktonCount++;
    },

    spawnBubble(width, height) {
        this.particles.push({
            type: 'bubble',
            x: Math.random() * width,
            y: height + Math.random() * 40,
            size: 2 + Math.random() * 5,
            alpha: 0.15 + Math.random() * 0.2,
            speedY: -0.3 - Math.random() * 0.7,
            wobble: Math.random() * Math.PI * 2,
            wobbleSpeed: 0.01 + Math.random() * 0.02,
            life: Infinity,
        });
        this.bubbleCount++;
    },

    /**
     * 发射粒子
     * @param {string} type - plankton|bubble|trail|ripple|firework
     * @param {number} x
     * @param {number} y
     * @param {Object} options
     */
    emit(type, x, y, options = {}) {
        switch (type) {
            case 'trail':
                for (let i = 0; i < (options.count || 3); i++) {
                    this.particles.push({
                        type: 'trail',
                        x: x + (Math.random() - 0.5) * 10,
                        y: y + (Math.random() - 0.5) * 10,
                        size: 1 + Math.random() * 2,
                        alpha: 0.6,
                        speedX: (Math.random() - 0.5) * 0.3,
                        speedY: (Math.random() - 0.5) * 0.3 + 0.1,
                        life: 800 + Math.random() * 400,
                        age: 0,
                    });
                }
                break;

            case 'ripple':
                this.particles.push({
                    type: 'ripple',
                    x: x,
                    y: y,
                    radius: 5,
                    maxRadius: 40 + Math.random() * 30,
                    alpha: 0.5,
                    lineWidth: 1.5,
                    life: 600,
                    age: 0,
                });
                break;

            case 'firework':
                const colors = options.colors || ['#FFD700', '#FF9800', '#FF5722', '#FFEB3B', '#00FFC8', '#FF6B9D'];
                for (let i = 0; i < (options.count || 40); i++) {
                    const angle = (Math.PI * 2 * i) / (options.count || 40) + (Math.random() - 0.5) * 0.3;
                    const speed = 1 + Math.random() * 3;
                    this.particles.push({
                        type: 'firework',
                        x: x,
                        y: y,
                        size: 2 + Math.random() * 4,
                        alpha: 1,
                        speedX: Math.cos(angle) * speed,
                        speedY: Math.sin(angle) * speed,
                        color: colors[Math.floor(Math.random() * colors.length)],
                        life: 1000 + Math.random() * 800,
                        age: 0,
                    });
                }
                break;

            case 'surface_ripple':
                this.particles.push({
                    type: 'surface_ripple',
                    x: x,
                    y: y,
                    radius: 3,
                    maxRadius: 25 + Math.random() * 20,
                    alpha: 0.3,
                    lineWidth: 1,
                    life: 500,
                    age: 0,
                });
                break;
        }
    },

    /**
     * 每帧更新所有粒子
     */
    update(dt, width, height) {
        if (!dt || dt > 100) dt = 16;

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            switch (p.type) {
                case 'plankton':
                    p.x += p.speedX * (dt / 16);
                    p.y += p.speedY * (dt / 16);
                    p.alphaPhase += 0.02 * (dt / 16);
                    // 循环边界
                    if (p.x < -20) p.x = width + 20;
                    if (p.x > width + 20) p.x = -20;
                    if (p.y < -20) p.y = height + 20;
                    if (p.y > height + 20) p.y = -20;
                    break;

                case 'bubble':
                    p.y += p.speedY * (dt / 16);
                    p.wobble += p.wobbleSpeed * (dt / 16);
                    p.x += Math.sin(p.wobble) * 0.3 * (dt / 16);
                    // 到达水面爆裂
                    if (p.y < -20) {
                        if (Math.random() < 0.3) {
                            this.emit('surface_ripple', p.x, 30, {});
                        }
                        p.y = height + 10 + Math.random() * 30;
                        p.x = Math.random() * width;
                    }
                    break;

                case 'trail':
                case 'firework':
                    p.age += dt;
                    p.x += p.speedX * (dt / 16);
                    p.y += p.speedY * (dt / 16);
                    if (p.type === 'firework') {
                        p.speedY += 0.02 * (dt / 16); // 重力
                    }
                    if (p.age > p.life) {
                        this.particles.splice(i, 1);
                    }
                    break;

                case 'ripple':
                case 'surface_ripple':
                    p.age += dt;
                    const progress = p.age / p.life;
                    p.radius = p.maxRadius * progress;
                    p.alpha = p.alpha * (1 - progress);
                    if (p.age > p.life) {
                        this.particles.splice(i, 1);
                    }
                    break;
            }
        }

        // 补充分子
        let currentPlankton = this.particles.filter(p => p.type === 'plankton').length;
        while (currentPlankton < this.maxPlankton) {
            this.spawnPlankton(width, height);
            currentPlankton++;
        }

        let currentBubbles = this.particles.filter(p => p.type === 'bubble').length;
        while (currentBubbles < this.maxBubbles && Math.random() < 0.3) {
            this.spawnBubble(width, height);
            currentBubbles++;
        }
    },

    /**
     * 绘制所有粒子
     */
    draw(ctx) {
        for (const p of this.particles) {
            ctx.save();

            switch (p.type) {
                case 'plankton':
                    const glowAlpha = p.alpha * (0.5 + 0.5 * Math.sin(p.alphaPhase));
                    ctx.fillStyle = `rgba(180, 220, 255, ${glowAlpha})`;
                    ctx.shadowColor = `rgba(180, 220, 255, ${glowAlpha})`;
                    ctx.shadowBlur = p.size * 3;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    ctx.fill();
                    break;

                case 'bubble':
                    ctx.strokeStyle = `rgba(255, 255, 255, ${p.alpha})`;
                    ctx.lineWidth = 0.8;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha * 0.3})`;
                    ctx.fill();
                    // 高光
                    ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha * 0.6})`;
                    ctx.beginPath();
                    ctx.arc(p.x - p.size * 0.25, p.y - p.size * 0.25, p.size * 0.25, 0, Math.PI * 2);
                    ctx.fill();
                    break;

                case 'trail':
                    ctx.fillStyle = `rgba(180, 220, 255, ${p.alpha * (1 - p.age / p.life)})`;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    ctx.fill();
                    break;

                case 'ripple':
                case 'surface_ripple':
                    ctx.strokeStyle = `rgba(255, 255, 255, ${p.alpha})`;
                    ctx.lineWidth = p.lineWidth;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                    ctx.stroke();
                    break;

                case 'firework':
                    const lifeRatio = 1 - p.age / p.life;
                    ctx.fillStyle = p.color;
                    ctx.globalAlpha = lifeRatio;
                    ctx.shadowColor = p.color;
                    ctx.shadowBlur = p.size * 2;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size * lifeRatio, 0, Math.PI * 2);
                    ctx.fill();
                    break;
            }

            ctx.restore();
        }
    },

    /**
     * 清理所有临时粒子
     */
    clear() {
        this.particles = this.particles.filter(p => p.type === 'plankton' || p.type === 'bubble');
    },

    /**
     * 更新粒子容量（移动端降级）
     */
    setCapacity(maxPlankton, maxBubbles) {
        this.maxPlankton = maxPlankton;
        this.maxBubbles = maxBubbles;
    }
};
```

- [ ] **Step 2: Commit**

```bash
cd "c:/Users/wei/Desktop/English aquarium"
git add static/js/particles.js
git commit -m "feat: add ParticleManager with plankton, bubbles, trails, ripples, and fireworks"
```

---

### Task 5: 创建光影系统 (lighting.js)

**Files:**
- Create: `static/js/lighting.js`

- [ ] **Step 1: 创建 lighting.js**

```javascript
// lighting.js - 动态光影系统
const Lighting = {
    // 时间段 → 颜色配置
    periodColors: {
        dawn: {
            top: '#1A0F08', mid: '#3D2614', low: '#2A1A0C', bot: '#120A04',
            ray: 'rgba(255,183,128,0.06)', rayEnd: 'rgba(255,140,66,0)',
            sand1: '#8B7355', sand2: '#6B4E30', sand3: '#4A3218',
            causticAlpha: 0.06,
        },
        day: {
            top: '#0A1A2E', mid: '#0D3B66', low: '#0A2647', bot: '#061830',
            ray: 'rgba(180,220,255,0.06)', rayEnd: 'rgba(0,180,216,0)',
            sand1: '#C2A55E', sand2: '#B8954A', sand3: '#6B5010',
            causticAlpha: 0.08,
        },
        dusk: {
            top: '#15081F', mid: '#3D1B4E', low: '#2A1040', bot: '#0E0518',
            ray: 'rgba(199,125,255,0.05)', rayEnd: 'rgba(199,125,255,0)',
            sand1: '#6B5B7A', sand2: '#4E3D60', sand3: '#2E1840',
            causticAlpha: 0.05,
        },
        night: {
            top: '#050510', mid: '#0D1B2A', low: '#091420', bot: '#030810',
            ray: 'rgba(69,228,181,0.04)', rayEnd: 'rgba(69,228,181,0)',
            sand1: '#3A5068', sand2: '#2A3A50', sand3: '#1A2230',
            causticAlpha: 0.03,
        },
    },

    currentPeriod: 'day',
    targetPeriod: 'day',
    transitionProgress: 1.0,     // 0 → 1
    transitionDuration: 1000,    // ms
    currentColors: null,

    init() {
        this.currentColors = this.periodColors.day;
    },

    /**
     * 触发时间段过渡
     */
    transitionTo(newPeriod) {
        if (newPeriod === this.currentPeriod) return;
        this.targetPeriod = newPeriod;
        this.transitionProgress = 0;
    },

    /**
     * 每帧更新过渡
     */
    update(dt) {
        if (this.transitionProgress < 1.0) {
            this.transitionProgress += dt / this.transitionDuration;
            if (this.transitionProgress >= 1.0) {
                this.transitionProgress = 1.0;
                this.currentPeriod = this.targetPeriod;
            }

            // Lerp between two color sets
            const from = this.periodColors[this.currentPeriod];
            const to = this.periodColors[this.targetPeriod];
            const t = this.easeInOutCubic(this.transitionProgress);

            this.currentColors = {};
            for (const key of Object.keys(from)) {
                const fromVal = from[key];
                const toVal = to[key];
                if (key === 'causticAlpha') {
                    this.currentColors[key] = fromVal + (toVal - fromVal) * t;
                } else {
                    this.currentColors[key] = this.lerpColor(fromVal, toVal, t);
                }
            }
        } else {
            this.currentColors = this.periodColors[this.currentPeriod];
        }
    },

    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    },

    lerpColor(a, b, t) {
        const parse = (c) => {
            const match = c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
            if (match) {
                return {
                    r: parseInt(match[1]),
                    g: parseInt(match[2]),
                    b: parseInt(match[3]),
                    a: match[4] ? parseFloat(match[4]) : 1,
                };
            }
            // Hex
            const hex = c.replace('#', '');
            return {
                r: parseInt(hex.substring(0, 2), 16),
                g: parseInt(hex.substring(2, 4), 16),
                b: parseInt(hex.substring(4, 6), 16),
                a: 1,
            };
        };

        const ca = parse(a), cb = parse(b);
        const r = Math.round(ca.r + (cb.r - ca.r) * t);
        const g = Math.round(ca.g + (cb.g - ca.g) * t);
        const b = Math.round(ca.b + (cb.b - ca.b) * t);
        const alpha = ca.a + (cb.a - ca.a) * t;

        // Preserve original format
        if (a.startsWith('rgba') || a.startsWith('rgb')) {
            return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(4)})`;
        }
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    },

    /**
     * 获取当前颜色配置
     */
    getColors() {
        return this.currentColors || this.periodColors[this.currentPeriod];
    },

    /**
     * 绘制水面焦散效果
     */
    drawCaustics(ctx, width, height, t) {
        const colors = this.getColors();
        const alpha = colors.causticAlpha || 0.06;
        if (alpha < 0.01) return;

        ctx.save();
        ctx.globalAlpha = alpha;

        for (let i = 0; i < 20; i++) {
            const cx = ((i * 197 + 31) % 1000) / 1000 * width;
            const cy = 20 + Math.sin(t * 0.8 + i * 1.7) * 40 + (i * 37) % 200;
            const rx = 20 + Math.sin(t * 0.5 + i) * 10 + (i * 13) % 40;
            const ry = 8 + Math.cos(t * 0.6 + i) * 4;

            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.beginPath();
            ctx.ellipse(cx, cy, rx, ry, 0.2 + Math.sin(t * 0.3 + i) * 0.3, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    },

    /**
     * 绘制生物光晕
     */
    drawCreatureGlow(ctx, creature, x, y, scale, t) {
        let glowColor, glowSize, glowAlpha;

        switch (creature.rarity) {
            case 'legendary':
                glowColor = creature.id === 'glow_jellyfish' ? '#00FFC8' : '#FFD700';
                glowSize = creature.size * scale * 0.6;
                glowAlpha = 0.3 + Math.sin(t * 2) * 0.15;  // 呼吸效果
                break;
            case 'epic':
                glowColor = '#AA88FF';
                glowSize = creature.size * scale * 0.4;
                glowAlpha = 0.15;
                break;
            case 'rare':
                glowColor = '#88BBFF';
                glowSize = creature.size * scale * 0.25;
                glowAlpha = 0.08;
                break;
            default:
                return; // 普通生物无光晕
        }

        ctx.save();
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, glowSize);
        gradient.addColorStop(0, glowColor.replace(')', `, ${glowAlpha})`).replace('rgb', 'rgba'));
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, glowSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    },

    /**
     * 绘制深度雾
     */
    drawDepthFog(ctx, width, height) {
        const fogStart = height * 0.6;
        const gradient = ctx.createLinearGradient(0, fogStart, 0, height);
        gradient.addColorStop(0, 'rgba(10, 30, 60, 0)');
        gradient.addColorStop(0.5, 'rgba(10, 30, 60, 0.15)');
        gradient.addColorStop(1, 'rgba(10, 30, 60, 0.35)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, fogStart, width, height - fogStart);
    },
};
```

- [ ] **Step 2: Commit**

```bash
cd "c:/Users/wei/Desktop/English aquarium"
git add static/js/lighting.js
git commit -m "feat: add Lighting system with caustics, creature glow, time transitions, and depth fog"
```

---

### Task 6: 创建环境装饰模块 (environment.js)

**Files:**
- Create: `static/js/environment.js`

- [ ] **Step 1: 创建 environment.js**

```javascript
// environment.js - 海底环境装饰
const Environment = {
    seaweeds: [],
    corals: [],
    anemones: [],
    rocks: [],
    decorFish: [],

    init(width, height) {
        this.seaweeds = [];
        this.corals = [];
        this.anemones = [];
        this.rocks = [];
        this.decorFish = [];

        // 海草（8丛，多段骨骼）
        for (let i = 0; i < 8; i++) {
            const segments = 3 + Math.floor(Math.random() * 2); // 3-4节
            this.seaweeds.push({
                baseX: 30 + i * (width - 60) / 7 + (Math.random() - 0.5) * 50,
                baseY: height - 50,
                segments: segments,
                segmentLength: 30 + Math.random() * 50,
                width: 5 + Math.random() * 8,
                phase: Math.random() * Math.PI * 2,
                stiffness: 0.3 + Math.random() * 0.4,
                color1: `hsl(${120 + Math.random() * 40}, ${50 + Math.random() * 30}%, ${20 + Math.random() * 20}%)`,
                color2: `hsl(${120 + Math.random() * 40}, ${50 + Math.random() * 30}%, ${15 + Math.random() * 15}%)`,
            });
        }

        // 珊瑚（3-5簇）
        const coralCount = 3 + Math.floor(Math.random() * 3);
        const coralColors = ['#FF6B6B', '#FF8E72', '#FFB347', '#DA70D6', '#FF69B4'];
        for (let i = 0; i < coralCount; i++) {
            this.corals.push({
                x: 60 + Math.random() * (width - 120),
                y: height - 50 + Math.random() * 10,
                size: 20 + Math.random() * 35,
                color: coralColors[i % coralColors.length],
                branches: 3 + Math.floor(Math.random() * 4),
                phase: Math.random() * Math.PI * 2,
            });
        }

        // 海葵（2-3个）
        const anemoneCount = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < anemoneCount; i++) {
            this.anemones.push({
                x: 80 + Math.random() * (width - 160),
                y: height - 50 + Math.random() * 5,
                size: 12 + Math.random() * 16,
                color: `hsl(${280 + Math.random() * 60}, 60%, ${50 + Math.random() * 30}%)`,
                tentacles: 8 + Math.floor(Math.random() * 8),
                phase: Math.random() * Math.PI * 2,
            });
        }

        // 小石头/贝壳（5-8个）
        const rockCount = 5 + Math.floor(Math.random() * 4);
        for (let i = 0; i < rockCount; i++) {
            this.rocks.push({
                x: Math.random() * width,
                y: height - 48 + Math.random() * 8,
                rx: 5 + Math.random() * 12,
                ry: 3 + Math.random() * 6,
                color: `hsl(${30 + Math.random() * 20}, ${10 + Math.random() * 20}%, ${40 + Math.random() * 30}%)`,
            });
        }

        // 装饰鱼群
        this.spawnDecorFish(width, height);
    },

    spawnDecorFish(width, height) {
        this.decorFish = [];
        const count = 6 + Math.floor(Math.random() * 5);
        for (let i = 0; i < count; i++) {
            this.decorFish.push({
                x: Math.random() * width,
                y: 60 + Math.random() * (height - 160),
                speed: 1 + Math.random() * 2.5,
                size: 3 + Math.random() * 6,
                color: `hsl(${Math.random() * 60 + 180}, 50%, ${40 + Math.random() * 30}%)`,
                phase: Math.random() * Math.PI * 2,
                angle: (Math.random() - 0.5) * 0.5,
            });
        }
    },

    update(dt, width, height) {
        // 装饰鱼游动
        for (const fish of this.decorFish) {
            fish.x += Math.cos(fish.angle) * fish.speed * (dt / 16);
            fish.y += Math.sin(fish.angle) * fish.speed * (dt / 16) + Math.sin(fish.phase) * 0.3;

            if (fish.x < -30) fish.x = width + 30;
            if (fish.x > width + 30) fish.x = -30;
            if (fish.y < 30) fish.y = 30;
            if (fish.y > height - 120) fish.y = height - 120;

            fish.phase += 0.02 * (dt / 16);
            if (Math.random() < 0.005) {
                fish.angle += (Math.random() - 0.5) * 0.4;
            }
        }
    },

    draw(ctx, t) {
        this.drawRocks(ctx);
        this.drawCorals(ctx, t);
        this.drawAnemones(ctx, t);
        this.drawSeaweeds(ctx, t);
        this.drawDecorFish(ctx, t);
    },

    drawRocks(ctx) {
        for (const rock of this.rocks) {
            ctx.fillStyle = rock.color;
            ctx.beginPath();
            ctx.ellipse(rock.x, rock.y, rock.rx, rock.ry, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    },

    drawCorals(ctx, t) {
        for (const coral of this.corals) {
            ctx.save();
            ctx.translate(coral.x, coral.y);

            for (let b = 0; b < coral.branches; b++) {
                const angle = (b / coral.branches) * Math.PI * 0.7 - Math.PI * 0.35;
                const sway = Math.sin(t * 0.5 + coral.phase + b) * 0.1;

                ctx.strokeStyle = coral.color;
                ctx.lineWidth = 6;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(0, 0);
                const cpX = Math.sin(angle) * coral.size * 0.3;
                const cpY = -coral.size * 0.4;
                const endX = Math.sin(angle + sway) * coral.size * 0.6;
                const endY = -coral.size * 0.7;
                ctx.quadraticCurveTo(cpX, cpY, endX, endY);

                // 小分支
                const bx = endX * 0.5;
                const by = endY * 0.5;
                ctx.moveTo(bx, by);
                ctx.lineTo(bx + Math.sin(angle + 0.3) * coral.size * 0.25, by - coral.size * 0.2);

                ctx.stroke();
            }

            ctx.restore();
        }
    },

    drawAnemones(ctx, t) {
        for (const anemone of this.anemones) {
            ctx.save();
            ctx.translate(anemone.x, anemone.y);

            for (let i = 0; i < anemone.tentacles; i++) {
                const angle = (i / anemone.tentacles) * Math.PI * 1.5 - Math.PI * 0.75;
                const sway = Math.sin(t * 1.2 + anemone.phase + i * 0.5) * 0.3;

                ctx.strokeStyle = anemone.color;
                ctx.lineWidth = 2;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(0, 0);
                const endX = Math.sin(angle + sway) * anemone.size;
                const endY = -anemone.size * 0.8 + Math.cos(sway) * 5;
                ctx.quadraticCurveTo(
                    Math.sin(angle) * anemone.size * 0.3,
                    -anemone.size * 0.3,
                    endX, endY
                );
                ctx.stroke();

                // 触手尖端的圆球
                ctx.fillStyle = anemone.color;
                ctx.beginPath();
                ctx.arc(endX, endY, 2.5, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }
    },

    drawSeaweeds(ctx, t) {
        for (const sw of this.seaweeds) {
            ctx.save();
            ctx.strokeStyle = sw.color1;
            ctx.fillStyle = sw.color2;
            ctx.lineWidth = sw.width;
            ctx.lineCap = 'round';

            let sx = sw.baseX;
            let sy = sw.baseY;

            for (let seg = 0; seg < sw.segments; seg++) {
                const ratio = (seg + 1) / sw.segments;
                const swayAngle = Math.sin(t * 0.6 + sw.phase + seg * 0.7) * sw.stiffness * ratio;
                const ex = sx + Math.sin(swayAngle) * sw.segmentLength;
                const ey = sy - sw.segmentLength * 0.7;

                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.quadraticCurveTo(
                    sx + Math.sin(swayAngle * 0.5) * sw.segmentLength * 0.4,
                    sy - sw.segmentLength * 0.3,
                    ex, ey
                );
                ctx.stroke();

                // 叶片
                if (seg > 0 && seg < sw.segments - 1) {
                    const leafX = sx + (ex - sx) * 0.5;
                    const leafY = sy + (ey - sy) * 0.5;
                    const leafAngle = Math.atan2(ey - sy, ex - sx);
                    ctx.save();
                    ctx.translate(leafX, leafY);
                    ctx.rotate(leafAngle + 0.3);
                    ctx.beginPath();
                    ctx.ellipse(sw.width * 1.2, 0, sw.width * 2.5, sw.width * 1.2, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.rotate(-0.6);
                    ctx.beginPath();
                    ctx.ellipse(-sw.width * 1.2, 0, sw.width * 2.5, sw.width * 1.2, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }

                sx = ex;
                sy = ey;
            }

            ctx.restore();
        }
    },

    drawDecorFish(ctx, t) {
        for (const fish of this.decorFish) {
            ctx.save();
            ctx.translate(fish.x, fish.y);
            ctx.rotate(fish.angle);

            ctx.fillStyle = fish.color;
            ctx.globalAlpha = 0.6;

            // 小鱼的简单形状
            ctx.beginPath();
            ctx.ellipse(0, 0, fish.size, fish.size * 0.4, 0, 0, Math.PI * 2);
            ctx.fill();

            // 尾巴
            ctx.beginPath();
            ctx.moveTo(-fish.size, 0);
            ctx.lineTo(-fish.size * 1.8, -fish.size * 0.5);
            ctx.lineTo(-fish.size * 1.8, fish.size * 0.5);
            ctx.closePath();
            ctx.fill();

            ctx.restore();
        }
    },

    resize(width, height) {
        // 环境装饰随窗口重新生成
        this.init(width, height);
    }
};
```

- [ ] **Step 2: Commit**

```bash
cd "c:/Users/wei/Desktop/English aquarium"
git add static/js/environment.js
git commit -m "feat: add Environment module with multi-segment seaweed, corals, anemones, and decor fish"
```

---

### Task 7: 创建增强交互模块 (interaction.js)

**Files:**
- Create: `static/js/interaction.js`

- [ ] **Step 1: 创建 interaction.js**

```javascript
// interaction.js - 增强交互
const Interaction = {
    canvas: null,
    mouseX: 0,
    mouseY: 0,
    mouseOnSurface: false,
    surfaceRippleTimer: 0,
    draggedCreature: null,
    dragOffsetX: 0,
    dragOffsetY: 0,
    isDragging: false,
    aquariumLayout: null,
    aquariumCreatures: null,

    init(canvas) {
        this.canvas = canvas;

        canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        canvas.addEventListener('click', (e) => this.onClick(e));
        canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        canvas.addEventListener('mouseleave', () => {
            this.mouseOnSurface = false;
            this.isDragging = false;
            this.draggedCreature = null;
        });

        // 触摸支持
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.onMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
        }, { passive: false });
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.onMouseDown({ clientX: touch.clientX, clientY: touch.clientY });
        }, { passive: false });
        canvas.addEventListener('touchend', () => this.onMouseUp({}));
    },

    setLayoutRefs(layout, creatures) {
        this.aquariumLayout = layout;
        this.aquariumCreatures = creatures;
    },

    onMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouseX = e.clientX - rect.left;
        this.mouseY = e.clientY - rect.top;
        this.mouseOnSurface = this.mouseY < rect.height * 0.2;

        // 拖拽中的生物
        if (this.isDragging && this.draggedCreature !== null) {
            const layoutItem = this.aquariumLayout[this.draggedCreature];
            if (layoutItem && window.Aquarium) {
                layoutItem.x = Math.max(5, Math.min(95, (this.mouseX / window.Aquarium.width) * 100));
                layoutItem.y = Math.max(5, Math.min(90, (this.mouseY / (window.Aquarium.height - 80)) * 100));
            }
        }

        // 水面涟漪（限流）
        if (this.mouseOnSurface && this.surfaceRippleTimer <= 0) {
            ParticleManager.emit('surface_ripple', this.mouseX, this.mouseY, {});
            this.surfaceRippleTimer = 150; // 150ms 限流
        }
    },

    onMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        // 检测是否点击了生物（用于拖拽）
        if (this.aquariumLayout && window.Aquarium) {
            for (let i = 0; i < this.aquariumLayout.length; i++) {
                const item = this.aquariumLayout[i];
                const cx = (item.x / 100) * window.Aquarium.width;
                const cy = (item.y / 100) * (window.Aquarium.height - 80);
                const dist = Math.sqrt((mx - cx) ** 2 + (my - cy) ** 2);
                if (dist < 50) {
                    this.isDragging = true;
                    this.draggedCreature = i;
                    this.dragOffsetX = cx - mx;
                    this.dragOffsetY = cy - my;
                    return;
                }
            }
        }
    },

    onMouseUp(e) {
        if (this.isDragging && this.draggedCreature !== null) {
            // 保存新布局
            if (window.Aquarium && window.API) {
                window.API.saveLayout(this.aquariumLayout).catch(() => {});
            }
        }
        this.isDragging = false;
        this.draggedCreature = null;
    },

    onClick(e) {
        // 忽略拖拽导致的点击
        if (this.isDragging) return;

        const rect = this.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        // 点击涟漪
        ParticleManager.emit('ripple', mx, my, {});

        // 检测是否点击了生物
        if (this.aquariumLayout && this.aquariumCreatures && window.Aquarium) {
            for (const item of this.aquariumLayout) {
                const cx = (item.x / 100) * window.Aquarium.width;
                const cy = (item.y / 100) * (window.Aquarium.height - 80);
                const dist = Math.sqrt((mx - cx) ** 2 + (my - cy) ** 2);
                if (dist < 50) {
                    const creature = this.aquariumCreatures.find(c => c.id === item.creature_id);
                    if (creature) {
                        this.showCreatureCard(creature, e.clientX, e.clientY);
                    }
                    return;
                }
            }
        }

        // 点击水面 → 投喂
        if (my < rect.height * 0.2 && window.SwimAI) {
            SwimAI.feed(mx, my);
            ParticleManager.emit('surface_ripple', mx, my, {});
        }
    },

    /**
     * 精美生物信息卡（替代旧 tooltip）
     */
    showCreatureCard(creature, screenX, screenY) {
        // 移除旧卡片
        const existing = document.querySelector('.creature-info-card');
        if (existing) existing.remove();

        const rarityNames = { common: '普通', rare: '稀有', epic: '史诗', legendary: '传说' };
        const rarityColors = {
            common: '#9E9E9E', rare: '#4FC3F7', epic: '#AB47BC', legendary: '#FFD700'
        };
        const creatureEmojis = {
            clownfish: '🐠', seahorse: '🦑', starfish: '⭐', jellyfish: '🫧',
            pufferfish: '🐡', turtle: '🐢', octopus: '🐙', stingray: '🦈',
            dolphin: '🐬', whale: '🐋', shark: '🦈', seadragon: '🐲',
            mermaid: '🧜‍♀️', narwhal: '🐳', glow_jellyfish: '✨'
        };

        const card = document.createElement('div');
        card.className = 'creature-info-card';
        card.innerHTML = `
            <div class="cic-header" style="border-color:${rarityColors[creature.rarity]}">
                <span class="cic-emoji">${creatureEmojis[creature.id] || '🐟'}</span>
                <div class="cic-names">
                    <span class="cic-name">${creature.name}</span>
                    <span class="cic-name-en">${creature.name_en}</span>
                </div>
            </div>
            <div class="cic-body">
                <span class="cic-rarity" style="background:${rarityColors[creature.rarity]}">${rarityNames[creature.rarity]}</span>
                <p class="cic-desc">${creature.description}</p>
            </div>
        `;

        // 定位（避免超出屏幕）
        const cardWidth = 220;
        const cardHeight = 140;
        let left = screenX - cardWidth / 2;
        let top = screenY - cardHeight - 20;
        if (left < 10) left = 10;
        if (left + cardWidth > window.innerWidth - 10) left = window.innerWidth - cardWidth - 10;
        if (top < 10) top = screenY + 20;
        card.style.left = left + 'px';
        card.style.top = top + 'px';

        document.body.appendChild(card);

        // 入场动画后自动消失
        requestAnimationFrame(() => card.classList.add('show'));
        setTimeout(() => {
            card.classList.remove('show');
            setTimeout(() => card.remove(), 300);
        }, 3000);

        // 点击任意位置关闭
        const closeHandler = (e) => {
            if (!card.contains(e.target)) {
                card.classList.remove('show');
                setTimeout(() => card.remove(), 300);
                document.removeEventListener('click', closeHandler);
            }
        };
        setTimeout(() => document.addEventListener('click', closeHandler), 100);
    },

    update(dt) {
        if (this.surfaceRippleTimer > 0) {
            this.surfaceRippleTimer -= dt;
        }
    },
};
```

- [ ] **Step 2: 添加信息卡 CSS 到 main.css**

在 `static/css/main.css` 末尾追加：

```css
/* 生物信息卡 */
.creature-info-card {
    position: fixed;
    z-index: 1000;
    width: 220px;
    background: rgba(10, 26, 46, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 16px;
    backdrop-filter: blur(12px);
    overflow: hidden;
    opacity: 0;
    transform: scale(0.8) translateY(10px);
    transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
    pointer-events: none;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.creature-info-card.show {
    opacity: 1;
    transform: scale(1) translateY(0);
    pointer-events: auto;
}

.cic-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    border-bottom: 2px solid;
    background: rgba(255, 255, 255, 0.03);
}

.cic-emoji {
    font-size: 36px;
    filter: drop-shadow(0 0 6px rgba(255, 255, 255, 0.3));
}

.cic-names {
    display: flex;
    flex-direction: column;
}

.cic-name {
    font-size: 16px;
    font-weight: 700;
    color: #fff;
}

.cic-name-en {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.5);
    font-style: italic;
}

.cic-body {
    padding: 12px 16px 14px;
}

.cic-rarity {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 10px;
    font-size: 11px;
    color: #fff;
    font-weight: 600;
    margin-bottom: 8px;
}

.cic-desc {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.7);
    line-height: 1.5;
    margin: 0;
}
```

- [ ] **Step 3: Commit**

```bash
cd "c:/Users/wei/Desktop/English aquarium"
git add static/js/interaction.js static/css/main.css
git commit -m "feat: add Interaction module with creature info card, drag, ripples, and feeding"
```

---

### Task 8: 重构 aquarium.js 为主控制器

**Files:**
- Modify: `static/js/aquarium.js` (重写)

- [ ] **Step 1: 重写 aquarium.js**

完全重写 `aquarium.js`，移除15个 `draw*` 方法，改为调度各子模块：

```javascript
// aquarium.js - 水族馆主控制器（重构版）
const Aquarium = {
    canvas: null,
    ctx: null,
    creatures: [],
    layout: [],
    animFrame: null,
    time: 0,
    initialized: false,
    width: 0,
    height: 0,
    currentPeriod: 'day',
    lastFrameTime: 0,
    spriteAlpha: 0,         // 精灵淡入进度

    // Debug
    debug: false,
    _fpsFrames: 0,
    _fpsTime: 0,
    _fpsDisplay: 0,

    async init() {
        this.canvas = document.getElementById('aquarium-canvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());

        try {
            const data = await API.getAquarium();
            this.creatures = data.creatures || [];
            this.layout = data.layout || [];
            const el = document.getElementById('collected-count');
            if (el) el.textContent = data.total_collected || 0;
        } catch (e) {
            console.error('Failed to load aquarium:', e);
        }

        // 初始化子模块
        const creatureIds = this.creatures.map(c => c.id);
        SpriteManager.preload(creatureIds).then(() => {
            // 精灵加载完成后淡入
            this.fadeInSprites();
        });

        SwimAI.init(this.layout, this.creatures, this.width, this.height);
        ParticleManager.init(this.width, this.height);
        Environment.init(this.width, this.height);
        Interaction.init(this.canvas);
        Interaction.setLayoutRefs(this.layout, this.creatures);
        Lighting.init();

        // 移动端降级
        if (window.innerWidth < 768) {
            ParticleManager.setCapacity(15, 12);
        }

        if (!this.initialized) {
            this.initialized = true;
            this.lastFrameTime = performance.now();
            this.animate();
        }
    },

    fadeInSprites() {
        const fadeStart = performance.now();
        const fadeDuration = 1500;
        const step = () => {
            const elapsed = performance.now() - fadeStart;
            this.spriteAlpha = Math.min(1, elapsed / fadeDuration);
            if (this.spriteAlpha < 1) {
                requestAnimationFrame(step);
            }
        };
        requestAnimationFrame(step);
    },

    async refresh() {
        try {
            const data = await API.getAquarium();
            this.creatures = data.creatures || [];
            this.layout = data.layout || [];
            Interaction.setLayoutRefs(this.layout, this.creatures);
            SwimAI.init(this.layout, this.creatures, this.width, this.height);
            const el = document.getElementById('collected-count');
            if (el) el.textContent = data.total_collected || 0;
        } catch (e) {}
    },

    resize() {
        if (!this.canvas) return;
        const dpr = window.devicePixelRatio || 1;
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(dpr, dpr);

        SwimAI.resize(this.width, this.height);
        Environment.resize(this.width, this.height);
    },

    animate(timestamp) {
        if (!this.ctx) return;

        // 计算 delta time
        if (!timestamp) timestamp = performance.now();
        const dt = Math.min(timestamp - this.lastFrameTime, 100);
        this.lastFrameTime = timestamp;
        this.time += dt / 1000;

        // FPS 计数
        if (this.debug) {
            this._fpsFrames++;
            this._fpsTime += dt;
            if (this._fpsTime >= 1000) {
                this._fpsDisplay = Math.round(this._fpsFrames / (this._fpsTime / 1000));
                this._fpsFrames = 0;
                this._fpsTime = 0;
            }
        }

        const ctx = this.ctx;

        // 1. 背景
        this.drawBackground(ctx);

        // 2. 水面焦散
        Lighting.drawCaustics(ctx, this.width, this.height, this.time);

        // 3. 沙地
        this.drawSand(ctx);

        // 4. 环境装饰（海草、珊瑚、石头）
        Environment.draw(ctx, this.time);

        // 5. 更新并绘制粒子（背景层）
        ParticleManager.update(dt, this.width, this.height);
        ParticleManager.draw(ctx);

        // 6. 更新游动AI
        SwimAI.update(dt);
        Interaction.update(dt);

        // 7. 更新时间段
        this.updateTimePeriod();

        // 8. 绘制生物（带光晕）
        this.drawAllCreatures(ctx);

        // 9. 深度雾
        Lighting.drawDepthFog(ctx, this.width, this.height);

        // 10. Debug FPS
        if (this.debug) {
            ctx.fillStyle = '#0f0';
            ctx.font = '14px monospace';
            ctx.fillText(`FPS: ${this._fpsDisplay}`, 10, 30);
        }

        this.animFrame = requestAnimationFrame((t) => this.animate(t));
    },

    drawBackground(ctx) {
        const c = Lighting.getColors();
        const grad = ctx.createLinearGradient(0, 0, 0, this.height);
        grad.addColorStop(0, c.top);
        grad.addColorStop(0.3, c.mid);
        grad.addColorStop(0.7, c.low);
        grad.addColorStop(1, c.bot);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.width, this.height);

        // 光线
        for (let i = 0; i < 4; i++) {
            const rx = this.width * (0.15 + i * 0.22);
            const rayGrad = ctx.createLinearGradient(rx, 0, rx, this.height * 0.7);
            rayGrad.addColorStop(0, c.ray);
            rayGrad.addColorStop(1, c.rayEnd);
            ctx.fillStyle = rayGrad;
            ctx.beginPath();
            ctx.moveTo(rx - 40, 0);
            ctx.lineTo(rx + 40, 0);
            ctx.lineTo(rx + 80, this.height * 0.7);
            ctx.lineTo(rx - 80, this.height * 0.7);
            ctx.fill();
        }
    },

    drawSand(ctx) {
        const c = Lighting.getColors();
        const sandY = this.height - 50;
        const grad = ctx.createLinearGradient(0, sandY, 0, this.height);
        grad.addColorStop(0, c.sand1);
        grad.addColorStop(0.3, c.sand2);
        grad.addColorStop(1, c.sand3);
        ctx.fillStyle = grad;

        ctx.beginPath();
        ctx.moveTo(0, sandY);
        for (let x = 0; x <= this.width; x += 12) {
            const y = sandY + Math.sin(x * 0.015) * 10 + Math.sin(x * 0.04 + 1) * 6;
            ctx.lineTo(x, y);
        }
        ctx.lineTo(this.width, this.height);
        ctx.lineTo(0, this.height);
        ctx.closePath();
        ctx.fill();

        // 沙地小石头
        ctx.fillStyle = c.sand3;
        const rockPositions = [
            [this.width * 0.1, sandY + 6, 10],
            [this.width * 0.25, sandY + 4, 7],
            [this.width * 0.45, sandY + 8, 12],
            [this.width * 0.6, sandY + 5, 8],
            [this.width * 0.8, sandY + 7, 11]
        ];
        rockPositions.forEach(([rx, ry, rr]) => {
            ctx.beginPath();
            ctx.arc(rx, ry, rr, 0, Math.PI * 2);
            ctx.fill();
        });
    },

    updateTimePeriod() {
        let period;
        if (document.body.classList.contains('time-dawn')) period = 'dawn';
        else if (document.body.classList.contains('time-dusk')) period = 'dusk';
        else if (document.body.classList.contains('time-night')) period = 'night';
        else period = 'day';

        if (period !== this.currentPeriod) {
            Lighting.transitionTo(period);
            this.currentPeriod = period;
        }
        Lighting.update(16); // ~60fps frame time
    },

    drawAllCreatures(ctx) {
        const states = SwimAI.getAllStates();
        const layoutMap = {};
        for (const item of this.layout) {
            layoutMap[item.creature_id] = layoutMap[item.creature_id] || [];
            layoutMap[item.creature_id].push(item);
        }

        // 按 Y 坐标排序实现简单的深度排序
        const toDraw = [];
        for (const s of states) {
            const creature = this.creatures.find(c => c.id === s.creatureId);
            if (!creature) continue;

            // 拖拽中的生物半透明
            let alpha = this.spriteAlpha;
            const draggedIdx = Interaction.draggedCreature;
            if (draggedIdx !== null && this.layout[draggedIdx] &&
                this.layout[draggedIdx].creature_id === s.creatureId) {
                // 如果正在拖拽的恰好是这个生物的layout项，半透明
                const draggedCreatureId = this.layout[draggedIdx].creature_id;
                if (s.creatureId === draggedCreatureId) {
                    alpha *= 0.6;
                }
            }

            toDraw.push({
                s, creature,
                y: s.y,
                alpha,
            });
        }
        toDraw.sort((a, b) => a.y - b.y);

        for (const item of toDraw) {
            // 光晕
            Lighting.drawCreatureGlow(ctx, item.creature, item.s.x, item.s.y, 1, this.time);

            // 翻转方向（鱼面向左/右）
            ctx.save();
            ctx.translate(item.s.x, item.s.y);
            const facingRight = Math.cos(item.s.angle) > 0;
            if (!facingRight) {
                ctx.scale(-1, 1);
            }

            // 绘制精灵（在原始坐标系中，以0,0为中心）
            SpriteManager.draw(ctx, item.creature, 0, 0, 1, item.alpha, this.time);

            ctx.restore();

            // 游动尾迹
            if (item.s.speed > 0.3 && Math.random() < 0.3) {
                const trailX = item.s.x - Math.cos(item.s.angle) * item.creature.size * 0.5;
                const trailY = item.s.y - Math.sin(item.s.angle) * item.creature.size * 0.5;
                ParticleManager.emit('trail', trailX, trailY, { count: 1 });
            }
        }
    },

    stop() {
        if (this.animFrame) {
            cancelAnimationFrame(this.animFrame);
            this.animFrame = null;
        }
    }
};
```

- [ ] **Step 2: Commit**

```bash
cd "c:/Users/wei/Desktop/English aquarium"
git add static/js/aquarium.js
git commit -m "refactor: rewrite aquarium.js as lightweight controller orchestrating 6 sub-modules"
```

---

### Task 9: 更新 index.html 脚本引入顺序

**Files:**
- Modify: `static/index.html`

- [ ] **Step 1: 更新 script 标签**

在 `static/index.html` 底部，将 script 引入部分从：

```html
    <script src="/js/api.js"></script>
    <script src="/js/state.js"></script>
    <script src="/js/aquarium.js"></script>
    <script src="/js/tasks.js"></script>
    <script src="/js/blindbox.js"></script>
    <script src="/js/app.js"></script>
```

替换为（按依赖顺序）：

```html
    <script src="/js/api.js"></script>
    <script src="/js/state.js"></script>
    <script src="/js/sprites.js"></script>
    <script src="/js/swim-ai.js"></script>
    <script src="/js/particles.js"></script>
    <script src="/js/lighting.js"></script>
    <script src="/js/environment.js"></script>
    <script src="/js/interaction.js"></script>
    <script src="/js/aquarium.js"></script>
    <script src="/js/tasks.js"></script>
    <script src="/js/blindbox.js"></script>
    <script src="/js/app.js"></script>
```

- [ ] **Step 2: Commit**

```bash
cd "c:/Users/wei/Desktop/English aquarium"
git add static/index.html
git commit -m "feat: add new module script references to index.html"
```

---

### Task 10: 集成测试与验证

- [ ] **Step 1: 启动应用验证**

```bash
cd "c:/Users/wei/Desktop/English aquarium"
pip install -r requirements.txt
python app.py
```

打开 `http://localhost:5000`，验证：
1. 水族馆背景正常渲染（天空、沙地、光线）
2. 精灵 fallback 正常显示（几何图形占位）
3. 生物在游动（非正弦波，有状态变化）
4. 浮游光点和气泡可见
5. 时间段切换有渐变过渡
6. 点击生物弹出信息卡
7. 海草多段摆动、珊瑚海葵可见
8. 点击水面产生涟漪+鱼群聚集
9. FPS 稳定在 60 左右

- [ ] **Step 2: 修复发现的问题**

- [ ] **Step 3: 最终 Commit**

```bash
cd "c:/Users/wei/Desktop/English aquarium"
git add -A
git commit -m "chore: integration fixes and polish

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task Order & Dependencies

```
Task 1 (dir+schema) ──> Task 2 (sprites.js) ──> Task 3 (swim-ai.js)
                                                     │
                          Task 4 (particles.js) ─────┤
                                                     │
                          Task 5 (lighting.js) ──────┼──> Task 8 (refactor aquarium.js) ──> Task 9 (index.html) ──> Task 10 (verify)
                                                     │
                          Task 6 (environment.js) ───┤
                                                     │
                          Task 7 (interaction.js) ───┘

Task 2-7 之间无依赖，可并行开发
Task 8 依赖 Task 2-7 全部完成（因为 aquarium.js 引用所有子模块）
Task 9 无代码依赖，可在 Task 8 之前完成
```
