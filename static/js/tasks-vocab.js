// tasks-vocab.js - 单词练习模块（单词回顾 + 极速闪卡 + 拼写挑战）
const TasksVocab = {
    showVocabulary(task) {
        const words = Tasks.getDailyItems(task.content.words, task.content.words_per_day || 5);
        const state = { idx: 0 };
        const render = () => {
            const w = words[state.idx];
            return `
                <button class="btn-close-modal" onclick="Tasks.closeModal()">✕</button>
                <h3>${task.icon} ${task.title}</h3>
                <p class="task-desc-text">${task.description} (${state.idx + 1}/${words.length})</p>
                <div class="vocab-word">
                    <div class="vocab-en">${w.en}</div>
                    <div class="vocab-zh">${w.zh}</div>
                </div>
                <div class="vocab-nav">
                    ${state.idx > 0 ? `<button class="btn-secondary" id="vocab-prev">← 上一个</button>` : ''}
                    ${state.idx < words.length - 1
                        ? `<button class="btn-primary" id="vocab-next" style="width:auto;">下一个 →</button>`
                        : `<button class="btn-primary" id="vocab-finish" style="width:auto;">完成复习 🐚 ${task.reward_shells}</button>`
                    }
                </div>
            `;
        };
        Tasks.showModal(render());
        this._bindVocabNav(task, words, state, render);
    },

    _bindVocabNav(task, words, state, render) {
        document.getElementById('vocab-prev')?.addEventListener('click', () => { state.idx--; Tasks.showModal(render()); this._bindVocabNav(task, words, state, render); });
        document.getElementById('vocab-next')?.addEventListener('click', () => { state.idx++; Tasks.showModal(render()); this._bindVocabNav(task, words, state, render); });
        document.getElementById('vocab-finish')?.addEventListener('click', () => Tasks.completeTask(task));
    },

    showFlashcard(task) {
        const pairs = Tasks.getDailyItems(task.content.pairs, task.content.pairs_per_day || 6);
        let currentIdx = 0;
        let correctCount = 0;
        let wrongAttempts = 0;
        const totalNeeded = 5;

        const showCard = () => {
            if (correctCount >= totalNeeded) {
                Tasks.showModal(`
                    <h3>⚡ 完成！</h3>
                    <p style="text-align:center;margin:16px 0;">答对 ${correctCount}/${correctCount + wrongAttempts} 题</p>
                    <button class="btn-primary" onclick="Tasks.completeTask(Tasks.allTasks.find(t=>t.id==='flashcards'))">
                        领取奖励 🐚 ${task.reward_shells}
                    </button>
                `);
                return;
            }
            if (currentIdx >= pairs.length) currentIdx = 0;
            const pair = pairs[currentIdx];
            const wrongOptions = pairs.filter(p => p.zh !== pair.zh).sort(() => Math.random() - 0.5).slice(0, 3);
            const options = [...wrongOptions, pair].sort(() => Math.random() - 0.5);
            const progress = `${correctCount}/${totalNeeded}`;

            Tasks.showModal(`
                <button class="btn-close-modal" onclick="Tasks.closeModal()">✕</button>
                <h3>${task.icon} ${task.title}</h3>
                <p class="flashcard-progress">${progress} 答对即可完成</p>
                <div class="flashcard-container">
                    <div class="flashcard-word">${pair.en}</div>
                    <div class="flashcard-options">
                        ${options.map((o, i) => `
                            <button class="flashcard-option" data-index="${i}" data-zh="${o.zh}">
                                ${o.zh}
                            </button>
                        `).join('')}
                    </div>
                </div>
            `);

            document.querySelectorAll('.flashcard-option').forEach(btn => {
                btn.addEventListener('click', () => {
                    const selectedZh = btn.dataset.zh;
                    const allBtns = document.querySelectorAll('.flashcard-option');
                    allBtns.forEach(b => b.disabled = true);
                    if (selectedZh === pair.zh) {
                        btn.classList.add('correct');
                        correctCount++;
                        currentIdx++;
                        setTimeout(() => showCard(), 600);
                    } else {
                        btn.classList.add('wrong');
                        wrongAttempts++;
                        allBtns.forEach(b => {
                            if (b.dataset.zh === pair.zh) b.classList.add('correct');
                        });
                        currentIdx++;
                        setTimeout(() => showCard(), 1000);
                    }
                });
            });
        };
        showCard();
    },

    showSpelling(task) {
        const words = Tasks.getDailyItems(task.content.words, task.content.words_per_day || 5);
        const state = { idx: 0, score: 0 };

        const render = () => {
            if (state.idx >= words.length) {
                Tasks.showModal(`
                    <h3>🔤 拼写完成！</h3>
                    <p style="text-align:center;margin:16px 0;">得分: ${state.score}/${words.length}</p>
                    <button class="btn-primary" onclick="Tasks.completeTask(Tasks.allTasks.find(t=>t.id==='spelling_bee'))">
                        领取奖励 🐚 ${task.reward_shells}
                    </button>
                `);
                return;
            }
            const w = words[state.idx];
            Tasks.showModal(`
                <button class="btn-close-modal" onclick="Tasks.closeModal()">✕</button>
                <h3>${task.icon} ${task.title}</h3>
                <p class="task-desc-text">听发音，拼写单词 (${state.idx + 1}/${words.length})</p>
                <div class="spelling-word-display">
                    <div class="spelling-hint">💡 ${w.hint}</div>
                    <div class="spelling-example">"${w.example}"</div>
                </div>
                <input type="text" class="spelling-input" id="spelling-input" placeholder="输入英文单词..." autocomplete="off" autocapitalize="off">
                <div id="spelling-feedback" class="spelling-feedback hidden"></div>
                <div style="display:flex;gap:10px;">
                    <button class="btn-secondary" id="spelling-speak" style="flex:1;">🔊 听发音</button>
                    <button class="btn-primary" id="spelling-check" style="flex:1;">检查 →</button>
                </div>
            `);

            const speak = () => {
                if ('speechSynthesis' in window) {
                    speechSynthesis.cancel();
                    const u = new SpeechSynthesisUtterance(w.word);
                    u.lang = 'en-US';
                    u.rate = 0.7;
                    speechSynthesis.speak(u);
                }
            };
            speak();

            document.getElementById('spelling-speak').addEventListener('click', speak);
            document.getElementById('spelling-check').addEventListener('click', () => {
                const input = document.getElementById('spelling-input').value.trim().toLowerCase();
                const fb = document.getElementById('spelling-feedback');
                fb.classList.remove('hidden');
                if (input === w.word.toLowerCase()) {
                    fb.innerHTML = '✅ 正确！';
                    fb.className = 'spelling-feedback correct';
                    state.score++;
                } else {
                    fb.innerHTML = `❌ 正确答案: <b>${w.word}</b>`;
                    fb.className = 'spelling-feedback wrong';
                }
                document.getElementById('spelling-check').textContent = state.idx >= words.length - 1 ? '完成 →' : '下一题 →';
                document.getElementById('spelling-check').onclick = () => { state.idx++; render(); };
            });
        };
        render();
    }
};
