// tasks-meta.js - 签到 + 今日复盘
const TasksMeta = {
    showCheckin(task) {
        Tasks.showModal(`
            <button class="btn-close-modal" onclick="Tasks.closeModal()">✕</button>
            <h3>${task.icon} ${task.title}</h3>
            <p class="task-desc-text">${task.description}</p>
            <div style="text-align:center;font-size:60px;margin:16px 0;">☀️</div>
            <p style="text-align:center;color:var(--text-secondary);margin-bottom:16px;">
                连续签到 <b style="color:#ED8936;">${State.user.streak || 0}</b> 天
            </p>
            <button class="btn-primary" onclick="Tasks.completeTask(Tasks.allTasks.find(t=>t.id==='checkin'))">
                签到领取 🐚 10+
            </button>
        `);
    },

    showSummary(task) {
        const completed = Object.keys(State.todayTasks || {}).length;
        Tasks.showModal(`
            <button class="btn-close-modal" onclick="Tasks.closeModal()">✕</button>
            <h3>${task.icon} ${task.title}</h3>
            <p class="task-desc-text">${task.description}</p>
            <div class="summary-stats">
                <div class="stat-card">
                    <div class="stat-value">${completed}</div>
                    <div class="stat-label">今日完成任务</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">🐚 ${State.user.shells || 0}</div>
                    <div class="stat-label">贝壳余额</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">🔥 ${State.user.streak || 0}天</div>
                    <div class="stat-label">连续签到</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">🐠 ${(State.user.creatures || []).length}</div>
                    <div class="stat-label">海洋生物</div>
                </div>
            </div>
            <button class="btn-primary" onclick="Tasks.completeTask(Tasks.allTasks.find(t=>t.id==='daily_summary'))">
                记录复盘 🐚 ${task.reward_shells} ${task.reward_pearls ? '+ 📎1' : ''}
            </button>
        `);
    }
};
