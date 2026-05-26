const State = {
    user: null,
    level: null,
    creatureList: [],
    todayTasks: {},

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
        document.getElementById('user-avatar').textContent = this.level ? this.level.emoji : '🐠';

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

        document.getElementById('profile-avatar').textContent = lv ? lv.emoji : '🐠';
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

    showToast(msg, type = '') {
        const toast = document.getElementById('toast');
        toast.textContent = msg;
        toast.className = `toast ${type} show`;
        clearTimeout(toast._timeout);
        toast._timeout = setTimeout(() => {
            toast.classList.remove('show');
        }, 2000);
    }
};
