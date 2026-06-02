// environment.js - 海底环境装饰
const Environment = {
    seaweeds: [],
    corals: [],
    anemones: [],
    rocks: [],
    decorFish: [],

    init(width, height) {
        this.seaweeds = [];
        this.corals = [];
        this.anemones = [];
        this.rocks = [];
        this.decorFish = [];

        // 海草（8丛，多段骨骼）
        for (let i = 0; i < 8; i++) {
            const segments = 3 + Math.floor(Math.random() * 2);
            this.seaweeds.push({
                baseX: 30 + i * (width - 60) / 7 + (Math.random() - 0.5) * 50,
                baseY: height - 50,
                segments: segments,
                segmentLength: 30 + Math.random() * 50,
                width: 5 + Math.random() * 8,
                phase: Math.random() * Math.PI * 2,
                stiffness: 0.3 + Math.random() * 0.4,
                color1: `hsl(${120 + Math.random() * 40}, ${50 + Math.random() * 30}%, ${20 + Math.random() * 20}%)`,
                color2: `hsl(${120 + Math.random() * 40}, ${50 + Math.random() * 30}%, ${15 + Math.random() * 15}%)`,
            });
        }

        // 珊瑚（3-5簇）
        const coralCount = 3 + Math.floor(Math.random() * 3);
        const coralColors = ['#FF6B6B', '#FF8E72', '#FFB347', '#DA70D6', '#FF69B4'];
        for (let i = 0; i < coralCount; i++) {
            this.corals.push({
                x: 60 + Math.random() * (width - 120),
                y: height - 50 + Math.random() * 10,
                size: 20 + Math.random() * 35,
                color: coralColors[i % coralColors.length],
                branches: 3 + Math.floor(Math.random() * 4),
                phase: Math.random() * Math.PI * 2,
            });
        }

        // 海葵（2-3个）
        const anemoneCount = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < anemoneCount; i++) {
            this.anemones.push({
                x: 80 + Math.random() * (width - 160),
                y: height - 50 + Math.random() * 5,
                size: 12 + Math.random() * 16,
                color: `hsl(${280 + Math.random() * 60}, 60%, ${50 + Math.random() * 30}%)`,
                tentacles: 8 + Math.floor(Math.random() * 8),
                phase: Math.random() * Math.PI * 2,
            });
        }

        // 小石头（5-8个）
        const rockCount = 5 + Math.floor(Math.random() * 4);
        for (let i = 0; i < rockCount; i++) {
            this.rocks.push({
                x: Math.random() * width,
                y: height - 48 + Math.random() * 8,
                rx: 5 + Math.random() * 12,
                ry: 3 + Math.random() * 6,
                color: `hsl(${30 + Math.random() * 20}, ${10 + Math.random() * 20}%, ${40 + Math.random() * 30}%)`,
            });
        }

        // 装饰鱼群
        this.spawnDecorFish(width, height);
    },

    spawnDecorFish(width, height) {
        this.decorFish = [];
        const count = 6 + Math.floor(Math.random() * 5);
        for (let i = 0; i < count; i++) {
            this.decorFish.push({
                x: Math.random() * width,
                y: 60 + Math.random() * (height - 160),
                speed: 1 + Math.random() * 2.5,
                size: 3 + Math.random() * 6,
                color: `hsl(${Math.random() * 60 + 180}, 50%, ${40 + Math.random() * 30}%)`,
                phase: Math.random() * Math.PI * 2,
                angle: (Math.random() - 0.5) * 0.5,
            });
        }
    },

    update(dt, width, height) {
        for (const fish of this.decorFish) {
            fish.x += Math.cos(fish.angle) * fish.speed * (dt / 16);
            fish.y += Math.sin(fish.angle) * fish.speed * (dt / 16) + Math.sin(fish.phase) * 0.3;
            if (fish.x < -30) fish.x = width + 30;
            if (fish.x > width + 30) fish.x = -30;
            if (fish.y < 30) fish.y = 30;
            if (fish.y > height - 120) fish.y = height - 120;
            fish.phase += 0.02 * (dt / 16);
            if (Math.random() < 0.005) fish.angle += (Math.random() - 0.5) * 0.4;
        }
    },

    draw(ctx, t) {
        this.drawRocks(ctx);
        this.drawCorals(ctx, t);
        this.drawAnemones(ctx, t);
        this.drawSeaweeds(ctx, t);
        this.drawDecorFish(ctx, t);
    },

    drawRocks(ctx) {
        for (const rock of this.rocks) {
            ctx.fillStyle = rock.color;
            ctx.beginPath();
            ctx.ellipse(rock.x, rock.y, rock.rx, rock.ry, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    },

    drawCorals(ctx, t) {
        for (const coral of this.corals) {
            ctx.save();
            ctx.translate(coral.x, coral.y);

            for (let b = 0; b < coral.branches; b++) {
                const angle = (b / coral.branches) * Math.PI * 0.7 - Math.PI * 0.35;
                const sway = Math.sin(t * 0.5 + coral.phase + b) * 0.1;

                ctx.strokeStyle = coral.color;
                ctx.lineWidth = 6;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(0, 0);
                const cpX = Math.sin(angle) * coral.size * 0.3;
                const cpY = -coral.size * 0.4;
                const endX = Math.sin(angle + sway) * coral.size * 0.6;
                const endY = -coral.size * 0.7;
                ctx.quadraticCurveTo(cpX, cpY, endX, endY);

                const bx = endX * 0.5;
                const by = endY * 0.5;
                ctx.moveTo(bx, by);
                ctx.lineTo(bx + Math.sin(angle + 0.3) * coral.size * 0.25, by - coral.size * 0.2);

                ctx.stroke();
            }

            ctx.restore();
        }
    },

    drawAnemones(ctx, t) {
        for (const anemone of this.anemones) {
            ctx.save();
            ctx.translate(anemone.x, anemone.y);

            for (let i = 0; i < anemone.tentacles; i++) {
                const angle = (i / anemone.tentacles) * Math.PI * 1.5 - Math.PI * 0.75;
                const sway = Math.sin(t * 1.2 + anemone.phase + i * 0.5) * 0.3;

                ctx.strokeStyle = anemone.color;
                ctx.lineWidth = 2;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(0, 0);
                const endX = Math.sin(angle + sway) * anemone.size;
                const endY = -anemone.size * 0.8 + Math.cos(sway) * 5;
                ctx.quadraticCurveTo(
                    Math.sin(angle) * anemone.size * 0.3,
                    -anemone.size * 0.3,
                    endX, endY
                );
                ctx.stroke();

                ctx.fillStyle = anemone.color;
                ctx.beginPath();
                ctx.arc(endX, endY, 2.5, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }
    },

    drawSeaweeds(ctx, t) {
        for (const sw of this.seaweeds) {
            ctx.save();
            ctx.strokeStyle = sw.color1;
            ctx.fillStyle = sw.color2;
            ctx.lineWidth = sw.width;
            ctx.lineCap = 'round';

            let sx = sw.baseX;
            let sy = sw.baseY;

            for (let seg = 0; seg < sw.segments; seg++) {
                const ratio = (seg + 1) / sw.segments;
                const swayAngle = Math.sin(t * 0.6 + sw.phase + seg * 0.7) * sw.stiffness * ratio;
                const ex = sx + Math.sin(swayAngle) * sw.segmentLength;
                const ey = sy - sw.segmentLength * 0.7;

                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.quadraticCurveTo(
                    sx + Math.sin(swayAngle * 0.5) * sw.segmentLength * 0.4,
                    sy - sw.segmentLength * 0.3,
                    ex, ey
                );
                ctx.stroke();

                // 叶片
                if (seg > 0 && seg < sw.segments - 1) {
                    const leafX = sx + (ex - sx) * 0.5;
                    const leafY = sy + (ey - sy) * 0.5;
                    const leafAngle = Math.atan2(ey - sy, ex - sx);
                    ctx.save();
                    ctx.translate(leafX, leafY);
                    ctx.rotate(leafAngle + 0.3);
                    ctx.beginPath();
                    ctx.ellipse(sw.width * 1.2, 0, sw.width * 2.5, sw.width * 1.2, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.rotate(-0.6);
                    ctx.beginPath();
                    ctx.ellipse(-sw.width * 1.2, 0, sw.width * 2.5, sw.width * 1.2, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }

                sx = ex;
                sy = ey;
            }

            ctx.restore();
        }
    },

    drawDecorFish(ctx, t) {
        for (const fish of this.decorFish) {
            ctx.save();
            ctx.translate(fish.x, fish.y);
            ctx.rotate(fish.angle);

            ctx.fillStyle = fish.color;
            ctx.globalAlpha = 0.6;

            ctx.beginPath();
            ctx.ellipse(0, 0, fish.size, fish.size * 0.4, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(-fish.size, 0);
            ctx.lineTo(-fish.size * 1.8, -fish.size * 0.5);
            ctx.lineTo(-fish.size * 1.8, fish.size * 0.5);
            ctx.closePath();
            ctx.fill();

            ctx.restore();
        }
    },

    resize(width, height) {
        this.init(width, height);
    }
};
