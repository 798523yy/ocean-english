// sprites.js - 精灵（emoji表情包）渲染
const SpriteManager = {
    sprites: {},
    loadedCount: 0,
    totalCount: 0,
    allLoaded: false,

    /**
     * 预加载（emoji无需加载，保留接口兼容性）
     * @param {Array} creatureIds - 生物ID列表
     * @returns {Promise}
     */
    async preload(creatureIds) {
        this.totalCount = creatureIds.length;
        this.loadedCount = creatureIds.length;
        this.allLoaded = true;
        return Promise.resolve();
    },

    isLoaded(id) {
        return true;
    },

    getProgress() {
        return 1;
    },

    /**
     * 用emoji绘制生物
     */
    draw(ctx, creature, x, y, scale, alpha, t) {
        const emoji = C.CREATURE_EMOJIS[creature.id] || C.DEFAULT_CREATURE_EMOJI;
        const spriteScale = creature.sprite_scale || 1.0;
        const finalScale = scale * spriteScale;
        const size = (creature.size || 50) * finalScale;

        ctx.save();
        ctx.globalAlpha = alpha || 1.0;
        ctx.translate(x, y);

        // 用emoji表情绘制
        const fontSize = size * 1.2;
        ctx.font = `${fontSize}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(emoji, 0, 0);

        ctx.restore();
    },

    drawFallback(ctx, creature, x, y, scale, t) {
        // Fallback: 也是用emoji，确保在所有平台都能显示
        const emoji = C.CREATURE_EMOJIS[creature.id] || C.DEFAULT_CREATURE_EMOJI;
        const size = (creature.size || 50) * scale;
        ctx.save();
        ctx.translate(x, y);
        ctx.font = `${size * 1.2}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(emoji, 0, 0);
        ctx.restore();
    }
};
