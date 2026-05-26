const Tasks = {
    allTasks: [],

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
                    <div style="font-size:40px;margin-bottom:12px;">\u{1f41f}</div>
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
                        \u{1f41a} ${t.reward_shells || 0}
                        ${t.reward_pearls ? ` \u{1f4ce} ${t.reward_pearls}` : ''}
                    </div>
                </div>
            `;
        }).join('');
    },

    openTask(taskId) {
        const task = this.allTasks.find(t => t.id === taskId);
        if (!task) return;

        switch (task.type) {
            case 'checkin': this.showCheckin(task); break;
            case 'reading': this.showReading(task); break;
            case 'vocabulary': this.showVocabulary(task); break;
            case 'flashcard': this.showFlashcard(task); break;
            case 'listening': this.showMiniListening(task); break;
            case 'translation': this.showTranslation(task); break;
            case 'listening_comp': this.showListeningComp(task); break;
            case 'summary': this.showSummary(task); break;
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
            State.showToast(`获得 \u{1f41a}${result.reward.shells}${result.reward.pearls ? ' \u{1f4ce}' + result.reward.pearls : ''}`, 'reward');
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

    // === Modal helpers ===
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
    },

    // === Task interaction implementations ===

    showCheckin(task) {
        this.showModal(`
            <button class="btn-close-modal" onclick="Tasks.closeModal()">✕</button>
            <h3>${task.icon} ${task.title}</h3>
            <p class="task-desc-text">${task.description}</p>
            <div style="text-align:center;font-size:60px;margin:16px 0;">☀️</div>
            <p style="text-align:center;color:var(--text-secondary);margin-bottom:16px;">
                连续签到 <b style="color:#ED8936;">${State.user.streak || 0}</b> 天
            </p>
            <button class="btn-primary" onclick="Tasks.completeTask(Tasks.allTasks.find(t=>t.id==='checkin'))">
                签到领取 \u{1f41a} 10+
            </button>
        `);
    },

    showReading(task) {
        const content = task.content;
        this.showModal(`
            <button class="btn-close-modal" onclick="Tasks.closeModal()">✕</button>
            <h3>${task.icon} ${task.title}</h3>
            <p class="task-desc-text">${task.description}</p>
            <div class="reading-text">${content.text}</div>
            <div class="reading-translation">\u{1f4dd} ${content.translation}</div>
            <button class="btn-primary" onclick="Tasks.completeTask(Tasks.allTasks.find(t=>t.id==='morning_reading'))">
                我完成朗读了！ \u{1f41a} ${task.reward_shells}
            </button>
        `);
    },

    showVocabulary(task) {
        const words = task.content.words;
        let idx = 0;
        const render = () => {
            const w = words[idx];
            return `
                <button class="btn-close-modal" onclick="Tasks.closeModal()">✕</button>
                <h3>${task.icon} ${task.title}</h3>
                <p class="task-desc-text">${task.description} (${idx + 1}/${words.length})</p>
                <div class="vocab-word">
                    <div class="vocab-en">${w.en}</div>
                    <div class="vocab-zh">${w.zh}</div>
                </div>
                <div class="vocab-nav">
                    ${idx > 0 ? `<button class="btn-secondary" id="vocab-prev">← 上一个</button>` : ''}
                    ${idx < words.length - 1
                        ? `<button class="btn-primary" id="vocab-next" style="width:auto;">下一个 →</button>`
                        : `<button class="btn-primary" id="vocab-finish" style="width:auto;">完成复习 \u{1f41a} ${task.reward_shells}</button>`
                    }
                </div>
            `;
        };
        this.showModal(render());
        document.getElementById('vocab-prev')?.addEventListener('click', () => { idx--; this.showModal(render()); this._bindVocabNav(task, words, idx, render); });
        document.getElementById('vocab-next')?.addEventListener('click', () => { idx++; this.showModal(render()); this._bindVocabNav(task, words, idx, render); });
        document.getElementById('vocab-finish')?.addEventListener('click', () => this.completeTask(task));
    },

    _bindVocabNav(task, words, idx, render) {
        document.getElementById('vocab-prev')?.addEventListener('click', () => { idx--; this.showModal(render()); this._bindVocabNav(task, words, idx, render); });
        document.getElementById('vocab-next')?.addEventListener('click', () => { idx++; this.showModal(render()); this._bindVocabNav(task, words, idx, render); });
        document.getElementById('vocab-finish')?.addEventListener('click', () => this.completeTask(task));
    },

    showFlashcard(task) {
        const pairs = task.content.pairs;
        let currentIdx = 0;
        let correctCount = 0;
        let wrongAttempts = 0;
        const totalNeeded = 5;

        const showCard = () => {
            if (correctCount >= totalNeeded) {
                this.showModal(`
                    <h3>⚡ 完成！</h3>
                    <p style="text-align:center;margin:16px 0;">答对 ${correctCount}/${correctCount + wrongAttempts} 题</p>
                    <button class="btn-primary" onclick="Tasks.completeTask(Tasks.allTasks.find(t=>t.id==='flashcards'))">
                        领取奖励 \u{1f41a} ${task.reward_shells}
                    </button>
                `);
                return;
            }
            if (currentIdx >= pairs.length) currentIdx = 0;
            const pair = pairs[currentIdx];
            const wrongOptions = pairs.filter(p => p.zh !== pair.zh).sort(() => Math.random() - 0.5).slice(0, 3);
            const options = [...wrongOptions, pair].sort(() => Math.random() - 0.5);
            const progress = `${correctCount}/${totalNeeded}`;

            this.showModal(`
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

    showMiniListening(task) {
        const questions = task.content.questions;
        let qIdx = 0;
        let score = 0;
        const passScore = 2;

        const showQ = () => {
            if (qIdx >= questions.length) {
                const passed = score >= passScore;
                this.showModal(`
                    <h3>${passed ? '\u{1f389} 恭喜' : '\u{1f622} 继续加油'}</h3>
                    <p style="text-align:center;margin:16px 0;">得分: ${score}/${questions.length} (需要${passScore}分)</p>
                    ${passed
                        ? `<button class="btn-primary" onclick="Tasks.completeTask(Tasks.allTasks.find(t=>t.id==='mini_listening'))">领取奖励 \u{1f41a} ${task.reward_shells}</button>`
                        : `<button class="btn-primary" onclick="Tasks.closeModal();Tasks.openTask('mini_listening')">再试一次</button>`
                    }
                `);
                return;
            }
            const q = questions[qIdx];
            this.showModal(`
                <button class="btn-close-modal" onclick="Tasks.closeModal()">✕</button>
                <h3>${task.icon} ${task.title}</h3>
                <p class="task-desc-text">听单词，选意思 (${qIdx + 1}/${questions.length})</p>
                <div class="listening-word-display">\u{1f50a} ${q.word}</div>
                <button class="listen-btn" id="listen-btn">\u{1f50a} 再听一次</button>
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

    showTranslation(task) {
        const sentences = task.content.sentences;
        let sIdx = 0;
        let completed = 0;

        const showS = () => {
            if (sIdx >= sentences.length) {
                this.showModal(`
                    <h3>✍️ 翻译完成</h3>
                    <p style="text-align:center;margin:16px 0;">完成了 ${completed} 句翻译</p>
                    <button class="btn-primary" onclick="Tasks.completeTask(Tasks.allTasks.find(t=>t.id==='translation'))">
                        领取奖励 \u{1f41a} ${task.reward_shells}
                    </button>
                `);
                return;
            }
            const s = sentences[sIdx];
            this.showModal(`
                <button class="btn-close-modal" onclick="Tasks.closeModal()">✕</button>
                <h3>${task.icon} ${task.title}</h3>
                <p class="task-desc-text">${task.description} (${sIdx + 1}/${sentences.length})</p>
                <div class="reading-translation" style="font-size:16px;text-align:center;">${s.zh}</div>
                <textarea class="translation-input" id="trans-input" placeholder="请输入英文翻译..."></textarea>
                <div class="translation-reference" id="trans-ref">
                    <b>参考译文:</b> ${s.en}
                </div>
                <div style="display:flex;gap:10px;">
                    <button class="btn-secondary" id="trans-hint" style="flex:1;">\u{1f4a1} 查看提示</button>
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
    },

    showListeningComp(task) {
        const content = task.content;
        let qIdx = 0;
        let score = 0;

        const showQ2 = () => {
            if (qIdx >= content.questions.length) {
                this.showModal(`
                    <h3>\u{1f50a} 听力完成</h3>
                    <p style="text-align:center;margin:16px 0;">得分: ${score}/${content.questions.length}</p>
                    <button class="btn-primary" onclick="Tasks.completeTask(Tasks.allTasks.find(t=>t.id==='listening_comp'))">
                        领取奖励 \u{1f41a} ${task.reward_shells}
                    </button>
                `);
                return;
            }
            const q = content.questions[qIdx];
            this.showModal(`
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
    },

    showSummary(task) {
        const completed = Object.keys(State.todayTasks || {}).length;
        this.showModal(`
            <button class="btn-close-modal" onclick="Tasks.closeModal()">✕</button>
            <h3>${task.icon} ${task.title}</h3>
            <p class="task-desc-text">${task.description}</p>
            <div class="summary-stats">
                <div class="stat-card">
                    <div class="stat-value">${completed}</div>
                    <div class="stat-label">今日完成任务</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">\u{1f41a} ${State.user.shells || 0}</div>
                    <div class="stat-label">贝壳余额</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">\u{1f525} ${State.user.streak || 0}天</div>
                    <div class="stat-label">连续签到</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">\u{1f420} ${(State.user.creatures || []).length}</div>
                    <div class="stat-label">海洋生物</div>
                </div>
            </div>
            <button class="btn-primary" onclick="Tasks.completeTask(Tasks.allTasks.find(t=>t.id==='daily_summary'))">
                记录复盘 \u{1f41a} ${task.reward_shells} ${task.reward_pearls ? '+ \u{1f4ce}1' : ''}
            </button>
        `);
    }
};
