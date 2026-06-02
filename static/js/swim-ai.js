// swim-ai.js - 智能游动状态机
const SwimAI = {
    states: {},          // creature_id → state object
    feedingTarget: null,
    feedingTimer: 0,
    canvasWidth: 0,
    canvasHeight: 0,

    init(layout, creatures, width, height) {
        this.canvasWidth = width;
        this.canvasHeight = height;
        this.states = {};

        layout.forEach((item, index) => {
            const creature = creatures.find(c => c.id === item.creature_id);
            if (!creature) return;

            const behavior = this.getBehavior(creature);
            this.states[`${item.creature_id}_${index}`] = {
                id: `${item.creature_id}_${index}`,
                creatureId: item.creature_id,
                x: (item.x / 100) * width,
                y: (item.y / 100) * (height - 80),
                angle: Math.random() * Math.PI * 2,
                speed: behavior.speedRange[0] + Math.random() * (behavior.speedRange[1] - behavior.speedRange[0]),
                targetX: null,
                targetY: null,
                state: 'free',
                stateTimer: 0,
                pauseDuration: 0,
                baseSpeed: behavior.speedRange[0] + Math.random() * (behavior.speedRange[1] - behavior.speedRange[0]),
                turnRate: behavior.turnRate,
                pauseChance: behavior.pauseChance,
                schooling: behavior.schooling,
                wobblePhase: Math.random() * Math.PI * 2,
            };
        });
    },

    getBehavior(creature) {
        const defaults = {
            speedRange: [0.2, 0.6],
            turnRate: 0.03,
            pauseChance: 0.005,
            schooling: false,
        };

        const overrides = {
            dolphin:     { speedRange: [0.5, 1.2], turnRate: 0.05, pauseChance: 0.003 },
            whale:       { speedRange: [0.15, 0.35], turnRate: 0.015, pauseChance: 0.01 },
            shark:       { speedRange: [0.4, 0.9], turnRate: 0.04, pauseChance: 0.004 },
            turtle:      { speedRange: [0.2, 0.4], turnRate: 0.02, pauseChance: 0.008 },
            jellyfish:   { speedRange: [0.08, 0.2], turnRate: 0.01, pauseChance: 0.02 },
            clownfish:   { speedRange: [0.4, 0.8], turnRate: 0.06, pauseChance: 0.005, schooling: true },
            seahorse:    { speedRange: [0.05, 0.15], turnRate: 0.02, pauseChance: 0.015 },
            pufferfish:  { speedRange: [0.15, 0.35], turnRate: 0.04, pauseChance: 0.01 },
            octopus:     { speedRange: [0.1, 0.25], turnRate: 0.03, pauseChance: 0.012 },
            stingray:    { speedRange: [0.3, 0.6], turnRate: 0.025, pauseChance: 0.006 },
            starfish:    { speedRange: [0.02, 0.06], turnRate: 0.01, pauseChance: 0.05 },
            seadragon:   { speedRange: [0.08, 0.2], turnRate: 0.015, pauseChance: 0.015 },
            mermaid:     { speedRange: [0.3, 0.7], turnRate: 0.04, pauseChance: 0.004 },
            narwhal:     { speedRange: [0.2, 0.45], turnRate: 0.02, pauseChance: 0.008 },
            glow_jellyfish: { speedRange: [0.06, 0.15], turnRate: 0.01, pauseChance: 0.025 },
        };

        return { ...defaults, ...(overrides[creature.id] || {}) };
    },

    update(dt) {
        if (!dt || dt > 100) dt = 16;

        const stateIds = Object.keys(this.states);
        const schoolGroups = this.buildSchoolGroups();

        for (const stateId of stateIds) {
            const s = this.states[stateId];
            s.stateTimer += dt;

            switch (s.state) {
                case 'free': this.updateFree(s, dt, schoolGroups); break;
                case 'moving': this.updateMoving(s, dt); break;
                case 'pausing': this.updatePausing(s, dt); break;
                case 'turning': this.updateTurning(s, dt); break;
                case 'feeding': this.updateFeeding(s, dt); break;
            }

            this.checkBounds(s);
        }

        if (this.feedingTimer > 0) {
            this.feedingTimer -= dt;
            if (this.feedingTimer <= 0) this.endFeeding();
        }
    },

    updateFree(s, dt, schoolGroups) {
        if (!s.targetX || Math.random() < 0.002) {
            s.targetX = 100 + Math.random() * (this.canvasWidth - 200);
            s.targetY = 80 + Math.random() * (this.canvasHeight - 200);
            s.state = 'moving';
            return;
        }

        if (Math.random() < s.pauseChance) {
            s.state = 'pausing';
            s.pauseDuration = 1000 + Math.random() * 3000;
            s.stateTimer = 0;
            return;
        }

        if (s.schooling && schoolGroups[s.creatureId]) {
            const group = schoolGroups[s.creatureId];
            if (group.length >= 2 && Math.random() < 0.01) {
                let avgAngle = 0;
                group.forEach(member => {
                    if (member !== s.id) {
                        const other = this.states[member];
                        if (other) avgAngle += other.angle;
                    }
                });
                avgAngle /= (group.length - 1);
                s.targetX = s.x + Math.cos(avgAngle) * 200;
                s.targetY = s.y + Math.sin(avgAngle) * 200;
                s.state = 'moving';
                return;
            }
        }

        s.x += Math.cos(s.angle) * s.speed * 0.3;
        s.y += Math.sin(s.angle) * s.speed * 0.3;
        s.angle += (Math.random() - 0.5) * s.turnRate * 0.1;
    },

    updateMoving(s, dt) {
        if (!s.targetX) { s.state = 'free'; return; }

        const dx = s.targetX - s.x;
        const dy = s.targetY - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 20) {
            s.state = 'free';
            s.targetX = null;
            s.targetY = null;
            return;
        }

        const targetAngle = Math.atan2(dy, dx);
        const angleDiff = targetAngle - s.angle;
        const normalizedDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
        s.angle += normalizedDiff * s.turnRate * (dt / 16);

        const speedFactor = Math.min(1, dist / 150);
        s.speed = s.baseSpeed * (0.5 + 0.5 * speedFactor);
        s.x += Math.cos(s.angle) * s.speed * (dt / 16);
        s.y += Math.sin(s.angle) * s.speed * (dt / 16);
    },

    updatePausing(s, dt) {
        s.x += Math.sin(s.stateTimer * 0.003 + s.wobblePhase) * 0.1;
        s.y += Math.cos(s.stateTimer * 0.004 + s.wobblePhase) * 0.1;
        if (s.stateTimer > s.pauseDuration) s.state = 'free';
    },

    updateTurning(s, dt) {
        s.angle += s.turnRate * 0.5 * (dt / 16);
        s.x += Math.cos(s.angle) * s.speed * 0.2 * (dt / 16);
        s.y += Math.sin(s.angle) * s.speed * 0.2 * (dt / 16);
        if (s.stateTimer > 1500) s.state = 'free';
    },

    updateFeeding(s, dt) {
        if (!this.feedingTarget) { s.state = 'free'; return; }
        const dx = this.feedingTarget.x - s.x;
        const dy = this.feedingTarget.y - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const targetAngle = Math.atan2(dy, dx);
        const angleDiff = targetAngle - s.angle;
        s.angle += Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff)) * s.turnRate * 1.5;

        const speed = Math.min(s.baseSpeed * 2, dist * 0.02);
        s.x += Math.cos(s.angle) * speed;
        s.y += Math.sin(s.angle) * speed;

        if (dist < 30) {
            s.state = 'pausing';
            s.pauseDuration = 2000;
            s.stateTimer = 0;
        }
    },

    checkBounds(s) {
        const margin = 60;
        let needsTurn = false;

        if (s.x < margin) { s.x = margin; needsTurn = true; }
        if (s.x > this.canvasWidth - margin) { s.x = this.canvasWidth - margin; needsTurn = true; }
        if (s.y < margin) { s.y = margin; needsTurn = true; }
        if (s.y > this.canvasHeight - 120) { s.y = this.canvasHeight - 120; needsTurn = true; }

        if (needsTurn && s.state !== 'turning') {
            s.state = 'turning';
            s.stateTimer = 0;
            s.angle += Math.PI * (0.5 + Math.random());
        }
    },

    buildSchoolGroups() {
        const groups = {};
        for (const stateId of Object.keys(this.states)) {
            const s = this.states[stateId];
            if (s.schooling) {
                if (!groups[s.creatureId]) groups[s.creatureId] = [];
                groups[s.creatureId].push(stateId);
            }
        }
        return groups;
    },

    feed(x, y) {
        this.feedingTarget = { x, y };
        this.feedingTimer = 4000;
        for (const stateId of Object.keys(this.states)) {
            const s = this.states[stateId];
            const dist = Math.sqrt((s.x - x) ** 2 + (s.y - y) ** 2);
            if (dist < 400) s.state = 'feeding';
        }
    },

    endFeeding() {
        this.feedingTarget = null;
        for (const stateId of Object.keys(this.states)) {
            if (this.states[stateId].state === 'feeding') {
                this.states[stateId].state = 'free';
            }
        }
    },

    getTransform(stateId) {
        const s = this.states[stateId];
        if (!s) return { x: 0, y: 0, angle: 0 };
        return { x: s.x, y: s.y, angle: s.angle, speed: s.speed };
    },

    getAllStates() {
        return Object.values(this.states);
    },

    resize(width, height) {
        const oldW = this.canvasWidth || width;
        const oldH = this.canvasHeight || height;
        this.canvasWidth = width;
        this.canvasHeight = height;
        if (oldW > 0 && oldH > 0) {
            for (const s of Object.values(this.states)) {
                s.x = (s.x / oldW) * width;
                s.y = (s.y / oldH) * height;
            }
        }
    }
};
