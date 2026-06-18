// tasks-router.js - 任务路由和共享工具（从 tasks.js 拆出）
const Tasks = {
    allTasks: [],

    // 每日选题：基于日期种子伪随机选取，保证同一天选相同的题
    getDailyItems(arr, count) {
        if (!arr || arr.length <= count) return arr.slice();
        const seed = new Date().toISOString().slice(0, 10);
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
            hash = ((hash << 5) - hash) + seed.charCodeAt(i);
            hash |= 0;
        }
        const sr = (i) => {
            let h = ((hash + i * 127) << 5) - (hash + i * 127);
            return ((h % 2147483647) + 2147483647) % 2147483647 / 2147483647;
        };
        const result = [];
        const pool = arr.slice();
        for (let i = 0; i < count && pool.length > 0; i++) {
            result.push(pool.splice(Math.floor(sr(i) * pool.length), 1)[0]);
        }
        return result;
    },

    async loadTasksForCategory(category) {
        try {
            const data = await API.getTasks();
            this.allTasks = data.tasks;
            State.todayTasks = data.completed || {};
            const categoryTasks = data.tasks.filter(t => t.category === category);
            this.renderTaskList(categoryTasks);
        } catch (e) {
            console.error('Failed to load tasks:', e);
        }
    },

    renderTaskList(tasks) {
        const container = document.getElementById('panel-tasks');
        if (!container) return;
        if (tasks.length === 0) {
            container.innerHTML = `
                <div style="text-align:center;padding:40px 20px;color:var(--text-muted);">
                    <div style="font-size:40px;margin-bottom:12px;">🐟</div>
                    <p>暂无题目，敬请期待更多内容</p>
                </div>
            `;
            return;
        }
        container.innerHTML = tasks.map(t => {
            const completed = State.todayTasks && State.todayTasks[t.id];
            return `
                <div class="task-card ${completed ? 'completed' : ''}"
                     onclick="${completed ? '' : `Tasks.openTask('${t.id}')`}">
                    <div class="task-card-header">
                        <div class="task-icon">${t.icon}</div>
                        <div class="task-title">${t.title}</div>
                    </div>
                    <div class="task-desc">${t.description}</div>
                    <div class="task-reward">
                        🐚 ${t.reward_shells || 0}
                        ${t.reward_pearls ? ` 📎 ${t.reward_pearls}` : ''}
                    </div>
                </div>
            `;
        }).join('');
    },

    // 任务类型 → 模块分发
    openTask(taskId) {
        const task = this.allTasks.find(t => t.id === taskId);
        if (!task) return;

        switch (task.type) {
            case 'checkin':        TasksMeta.showCheckin(task); break;
            case 'vocabulary':     TasksVocab.showVocabulary(task); break;
            case 'flashcard':      TasksVocab.showFlashcard(task); break;
            case 'spelling':       TasksVocab.showSpelling(task); break;
            case 'listening':      TasksListening.showMiniListening(task); break;
            case 'listening_comp': TasksListening.showListeningComp(task); break;
            case 'reading':        TasksSpeaking.showReading(task); break;
            case 'translation':    TasksSpeaking.showTranslation(task); break;
            case 'summary':        TasksMeta.showSummary(task); break;
        }
    },

    async completeTask(task) {
        try {
            const result = await API.completeTask(task.id);
            State.user = result.user;
            State.level = result.level;
            State.updateUI();
            State.updateProfilePopup();
            this.closeModal();
            // 任务完成撒花
            if (typeof ParticleManager !== 'undefined') {
                const cx = window.innerWidth / 2, cy = window.innerHeight * 0.35;
                ParticleManager.emit('firework', cx, cy, { count: 30, colors: ['#FFD700', '#00FFC8', '#C77DFF', '#FF9800', '#FFF'] });
            }
            State.showToast(`获得 🐚${result.reward.shells}${result.reward.pearls ? ' 📎' + result.reward.pearls : ''}`, 'reward', '✅');
            if (typeof App !== 'undefined' && App.currentPanel === 'practice' && App.currentCategory) {
                Tasks.loadTasksForCategory(App.currentCategory);
            }
        } catch (e) {
            if (e.already_completed) {
                State.showToast('今日已完成此任务', 'error');
            } else {
                State.showToast('完成任务失败', 'error');
            }
        }
    },

    // === Modal 工具 ===
    _modalEl: null,

    showModal(html) {
        this.closeModal();
        const overlay = document.createElement('div');
        overlay.className = 'task-modal-overlay';
        overlay.onclick = (e) => { if (e.target === overlay) this.closeModal(); };
        const modal = document.createElement('div');
        modal.className = 'task-modal';
        modal.innerHTML = html;
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        this._modalEl = overlay;
    },

    closeModal() {
        if (this._modalEl) {
            this._modalEl.remove();
            this._modalEl = null;
        }
    }
};
