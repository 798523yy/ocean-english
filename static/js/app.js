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

        // Check if user is logged in
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
        const info = {
            dawn: { greeting: 'Good Morning!', sub: '晨间学习', emoji: '🌅', desc: '一日之计在于晨，开启元气满满的一天' },
            day: { greeting: 'Good Afternoon!', sub: '日间学习', emoji: '☀️', desc: '阳光正好，正是学习好时光' },
            dusk: { greeting: 'Good Evening!', sub: '傍晚学习', emoji: '🌇', desc: '日落时分，温故而知新' },
            night: { greeting: 'Good Night!', sub: '夜间学习', emoji: '🌟', desc: '夜深人静，专注学习的好时刻' }
        };
        return info[period];
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
                    <h2>🎁 抽取盲盒</h2>
                    <p class="scene-subtitle">试试手气，收集海洋生物</p>
                </div>
                <div class="box-options" id="box-options">
                    <div class="box-card" data-box="normal" onclick="Blindbox.startOpen('normal')">
                        <div class="box-icon">📦</div>
                        <div>
                            <div class="box-name">普通盲盒</div>
                            <div class="box-cost">🐚 50</div>
                            <div class="box-prob">传说 5% | 史诗 10%</div>
                        </div>
                    </div>
                    <div class="box-card" data-box="rare" onclick="Blindbox.startOpen('rare')">
                        <div class="box-icon">🎁</div>
                        <div>
                            <div class="box-name">稀有盲盒</div>
                            <div class="box-cost">🐚 200</div>
                            <div class="box-prob">传说 10% | 史诗 30%</div>
                        </div>
                    </div>
                    <div class="box-card" data-box="legendary" onclick="Blindbox.startOpen('legendary')">
                        <div class="box-icon">👑</div>
                        <div>
                            <div class="box-name">传说盲盒</div>
                            <div class="box-cost">🦪 5</div>
                            <div class="box-prob">传说 40% | 史诗 60%</div>
                        </div>
                    </div>
                </div>
                <div class="box-animation hidden" id="box-animation"></div>
                <div class="box-result hidden" id="box-result"></div>
            `;
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

    // === Collection / Bestiary ===

    _collectionOverlay: null,

    async showCollection() {
        this.closeCollection();
        try {
            const data = await API.getCreatures();
            this._renderCollection(data);
        } catch (e) {
            State.showToast('加载图鉴失败', 'error');
        }
    },

    _renderCollection(data) {
        const creatureEmojis = {
            clownfish: '🐠', seahorse: '🦑', starfish: '⭐', jellyfish: '🫧',
            pufferfish: '🐡', turtle: '🐢', octopus: '🐙', stingray: '🦈',
            dolphin: '🐬', whale: '🐋', shark: '🦈', seadragon: '🐲',
            mermaid: '🧜‍♀️', narwhal: '🐳', glow_jellyfish: '✨'
        };
        const rarityNames = { common: '普通', rare: '稀有', epic: '史诗', legendary: '传说' };

        const overlay = document.createElement('div');
        overlay.className = 'collection-overlay';
        overlay.onclick = (e) => { if (e.target === overlay) this.closeCollection(); };

        const creaturesHtml = data.creatures.map(c => {
            const emoji = creatureEmojis[c.id] || '🐟';
            const ownedClass = c.owned ? 'owned' : 'locked';
            return `
                <div class="collection-creature ${ownedClass}">
                    ${c.owned ? `<span class="owned-check">✅</span>` : ''}
                    <span class="creature-emoji">${emoji}</span>
                    <div class="creature-name">${c.name}</div>
                    <div class="creature-name-en">${c.name_en}</div>
                    <span class="creature-rarity-tag rarity-tag-${c.rarity}">${rarityNames[c.rarity]}</span>
                </div>
            `;
        }).join('');

        overlay.innerHTML = `
            <div class="collection-modal" onclick="event.stopPropagation()">
                <div class="collection-header">
                    <button class="collection-close" onclick="App.closeCollection()">✕</button>
                    <h2>🐋 海洋图鉴</h2>
                    <p class="collection-progress">已收集 <b>${data.owned_count}</b> / ${data.total} 种海洋生物</p>
                </div>
                <div class="collection-grid">${creaturesHtml}</div>
                <p class="collection-tip">💡 打开盲盒收集更多海洋生物吧！</p>
            </div>
        `;

        document.body.appendChild(overlay);
        this._collectionOverlay = overlay;
    },

    closeCollection() {
        if (this._collectionOverlay) {
            this._collectionOverlay.remove();
            this._collectionOverlay = null;
        }
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

// === Auth handler ===

const Auth = {
    countdown: 0,
    timer: null,

    async sendCode() {
        if (this.countdown > 0) return;

        const phone = document.getElementById('login-phone').value.trim();
        if (phone.length !== 11 || !/^\d{11}$/.test(phone)) {
            State.showToast('请输入正确的11位手机号', 'error');
            return;
        }

        try {
            const resp = await fetch('/api/auth/send-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone })
            });
            const data = await resp.json();
            if (!resp.ok) {
                State.showToast(data.error || '发送失败', 'error');
                return;
            }
            // For demo: auto-fill the code
            document.getElementById('login-code').value = data.demo_code || '';
            State.showToast('验证码已发送 (Demo: 已自动填入)', 'success');

            this.countdown = 60;
            this.updateCodeBtn();
            this.timer = setInterval(() => {
                this.countdown--;
                this.updateCodeBtn();
                if (this.countdown <= 0) clearInterval(this.timer);
            }, 1000);
        } catch (e) {
            State.showToast('网络错误', 'error');
        }
    },

    updateCodeBtn() {
        const btn = document.getElementById('send-code-btn');
        if (!btn) return;
        if (this.countdown > 0) {
            btn.textContent = `${this.countdown}s`;
            btn.disabled = true;
        } else {
            btn.textContent = '获取验证码';
            btn.disabled = false;
        }
    },

    async login() {
        const phone = document.getElementById('login-phone').value.trim();
        const code = document.getElementById('login-code').value.trim();

        if (!phone || !code) {
            State.showToast('请输入手机号和验证码', 'error');
            return;
        }

        try {
            const resp = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, code })
            });
            const data = await resp.json();
            if (!resp.ok) {
                State.showToast(data.error || '登录失败', 'error');
                return;
            }

            localStorage.setItem('ocean_english_uid', phone);
            API.uid = phone;
            App.onLoginSuccess(data.user, data.level);
        } catch (e) {
            State.showToast('网络错误', 'error');
        }
    },

    logout() {
        localStorage.removeItem('ocean_english_uid');
        API.uid = 'default';
        App.closeProfilePopup();
        App.closePanel();
        State.user = null;
        State.level = null;
        State.updateUI();
        document.getElementById('user-name').textContent = '探险家';
        document.getElementById('user-level-tag').textContent = '';
        document.getElementById('user-avatar').textContent = '🐠';
        App.showLogin();
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
        if (App._collectionOverlay) App.closeCollection();
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
