# Phase 1: 水族馆视觉生动化 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 2D Canvas 基础上提升水族馆视觉品质，包括粒子、水面、生物动画、色彩四项改造。

**Architecture:** 全部改动在现有 JS/CSS 模块上增强，不加新文件、不加新依赖。渲染管线不变：背景→焦散→沙地→装饰→粒子→生物→天气→雾。

**Tech Stack:** Canvas 2D API, CSS custom properties, vanilla JavaScript

---

### Task 1: 气泡系统重写

**Files:**
- Modify: `static/js/particles.js`

**Design:** 气泡从沙地随机冒出（小而密），上升时水平摇摆，到水面爆裂成 surface_ripple。最大气泡数 25→40。

- [ ] **Step 1: 增加气泡容量并修改生成逻辑**

将 `maxBubbles` 从 25 改为 40。修改 `spawnBubble()` 让气泡从底部沙地附近生成：

```js
// particles.js - init() 中
maxBubbles: 40,  // 25 → 40

// spawnBubble 改为从沙地生成
spawnBubble(width, height) {
    this.particles.push({
        type: 'bubble',
        x: Math.random() * width,
        y: height - 50 + Math.random() * 30,  // 从沙地附近冒出
        size: 1.5 + Math.random() * 7,         // 大小更丰富
        alpha: 0.1 + Math.random() * 0.25,
        speedY: -0.4 - Math.random() * 1.0,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.01 + Math.random() * 0.03,
        wobbleAmp: 0.2 + Math.random() * 0.6, // 摇摆幅度
        life: Infinity,
    });
},
```

- [ ] **Step 2: 修改气泡更新逻辑**

在 `update()` 的 bubble case 中增加水平摇摆和爆裂逻辑：

```js
case 'bubble':
    p.y += p.speedY * (dt / 16);
    p.wobble += p.wobbleSpeed * (dt / 16);
    p.x += Math.sin(p.wobble) * p.wobbleAmp * (dt / 16);  // 水平摇摆
    // 到水面爆裂
    if (p.y < 40) {
        this.emit('surface_ripple', p.x, 35, {});
        p.y = height - 50 + Math.random() * 30;
        p.x = Math.random() * width;
        // 随机大小
        p.size = 1.5 + Math.random() * 7;
        p.wobbleAmp = 0.2 + Math.random() * 0.6;
    }
    break;
```

- [ ] **Step 3: 强化气泡绘制**

```js
case 'bubble':
    ctx.strokeStyle = `rgba(200, 230, 255, ${p.alpha})`;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.stroke();
    // 内部亮点
    ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha * 0.5})`;
    ctx.beginPath();
    ctx.arc(p.x - p.size * 0.2, p.y - p.size * 0.2, p.size * 0.3, 0, Math.PI * 2);
    ctx.fill();
    break;
```

- [ ] **Step 4: 提交**

```bash
git add static/js/particles.js
git commit -m "feat: upgrade bubble system (40 bubbles, sand spawn, wobble, surface pop)"
```

---

### Task 2: 水下光柱 (God Rays)

**Files:**
- Modify: `static/js/particles.js`

**Design:** 新增 `lightray` 粒子类型，4条光线从水面射下，随波动偏移，浮游生物靠近时更亮。

- [ ] **Step 1: 在 init() 中初始化光柱**

```js
// particles.js - init() 中添加
for (let i = 0; i < 4; i++) {
    this.particles.push({
        type: 'lightray',
        x: width * (0.2 + i * 0.2),
        width: 40 + Math.random() * 30,
        alpha: 0.03 + Math.random() * 0.04,
        phase: Math.random() * Math.PI * 2,
        life: Infinity,
    });
}
```

- [ ] **Step 2: 光柱更新逻辑**

```js
case 'lightray':
    p.phase += 0.005 * (dt / 16);
    // x 随水面波动偏移
    p.x += Math.sin(p.phase) * 0.15 * (dt / 16);
    break;
