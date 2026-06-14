// tasks-speaking.js - 口语练习模块（朗读 + 翻译）
const TasksSpeaking = {
    showReading(task) {
        const texts = task.content.texts || [{text: task.content.text, translation: task.content.translation}];
        const content = Tasks.getDailyItems(texts, 1)[0];
        Tasks.showModal(`
            <button class="btn-close-modal" onclick="Tasks.closeModal()">✕</button>
            <h3>${task.icon} ${task.title}</h3>
            <p class="task-desc-text">${task.description}</p>
            <div class="reading-text">${content.text}</div>
            <div class="reading-translation">📝 ${content.translation}</div>
            <button class="btn-primary" onclick="Tasks.completeTask(Tasks.allTasks.find(t=>t.id==='morning_reading'))">
                我完成朗读了！ 🐚 ${task.reward_shells}
            </button>
        `);
    },

    showTranslation(task) {
        const sentences = Tasks.getDailyItems(task.content.sentences, task.content.sentences_per_day || 3);
        let sIdx = 0;
        let completed = 0;

        const showS = () => {
            if (sIdx >= sentences.length) {
                Tasks.showModal(`
                    <h3>✍️ 翻译完成</h3>
                    <p style="text-align:center;margin:16px 0;">完成了 ${completed} 句翻译</p>
                    <button class="btn-primary" onclick="Tasks.completeTask(Tasks.allTasks.find(t=>t.id==='translation'))">
                        领取奖励 🐚 ${task.reward_shells}
                    </button>
                `);
                return;
            }
            const s = sentences[sIdx];
            Tasks.showModal(`
                <button class="btn-close-modal" onclick="Tasks.closeModal()">✕</button>
                <h3>${task.icon} ${task.title}</h3>
                <p class="task-desc-text">${task.description} (${sIdx + 1}/${sentences.length})</p>
                <div class="reading-translation" style="font-size:16px;text-align:center;">${s.zh}</div>
                <textarea class="translation-input" id="trans-input" placeholder="请输入英文翻译..."></textarea>
                <div class="translation-reference" id="trans-ref">
                    <b>参考译文:</b> ${s.en}
                </div>
                <div style="display:flex;gap:10px;">
                    <button class="btn-secondary" id="trans-hint" style="flex:1;">💡 查看提示</button>
                    <button class="btn-primary" id="trans-next" style="flex:1;">下一句 →</button>
                </div>
            `);

            document.getElementById('trans-hint').addEventListener('click', () => {
                document.getElementById('trans-ref').classList.add('show');
            });
            document.getElementById('trans-next').addEventListener('click', () => {
                completed++;
                sIdx++;
                showS();
            });
        };
        showS();
    }
};
