// sprites.js - 精灵图片加载、缓存、绘制
const SpriteManager = {
    sprites: {},          // id → Image
    loadedCount: 0,
    totalCount: 0,
    allLoaded: false,

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

    isLoaded(id) {
        return this.sprites[id] != null;
    },

    getProgress() {
        if (this.totalCount === 0) return 0;
        return this.loadedCount / this.totalCount;
    },

    draw(ctx, creature, x, y, scale, alpha, t) {
        const img = this.sprites[creature.id];
        const spriteScale = creature.sprite_scale || 1.0;
        const finalScale = scale * spriteScale;
        const size = (creature.size || 50) * finalScale;

        ctx.save();
        ctx.globalAlpha = alpha || 1.0;

        if (img) {
            ctx.translate(x, y);
            ctx.drawImage(img, -size / 2, -size / 2, size, size);
        } else {
            this.drawFallback(ctx, creature, x, y, finalScale, t);
        }

        ctx.restore();
    },

    drawFallback(ctx, creature, x, y, scale, t) {
        const size = (creature.size || 50) * scale;
        ctx.save();
        ctx.translate(x, y);

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
                ctx.fillStyle = creature.color;
                ctx.beginPath();
                ctx.arc(0, 0, size * 0.35, 0, Math.PI * 2);
                ctx.fill();
                break;
        }
        ctx.restore();
    }
};
