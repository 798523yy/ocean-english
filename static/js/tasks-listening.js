// tasks-listening.js - 听力练习模块（迷你听力 + 听力理解）
const TasksListening = {
    showMiniListening(task) {
        const questions = Tasks.getDailyItems(task.content.questions, task.content.questions_per_day || 4);
        let qIdx = 0;
        let score = 0;
        const passScore = 2;

        const showQ = () => {
            if (qIdx >= questions.length) {
                const passed = score >= passScore;
                Tasks.showModal(`
                    <h3>${passed ? '🎉 恭喜' : '😢 继续加油'}</h3>
                    <p style="text-align:center;margin:16px 0;">得分: ${score}/${questions.length} (需要${passScore}分)</p>
                    ${passed
                        ? `<button class="btn-primary" onclick="Tasks.completeTask(Tasks.allTasks.find(t=>t.id==='mini_listening'))">领取奖励 🐚 ${task.reward_shells}</button>`
                        : `<button class="btn-primary" onclick="Tasks.closeModal();Tasks.openTask('mini_listening')">再试一次</button>`
                    }
                `);
                return;
            }
            const q = questions[qIdx];
            Tasks.showModal(`
                <button class="btn-close-modal" onclick="Tasks.closeModal()">✕</button>
                <h3>${task.icon} ${task.title}</h3>
                <p class="task-desc-text">听单词，选意思 (${qIdx + 1}/${questions.length})</p>
                <div class="listening-word-display">🔊 ${q.word}</div>
                <button class="listen-btn" id="listen-btn">🔊 再听一次</button>
                <div class="flashcard-options">
                    ${q.options.map((opt, i) => `
                        <button class="flashcard-option" data-idx="${i}">${opt}</button>
                    `).join('')}
                </div>
            `);

            const speak = () => {
                if ('speechSynthesis' in window) {
                    speechSynthesis.cancel();
                    const u = new SpeechSynthesisUtterance(q.word);
                    u.lang = 'en-US';
                    u.rate = 0.8;
                    speechSynthesis.speak(u);
                }
            };
            speak();
            document.getElementById('listen-btn').addEventListener('click', speak);

            document.querySelectorAll('.flashcard-option').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = parseInt(btn.dataset.idx);
                    document.querySelectorAll('.flashcard-option').forEach(b => b.disabled = true);
                    if (idx === q.answer) {
                        btn.classList.add('correct');
                        score++;
                    } else {
                        btn.classList.add('wrong');
                        document.querySelector(`.flashcard-option[data-idx="${q.answer}"]`)?.classList.add('correct');
                    }
                    qIdx++;
                    setTimeout(() => showQ(), 800);
                });
            });
        };
        showQ();
    },

    showListeningComp(task) {
        const passages = task.content.passages || [{passage: task.content.passage, translation: task.content.translation, questions: task.content.questions}];
        const content = Tasks.getDailyItems(passages, 1)[0];
        let qIdx = 0;
        let score = 0;

        const showQ2 = () => {
            if (qIdx >= content.questions.length) {
                Tasks.showModal(`
                    <h3>🔊 听力完成</h3>
                    <p style="text-align:center;margin:16px 0;">得分: ${score}/${content.questions.length}</p>
                    <button class="btn-primary" onclick="Tasks.completeTask(Tasks.allTasks.find(t=>t.id==='listening_comp'))">
                        领取奖励 🐚 ${task.reward_shells}
                    </button>
                `);
                return;
            }
            const q = content.questions[qIdx];
            Tasks.showModal(`
                <button class="btn-close-modal" onclick="Tasks.closeModal()">✕</button>
                <h3>${task.icon} ${task.title}</h3>
                <p class="task-desc-text">${task.description}</p>
                <div class="reading-text">${content.passage}</div>
                <div class="reading-translation">${content.translation}</div>
                <div class="listening-question">
                    <p style="font-weight:700;margin-bottom:10px;">${q.q} (${qIdx + 1}/${content.questions.length})</p>
                    <div class="flashcard-options">
                        ${q.options.map((opt, i) => `
                            <button class="flashcard-option" data-idx="${i}">${opt}</button>
                        `).join('')}
                    </div>
                </div>
            `);

            const speak = () => {
                if ('speechSynthesis' in window) {
                    speechSynthesis.cancel();
                    const u = new SpeechSynthesisUtterance(content.passage);
                    u.lang = 'en-US';
                    u.rate = 0.75;
                    speechSynthesis.speak(u);
                }
            };

            document.querySelectorAll('.flashcard-option').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = parseInt(btn.dataset.idx);
                    document.querySelectorAll('.flashcard-option').forEach(b => b.disabled = true);
                    if (idx === q.answer) {
                        btn.classList.add('correct');
                        score++;
                    } else {
                        btn.classList.add('wrong');
                        document.querySelector(`.flashcard-option[data-idx="${q.answer}"]`)?.classList.add('correct');
                    }
                    qIdx++;
                    setTimeout(() => showQ2(), 800);
                });
            });
        };
        showQ2();
    }
};
