// particles.js - 粒子特效管理器
const ParticleManager = {
    particles: [],
    maxPlankton: 30,
    maxBubbles: 25,

    init(width, height) {
        this.particles = [];
        for (let i = 0; i < this.maxPlankton; i++) {
            this.spawnPlankton(width, height);
        }
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
    },

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
                    x, y,
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
                        x, y,
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
                    x, y,
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

    update(dt, width, height) {
        if (!dt || dt > 100) dt = 16;

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            switch (p.type) {
                case 'plankton':
                    p.x += p.speedX * (dt / 16);
                    p.y += p.speedY * (dt / 16);
                    p.alphaPhase += 0.02 * (dt / 16);
                    if (p.x < -20) p.x = width + 20;
                    if (p.x > width + 20) p.x = -20;
                    if (p.y < -20) p.y = height + 20;
                    if (p.y > height + 20) p.y = -20;
                    break;

                case 'bubble':
                    p.y += p.speedY * (dt / 16);
                    p.wobble += p.wobbleSpeed * (dt / 16);
                    p.x += Math.sin(p.wobble) * 0.3 * (dt / 16);
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
                    if (p.type === 'firework') p.speedY += 0.02 * (dt / 16);
                    if (p.age > p.life) this.particles.splice(i, 1);
                    break;

                case 'ripple':
                case 'surface_ripple':
                    p.age += dt;
                    const progress = p.age / p.life;
                    p.radius = p.maxRadius * progress;
                    p.alpha = p.alpha * (1 - progress);
                    if (p.age > p.life) this.particles.splice(i, 1);
                    break;
            }
        }

        let planktonCount = this.particles.filter(p => p.type === 'plankton').length;
        while (planktonCount < this.maxPlankton) { this.spawnPlankton(width, height); planktonCount++; }

        let bubbleCount = this.particles.filter(p => p.type === 'bubble').length;
        while (bubbleCount < this.maxBubbles && Math.random() < 0.3) { this.spawnBubble(width, height); bubbleCount++; }
    },

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

    clear() {
        this.particles = this.particles.filter(p => p.type === 'plankton' || p.type === 'bubble');
    },

    setCapacity(maxPlankton, maxBubbles) {
        this.maxPlankton = maxPlankton;
        this.maxBubbles = maxBubbles;
    }
};
