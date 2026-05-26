const Aquarium = {
    canvas: null,
    ctx: null,
    creatures: [],
    layout: [],
    animFrame: null,
    bubbles: [],
    seaweedPositions: [],
    time: 0,
    initialized: false,

    async init() {
        this.canvas = document.getElementById('aquarium-canvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());

        try {
            const data = await API.getAquarium();
            this.creatures = data.creatures || [];
            this.layout = data.layout || [];
            const el = document.getElementById('collected-count');
            if (el) el.textContent = data.total_collected || 0;
        } catch (e) {
            console.error('Failed to load aquarium:', e);
        }

        this.initSeaweed();
        this.initBubbles();
        this.canvas.addEventListener('click', (e) => this.onClick(e));

        if (!this.initialized) {
            this.initialized = true;
            this.animate();
        }
    },

    async refresh() {
        try {
            const data = await API.getAquarium();
            this.creatures = data.creatures || [];
            this.layout = data.layout || [];
            const el = document.getElementById('collected-count');
            if (el) el.textContent = data.total_collected || 0;
        } catch (e) {}
    },

    resize() {
        if (!this.canvas) return;
        this.canvas.width = window.innerWidth * (window.devicePixelRatio || 1);
        this.canvas.height = window.innerHeight * (window.devicePixelRatio || 1);
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
        this.width = window.innerWidth;
        this.height = window.innerHeight;
    },

    initSeaweed() {
        this.seaweedPositions = [];
        for (let i = 0; i < 8; i++) {
            this.seaweedPositions.push({
                x: 30 + i * (this.width - 60) / 7 + (Math.random() - 0.5) * 40,
                height: 60 + Math.random() * 100,
                width: 8 + Math.random() * 10,
                phase: Math.random() * Math.PI * 2
            });
        }
    },

    initBubbles() {
        this.bubbles = [];
        for (let i = 0; i < 20; i++) {
            this.bubbles.push(this.createBubble());
        }
    },

    createBubble() {
        return {
            x: Math.random() * this.width,
            y: this.height + Math.random() * 60,
            r: 2 + Math.random() * 6,
            speed: 0.3 + Math.random() * 0.8,
            wobble: Math.random() * Math.PI * 2,
            wobbleSpeed: 0.01 + Math.random() * 0.02
        };
    },

    animate() {
        if (!this.ctx) return;
        this.time += 0.016;
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.drawBackground();
        this.drawSand();
        this.drawSeaweed();
        this.updateAndDrawBubbles();
        this.drawCreatures();
        this.animFrame = requestAnimationFrame(() => this.animate());
    },

    getTimeColors() {
        if (document.body.classList.contains('time-dawn')) {
            return {
                top: '#1A0F08', mid: '#3D2614', low: '#2A1A0C', bot: '#120A04',
                ray: 'rgba(255,183,128,0.06)', rayEnd: 'rgba(255,140,66,0)',
                sand1: '#8B7355', sand2: '#6B4E30', sand3: '#4A3218'
            };
        }
        if (document.body.classList.contains('time-day')) {
            return {
                top: '#0A1A2E', mid: '#0D3B66', low: '#0A2647', bot: '#061830',
                ray: 'rgba(180,220,255,0.06)', rayEnd: 'rgba(0,180,216,0)',
                sand1: '#C2A55E', sand2: '#B8954A', sand3: '#6B5010'
            };
        }
        if (document.body.classList.contains('time-dusk')) {
            return {
                top: '#15081F', mid: '#3D1B4E', low: '#2A1040', bot: '#0E0518',
                ray: 'rgba(199,125,255,0.05)', rayEnd: 'rgba(199,125,255,0)',
                sand1: '#6B5B7A', sand2: '#4E3D60', sand3: '#2E1840'
            };
        }
        // night (default)
        return {
            top: '#050510', mid: '#0D1B2A', low: '#091420', bot: '#030810',
            ray: 'rgba(69,228,181,0.04)', rayEnd: 'rgba(69,228,181,0)',
            sand1: '#3A5068', sand2: '#2A3A50', sand3: '#1A2230'
        };
    },

    drawBackground() {
        const ctx = this.ctx;
        const c = this.getTimeColors();
        const grad = ctx.createLinearGradient(0, 0, 0, this.height);
        grad.addColorStop(0, c.top);
        grad.addColorStop(0.3, c.mid);
        grad.addColorStop(0.7, c.low);
        grad.addColorStop(1, c.bot);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.width, this.height);

        // Light rays from surface
        for (let i = 0; i < 4; i++) {
            const rx = this.width * (0.15 + i * 0.22);
            const rayGrad = ctx.createLinearGradient(rx, 0, rx, this.height * 0.7);
            rayGrad.addColorStop(0, c.ray);
            rayGrad.addColorStop(1, c.rayEnd);
            ctx.fillStyle = rayGrad;
            ctx.beginPath();
            ctx.moveTo(rx - 40, 0);
            ctx.lineTo(rx + 40, 0);
            ctx.lineTo(rx + 80, this.height * 0.7);
            ctx.lineTo(rx - 80, this.height * 0.7);
            ctx.fill();
        }
    },

    drawSand() {
        const ctx = this.ctx;
        const c = this.getTimeColors();
        const sandY = this.height - 50;
        const grad = ctx.createLinearGradient(0, sandY, 0, this.height);
        grad.addColorStop(0, c.sand1);
        grad.addColorStop(0.3, c.sand2);
        grad.addColorStop(1, c.sand3);
        ctx.fillStyle = grad;

        ctx.beginPath();
        ctx.moveTo(0, sandY);
        for (let x = 0; x <= this.width; x += 12) {
            const y = sandY + Math.sin(x * 0.015) * 10 + Math.sin(x * 0.04 + 1) * 6;
            ctx.lineTo(x, y);
        }
        ctx.lineTo(this.width, this.height);
        ctx.lineTo(0, this.height);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = c.sand3;
        [
            [this.width * 0.1, sandY + 6, 10],
            [this.width * 0.25, sandY + 4, 7],
            [this.width * 0.45, sandY + 8, 12],
            [this.width * 0.6, sandY + 5, 8],
            [this.width * 0.8, sandY + 7, 11]
        ].forEach(([rx, ry, rr]) => {
            ctx.beginPath();
            ctx.arc(rx, ry, rr, 0, Math.PI * 2);
            ctx.fill();
        });
    },

    drawSeaweed() {
        const ctx = this.ctx;
        this.seaweedPositions.forEach(sw => {
            const baseY = this.height - 50;
            ctx.strokeStyle = '#2E7D32';
            ctx.lineWidth = sw.width;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(sw.x, baseY);
            const cp1x = sw.x + Math.sin(this.time * 0.8 + sw.phase) * 18;
            const cp1y = baseY - sw.height * 0.5;
            const cp2x = sw.x + Math.sin(this.time * 0.6 + sw.phase + 1) * 22;
            const cp2y = baseY - sw.height * 0.75;
            const endX = sw.x + Math.sin(this.time * 0.5 + sw.phase + 2) * 28;
            const endY = baseY - sw.height;
            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
            ctx.stroke();

            ctx.fillStyle = '#388E3C';
            for (let i = 0; i < 3; i++) {
                const t = 0.3 + i * 0.2;
                const lx = sw.x + Math.sin(this.time * 0.7 + sw.phase + i) * 14 * (1 - t);
                const ly = baseY - sw.height * t;
                ctx.beginPath();
                ctx.ellipse(lx + 8, ly, 10, 4, 0.3, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.ellipse(lx - 8, ly, 10, 4, -0.3, 0, Math.PI * 2);
                ctx.fill();
            }
        });
    },

    updateAndDrawBubbles() {
        const ctx = this.ctx;
        this.bubbles.forEach(b => {
            b.y -= b.speed;
            b.wobble += b.wobbleSpeed;
            b.x += Math.sin(b.wobble) * 0.3;
            if (b.y < -20) {
                Object.assign(b, this.createBubble());
                b.y = this.height + 10;
            }
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,0.08)';
            ctx.fill();
        });
        if (this.bubbles.length < 20 && Math.random() < 0.03) {
            this.bubbles.push(this.createBubble());
        }
    },

    drawCreatures() {
        this.layout.forEach(item => {
            const creature = this.creatures.find(c => c.id === item.creature_id);
            if (!creature) return;
            const x = (item.x / 100) * this.width;
            const y = (item.y / 100) * (this.height - 80);
            this.drawCreature(creature, x, y);
        });
    },

    drawCreature(creature, baseX, baseY) {
        const ctx = this.ctx;
        const t = this.time;
        const s = creature.size / 50;

        ctx.save();
        ctx.translate(baseX, baseY);

        switch (creature.shape) {
            case 'fish': this.drawFish(ctx, s, t, creature.color); break;
            case 'seahorse': this.drawSeahorse(ctx, s, t, creature.color); break;
            case 'star': this.drawStarfish(ctx, s, t, creature.color); break;
            case 'jellyfish': this.drawJellyfish(ctx, s, t, creature.color); break;
            case 'puffer': this.drawPufferfish(ctx, s, t, creature.color); break;
            case 'turtle': this.drawTurtle(ctx, s, t, creature.color); break;
            case 'octopus': this.drawOctopus(ctx, s, t, creature.color); break;
            case 'ray': this.drawRay(ctx, s, t, creature.color); break;
            case 'dolphin': this.drawDolphin(ctx, s, t, creature.color); break;
            case 'whale': this.drawWhale(ctx, s, t, creature.color); break;
            case 'shark': this.drawShark(ctx, s, t, creature.color); break;
            case 'seadragon': this.drawSeaDragon(ctx, s, t, creature.color); break;
            case 'mermaid': this.drawMermaid(ctx, s, t); break;
            case 'narwhal': this.drawNarwhal(ctx, s, t, creature.color); break;
        }
        ctx.restore();
    },

    // Drawing methods (same as before)
    drawFish(ctx, s, t, color) {
        const ox = Math.sin(t * 1.5) * 20;
        const oy = Math.cos(t * 1.3) * 8;
        ctx.translate(ox, oy); ctx.scale(s, s);
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.ellipse(0, 0, 18, 10, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(-30, -12); ctx.lineTo(-30, 12); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'white';
        ctx.beginPath(); ctx.arc(10, -3, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1A1A2E';
        ctx.beginPath(); ctx.arc(11, -3, 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(-5, -8, 4, 16);
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.moveTo(-5, -9); ctx.lineTo(5, -15); ctx.lineTo(10, -9); ctx.fill();
    },

    drawSeahorse(ctx, s, t, color) {
        const oy = Math.sin(t * 0.8) * 15;
        ctx.translate(0, oy); ctx.scale(s, s);
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.moveTo(0, -18); ctx.bezierCurveTo(10, -18, 12, -5, 8, 5); ctx.bezierCurveTo(5, 12, -2, 18, 0, 22); ctx.lineTo(0, 24); ctx.bezierCurveTo(3, 24, 4, 20, 6, 18); ctx.bezierCurveTo(-2, 15, -8, 5, -6, -5); ctx.bezierCurveTo(-4, -12, 0, -18, 0, -18); ctx.fill();
        ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(5, -10, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1A1A2E'; ctx.beginPath(); ctx.arc(6, -10, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.moveTo(-2, -17); ctx.lineTo(-6, -24); ctx.lineTo(0, -20); ctx.lineTo(4, -25); ctx.lineTo(6, -18); ctx.fill();
    },

    drawStarfish(ctx, s, t, color) {
        const angle = Math.sin(t * 0.3) * 0.2;
        ctx.rotate(angle); ctx.scale(s, s);
        ctx.fillStyle = color;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
            const ox = Math.cos(a) * 18, oy = Math.sin(a) * 18;
            const ix = Math.cos(a + Math.PI / 5) * 7, iy = Math.sin(a + Math.PI / 5) * 7;
            if (i === 0) ctx.moveTo(ox, oy); else ctx.lineTo(ox, oy);
            ctx.lineTo(ix, iy);
        }
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();
    },

    drawJellyfish(ctx, s, t, color) {
        const oy = Math.sin(t * 0.6) * 12;
        ctx.translate(0, oy); ctx.scale(s, s);
        ctx.fillStyle = color + '99'; ctx.beginPath(); ctx.ellipse(0, -5, 20, 16, 0, Math.PI, 0); ctx.fill();
        ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, -5, 20, Math.PI, 0); ctx.fill();
        ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineCap = 'round';
        for (let i = -3; i <= 3; i++) {
            ctx.beginPath(); ctx.moveTo(i * 5, 10);
            ctx.quadraticCurveTo(i * 5 + Math.sin(t * 2 + i) * 6, 14 + Math.abs(i) * 4, i * 5 + Math.sin(t * 2.5 + i) * 8, 18 + Math.abs(i) * 6);
            ctx.stroke();
        }
    },

    drawPufferfish(ctx, s, t, color) {
        const puff = 1 + Math.sin(t * 1.2) * 0.15;
        ctx.scale(s * puff, s * puff);
        ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = color; ctx.lineWidth = 1.5;
        for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2;
            ctx.beginPath(); ctx.moveTo(Math.cos(a) * 14, Math.sin(a) * 14); ctx.lineTo(Math.cos(a) * 19, Math.sin(a) * 19); ctx.stroke();
        }
        ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(-6, -5, 5, 0, Math.PI * 2); ctx.arc(6, -5, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1A1A2E'; ctx.beginPath(); ctx.arc(-6, -4, 2.5, 0, Math.PI * 2); ctx.arc(6, -4, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FF8A80'; ctx.beginPath(); ctx.arc(0, 4, 3, 0, Math.PI); ctx.fill();
    },

    drawTurtle(ctx, s, t, color) {
        const ox = Math.sin(t * 0.5) * 30;
        ctx.translate(ox, 0); ctx.scale(s, s);
        ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(0, 0, 22, 16, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#3E5C3E'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(0, 12); ctx.moveTo(-14, 0); ctx.lineTo(14, 0); ctx.moveTo(-8, -10); ctx.lineTo(8, 10); ctx.moveTo(8, -10); ctx.lineTo(-8, 10); ctx.stroke();
        ctx.fillStyle = '#7CB342'; ctx.beginPath(); ctx.ellipse(22, 0, 8, 6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(25, -2, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1A1A2E'; ctx.beginPath(); ctx.arc(26, -2, 1.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.ellipse(-12, -14, 10, 5, -0.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(10, -14, 10, 5, 0.5, 0, Math.PI * 2); ctx.fill();
    },

    drawOctopus(ctx, s, t, color) {
        ctx.scale(s, s);
        ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, -5, 16, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(-6, -8, 5, 0, Math.PI * 2); ctx.arc(6, -8, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1A1A2E'; ctx.beginPath(); ctx.arc(-6, -7, 2.5, 0, Math.PI * 2); ctx.arc(6, -7, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.lineCap = 'round';
        for (let i = 0; i < 8; i++) {
            const bx = (i - 3.5) * 4;
            ctx.beginPath(); ctx.moveTo(bx, 8);
            ctx.quadraticCurveTo(bx + Math.sin(t * 1.5 + i) * 10, 15 + i * 2, bx + Math.sin(t * 2 + i) * 14, 22 + i * 3);
            ctx.stroke();
        }
    },

    drawRay(ctx, s, t, color) {
        const ox = Math.sin(t * 0.4) * 35, oy = Math.sin(t * 0.5) * 10;
        ctx.translate(ox, oy); ctx.scale(s, s);
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(15, -20, 30, -14, 28, 0); ctx.bezierCurveTo(30, 14, 15, 20, 0, 0); ctx.bezierCurveTo(-10, 10, -10, -10, 0, 0); ctx.fill();
        ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(18, -6, 3, 0, Math.PI * 2); ctx.arc(18, 6, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1A1A2E'; ctx.beginPath(); ctx.arc(19, -6, 1.5, 0, Math.PI * 2); ctx.arc(19, 6, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(-20, -3); ctx.lineTo(-22, 3); ctx.closePath(); ctx.fill();
    },

    drawDolphin(ctx, s, t, color) {
        const oy = Math.sin(t * 0.3) * 15;
        ctx.translate(0, oy); ctx.scale(s, s);
        ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(0, 0, 28, 11, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(26, -3); ctx.lineTo(38, 0); ctx.lineTo(26, 3); ctx.fill();
        ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(-5, -20); ctx.lineTo(8, -10); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-27, 0); ctx.lineTo(-36, -12); ctx.lineTo(-34, 12); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(16, -3, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1A1A2E'; ctx.beginPath(); ctx.arc(17, -3, 1.5, 0, Math.PI * 2); ctx.fill();
    },

    drawWhale(ctx, s, t, color) {
        const ox = Math.sin(t * 0.3) * 20;
        ctx.translate(ox, 0); ctx.scale(s, s);
        ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(0, 0, 35, 16, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#B0C4DE'; ctx.beginPath(); ctx.ellipse(0, 5, 25, 8, 0, 0, Math.PI); ctx.fill();
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.moveTo(-34, 0); ctx.lineTo(-46, -16); ctx.lineTo(-42, 0); ctx.lineTo(-46, 16); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(20, -6, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1A1A2E'; ctx.beginPath(); ctx.arc(21, -6, 2, 0, Math.PI * 2); ctx.fill();
    },

    drawShark(ctx, s, t, color) {
        const ox = Math.sin(t * 0.5) * 25;
        ctx.translate(ox, 0); ctx.scale(s, s);
        ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(0, 0, 28, 12, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#D5D5D5'; ctx.beginPath(); ctx.ellipse(0, 4, 22, 6, 0, 0, Math.PI); ctx.fill();
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.moveTo(-5, -10); ctx.lineTo(0, -24); ctx.lineTo(8, -10); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-27, 0); ctx.lineTo(-38, -14); ctx.lineTo(-34, 14); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(18, -4, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1A1A2E'; ctx.beginPath(); ctx.arc(19, -4, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#333'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(22, 2); ctx.lineTo(26, 2); ctx.stroke();
    },

    drawSeaDragon(ctx, s, t, color) {
        ctx.scale(s, s);
        ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-20, 0); ctx.quadraticCurveTo(-5, -5, 5, 0); ctx.quadraticCurveTo(15, 5, 25, 0); ctx.stroke();
        ctx.fillStyle = color + '88';
        for (let i = -1; i <= 1; i++) {
            const bx = i * 10;
            ctx.beginPath(); ctx.ellipse(bx, -6 + Math.sin(t * 2 + i) * 3, 8, 3, 0.3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(bx, 6 + Math.sin(t * 2 + i + 1) * 3, 8, 3, -0.3, 0, Math.PI * 2); ctx.fill();
        }
    },

    drawMermaid(ctx, s, t) {
        const oy = Math.sin(t * 0.7) * 10;
        ctx.translate(0, oy); ctx.scale(s, s);
        ctx.fillStyle = '#00BCD4';
        ctx.beginPath(); ctx.moveTo(0, -5); ctx.bezierCurveTo(8, 5, 12, 15, 5, 25); ctx.bezierCurveTo(2, 22, -4, 20, -2, 28); ctx.bezierCurveTo(-6, 22, -10, 20, -5, 25); ctx.bezierCurveTo(-14, 15, -10, 5, 0, -5); ctx.fill();
        ctx.fillStyle = '#FFCCBC'; ctx.beginPath(); ctx.arc(0, -12, 9, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FF7043'; ctx.beginPath(); ctx.arc(0, -14, 10, Math.PI, 0); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-8, -10); ctx.quadraticCurveTo(-14, -5, -12, 2); ctx.quadraticCurveTo(-10, -2, -5, 0); ctx.fill();
        ctx.fillStyle = '#1A1A2E'; ctx.beginPath(); ctx.arc(-3, -14, 1.5, 0, Math.PI * 2); ctx.arc(3, -14, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FFD700'; ctx.beginPath(); ctx.moveTo(-4, -22); ctx.lineTo(0, -27); ctx.lineTo(4, -22); ctx.fill();
    },

    drawNarwhal(ctx, s, t, color) {
        const ox = Math.sin(t * 0.3) * 18;
        ctx.translate(ox, 0); ctx.scale(s, s);
        ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(0, 0, 28, 13, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#89CFF0';
        for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(-8 + i * 7, -2 + Math.sin(i * 2) * 4, 2, 0, Math.PI * 2); ctx.fill(); }
        ctx.strokeStyle = '#F5E6CA'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(24, -4); ctx.lineTo(42, -12); ctx.stroke();
        ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(-27, 0); ctx.lineTo(-38, -10); ctx.lineTo(-34, 10); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(16, -5, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1A1A2E'; ctx.beginPath(); ctx.arc(17, -5, 1.5, 0, Math.PI * 2); ctx.fill();
    },

    onClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        for (const item of this.layout) {
            const cx = (item.x / 100) * this.width;
            const cy = (item.y / 100) * (this.height - 80);
            if (Math.sqrt((mx - cx) ** 2 + (my - cy) ** 2) < 45) {
                const creature = this.creatures.find(c => c.id === item.creature_id);
                if (creature) this.showCreatureInfo(creature, e.clientX, e.clientY);
                break;
            }
        }
    },

    showCreatureInfo(creature, cx, cy) {
        const existing = document.querySelector('.creature-tooltip');
        if (existing) existing.remove();
        const rarityNames = { common: '普通', rare: '稀有', epic: '史诗', legendary: '传说' };
        const tooltip = document.createElement('div');
        tooltip.className = 'creature-tooltip';
        tooltip.innerHTML = `
            <div class="tt-name">${creature.name}</div>
            <div class="tt-name-en">${creature.name_en}</div>
            <div class="tt-rarity ${creature.rarity}">${rarityNames[creature.rarity] || creature.rarity}</div>
        `;
        tooltip.style.left = Math.min(cx, window.innerWidth - 160) + 'px';
        tooltip.style.top = (cy - 80) + 'px';
        document.body.appendChild(tooltip);
        setTimeout(() => tooltip.remove(), 2500);
    },

    stop() {
        if (this.animFrame) {
            cancelAnimationFrame(this.animFrame);
            this.animFrame = null;
        }
    }
};
