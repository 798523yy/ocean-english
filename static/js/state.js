const State = {
    user: null,
    level: null,
    creatureList: [],
    todayTasks: {},
    _lastLevelMin: 0,

    async init() {
        try {
            const data = await API.getUser();
            this.user = data.user;
            this.level = data.level;
            this.updateUI();
            this.updateCheckinState();
            this.updateProfilePopup();
        } catch (e) {
            console.error('Failed to load user:', e);
            this.showToast('加载用户数据失败', 'error');
        }
    },

    async refresh() {
        await this.init();
    },

    updateUI() {
        const u = this.user;
        if (!u) {
            document.getElementById('shell-count').textContent = '0';
            document.getElementById('pearl-count').textContent = '0';
            document.getElementById('streak-count').textContent = '0';
            const collectedEl = document.getElementById('collected-count');
            if (collectedEl) collectedEl.textContent = '0';
            const hintEl = document.getElementById('streak-reward-hint');
            if (hintEl) hintEl.textContent = '签到+🐚12';
            return;
        }
        document.getElementById('shell-count').textContent = u.shells || 0;
        document.getElementById('pearl-count').textContent = u.pearls || 0;
        document.getElementById('streak-count').textContent = u.streak || 0;
        document.getElementById('user-name').textContent = u.name || '探险家';
        document.getElementById('user-avatar').textContent = u.avatar || this.level ? this.level.emoji : '🐠';

        // Collection count
        const collectedEl = document.getElementById('collected-count');
        if (collectedEl) {
            collectedEl.textContent = (u.creatures || []).length;
        }

        // Streak reward hint
        const hintEl = document.getElementById('streak-reward-hint');
        if (hintEl) {
            const nextShells = 10 + ((u.streak || 0) + 1) * 2;
            const willGetPearl = (u.streak || 0) % 7 === 6;
            hintEl.textContent = `签到+🐚${nextShells}` + (willGetPearl ? ` +🦪` : '');
        }

        const levelTag = document.getElementById('user-level-tag');
        if (levelTag && this.level) {
            levelTag.textContent = this.level.title;
        }

        // Daily goal ring
        const todayTaskCount = Object.keys(u.today_tasks || {}).length;
        const goalTarget = 3;
        const goalDone = todayTaskCount >= goalTarget;
        const goalFloat = document.getElementById('daily-goal-float');
        const goalRingFill = document.getElementById('goal-ring-fill');
        const goalText = document.getElementById('goal-text');
        if (goalFloat && goalRingFill && goalText) {
            goalFloat.classList.toggle('done', goalDone);
            const pct = Math.min(100, (todayTaskCount / goalTarget) * 100);
            const circumference = 2 * Math.PI * 15; // r=15
            const dash = (pct / 100) * circumference;
            goalRingFill.setAttribute('stroke-dasharray', dash + ' ' + circumference);
            goalText.textContent = todayTaskCount + '/' + goalTarget;
        }

        // Level progress bar
        if (this.level) {
            const tasksDone = u.total_tasks_completed || 0;
            const currentMin = this.level.min || 0;
            // Find next level threshold
            let nextMin = Infinity;
            for (const lv of (C.LEVELS || [])) {
                if (lv.min > currentMin && lv.min < nextMin) nextMin = lv.min;
            }
            const progressFill = document.getElementById('level-progress-fill');
            const progressText = document.getElementById('level-progress-text');
            if (progressFill && nextMin < Infinity) {
                const pct = Math.min(100, Math.max(0, ((tasksDone - currentMin) / (nextMin - currentMin)) * 100));
                progressFill.style.width = pct + '%';
            }
            if (progressText) {
                if (nextMin < Infinity) {
                    progressText.textContent = tasksDone + '/' + nextMin;
                } else {
                    progressText.textContent = tasksDone + ' ✓';
                }
            }
        }

        this.todayTasks = u.today_tasks || {};
        this.updateCheckinState();

        // 检测等级升级
        const newMin = this.level ? this.level.min : 0;
        if (newMin > this._lastLevelMin && this._lastLevelMin > 0) {
            this._showLevelUp();
        }
        this._lastLevelMin = newMin;
    },

    _showLevelUp() {
        const lv = this.level;
        if (!lv) return;

        // 全屏庆祝 overlay
        const overlay = document.createElement('div');
        overlay.className = 'levelup-overlay';
        overlay.innerHTML = `
            <div class="levelup-content">
                <div class="levelup-emoji">${lv.emoji}</div>
                <div class="levelup-title">${lv.title}</div>
                <div class="levelup-sub">${lv.title_en || ''}</div>
            </div>
        `;
        document.body.appendChild(overlay);

        // 升级音效
        if (typeof Sound !== 'undefined') Sound.playLevelUp();

        // 烟花
        const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
        if (typeof ParticleManager !== 'undefined') {
            ParticleManager.emit('firework', cx, cy, { count: 60 });
            setTimeout(() => ParticleManager.emit('firework', cx - 100, cy - 60, { count: 40 }), 500);
            setTimeout(() => ParticleManager.emit('firework', cx + 100, cy - 60, { count: 40 }), 1000);
        }

        // 动画结束后清理
        setTimeout(() => {
            overlay.classList.add('fading');
            setTimeout(() => overlay.remove(), 500);
        }, 2500);
    },

    updateCheckinState() {
        const today = new Date().toISOString().split('T')[0];
        const lastCheckin = this.user ? this.user.last_checkin : null;
        const btn = document.getElementById('checkin-btn');
        if (!btn) return;
        if (lastCheckin === today) {
            btn.classList.add('checked');
        } else {
            btn.classList.remove('checked');
        }
        this._renderStreakCalendar();
    },

    _getCheckinHistory() {
        try {
            const raw = localStorage.getItem('ocean_checkins');
            return raw ? JSON.parse(raw) : [];
        } catch (e) { return []; }
    },

    _addCheckinDate(dateStr) {
        const history = this._getCheckinHistory();
        if (history[history.length - 1] !== dateStr) {
            history.push(dateStr);
            // Keep last 60 days only
            while (history.length > 60) history.shift();
            localStorage.setItem('ocean_checkins', JSON.stringify(history));
        }
    },

    _renderStreakCalendar() {
        const container = document.getElementById('streak-calendar');
        if (!container) return;
        const history = this._getCheckinHistory();
        const historySet = new Set(history);
        const today = new Date();
        const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
        let html = '<div class=\"streak-calendar-wrap\">';
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const isChecked = historySet.has(dateStr);
            const isToday = i === 0;
            html += '<div class=\"streak-day-col\">';
            html += '<div class=\"streak-day' + (isChecked ? ' checked' : '') + (isToday ? ' today' : '') + '\">';
            html += isChecked ? '✓' : d.getDate();
            html += '</div>';
            html += '<div class=\"streak-day-label\">' + dayNames[d.getDay()] + '</div>';
            html += '</div>';
        }
        html += '</div>';
        container.innerHTML = html;
    },

    updateProfilePopup() {
        const u = this.user;
        const lv = this.level;
        if (!u) return;

        // Always refresh profile data so it's current when opened
        const el = (id) => document.getElementById(id);
        const setText = (id, val) => { const e = el(id); if (e) e.textContent = val; };

        setText('profile-avatar', u.avatar || (lv ? lv.emoji : '🐠'));
        setText('profile-name', u.name || '探险家');

        if (lv) {
            setText('level-emoji', lv.emoji);
            setText('level-title', lv.title);
            setText('level-title-en', lv.title_en || '');
        }

        setText('pstat-tasks', u.total_tasks_completed || 0);
        setText('pstat-shells', u.shells || 0);
        setText('pstat-pearls', u.pearls || 0);
        setText('pstat-streak', u.streak || 0);
        setText('pstat-creatures', (u.creatures || []).length);
        setText('pstat-phone', u.phone ? u.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : '-');
    },

    showToast(msg, type = '', icon = '') {
        // 获取或创建 toast 容器
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        // 限制最多 3 条，超出移除最早
        const existing = container.querySelectorAll('.toast');
        if (existing.length >= 3) {
            existing[0].remove();
        }

        // 音效
        if (type === 'success' && typeof Sound !== 'undefined') Sound.playSuccess();
        else if (type === 'error' && typeof Sound !== 'undefined') Sound.playError();
        else if (type === 'reward' && typeof Sound !== 'undefined') Sound.playReward();

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        if (icon) {
            toast.innerHTML = `<span class="toast-icon">${icon}</span>${msg}`;
        } else {
            toast.textContent = msg;
        }
        container.appendChild(toast);

        // 动态时长：按消息长度
        const len = msg.length;
        const duration = len < 10 ? 2000 : len < 25 ? 2500 : 3500;

        toast._timeout = setTimeout(() => {
            toast.classList.add('hiding');
            setTimeout(() => toast.remove(), 250);
        }, duration);
    }
};
