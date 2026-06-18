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
    },

    updateProfilePopup() {
        const u = this.user;
        const lv = this.level;
        if (!u) return;

        const popup = document.getElementById('profile-popup');
        if (!popup || popup.classList.contains('hidden')) return;

        document.getElementById('profile-avatar').textContent = u.avatar || (lv ? lv.emoji : '🐠');
        document.getElementById('profile-name').textContent = u.name || '探险家';

        if (lv) {
            document.getElementById('level-emoji').textContent = lv.emoji;
            document.getElementById('level-title').textContent = lv.title;
            document.getElementById('level-title-en').textContent = lv.title_en || '';
        }

        document.getElementById('pstat-tasks').textContent = u.total_tasks_completed || 0;
        document.getElementById('pstat-shells').textContent = u.shells || 0;
        document.getElementById('pstat-pearls').textContent = u.pearls || 0;
        document.getElementById('pstat-streak').textContent = u.streak || 0;
        document.getElementById('pstat-creatures').textContent = (u.creatures || []).length;
        document.getElementById('pstat-phone').textContent = u.phone ? u.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : '-';
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
