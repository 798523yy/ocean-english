// collection.js - 海洋图鉴模块（从 app.js 拆出）
const Collection = {
    _overlay: null,

    async show() {
        this.close();
        try {
            const data = await API.getCreatures();
            this._render(data);
        } catch (e) {
            State.showToast('加载图鉴失败', 'error');
        }
    },

    _render(data) {
        const overlay = document.createElement('div');
        overlay.className = 'collection-overlay';
        overlay.onclick = (e) => { if (e.target === overlay) this.close(); };

        const creaturesHtml = data.creatures.map(c => {
            const emoji = C.CREATURE_EMOJIS[c.id] || C.DEFAULT_CREATURE_EMOJI;
            const ownedClass = c.owned ? 'owned' : 'locked';
            const ownedAttr = c.owned ? `onclick="Collection.flipCard(this)"` : '';
            const inner = c.owned
                ? `<div class="card-inner">
                    <div class="card-front">
                        <span class="owned-check">✅</span>
                        <span class="creature-emoji">${emoji}</span>
                        <div class="creature-name">${c.name}</div>
                        <div class="creature-name-en">${c.name_en}</div>
                        <span class="creature-rarity-tag rarity-tag-${c.rarity}">${C.RARITY_NAMES[c.rarity]}</span>
                    </div>
                    <div class="card-back">
                        <span class="card-back-en">${c.name_en}</span>
                        <span class="creature-rarity-tag rarity-tag-${c.rarity}">${C.RARITY_NAMES[c.rarity]}</span>
                        <span class="card-back-desc">${c.description || ''}</span>
                        <span class="card-back-hint">🖱️ 点击翻回</span>
                    </div>
                   </div>`
                : `<span class="creature-emoji">${emoji}</span>
                    <div class="creature-name">${c.name}</div>
                    <div class="creature-name-en">${c.name_en}</div>
                    <span class="creature-rarity-tag rarity-tag-${c.rarity}">${C.RARITY_NAMES[c.rarity]}</span>`;
            return `
                <div class="collection-creature ${ownedClass}" ${ownedAttr}>
                    ${inner}
                </div>
            `;
        }).join('');

        overlay.innerHTML = `
            <div class="collection-modal" onclick="event.stopPropagation()">
                <div class="collection-header">
                    <button class="collection-close" onclick="Collection.close()">✕</button>
                    <h2>🐋 海洋图鉴</h2>
                    <p class="collection-progress">已收集 <b>${data.owned_count}</b> / ${data.total} 种海洋生物</p>
                </div>
                <div class="collection-grid">${creaturesHtml}</div>
                <p class="collection-tip">💡 打开盲盒收集更多海洋生物吧！</p>
            </div>
        `;

        document.body.appendChild(overlay);
        this._overlay = overlay;
    },

    flipCard(el) {
        el.classList.toggle('flipped');
    },

    close() {
        if (this._overlay) {
            this._overlay.remove();
            this._overlay = null;
        }
    }
};
