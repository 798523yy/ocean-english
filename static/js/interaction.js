// interaction.js - 增强交互
const Interaction = {
    canvas: null,
    mouseX: 0,
    mouseY: 0,
    mouseOnSurface: false,
    surfaceRippleTimer: 0,
    draggedCreature: null,
    dragOffsetX: 0,
    dragOffsetY: 0,
    isDragging: false,
    aquariumLayout: null,
    aquariumCreatures: null,

    init(canvas) {
        this.canvas = canvas;

        canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        canvas.addEventListener('click', (e) => this.onClick(e));
        canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        canvas.addEventListener('mouseup', () => this.onMouseUp());
        canvas.addEventListener('mouseleave', () => {
            this.mouseOnSurface = false;
            this.isDragging = false;
            this.draggedCreature = null;
        });

        // 触摸支持
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.onMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
        }, { passive: false });
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.onMouseDown({ clientX: touch.clientX, clientY: touch.clientY });
        }, { passive: false });
        canvas.addEventListener('touchend', () => this.onMouseUp());
    },

    setLayoutRefs(layout, creatures) {
        this.aquariumLayout = layout;
        this.aquariumCreatures = creatures;
    },

    onMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouseX = e.clientX - rect.left;
        this.mouseY = e.clientY - rect.top;
        this.mouseOnSurface = this.mouseY < rect.height * 0.2;

        if (this.isDragging && this.draggedCreature !== null) {
            const layoutItem = this.aquariumLayout[this.draggedCreature];
            if (layoutItem && window.Aquarium) {
                layoutItem.x = Math.max(5, Math.min(95, (this.mouseX / window.Aquarium.width) * 100));
                layoutItem.y = Math.max(5, Math.min(90, (this.mouseY / (window.Aquarium.height - 80)) * 100));
            }
        }

        if (this.mouseOnSurface && this.surfaceRippleTimer <= 0) {
            ParticleManager.emit('surface_ripple', this.mouseX, this.mouseY, {});
            this.surfaceRippleTimer = 150;
        }
    },

    onMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        if (this.aquariumLayout && window.Aquarium) {
            for (let i = 0; i < this.aquariumLayout.length; i++) {
                const item = this.aquariumLayout[i];
                const cx = (item.x / 100) * window.Aquarium.width;
                const cy = (item.y / 100) * (window.Aquarium.height - 80);
                const dist = Math.sqrt((mx - cx) ** 2 + (my - cy) ** 2);
                if (dist < 50) {
                    this.isDragging = true;
                    this.draggedCreature = i;
                    this.dragOffsetX = cx - mx;
                    this.dragOffsetY = cy - my;
                    return;
                }
            }
        }
    },

    onMouseUp() {
        if (this.isDragging && this.draggedCreature !== null) {
            if (window.API) {
                window.API.saveLayout(this.aquariumLayout).catch(() => {});
            }
        }
        this.isDragging = false;
        this.draggedCreature = null;
    },

    onClick(e) {
        if (this.isDragging) return;

        const rect = this.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        ParticleManager.emit('ripple', mx, my, {});

        if (this.aquariumLayout && this.aquariumCreatures && window.Aquarium) {
            for (const item of this.aquariumLayout) {
                const cx = (item.x / 100) * window.Aquarium.width;
                const cy = (item.y / 100) * (window.Aquarium.height - 80);
                const dist = Math.sqrt((mx - cx) ** 2 + (my - cy) ** 2);
                if (dist < 50) {
                    const creature = this.aquariumCreatures.find(c => c.id === item.creature_id);
                    if (creature) {
                        this.showCreatureCard(creature, e.clientX, e.clientY);
                    }
                    return;
                }
            }
        }

        if (my < rect.height * 0.2 && window.SwimAI) {
            SwimAI.feed(mx, my);
            ParticleManager.emit('surface_ripple', mx, my, {});
        }
    },

    showCreatureCard(creature, screenX, screenY) {
        const existing = document.querySelector('.creature-info-card');
        if (existing) existing.remove();

        const rarityNames = { common: '普通', rare: '稀有', epic: '史诗', legendary: '传说' };
        const rarityColors = {
            common: '#9E9E9E', rare: '#4FC3F7', epic: '#AB47BC', legendary: '#FFD700'
        };
        const creatureEmojis = {
            clownfish: '🐠', seahorse: '🦑', starfish: '⭐', jellyfish: '🫧',
            pufferfish: '🐡', turtle: '🐢', octopus: '🐙', stingray: '🦈',
            dolphin: '🐬', whale: '🐋', shark: '🦈', seadragon: '🐲',
            mermaid: '🧜‍♀️', narwhal: '🐳', glow_jellyfish: '✨'
        };

        const card = document.createElement('div');
        card.className = 'creature-info-card';
        card.innerHTML = `
            <div class="cic-header" style="border-color:${rarityColors[creature.rarity]}">
                <span class="cic-emoji">${creatureEmojis[creature.id] || '🐟'}</span>
                <div class="cic-names">
                    <span class="cic-name">${creature.name}</span>
                    <span class="cic-name-en">${creature.name_en}</span>
                </div>
            </div>
            <div class="cic-body">
                <span class="cic-rarity" style="background:${rarityColors[creature.rarity]}">${rarityNames[creature.rarity]}</span>
                <p class="cic-desc">${creature.description}</p>
            </div>
        `;

        const cardWidth = 220;
        const cardHeight = 140;
        let left = screenX - cardWidth / 2;
        let top = screenY - cardHeight - 20;
        if (left < 10) left = 10;
        if (left + cardWidth > window.innerWidth - 10) left = window.innerWidth - cardWidth - 10;
        if (top < 10) top = screenY + 20;
        card.style.left = left + 'px';
        card.style.top = top + 'px';

        document.body.appendChild(card);
        requestAnimationFrame(() => card.classList.add('show'));
        setTimeout(() => {
            card.classList.remove('show');
            setTimeout(() => card.remove(), 300);
        }, 3000);

        const closeHandler = (e) => {
            if (!card.contains(e.target)) {
                card.classList.remove('show');
                setTimeout(() => card.remove(), 300);
                document.removeEventListener('click', closeHandler);
            }
        };
        setTimeout(() => document.addEventListener('click', closeHandler), 100);
    },

    update(dt) {
        if (this.surfaceRippleTimer > 0) {
            this.surfaceRippleTimer -= dt;
        }
    },
};
