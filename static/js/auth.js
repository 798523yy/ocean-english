// auth.js - 登录认证模块（从 app.js 拆出）
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
            const data = await API.request('POST', '/auth/send-code', { phone });
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
            State.showToast(e.error || '网络错误', 'error');
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
            const data = await API.request('POST', '/auth/login', { phone, code });
            localStorage.setItem('ocean_english_uid', phone);
            API.uid = phone;
            App.onLoginSuccess(data.user, data.level);
        } catch (e) {
            State.showToast(e.error || '网络错误', 'error');
        }
    },

    logout() {
        localStorage.removeItem('ocean_english_uid');
        API.uid = 'default';

        // 关闭所有弹窗和面板
        App.closeProfilePopup();
        App.closePanel();
        App.closePracticeMenu();
        if (Friends._overlay) Friends.close();
        if (Settings._overlay) Settings.close();
        if (Collection._overlay) Collection.close();

        // 重置状态
        State.user = null;
        State.level = null;
        State.updateUI();

        // 清除粒子特效（雨水等）
        ParticleManager.clear();

        // 重置水族馆
        Aquarium.creatures = [];
        Aquarium.initialized = false;

        // 显示登录界面
        document.getElementById('user-name').textContent = '探险家';
        document.getElementById('user-level-tag').textContent = '';
        document.getElementById('user-avatar').textContent = '🐠';
        document.getElementById('streak-count').textContent = '0';
        App.showLogin();
    }
};