```

- [ ] **Step 3: 光柱绘制**

```js
case 'lightray':
    ctx.save();
    const grad = ctx.createLinearGradient(p.x, 0, p.x, height * 0.6);
    grad.addColorStop(0, `rgba(255, 255, 220, ${p.alpha * 1.2})`);
    grad.addColorStop(0.5, `rgba(255, 255, 220, ${p.alpha * 0.5})`);
    grad.addColorStop(1, `rgba(255, 255, 220, 0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    const sway = Math.sin(p.phase) * 15;
    ctx.moveTo(p.x - p.width / 2, 0);
    ctx.lineTo(p.x + p.width / 2, 0);
    ctx.lineTo(p.x + p.width / 2 + sway * 2, height * 0.6);
    ctx.lineTo(p.x - p.width / 2 + sway * 2, height * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    break;
```

- [ ] **Step 4: 提交**

```bash
git add static/js/particles.js
git commit -m "feat: add underwater god rays (4 light beams with sway)"
```

---

### Task 3: 环境微粒 & 传说光晕

**Files:**
- Modify: `static/js/particles.js`, `static/js/lighting.js`

**Design:** 环境装饰旁散发微光粒子。传说生物 glow 增强为脉冲光环。

- [ ] **Step 1: 环境微粒粒子类型**

在 `particles.js` `emit()` 中新增 `sparkle` 类型：

```js
case 'sparkle':
    for (let i = 0; i < (options.count || 3); i++) {
        this.particles.push({
            type: 'sparkle',
            x: x + (Math.random() - 0.5) * 20,
            y: y + (Math.random() - 0.5) * 20,
            size: 0.5 + Math.random() * 1.5,
            alpha: 0.4 + Math.random() * 0.4,
            speedY: -0.2 - Math.random() * 0.3,
            speedX: (Math.random() - 0.5) * 0.3,
            life: 1500 + Math.random() * 1500,
            age: 0,
            color: options.color || '200, 220, 255',
        });
    }
    break;
```

- [ ] **Step 2: sparkle 更新和绘制**

```js
case 'sparkle':
    p.age += dt;
    p.y += p.speedY * (dt / 16);
    p.x += p.speedX * (dt / 16);
    if (p.age > p.life) this.particles.splice(i, 1);
    break;

// 绘制
case 'sparkle':
    const sRatio = 1 - p.age / p.life;
    ctx.fillStyle = `rgba(${p.color}, ${p.alpha * sRatio})`;
    ctx.shadowColor = `rgba(${p.color}, ${p.alpha * sRatio})`;
    ctx.shadowBlur = p.size * 4;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * sRatio, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    break;
```

- [ ] **Step 3: 环境装饰定时产生 sparkle**

在 `aquarium.js` 的 `animate()` 中，每帧少量概率在珊瑚和海葵位置生成 sparkle：

```js
// 在 animate() 循环中，Environment.draw() 之后
if (Math.random() < 0.08) {
    const coral = Environment.corals[Math.floor(Math.random() * Environment.corals.length)];
    if (coral) ParticleManager.emit('sparkle', coral.x, coral.y - 20, { count: 2, color: '180, 255, 220' });
}
if (Math.random() < 0.05) {
    const anemone = Environment.anemones[Math.floor(Math.random() * Environment.anemones.length)];
    if (anemone) ParticleManager.emit('sparkle', anemone.x, anemone.y - 10, { count: 1, color: '255, 180, 255' });
}
```

- [ ] **Step 4: 增强传说生物光晕**

在 `lighting.js` `drawCreatureGlow()` 中为 legendary 生物增加呼吸式脉冲：

```js
case 'legendary':
    glowColor = creature.id === 'glow_jellyfish' ? '0, 255, 200' : '255, 215, 0';
    glowSize = creature.size * scale * 0.7;  // 0.6 → 0.7
    glowAlpha = 0.25 + Math.sin(t * 2) * 0.2;  // 更强脉冲
    break;
```

- [ ] **Step 5: 提交**

```bash
git add static/js/particles.js static/js/aquarium.js static/js/lighting.js
git commit -m "feat: add sparkle particles near corals + legendary creature pulse glow"
```

---

### Task 4: 水面波纹 + 沙地动画

**Files:**
- Modify: `static/js/aquarium.js`

**Design:** 画布顶部绘制动态水面线。沙地有缓慢波动。沙地随机冒气泡。

- [ ] **Step 1: 新增 `drawWaterSurface()` 方法**

在 `aquarium.js` 中添加，在 `animate()` 的 `drawBackground` 之后调用：

```js
drawWaterSurface(ctx) {
    const t = this.time;
    ctx.save();
    // 水面渐变
    const surfGrad = ctx.createLinearGradient(0, 0, 0, 45);
    surfGrad.addColorStop(0, 'rgba(120, 200, 220, 0.25)');
    surfGrad.addColorStop(0.5, 'rgba(80, 160, 200, 0.12)');
    surfGrad.addColorStop(1, 'rgba(0, 100, 160, 0)');
    ctx.fillStyle = surfGrad;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (let x = 0; x <= this.width; x += 4) {
        const y = 8 + Math.sin(x * 0.01 + t * 0.6) * 7
                  + Math.sin(x * 0.03 + t * 1.2) * 4
                  + Math.sin(x * 0.06 - t * 0.8) * 2;
        ctx.lineTo(x, y);
    }
    ctx.lineTo(this.width, 45);
    ctx.lineTo(0, 45);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
},
```

在 `animate()` 中 `drawBackground(ctx)` 之后调用：
```js
this.drawWaterSurface(ctx);
```

- [ ] **Step 2: 沙地慢速波动**

在 `drawSand()` 的沙线中加入时间变量：

```js
// 替换沙线生成逻辑
ctx.beginPath();
ctx.moveTo(0, sandY);
for (let x = 0; x <= this.width; x += 12) {
    const y = sandY + Math.sin(x * 0.015 + this.time * 0.2) * 10
            + Math.sin(x * 0.04 + this.time * 0.35 + 1) * 6;
    ctx.lineTo(x, y);
}
```

- [ ] **Step 3: 沙地随机冒气泡**

在 `animate()` 循环中添加：

```js
// 沙地气泡（约每 2 秒一个）
if (Math.random() < 0.015) {
    ParticleManager.emit('bubble', Math.random() * this.width, this.height - 50, {});
}
```

> 注意：这是额外调用，spawnBubble 的自动补充逻辑在 update 中继续运行。

- [ ] **Step 4: 提交**

```bash
git add static/js/aquarium.js
git commit -m "feat: add animated water surface + undulating sand + seabed bubbles"
```

---

### Task 5: 焦散光升级

**Files:**
- Modify: `static/js/lighting.js`

**Design:** 沙地光斑密度翻倍，移动更流畅，随深度衰减。

- [ ] **Step 1: 增加光斑数量和深度衰减**

修改 `drawCaustics()`：

```js
drawCaustics(ctx, width, height, t) {
    const colors = this.getColors();
    const alpha = colors.causticAlpha || 0.06;
    if (alpha < 0.01) return;

    ctx.save();

    for (let i = 0; i < 35; i++) {  // 20 → 35
        const cx = ((i * 197 + 31) % 1000) / 1000 * width;
        const depth = 0.1 + (i / 35) * 0.7;  // 0=surface, 1=deep
        const y = height * 0.1 + depth * height * 0.5 + Math.sin(t * 0.5 + i * 1.3) * 30;
        const rx = 25 + Math.sin(t * 0.4 + i) * 12 + (i * 13) % 50;  // 更大光斑
        const ry = 6 + Math.cos(t * 0.5 + i) * 3;

        const depthAlpha = alpha * (1 - depth * 0.5);  // 越深越淡
        ctx.fillStyle = `rgba(255, 255, 255, ${depthAlpha * 2})`;
        ctx.beginPath();
        ctx.ellipse(cx, y, rx, ry, 0.2 + Math.sin(t * 0.25 + i) * 0.3, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
},
```

- [ ] **Step 2: 提交**

```bash
git add static/js/lighting.js
git commit -m "feat: denser caustics with depth-based fading"
```

---

### Task 6: 生物动画 — 缓入缓出 + 弧线转弯

**Files:**
- Modify: `static/js/swim-ai.js`

**Design:** 生物速度加入 ease-in-out。方向改变时走弧线而非瞬切。

- [ ] **Step 1: easeInOut 速度曲线**

修改 `updateMoving()` 的速度计算：

```js
// 替换现有 speed 计算
const speedFactor = Math.min(1, dist / 150);
// ease-in-out
const easeFactor = speedFactor < 0.5
    ? 2 * speedFactor * speedFactor
    : 1 - Math.pow(-2 * speedFactor + 2, 2) / 2;
s.speed = s.baseSpeed * (0.3 + 0.7 * easeFactor);
```

- [ ] **Step 2: 弧线转弯 — 引入 desiredAngle**

在 state 对象中增加 `desiredAngle`，转弯时逐渐逼近：

```js
// updateMoving 中替换角度更新
const targetAngle = Math.atan2(dy, dx);
let angleDiff = targetAngle - s.angle;
// 标准化到 -PI..PI
angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
const turnAmount = Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), s.turnRate * 1.5 * (dt / 16));
s.angle += turnAmount;
```

- [ ] **Step 3: 停留浮动效果**

修改 `updateFree()` 和 `updatePausing()` 增加上下微浮动：

```js
// updateFree 增加浮动
s.y += Math.sin(s.stateTimer * 0.003 + s.wobblePhase) * 0.15 * (dt / 16);

// updatePausing 增加浮动幅度
s.x += Math.sin(s.stateTimer * 0.003 + s.wobblePhase) * 0.2 * (dt / 16);
s.y += Math.cos(s.stateTimer * 0.004 + s.wobblePhase) * 0.2 * (dt / 16);
```

- [ ] **Step 4: 冲刺行为**

在 `updateFree()` 中偶尔触发冲刺：

```js
// 冲刺：小概率触发
if (Math.random() < 0.0003) {
    s.state = 'dashing';
    s.stateTimer = 0;
    s.dashAngle = s.angle + (Math.random() - 0.5) * 0.6;
    s.dashDuration = 600 + Math.random() * 800;
    return;
}
```

添加 `dashing` state：

```js
// update 的 switch 中
case 'dashing': this.updateDashing(s, dt); break;

// 新方法
updateDashing(s, dt) {
    s.x += Math.cos(s.dashAngle) * s.baseSpeed * 2.5 * (dt / 16);
    s.y += Math.sin(s.dashAngle) * s.baseSpeed * 2.5 * (dt / 16);
    if (s.stateTimer > s.dashDuration) {
        s.state = 'free';
        s.stateTimer = 0;
    }
},
```

- [ ] **Step 5: 种内弱聚群**

为同种生物增加弱吸引力（已有 `schoolGroups`，补充 `free` 状态逻辑）：

```js
// 在 updateFree 中，schooling 检查后
if (s.schooling && schoolGroups[s.creatureId] && schoolGroups[s.creatureId].length >= 2) {
    // 计算群体中心
    let cx = 0, cy = 0, count = 0;
    for (const mid of schoolGroups[s.creatureId]) {
        if (mid !== stateId) {
            const other = this.states[mid];
            if (other && other.state === 'free') {
                cx += other.x; cy += other.y; count++;
            }
        }
    }
    if (count > 0) {
        cx /= count; cy /= count;
        const toCenterX = cx - s.x;
        const toCenterY = cy - s.y;
        s.x += toCenterX * 0.0002 * (dt / 16);
        s.y += toCenterY * 0.0002 * (dt / 16);
    }
}
```

- [ ] **Step 6: 提交**

```bash
git add static/js/swim-ai.js
git commit -m "feat: ease-in-out swim, arc turns, bobbing, dash, weak schooling"
```

---

### Task 7: 生物体型差异 + 尾迹强化

**Files:**
- Modify: `static/js/aquarium.js`

**Design:** 同种生物大小 ±15% 随机。游动速度快时尾迹更明显。

- [ ] **Step 1: 生物体型随机差异**

在 `drawAllCreatures()` 中为每个生物计算随机缩放：

```js
// 在 toDraw.push 之前
const sizeVariation = creature._sizeVar !== undefined ? creature._sizeVar : (() => {
    creature._sizeVar = 0.85 + Math.random() * 0.3;  // 0.85 ~ 1.15
    return creature._sizeVar;
})();

toDraw.push({ s, creature, y: s.y, alpha, scale: sizeVariation });
```

修改 `draw` 调用：
```js
SpriteManager.draw(ctx, item.creature, 0, 0, item.scale, item.alpha, this.time);
```

- [ ] **Step 2: 尾迹强化**

速度 > 0.2 时更大概率产生尾迹（原来 0.3）：

```js
if (item.s.speed > 0.2 && Math.random() < Math.min(0.5, item.s.speed * 0.6)) {
    const trailX = item.s.x - Math.cos(item.s.angle) * item.creature.size * 0.6;
    const trailY = item.s.y - Math.sin(item.s.angle) * item.creature.size * 0.6;
    ParticleManager.emit('trail', trailX, trailY, { count: item.s.speed > 0.6 ? 2 : 1 });
}
```

- [ ] **Step 3: 提交**

```bash
git add static/js/aquarium.js
git commit -m "feat: random creature size variation ±15% + enhanced swim trails"
```

---

### Task 8: 色彩主题深化 — 时段过渡

**Files:**
- Modify: `static/js/lighting.js`, `static/css/main.css`

**Design:** 时段切换从 1s 改为 3s 缓慢过渡。Night 模式增加生物荧光效果。

- [ ] **Step 1: 过渡时间延长**

```js
// lighting.js - 修改 transitionDuration
transitionDuration: 3000,  // 1000 → 3000
```

- [ ] **Step 2: Night 时段增加荧光色调**

修改 night 色板，让沙地和光线更偏蓝紫荧光：

```js
night: {
    top: '#040A18', mid: '#0A1A3A', low: '#071430', bot: '#020810',
    ray: 'rgba(69, 228, 181, 0.05)', rayEnd: 'rgba(0, 200, 180, 0)',
    sand1: '#2A4A6A', sand2: '#1E3850', sand3: '#122030',
    causticAlpha: 0.04,
},
```

- [ ] **Step 3: CSS 时段过渡配合**

在 `main.css` 中确认 body 背景过渡与 JS 同步：

```css
body {
    transition: background 3s ease;
}
```

- [ ] **Step 4: 提交**

```bash
git add static/js/lighting.js static/css/main.css
git commit -m "feat: 3s smooth time-of-day transition + night bioluminescence palette"
```

---

### Task 9: 验证 & 提交

- [ ] **Step 1: 语法检查**

```bash
node --check static/js/particles.js
node --check static/js/swim-ai.js
node --check static/js/aquarium.js
node --check static/js/lighting.js
```

- [ ] **Step 2: 启动服务器验证**

```bash
python app.py &
sleep 2
curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/
# Expected: 200
```

- [ ] **Step 3: 手动验收清单**

打开 http://localhost:5000/ 检查：
- [ ] 气泡从沙地冒出，上升有摇摆
- [ ] 水下光柱可见
- [ ] 珊瑚/海葵旁有微光粒子
- [ ] 水面波纹在画布顶部
- [ ] 沙地光斑更密集
- [ ] 生物游动有缓入缓出
- [ ] 生物偶尔冲刺
- [ ] 传说生物有脉冲光环
- [ ] 时段切换是 3s 渐变

- [ ] **Step 4: 最终提交**

```bash
git add -A && git commit -m "feat: Phase 1 visual polish complete — particles, water, creatures, color"
```
