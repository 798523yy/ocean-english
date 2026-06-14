// blindbox.js - 大转盘抽奖模块
const Blindbox = {
    currentBoxType: null,
    isAnimating: false,
    isFestival: false,
    festivalEvent: null,

    async checkFestival() {
        try {
            const resp = await fetch('/api/event');
            const event = await resp.json();
            this.isFestival = event.active;
            this.festivalEvent = event;
            return event;
        } catch (e) {
            this.isFestival = false;
            return { active: false };
        }
    },

    async startOpen(boxType) {
        if (this.isAnimating) return;

        const cfg = C.BOX_CONFIG[boxType];
        if (!State.user) return;

        if (cfg.cost_shells > (State.user.shells || 0)) {
            State.showToast('贝壳不足！去做任务赚贝壳吧 🐚', 'error');
            return;
        }
        if (cfg.cost_pearls > (State.user.pearls || 0)) {
            State.showToast('珍珠不足！连续签到获取珍珠吧 🦪', 'error');
            return;
        }

        await this.checkFestival();
        this.isAnimating = true;
        this.currentBoxType = boxType;

        const optionsDiv = document.getElementById('box-options');
        const wheelDiv = document.getElementById('wheel-container');
        const resultDiv = document.getElementById('box-result');

        optionsDiv.classList.add('hidden');
        resultDiv.classList.add('hidden');
        wheelDiv.classList.remove('hidden');

        // 初始化转盘
        Wheel.init('wheel-canvas');
        Wheel.draw(boxType, this.isFestival);

        // 绑定旋转按钮
        const spinBtn = document.getElementById('wheel-spin-btn');
        if (spinBtn) {
            spinBtn.onclick = () => this.doSpin(boxType);
            spinBtn.disabled = false;
            spinBtn.textContent = '🎯 开始抽奖';
        }
    },

    doSpin(boxType) {
        const spinBtn = document.getElementById('wheel-spin-btn');
        if (spinBtn) {
            spinBtn.disabled = true;
            spinBtn.textContent = '转动中...';
        }

        Wheel.spin(boxType, this.isFestival, async (segment) => {
            await this.handleResult(boxType, segment);
        });
    },

    async handleResult(boxType, segment) {
        try {
            if (segment.type === 'creature') {
                // 抽中生物：传 creature_id 确保得到转盘上显示的那个
                const result = await API.request('POST', '/blindbox/open', {
                    uid: API.uid,
                    box_type: boxType,
                    force_creature_id: segment.creature_id
                });
                State.user = result.user;
                State.updateUI();
                this.showCreatureResult(result, segment);
            } else {
                // 抽中贝壳或珍珠
                const result = await API.request('POST', '/blindbox/spin-reward', {
                    uid: API.uid,
                    box_type: boxType,
                    reward_type: segment.type,
                    amount: segment.amount
                });
                State.user = result.user;
                State.updateUI();
                this.showShellResult(result, segment);
            }
        } catch (e) {
            State.showToast(e.error || '抽奖失败', 'error');
            this.reset();
        }
    },

    showCreatureResult(result, segment) {
        const wheelDiv = document.getElementById('wheel-container');
        const resultDiv = document.getElementById('box-result');
        wheelDiv.classList.add('hidden');
        resultDiv.classList.remove('hidden');

        const c = result.creature;
        const emoji = C.CREATURE_EMOJIS[c.id] || C.DEFAULT_CREATURE_EMOJI;

        resultDiv.innerHTML = `
            <div class="box-result rarity-${c.rarity}">
                <p class="wheel-result-tag">🎯 转盘抽中：${segment.label}</p>
                ${result.is_duplicate ? `<div class="duplicate-badge">🔄 重复生物 +🐚${result.duplicate_reward}</div>` : ''}
                <div class="result-creature-display">${emoji}</div>
                <div class="result-creature-name">${c.name}</div>
                <div class="result-creature-name-en">${c.name_en}</div>
                <span class="result-rarity-tag">${C.RARITY_NAMES[c.rarity]}</span>
                <div class="result-desc">${c.description}</div>
                <div class="result-actions">
                    <button class="btn-view-aquarium" onclick="App.closePanel();Aquarium.refresh();">🐋 查看水族馆</button>
                    <button class="btn-open-again" onclick="Blindbox.reset()">🎯 再抽一次</button>
                </div>
            </div>
        `;
        this.isAnimating = false;
    },

    showShellResult(result, segment) {
        const wheelDiv = document.getElementById('wheel-container');
        const resultDiv = document.getElementById('box-result');
        wheelDiv.classList.add('hidden');
        resultDiv.classList.remove('hidden');

        resultDiv.innerHTML = `
            <div class="box-result rarity-${segment.type === 'pearls' ? 'epic' : 'common'}">
                <p class="wheel-result-tag">🎯 转盘抽中：${segment.label}</p>
                <div class="result-creature-display">${segment.emoji}</div>
                <div class="result-creature-name">${segment.label}</div>
                <div class="result-creature-name-en">${segment.type === 'shells' ? 'Shell Bonus' : 'Pearl Bonus'}</div>
                <div class="result-desc">运气不错！继续加油收集海洋生物吧~</div>
                <div class="result-actions">
                    <button class="btn-view-aquarium" onclick="App.closePanel();">🐋 返回</button>
                    <button class="btn-open-again" onclick="Blindbox.reset()">🎯 再抽一次</button>
                </div>
            </div>
        `;
        this.isAnimating = false;
    },

    reset() {
        const optionsDiv = document.getElementById('box-options');
        const wheelDiv = document.getElementById('wheel-container');
        const resultDiv = document.getElementById('box-result');
        const spinBtn = document.getElementById('wheel-spin-btn');

        optionsDiv.classList.remove('hidden');
        wheelDiv.classList.add('hidden');
        resultDiv.classList.add('hidden');
        this.isAnimating = false;
        if (spinBtn) spinBtn.disabled = false;
    }
};
