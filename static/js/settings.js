// settings.js - 个人资料编辑模块
const Settings = {
    _overlay: null,
    AVATAR_EMOJIS: [
        '🐠', '🐟', '🐡', '🦈', '🐙', '🦑', '🐬', '🐋',
        '🐳', '🦀', '🦞', '🦐', '🦪', '🐚', '🐌', '🧜',
        '🧜‍♀️', '🐢', '🦭', '🐧', '🦩', '🐤', '🐲', '🦕',
        '⚓', '🌟', '💎', '🔥', '🌈', '🎯', '🏆', '💖',
    ],

    show() {
        this.close();
        const u = State.user;
        if (!u) {
            State.showToast('请先登录', 'error');
            return;
        }

        const currentName = this._esc(u.name || '探险家');
        const currentAvatar = this._esc(u.avatar || '🐠');

        let emojiGrid = '';
        this.AVATAR_EMOJIS.forEach((emoji, i) => {
            const sel = emoji === (u.avatar || '🐠') ? ' selected' : '';
            emojiGrid += `<button class="settings-emoji-btn${sel}" data-emoji="${emoji}" onclick="Settings.selectEmoji(this, '${emoji}')">${emoji}</button>`;
        });

        const overlay = document.createElement('div');
        overlay.className = 'settings-overlay';
        overlay.onclick = (e) => { if (e.target === overlay) this.close(); };

        overlay.innerHTML = `
            <div class="settings-modal" onclick="event.stopPropagation()">
                <div class="settings-header">
                    <h2>⚙️ 编辑资料</h2>
                    <button class="settings-close" onclick="Settings.close()">✕</button>
                </div>
                <div class="settings-body">
                    <div class="settings-field">
                        <label class="settings-label">头像</label>
                        <div class="settings-avatar-preview" id="settings-avatar-preview">${currentAvatar}</div>
                        <div class="settings-emoji-grid">${emojiGrid}</div>
                    </div>
                    <div class="settings-field">
                        <label class="settings-label" for="settings-name-input">昵称</label>
                        <input type="text" class="settings-input" id="settings-name-input"
                            value="${currentName}" maxlength="20" placeholder="输入新昵称">
                        <p class="settings-hint">最多20个字符</p>
                    </div>
                    <button class="settings-save-btn" id="settings-save-btn" onclick="Settings.save()">💾 保存</button>
                    <p class="settings-msg hidden" id="settings-msg"></p>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        this._overlay = overlay;
        this._pickedEmoji = u.avatar || '🐠';
    },

    selectEmoji(btn, emoji) {
        this._pickedEmoji = emoji;
        document.getElementById('settings-avatar-preview').textContent = emoji;
        document.querySelectorAll('.settings-emoji-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
    },

    async save() {
        const nameInput = document.getElementById('settings-name-input');
        const name = nameInput.value.trim();
        const avatar = this._pickedEmoji;

        if (!name) {
            this._showMsg('请输入昵称', 'error');
            return;
        }

        const btn = document.getElementById('settings-save-btn');
        btn.disabled = true;
        btn.textContent = '保存中...';

        try {
            const result = await API.updateProfile(name, avatar);
            State.user = result.user;
            State.level = result.level;
            State.updateUI();
            State.updateProfilePopup();
            this._showMsg('资料已更新！', 'success');
            State.showToast('资料已更新！', 'success');

            // 如果好友面板开着，刷新
            if (Friends._overlay) {
                await Friends._loadAndRender();
            }

            setTimeout(() => this.close(), 800);
        } catch (e) {
            this._showMsg(e.error || '保存失败', 'error');
            btn.disabled = false;
            btn.textContent = '💾 保存';
        }
    },

    _showMsg(msg, type) {
        const el = document.getElementById('settings-msg');
        if (!el) return;
        el.textContent = msg;
        el.className = `settings-msg ${type}`;
        el.classList.remove('hidden');
    },

    _esc(s) {
        const div = document.createElement('div');
        div.textContent = s;
        return div.innerHTML;
    },

    close() {
        if (this._overlay) {
            this._overlay.remove();
            this._overlay = null;
        }
    }
};
