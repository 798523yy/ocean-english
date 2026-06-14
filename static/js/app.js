// app.js - 主控制器（重构后，Auth→auth.js, Collection→collection.js）
const App = {
    currentPanel: null,
    currentCategory: null,
    practiceMenuOpen: false,
    profileOpen: false,
    timeInterval: null,

    async init() {
        this.detectTimePeriod();
        this.updateGreeting();
        this.timeInterval = setInterval(() => {
            this.detectTimePeriod();
            this.updateGreeting();
        }, 30000);

        const savedUid = localStorage.getItem('ocean_english_uid');
        if (savedUid) {
            API.uid = savedUid;
            await State.init();
            Aquarium.init();
            this.hideLogin();
        } else {
            this.showLogin();
        }
    },

    // === Time ===

    getTimePeriod() {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 8) return 'dawn';
        if (hour >= 8 && hour < 17) return 'day';
        if (hour >= 17 && hour < 20) return 'dusk';
        return 'night';
    },

    getTimeInfo() {
        const period = this.getTimePeriod();
        return C.TIME_PERIODS[period] || C.TIME_PERIODS.night;
    },

    detectTimePeriod() {
        const period = this.getTimePeriod();
        document.body.className = document.body.className.replace(/time-\w+/g, '');
        document.body.classList.add(`time-${period}`);
        return period;
    },

    updateGreeting() {
        const info = this.getTimeInfo();
        const greetingText = document.getElementById('greeting-text');
        const greetingSub = document.getElementById('greeting-sub');
        const greetingTime = document.getElementById('greeting-time');
        if (greetingText) greetingText.textContent = info.greeting;
        if (greetingSub) greetingSub.textContent = info.sub;
        if (greetingTime) {
            const now = new Date();
            greetingTime.textContent = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        }
    },

    // === Login ===

    showLogin() {
        document.getElementById('login-overlay').classList.remove('hidden');
    },

    hideLogin() {
        document.getElementById('login-overlay').classList.add('hidden');
    },

    onLoginSuccess(user, level) {
        this.hideLogin();
        State.user = user;
        State.level = level;
        State.updateUI();
        State.updateProfilePopup();
        Aquarium.init();
    },

    // === Profile Popup ===

    toggleProfilePopup() {
        const popup = document.getElementById('profile-popup');
        if (!popup) return;

        this.profileOpen = !this.profileOpen;
        if (this.profileOpen) {
            State.updateProfilePopup();
            popup.classList.remove('hidden');
        } else {
            popup.classList.add('hidden');
        }
    },

    closeProfilePopup() {
        const popup = document.getElementById('profile-popup');
        if (popup) popup.classList.add('hidden');
        this.profileOpen = false;
    },

    // === Practice Menu ===

    togglePracticeMenu() {
        const submenu = document.getElementById('practice-submenu');
        const btn = document.getElementById('practice-btn');
        if (!submenu) return;

        this.practiceMenuOpen = !this.practiceMenuOpen;
        if (this.practiceMenuOpen) {
            submenu.classList.remove('hidden');
            btn.classList.add('active');
        } else {
            submenu.classList.add('hidden');
            btn.classList.remove('active');
        }
    },

    closePracticeMenu() {
        const submenu = document.getElementById('practice-submenu');
        const btn = document.getElementById('practice-btn');
        if (submenu) submenu.classList.add('hidden');
        if (btn) btn.classList.remove('active');
        this.practiceMenuOpen = false;
    },

    // === Panel ===

    openPanel(type, category) {
        this.currentPanel = type;
        this.currentCategory = category || null;
        const panel = document.getElementById('slide-panel');
        const body = document.getElementById('panel-body');
        if (!panel || !body) return;
        panel.classList.remove('hidden');

        if (type === 'blindbox') {
            body.className = 'panel-body panel-category blindbox';
            body.innerHTML = `
                <div class="panel-scene-header">
                    <h2>🎯 大转盘抽奖</h2>
                    <p class="scene-subtitle">转动转盘，试试你的运气</p>
                </div>
                <!-- 节日活动横幅 -->
                <div class="festival-banner hidden" id="festival-banner"></div>
                <!-- 等级选择 -->
                <div class="box-options" id="box-options">
                    <div class="box-card" data-box="normal" onclick="Blindbox.startOpen('normal')">
                        <div class="box-icon">🎯</div>
                        <div>
                            <div class="box-name">普通转盘</div>
                            <div class="box-cost">🐚 ${C.BOX_CONFIG.normal.cost_shells}</div>
                            <div class="box-prob">稀有15% | 贝壳/珍珠奖励</div>
                        </div>
                    </div>
                    <div class="box-card" data-box="rare" onclick="Blindbox.startOpen('rare')">
                        <div class="box-icon">🎰</div>
                        <div>
                            <div class="box-name">稀有转盘</div>
                            <div class="box-cost">🐚 ${C.BOX_CONFIG.rare.cost_shells}</div>
                            <div class="box-prob">史诗10% | 稀有+贝壳奖励</div>
                        </div>
                    </div>
                    <div class="box-card" data-box="legendary" onclick="Blindbox.startOpen('legendary')">
                        <div class="box-icon">👑</div>
                        <div>
                            <div class="box-name">传说转盘</div>
                            <div class="box-cost">🦪 ${C.BOX_CONFIG.legendary.cost_pearls}</div>
                            <div class="box-prob">传说40% | 史诗+珍珠奖励</div>
                        </div>
                    </div>
                </div>
                <!-- 转盘 -->
                <div class="wheel-container hidden" id="wheel-container">
                    <canvas id="wheel-canvas"></canvas>
                    <button class="btn-primary wheel-spin-btn" id="wheel-spin-btn">🎯 开始抽奖</button>
                </div>
                <!-- 结果 -->
                <div class="box-result hidden" id="box-result"></div>
            `;

            // 异步检查节日活动
            Blindbox.checkFestival().then(event => {
                if (event.active) {
                    const banner = document.getElementById('festival-banner');
                    if (banner) {
                        banner.classList.remove('hidden');
                        const endDate = new Date(event.end_date + 'T23:59:59');
                        const daysLeft = Math.ceil((endDate - new Date()) / 86400000);
                        banner.innerHTML = `${event.emoji} <b>${event.name}活动</b>：传说转盘概率提升至60%！剩余 ${daysLeft} 天`;
                    }
                }
            });
        } else if (type === 'practice') {
            this.renderPracticePanel(body, category);
        }

        this.closePracticeMenu();
    },

    renderPracticePanel(body, activeCategory) {
        const categoryInfo = {
            vocabulary: { icon: '📝', title: '单词练习', subtitle: 'Vocabulary', cls: 'vocabulary' },
            listening: { icon: '🎧', title: '听力练习', subtitle: 'Listening', cls: 'listening' },
            speaking: { icon: '🗣️', title: '口语练习', subtitle: 'Speaking', cls: 'speaking' }
        };

        const info = categoryInfo[activeCategory] || categoryInfo.vocabulary;
        body.className = `panel-body panel-category ${info.cls}`;

        body.innerHTML = `
            <div class="panel-scene-header">
                <h2>${info.icon} ${info.title}</h2>
                <p class="scene-subtitle">${info.subtitle}</p>
            </div>
            <div class="category-tabs">
                <button class="category-tab ${activeCategory === 'vocabulary' ? 'active' : ''}" data-cat="vocabulary">
                    📝 单词
                </button>
                <button class="category-tab ${activeCategory === 'listening' ? 'active' : ''}" data-cat="listening">
                    🎧 听力
                </button>
                <button class="category-tab ${activeCategory === 'speaking' ? 'active' : ''}" data-cat="speaking">
                    🗣️ 口语
                </button>
            </div>
            <div class="task-list" id="panel-tasks"></div>
        `;

        body.querySelectorAll('.category-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.renderPracticePanel(body, tab.dataset.cat);
            });
        });

        Tasks.loadTasksForCategory(activeCategory);
    },

    closePanel() {
        this.currentPanel = null;
        this.currentCategory = null;
        const panel = document.getElementById('slide-panel');
        if (panel) panel.classList.add('hidden');
        Blindbox.reset();
        this.closePracticeMenu();
    },

    // === Collection (delegates to Collection module) ===

    showCollection() {
        Collection.show();
    },

    closeCollection() {
        Collection.close();
    },

    // === Checkin ===

    async quickCheckin() {
        const btn = document.getElementById('checkin-btn');
        if (btn && btn.classList.contains('checked')) {
            State.showToast('今日已签到', 'success');
            return;
        }
        try {
            const result = await API.checkin();
            State.user = result.user;
            State.level = result.level;
            State.updateUI();
            State.updateProfilePopup();
            let msg = `签到成功! 🔥+${result.streak}天 🐚+${result.reward.shells}`;
            if (result.reward.pearls) msg += ` 🦪+${result.reward.pearls}`;
            State.showToast(msg, 'reward');
            if (btn) {
                btn.classList.add('checked');
            }
        } catch (e) {
            if (e.already_checked_in) {
                State.showToast('今日已签到', 'success');
                if (btn) btn.classList.add('checked');
            } else {
                State.showToast('签到失败', 'error');
            }
        }
    }
};

