// lighting.js - 动态光影系统
const Lighting = {
    periodColors: {
        dawn: {
            top: '#1A0F08', mid: '#3D2614', low: '#2A1A0C', bot: '#120A04',
            ray: 'rgba(255,183,128,0.06)', rayEnd: 'rgba(255,140,66,0)',
            sand1: '#8B7355', sand2: '#6B4E30', sand3: '#4A3218',
            causticAlpha: 0.06,
        },
        day: {
            top: '#0A1A2E', mid: '#0D3B66', low: '#0A2647', bot: '#061830',
            ray: 'rgba(180,220,255,0.06)', rayEnd: 'rgba(0,180,216,0)',
            sand1: '#C2A55E', sand2: '#B8954A', sand3: '#6B5010',
            causticAlpha: 0.08,
        },
        dusk: {
            top: '#15081F', mid: '#3D1B4E', low: '#2A1040', bot: '#0E0518',
            ray: 'rgba(199,125,255,0.05)', rayEnd: 'rgba(199,125,255,0)',
            sand1: '#6B5B7A', sand2: '#4E3D60', sand3: '#2E1840',
            causticAlpha: 0.05,
        },
        night: {
            top: '#050510', mid: '#0D1B2A', low: '#091420', bot: '#030810',
            ray: 'rgba(69,228,181,0.04)', rayEnd: 'rgba(69,228,181,0)',
            sand1: '#3A5068', sand2: '#2A3A50', sand3: '#1A2230',
            causticAlpha: 0.03,
        },
    },

    currentPeriod: 'day',
    targetPeriod: 'day',
    transitionProgress: 1.0,
    transitionDuration: 1000,
    currentColors: null,

    init() {
        this.currentColors = this.periodColors.day;
    },

    transitionTo(newPeriod) {
        if (newPeriod === this.currentPeriod) return;
        this.targetPeriod = newPeriod;
        this.transitionProgress = 0;
    },

    update(dt) {
        if (this.transitionProgress < 1.0) {
            this.transitionProgress += dt / this.transitionDuration;
            if (this.transitionProgress >= 1.0) {
                this.transitionProgress = 1.0;
                this.currentPeriod = this.targetPeriod;
            }

            const from = this.periodColors[this.currentPeriod];
            const to = this.periodColors[this.targetPeriod];
            const t = this.easeInOutCubic(this.transitionProgress);

            this.currentColors = {};
            for (const key of Object.keys(from)) {
                if (key === 'causticAlpha') {
                    this.currentColors[key] = from[key] + (to[key] - from[key]) * t;
                } else {
                    this.currentColors[key] = this.lerpColor(from[key], to[key], t);
                }
            }
        } else {
            this.currentColors = this.periodColors[this.currentPeriod];
        }
    },

    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    },

    lerpColor(a, colorB, t) {
        const parse = (c) => {
            const match = c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
            if (match) {
                return { r: parseInt(match[1]), g: parseInt(match[2]), b: parseInt(match[3]), a: match[4] ? parseFloat(match[4]) : 1 };
            }
            const hex = c.replace('#', '');
            return { r: parseInt(hex.substring(0, 2), 16), g: parseInt(hex.substring(2, 4), 16), b: parseInt(hex.substring(4, 6), 16), a: 1 };
        };

        const ca = parse(a), cb = parse(colorB);
        const r = Math.round(ca.r + (cb.r - ca.r) * t);
        const g = Math.round(ca.g + (cb.g - ca.g) * t);
        const b = Math.round(ca.b + (cb.b - ca.b) * t);
        const alpha = ca.a + (cb.a - ca.a) * t;

        if (a.startsWith('rgba') || a.startsWith('rgb')) {
            return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(4)})`;
        }
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    },

    getColors() {
        return this.currentColors || this.periodColors[this.currentPeriod];
    },

    drawCaustics(ctx, width, height, t) {
        const colors = this.getColors();
        const alpha = colors.causticAlpha || 0.06;
        if (alpha < 0.01) return;

        ctx.save();
        ctx.globalAlpha = alpha;

        for (let i = 0; i < 20; i++) {
            const cx = ((i * 197 + 31) % 1000) / 1000 * width;
            const cy = 20 + Math.sin(t * 0.8 + i * 1.7) * 40 + (i * 37) % 200;
            const rx = 20 + Math.sin(t * 0.5 + i) * 10 + (i * 13) % 40;
            const ry = 8 + Math.cos(t * 0.6 + i) * 4;

            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.beginPath();
            ctx.ellipse(cx, cy, rx, ry, 0.2 + Math.sin(t * 0.3 + i) * 0.3, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    },

    drawCreatureGlow(ctx, creature, x, y, scale, t) {
        let glowColor, glowSize, glowAlpha;

        switch (creature.rarity) {
            case 'legendary':
                glowColor = creature.id === 'glow_jellyfish' ? '0, 255, 200' : '255, 215, 0';
                glowSize = creature.size * scale * 0.7;
                glowAlpha = 0.25 + Math.sin(t * 2) * 0.2;
                break;
            case 'epic':
                glowColor = '170, 136, 255';
                glowSize = creature.size * scale * 0.4;
                glowAlpha = 0.15;
                break;
            case 'rare':
                glowColor = '136, 187, 255';
                glowSize = creature.size * scale * 0.25;
                glowAlpha = 0.08;
                break;
            default:
                return;
        }

        ctx.save();
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, glowSize);
        gradient.addColorStop(0, `rgba(${glowColor}, ${glowAlpha})`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, glowSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    },

    drawDepthFog(ctx, width, height) {
        const fogStart = height * 0.6;
        const gradient = ctx.createLinearGradient(0, fogStart, 0, height);
        gradient.addColorStop(0, 'rgba(10, 30, 60, 0)');
        gradient.addColorStop(0.5, 'rgba(10, 30, 60, 0.15)');
        gradient.addColorStop(1, 'rgba(10, 30, 60, 0.35)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, fogStart, width, height - fogStart);
    },
};
