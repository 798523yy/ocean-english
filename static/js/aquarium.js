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
    spriteAlpha: 0,

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

        if (!timestamp) timestamp = performance.now();
        const dt = Math.min(timestamp - this.lastFrameTime, 100);
        this.lastFrameTime = timestamp;
        this.time += dt / 1000;

        // FPS
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

        // 4. 环境装饰
        Environment.draw(ctx, this.time);

        // 5. 粒子
        ParticleManager.update(dt, this.width, this.height);
        ParticleManager.draw(ctx);

        // 6. 游动AI
        SwimAI.update(dt);
        Interaction.update(dt);

        // 7. 时间段检测
        this.updateTimePeriod();

        // 8. 绘制生物（带光晕和深度排序）
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

        ctx.fillStyle = c.sand3;
        [
            [this.width * 0.1, sandY + 6, 10],
            [this.width * 0.25, sandY + 4, 7],
            [this.width * 0.45, sandY + 8, 12],
            [this.width * 0.6, sandY + 5, 8],
            [this.width * 0.8, sandY + 7, 11]
        ].forEach(([rx, ry, rr]) => {
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
        Lighting.update(16);
    },

    drawAllCreatures(ctx) {
        const states = SwimAI.getAllStates();

        const toDraw = [];
        for (const s of states) {
            const creature = this.creatures.find(c => c.id === s.creatureId);
            if (!creature) continue;

            let alpha = this.spriteAlpha;
            const draggedIdx = Interaction.draggedCreature;
            if (draggedIdx !== null && this.layout[draggedIdx] &&
                this.layout[draggedIdx].creature_id === s.creatureId) {
                alpha *= 0.6;
            }

            toDraw.push({ s, creature, y: s.y, alpha });
        }
        toDraw.sort((a, b) => a.y - b.y);

        for (const item of toDraw) {
            // 光晕
            Lighting.drawCreatureGlow(ctx, item.creature, item.s.x, item.s.y, 1, this.time);

            // 朝向和绘制
            ctx.save();
            ctx.translate(item.s.x, item.s.y);
            const facingRight = Math.cos(item.s.angle) > 0;
            if (!facingRight) ctx.scale(-1, 1);

            SpriteManager.draw(ctx, item.creature, 0, 0, 1, item.alpha, this.time);
            ctx.restore();

            // 尾迹
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
