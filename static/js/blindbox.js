const Blindbox = {
    currentBoxType: null,
    isAnimating: false,

    async startOpen(boxType) {
        if (this.isAnimating) return;

        const costs = { normal: { shells: 50, pearls: 0 }, rare: { shells: 200, pearls: 0 }, legendary: { shells: 0, pearls: 5 } };
        const cost = costs[boxType];
        if (!State.user) return;

        if (cost.shells > (State.user.shells || 0)) {
            State.showToast('贝壳不足！去做任务赚贝壳吧 🐚', 'error');
            return;
        }
        if (cost.pearls > (State.user.pearls || 0)) {
            State.showToast('珍珠不足！连续签到获取珍珠吧 🦪', 'error');
            return;
        }

        this.isAnimating = true;
        this.currentBoxType = boxType;

        const optionsDiv = document.getElementById('box-options');
        const animDiv = document.getElementById('box-animation');
        const resultDiv = document.getElementById('box-result');

        optionsDiv.classList.add('hidden');
        resultDiv.classList.add('hidden');
        animDiv.classList.remove('hidden');

        this.showAnimation(animDiv);
    },

    showAnimation(container) {
        const boxEmojis = { normal: '📦', rare: '🎁', legendary: '👑' };
        container.innerHTML = `
            <div class="chest-container">
                <div class="chest-light" id="chest-light"></div>
                <div class="chest" id="chest">${boxEmojis[this.currentBoxType]}</div>
            </div>
            <p class="opening-text">正在打开盲盒...</p>
        `;

        // Shake animation
        setTimeout(() => {
            const chest = document.getElementById('chest');
            const light = document.getElementById('chest-light');
            if (chest) chest.classList.add('opening');
            if (light) light.classList.add('glow');

            // Spawn particles
            this.spawnParticles();

            // Call API
            setTimeout(async () => {
                try {
                    const result = await API.openBlindbox(this.currentBoxType);
                    State.user = result.user;
                    State.updateUI();
                    this.showResult(result);
                } catch (e) {
                    State.showToast(e.error || '打开盲盒失败', 'error');
                    this.reset();
                }
            }, 800);
        }, 1500);
    },

    showResult(result) {
        const animDiv = document.getElementById('box-animation');
        const resultDiv = document.getElementById('box-result');

        animDiv.classList.add('hidden');
        resultDiv.classList.remove('hidden');

        const rarityNames = { common: '普通', rare: '稀有', epic: '史诗', legendary: '传说' };
        const creatureEmojis = {
            clownfish: '🐠', seahorse: '🦑', starfish: '⭐', jellyfish: '🫧',
            pufferfish: '🐡', turtle: '🐢', octopus: '🐙', stingray: '🦈',
            dolphin: '🐬', whale: '🐋', shark: '🦈', seadragon: '🐲',
            mermaid: '🧜‍♀️', narwhal: '🐳', glow_jellyfish: '✨'
        };

        const c = result.creature;
        const emoji = creatureEmojis[c.id] || '🐟';

        resultDiv.innerHTML = `
            <div class="box-result rarity-${c.rarity}">
                ${result.is_duplicate ? `<div class="duplicate-badge">🔄 重复生物 +🐚${result.duplicate_reward}</div>` : ''}
                <div class="result-creature-display">${emoji}</div>
                <div class="result-creature-name">${c.name}</div>
                <div class="result-creature-name-en">${c.name_en}</div>
                <span class="result-rarity-tag">${rarityNames[c.rarity] || c.rarity}</span>
                <div class="result-desc">${c.description}</div>
                <div class="result-actions">
                    <button class="btn-view-aquarium" onclick="App.closePanel();Aquarium.refresh();">🐋 查看水族馆</button>
                    <button class="btn-open-again" onclick="Blindbox.reset()">🎁 再抽一次</button>
                </div>
            </div>
        `;

        this.isAnimating = false;
    },

    reset() {
        const optionsDiv = document.getElementById('box-options');
        const animDiv = document.getElementById('box-animation');
        const resultDiv = document.getElementById('box-result');

        optionsDiv.classList.remove('hidden');
        animDiv.classList.add('hidden');
        resultDiv.classList.add('hidden');
        this.isAnimating = false;
        document.querySelectorAll('.particles-container').forEach(el => el.remove());
    },

    spawnParticles() {
        const container = document.createElement('div');
        container.className = 'particles-container';
        document.body.appendChild(container);

        const colors = ['#FFD700', '#FF9800', '#FF5722', '#FFEB3B', '#FFFFFF'];
        for (let i = 0; i < 30; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = (30 + Math.random() * 40) + '%';
            particle.style.top = (20 + Math.random() * 20) + '%';
            particle.style.width = (4 + Math.random() * 8) + 'px';
            particle.style.height = particle.style.width;
            particle.style.background = colors[Math.floor(Math.random() * colors.length)];
            particle.style.animationDuration = (1 + Math.random() * 2) + 's';
            particle.style.animationDelay = Math.random() * 0.5 + 's';
            container.appendChild(particle);
        }

        setTimeout(() => container.remove(), 3000);
    }
};