// === Redeem ===

const Redeem = {
    async submit() {
        const input = document.getElementById('redeem-code-input');
        const msgEl = document.getElementById('redeem-msg');
        const code = input.value.trim();

        if (!code) {
            this._showMsg('请输入兑换码', 'error');
            return;
        }

        try {
            const resp = await fetch('/api/redeem', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid: API.uid, code })
            });
            const data = await resp.json();
            if (!resp.ok) {
                this._showMsg(data.error || '兑换失败', 'error');
                return;
            }

            State.user = data.user;
            State.updateUI();
            State.updateProfilePopup();
            this._showMsg(data.message, 'success');
            State.showToast(`兑换成功！+🐚${data.reward.shells} +🦪${data.reward.pearls}`, 'reward');
            input.value = '';
        } catch (e) {
            this._showMsg('网络错误', 'error');
        }
    },

    _showMsg(msg, type) {
        const msgEl = document.getElementById('redeem-msg');
        if (!msgEl) return;
        msgEl.textContent = msg;
        msgEl.className = `redeem-msg ${type}`;
        msgEl.classList.remove('hidden');
        setTimeout(() => msgEl.classList.add('hidden'), 3000);
    }
};

// === Bootstrap ===

document.addEventListener('DOMContentLoaded', () => {
    App.init();

    document.querySelectorAll('.submenu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            App.openPanel('practice', item.dataset.category);
        });
    });
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (Settings._overlay) Settings.close();
        else if (Friends._overlay) Friends.close();
        else if (Collection._overlay) Collection.close();
        else if (App.profileOpen) App.closeProfilePopup();
        else App.closePanel();
    }
});

// Close popups when clicking outside
document.addEventListener('click', (e) => {
    if (App.practiceMenuOpen) {
        const actions = document.getElementById('right-actions');
        if (actions && !actions.contains(e.target)) {
            App.closePracticeMenu();
        }
    }
    if (App.profileOpen) {
        const popup = document.getElementById('profile-popup');
        const userArea = document.getElementById('user-float');
        if (popup && !popup.contains(e.target) && userArea && !userArea.contains(e.target)) {
            App.closeProfilePopup();
        }
    }
});
