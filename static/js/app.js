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
        // 时段背景音乐
        if (typeof Sound !== 'undefined') Sound.updateMusic(period);
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
        this._syncMuteIcon();
        Aquarium.init();
        // First-time onboarding
        if (!localStorage.getItem('ocean_onboarded')) {
            setTimeout(() => this._showOnboarding(), 800);
        }
    },

    _syncMuteIcon() {
        const btn = document.getElementById('mute-toggle');
        if (!btn) return;
        if (typeof Sound !== 'undefined' && Sound._muted) {
            btn.classList.add('muted');
            btn.innerHTML = '&#x1f507;';
        } else {
            btn.classList.remove('muted');
            btn.innerHTML = '&#x1f50a;';
        }
    },

    _showOnboarding() {
        const steps = [
            { sel: '#checkin-btn', text: '☀️ 每日签到获取贝壳和珍珠<br>连续签到奖励更多！', pos: 'left' },
            { sel: '#practice-btn', text: '📚 练习英语 — 单词、听力、口语<br>完成任务升级解锁新生物', pos: 'left' },
            { sel: '#blindbox-btn', text: '🎁 抽奖转盘获取海洋生物<br>集齐图鉴打造你的水族馆', pos: 'left' },
        ];
        let stepIdx = 0;
        let overlay = null;
        let tooltip = null;

        const showStep = () => {
            if (overlay) overlay.remove();
            const step = steps[stepIdx];
            const target = document.querySelector(step.sel);
            overlay = document.createElement('div');
            overlay.className = 'onboard-overlay';
            const rect = target ? target.getBoundingClientRect() : { left: 0, top: 0, width: 50, height: 50 };
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            overlay.innerHTML = `
                <div class="onboard-spotlight" style="left:${cx}px;top:${cy}px;width:${Math.max(rect.width, rect.height) + 24}px;height:${Math.max(rect.width, rect.height) + 24}px;"></div>
                <div class="onboard-tooltip" style="${step.pos === 'left' ? 'right:' + (window.innerWidth - rect.left + 20) + 'px' : 'left:' + (rect.right + 20) + 'px'};top:${cy}px;">
                    <p>${step.text}</p>
                    <div class="onboard-actions">
                        <span class="onboard-dots">${steps.map((_, i) => i === stepIdx ? '●' : '○').join(' ')}</span>
                        <button class="onboard-next-btn">${stepIdx < steps.length - 1 ? '下一步 →' : '开始探索 🐠'}</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);

            const nextBtn = overlay.querySelector('.onboard-next-btn');
            nextBtn.addEventListener('click', () => {
                stepIdx++;
                if (stepIdx < steps.length) {
                    showStep();
                } else {
                    overlay.remove();
                    localStorage.setItem('ocean_onboarded', '1');
                }
            });
        };

        showStep();
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

    // === Mute ===

    toggleMute() {
        if (typeof Sound === 'undefined') return;
        const btn = document.getElementById('mute-toggle');
        if (Sound._muted) {
            Sound.unmute();
            if (btn) { btn.classList.remove('muted'); btn.innerHTML = '&#x1f50a;'; }
        } else {
            Sound.mute();
            if (btn) { btn.classList.add('muted'); btn.innerHTML = '&#x1f507;'; }
        }
    },

    // === Redeem ===

    _redeemOverlay: null,

    showRedeem() {
        if (this._redeemOverlay) return;
        const overlay = document.createElement('div');
        overlay.className = 'redeem-overlay';
        overlay.onclick = (e) => { if (e.target === overlay) this.closeRedeem(); };
        overlay.innerHTML = `
            <div class="redeem-modal">
                <div class="redeem-modal-header">
                    <h2>🎫 兑换码</h2>
                    <p>输入兑换码获取奖励</p>
                </div>
                <button class="redeem-modal-close" onclick="App.closeRedeem()">✕</button>
                <div class="redeem-modal-body">
                    <input type="text" id="redeem-code-input" placeholder="输入兑换码" maxlength="20" autocomplete="off">
                    <button class="redeem-submit-btn" id="redeem-submit-btn" onclick="Redeem.submit()">兑换</button>
                    <p class="redeem-modal-msg" id="redeem-modal-msg"></p>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        this._redeemOverlay = overlay;
        // Auto-focus input + Enter key support
        setTimeout(() => {
            const inp = document.getElementById('redeem-code-input');
            if (inp) {
                inp.focus();
                inp.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') Redeem.submit();
                });
            }
        }, 100);
    },

    closeRedeem() {
        if (this._redeemOverlay) {
            this._redeemOverlay.remove();
            this._redeemOverlay = null;
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
            // Save check-in date for calendar
            State._addCheckinDate(new Date().toISOString().split('T')[0]);
            State.updateUI();
            State.updateProfilePopup();
            let msg = `签到成功! 🔥+${result.streak}天 🐚+${result.reward.shells}`;
            if (result.reward.pearls) msg += ` 🦪+${result.reward.pearls}`;
            // 签到烟花
            const cx = Aquarium.width / 2, cy = Aquarium.height / 2;
            ParticleManager.emit('firework', cx, cy, { count: 50 });
            if (result.streak >= 7) {
                setTimeout(() => ParticleManager.emit('firework', cx - 80, cy - 40, { count: 40 }), 400);
            }
            if (result.streak >= 30) {
                setTimeout(() => ParticleManager.emit('firework', cx + 80, cy - 40, { count: 40, colors: ['#FFD700', '#FFD700', '#FFEB3B', '#FFF', '#FFD700'] }), 800);
            }
            // 签到音效
            if (typeof Sound !== 'undefined') Sound.playCheckin();
            State.showToast(msg, 'reward', '🎉');
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
        const msgEl = document.getElementById('redeem-modal-msg');
        const btn = document.getElementById('redeem-submit-btn');
        const code = input.value.trim();

        if (!code) {
            this._showMsg('请输入兑换码', 'error');
            return;
        }

        btn.disabled = true;
        btn.textContent = '兑换中...';

        try {
            const resp = await fetch('/api/redeem', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid: API.uid, code })
            });
            const data = await resp.json();
            if (!resp.ok) {
                this._showMsg(data.error || '兑换失败', 'error');
                btn.disabled = false;
                btn.textContent = '兑换';
                return;
            }

            State.user = data.user;
            State.updateUI();
            State.updateProfilePopup();
            this._showMsg(data.message, 'success');
            State.showToast(`兑换成功！+🐚${data.reward.shells} +🦪${data.reward.pearls}`, 'reward');
            input.value = '';
            // Close modal after success
            setTimeout(() => App.closeRedeem(), 1200);
        } catch (e) {
            this._showMsg('网络错误', 'error');
            btn.disabled = false;
            btn.textContent = '兑换';
        }
    },

    _showMsg(msg, type) {
        const msgEl = document.getElementById('redeem-modal-msg');
        if (!msgEl) return;
        msgEl.textContent = msg;
        msgEl.className = `redeem-modal-msg ${type}`;
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
        else if (App._redeemOverlay) App.closeRedeem();
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
