// friends.js - 好友系统模块
const Friends = {
    _overlay: null,
    _currentTab: 'list',

    async show() {
        this.close();
        this._currentTab = 'list';
        await this._loadAndRender();
    },

    async _loadAndRender() {
        // 加载 friend list 和 requests
        let friendData = { friends: [], count: 0 };
        let reqData = { incoming: [], outgoing: [] };
        try {
            [friendData, reqData] = await Promise.all([
                API.getFriendList(),
                API.getFriendRequests()
            ]);
        } catch (e) {
            State.showToast('加载好友数据失败', 'error');
            return;
        }

        this._render(friendData, reqData);
        // 更新按钮角标
        this._updateBadge(reqData.incoming.length);
    },

    _render(friendData, reqData) {
        // 先移除旧 overlay，防止多层叠加导致点击失效
        this.close();

        const overlay = document.createElement('div');
        overlay.className = 'friends-overlay';
        overlay.onclick = (e) => { if (e.target === overlay) this.close(); };

        const incomingCount = reqData.incoming.length;
        const badgeHtml = incomingCount > 0 ? `<span class="friends-tab-badge">${incomingCount}</span>` : '';

        overlay.innerHTML = `
            <div class="friends-modal" onclick="event.stopPropagation()">
                <div class="friends-header">
                    <h2>👥 我的好友</h2>
                    <button class="friends-close" onclick="Friends.close()">✕</button>
                </div>
                <div class="friends-tabs">
                    <button class="friends-tab ${this._currentTab === 'list' ? 'active' : ''}" data-tab="list">👥 好友列表</button>
                    <button class="friends-tab ${this._currentTab === 'requests' ? 'active' : ''}" data-tab="requests">📩 好友请求${badgeHtml}</button>
                    <button class="friends-tab ${this._currentTab === 'add' ? 'active' : ''}" data-tab="add">🔍 添加好友</button>
                </div>
                <div class="friends-body" id="friends-body"></div>
            </div>
        `;

        document.body.appendChild(overlay);
        this._overlay = overlay;

        // 绑定 tab
        overlay.querySelectorAll('.friends-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this._currentTab = tab.dataset.tab;
                this._renderContent(friendData, reqData);
                // 更新 active tab
                overlay.querySelectorAll('.friends-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
            });
        });

        this._renderContent(friendData, reqData);

        // 如果有添加好友 tab 且已在 add 状态，绑定搜索
        if (this._currentTab === 'add') {
            this._bindSearch();
        }
    },

    _renderContent(friendData, reqData) {
        const body = document.getElementById('friends-body');
        if (!body) return;

        if (this._currentTab === 'list') {
            this._renderList(body, friendData);
        } else if (this._currentTab === 'requests') {
            this._renderRequests(body, reqData);
        } else if (this._currentTab === 'add') {
            this._renderAdd(body);
        }
    },

    // === 好友列表 ===

    _renderList(body, friendData) {
        const friends = friendData.friends || [];
        if (friends.length === 0) {
            body.innerHTML = `<div class="friends-empty">🐟 还没有好友<br><small>去"添加好友"搜索并添加吧</small></div>`;
            return;
        }

        let html = `<div class="friends-list">`;
        friends.forEach(f => {
            html += `
                <div class="friends-card">
                    <div class="friends-card-left">
                        <span class="friends-card-avatar">${this._esc(f.avatar || f.level.emoji)}</span>
                        <div class="friends-card-info">
                            <div class="friends-card-name">${this._esc(f.name)}</div>
                            <div class="friends-card-level">${f.level.title} · Lv.${f.level.min}</div>
                        </div>
                    </div>
                    <div class="friends-card-stats">
                        <span>🐚${this._fmtNum(f.shells)}</span>
                        <span>🐟${f.creature_count}种</span>
                        <span>🔥${f.streak}天</span>
                    </div>
                    <button class="friends-btn-sm friends-btn-remove" data-uid="${this._esc(f.id)}">移除</button>
                </div>
            `;
        });
        html += `</div>`;

        body.innerHTML = html;

        // 绑定移除按钮
        body.querySelectorAll('.friends-btn-remove').forEach(btn => {
            btn.addEventListener('click', async () => {
                const friendUid = btn.dataset.uid;
                try {
                    await API.friendRemoveFriend(friendUid);
                    State.showToast('已移除好友', 'success');
                    await this._loadAndRender();
                } catch (e) {
                    State.showToast(e.error || '移除失败', 'error');
                }
            });
        });
    },

    // === 好友请求 ===

    _renderRequests(body, reqData) {
        const incoming = reqData.incoming || [];
        const outgoing = reqData.outgoing || [];

        if (incoming.length === 0 && outgoing.length === 0) {
            body.innerHTML = `<div class="friends-empty">📭 没有待处理的好友请求</div>`;
            return;
        }

        let html = '';

        // 收到的请求
        if (incoming.length > 0) {
            html += `<div class="friends-section-title">📥 收到的请求</div>`;
            incoming.forEach(r => {
                html += `
                    <div class="friends-card">
                        <div class="friends-card-left">
                            <span class="friends-card-avatar">${this._esc(r.avatar || r.level.emoji)}</span>
                            <div class="friends-card-info">
                                <div class="friends-card-name">${this._esc(r.name)}</div>
                                <div class="friends-card-level">${r.level.title} · 🐟${r.creature_count}种</div>
                            </div>
                        </div>
                        <div class="friends-card-actions">
                            <button class="friends-btn-sm friends-btn-accept" data-uid="${this._esc(r.from)}">接受</button>
                            <button class="friends-btn-sm friends-btn-reject" data-uid="${this._esc(r.from)}">拒绝</button>
                        </div>
                    </div>
                `;
            });
        }

        // 发出的请求
        if (outgoing.length > 0) {
            html += `<div class="friends-section-title">📤 发出的请求</div>`;
            outgoing.forEach(r => {
                html += `
                    <div class="friends-card">
                        <div class="friends-card-left">
                            <span class="friends-card-avatar">⏳</span>
                            <div class="friends-card-info">
                                <div class="friends-card-name">${this._esc(r.name)}</div>
                                <div class="friends-card-level">等待对方确认</div>
                            </div>
                        </div>
                        <button class="friends-btn-sm friends-btn-cancel" data-uid="${this._esc(r.to)}">取消</button>
                    </div>
                `;
            });
        }

        body.innerHTML = html;

        // 绑定事件
        body.querySelectorAll('.friends-btn-accept').forEach(btn => {
            btn.addEventListener('click', async () => {
                try {
                    await API.friendAcceptRequest(btn.dataset.uid);
                    State.showToast('已接受好友请求！', 'success');
                    await this._loadAndRender();
                } catch (e) {
                    State.showToast(e.error || '操作失败', 'error');
                }
            });
        });
        body.querySelectorAll('.friends-btn-reject').forEach(btn => {
            btn.addEventListener('click', async () => {
                try {
                    await API.friendRejectRequest(btn.dataset.uid);
                    State.showToast('已拒绝好友请求', 'success');
                    await this._loadAndRender();
                } catch (e) {
                    State.showToast(e.error || '操作失败', 'error');
                }
            });
        });
        body.querySelectorAll('.friends-btn-cancel').forEach(btn => {
            btn.addEventListener('click', async () => {
                try {
                    await API.friendCancelRequest(btn.dataset.uid);
                    State.showToast('已取消好友请求', 'success');
                    await this._loadAndRender();
                } catch (e) {
                    State.showToast(e.error || '操作失败', 'error');
                }
            });
        });
    },

    // === 添加好友 ===

    _renderAdd(body) {
        body.innerHTML = `
            <div class="friends-search-row">
                <input type="text" class="friends-search-input" id="friends-search-input" placeholder="输入用户ID或昵称搜索" maxlength="30" autocomplete="off">
                <button class="friends-search-btn" id="friends-search-btn">🔍 搜索</button>
            </div>
            <div class="friends-search-results" id="friends-search-results">
                <div class="friends-empty">🔍 输入关键词搜索其他探险家</div>
            </div>
        `;
        this._bindSearch();
    },

    _bindSearch() {
        const input = document.getElementById('friends-search-input');
        const btn = document.getElementById('friends-search-btn');
        if (!input || !btn) return;

        const doSearch = async () => {
            const keyword = input.value.trim();
            const resultsDiv = document.getElementById('friends-search-results');
            if (!keyword) {
                resultsDiv.innerHTML = `<div class="friends-empty">🔍 输入关键词搜索其他探险家</div>`;
                return;
            }

            resultsDiv.innerHTML = `<div class="friends-loading">搜索中...</div>`;

            try {
                const data = await API.friendSearch(keyword);
                this._renderSearchResults(resultsDiv, data.results || []);
            } catch (e) {
                resultsDiv.innerHTML = `<div class="friends-error">搜索失败</div>`;
            }
        };

        btn.addEventListener('click', doSearch);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') doSearch();
        });
    },

    _renderSearchResults(container, results) {
        if (results.length === 0) {
            container.innerHTML = `<div class="friends-empty">😕 未找到匹配的用户</div>`;
            return;
        }

        let html = `<div class="friends-list">`;
        results.forEach(r => {
            let actionBtn = '';
            if (r.relation === 'friend') {
                actionBtn = `<span class="friends-tag-done">✅ 已是好友</span>`;
            } else if (r.relation === 'outgoing_request') {
                actionBtn = `<span class="friends-tag-pending">⏳ 已发送请求</span>`;
            } else if (r.relation === 'incoming_request') {
                actionBtn = `<span class="friends-tag-pending">📩 对方已请求</span>`;
            } else {
                actionBtn = `<button class="friends-btn-sm friends-btn-add" data-uid="${this._esc(r.id)}">➕ 添加好友</button>`;
            }

            html += `
                <div class="friends-card">
                    <div class="friends-card-left">
                        <span class="friends-card-avatar">${this._esc(r.avatar || r.level.emoji)}</span>
                        <div class="friends-card-info">
                            <div class="friends-card-name">${this._esc(r.name)}</div>
                            <div class="friends-card-level">${r.level.title} · 🐟${r.creature_count}种 · 🔥${r.streak}天</div>
                        </div>
                    </div>
                    ${actionBtn}
                </div>
            `;
        });
        html += `</div>`;
        container.innerHTML = html;

        // 绑定添加按钮
        container.querySelectorAll('.friends-btn-add').forEach(btn => {
            btn.addEventListener('click', async () => {
                const targetUid = btn.dataset.uid;
                try {
                    await API.friendSendRequest(targetUid);
                    State.showToast('好友请求已发送！', 'success');
                    // 刷新搜索结果显示新状态
                    const input = document.getElementById('friends-search-input');
                    if (input && input.value.trim()) {
                        const data = await API.friendSearch(input.value.trim());
                        const resultsDiv = document.getElementById('friends-search-results');
                        this._renderSearchResults(resultsDiv, data.results || []);
                    }
                } catch (e) {
                    State.showToast(e.error || '发送失败', 'error');
                }
            });
        });
    },

    // === 按钮角标 ===

    _updateBadge(count) {
        const btn = document.getElementById('friends-btn');
        if (!btn) return;
        // 移除旧角标
        const existing = btn.querySelector('.friends-badge');
        if (existing) existing.remove();
        if (count > 0) {
            const badge = document.createElement('span');
            badge.className = 'friends-badge';
            badge.textContent = count > 99 ? '99+' : count;
            btn.appendChild(badge);
        }
    },

    // === 工具 ===

    _esc(s) {
        const div = document.createElement('div');
        div.textContent = s;
        return div.innerHTML;
    },

    _fmtNum(n) {
        if (n >= 10000) return (n / 10000).toFixed(1) + 'w';
        if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
        return n.toString();
    },

    close() {
        if (this._overlay) {
            this._overlay.remove();
            this._overlay = null;
        }
    }
};
