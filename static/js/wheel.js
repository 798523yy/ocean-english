// wheel.js - 大转盘抽奖模块
const Wheel = {
	canvas: null,
	ctx: null,
	spinning: false,
	currentAngle: 0,
	animFrame: null,

	// 稀有度对应扇区颜色
	RARITY_COLOR: {
		common:    '#7CB342',  // 绿色
		rare:      '#42A5F5',  // 蓝色
		epic:      '#AB47BC',  // 紫色
		legendary: '#FFD700',  // 金色
		shells:    '#FF8C42',  // 橙色
		pearls:    '#E040FB',  // 粉紫
	},

	// 转盘内容配置：每个等级8个格子，混合生物+贝壳+珍珠
	// 生物格子指定具体 creature_id，抽中即得该生物
	segments: {
		normal: [
			{ type: 'creature', creature_id: 'clownfish',  rarity: 'common',    emoji: '🐠', label: '小丑鱼',   },
			{ type: 'creature', creature_id: 'seahorse',   rarity: 'common',    emoji: '🦑', label: '海马',     },
			{ type: 'creature', creature_id: 'starfish',   rarity: 'common',    emoji: '⭐', label: '海星',     },
			{ type: 'creature', creature_id: 'pufferfish', rarity: 'common',    emoji: '🐡', label: '河豚',     },
			{ type: 'creature', creature_id: 'turtle',     rarity: 'rare',      emoji: '🐢', label: '海龟',     },
			{ type: 'shells',   amount: 15,                rarity: 'shells',    emoji: '🐚', label: '贝壳×15',  },
			{ type: 'shells',   amount: 25,                rarity: 'shells',    emoji: '🐚', label: '贝壳×25',  },
			{ type: 'pearls',   amount: 1,                 rarity: 'pearls',    emoji: '🦪', label: '珍珠×1',   },
		],
		rare: [
			{ type: 'creature', creature_id: 'octopus',    rarity: 'rare',      emoji: '🐙', label: '章鱼',     },
			{ type: 'creature', creature_id: 'turtle',     rarity: 'rare',      emoji: '🐢', label: '海龟',     },
			{ type: 'creature', creature_id: 'stingray',   rarity: 'rare',      emoji: '🦈', label: '鳐鱼',     },
			{ type: 'creature', creature_id: 'dolphin',    rarity: 'rare',      emoji: '🐬', label: '海豚',     },
			{ type: 'creature', creature_id: 'jellyfish',  rarity: 'common',    emoji: '🫧', label: '水母',     },
			{ type: 'shells',   amount: 40,                rarity: 'shells',    emoji: '🐚', label: '贝壳×40',  },
			{ type: 'shells',   amount: 60,                rarity: 'shells',    emoji: '🐚', label: '贝壳×60',  },
			{ type: 'pearls',   amount: 3,                 rarity: 'pearls',    emoji: '🦪', label: '珍珠×3',   },
		],
		legendary: [
			{ type: 'creature', creature_id: 'shark',          rarity: 'epic',      emoji: '🦈', label: '鲨鱼',       },
			{ type: 'creature', creature_id: 'whale',          rarity: 'epic',      emoji: '🐋', label: '鲸鱼',       },
			{ type: 'creature', creature_id: 'seadragon',      rarity: 'epic',      emoji: '🐲', label: '海龙',       },
			{ type: 'creature', creature_id: 'mermaid',        rarity: 'legendary', emoji: '🧜‍♀️', label: '美人鱼',     },
			{ type: 'creature', creature_id: 'narwhal',        rarity: 'legendary', emoji: '🐳', label: '独角鲸',     },
			{ type: 'creature', creature_id: 'glow_jellyfish', rarity: 'legendary', emoji: '✨', label: '发光水母',   },
			{ type: 'shells',   amount: 120,                   rarity: 'shells',    emoji: '🐚', label: '贝壳×120',  },
			{ type: 'pearls',   amount: 5,                     rarity: 'pearls',    emoji: '🦪', label: '珍珠×5',    },
		]
	},

	// 节日活动期间传说转盘多一格传说生物
	festivalLegendarySegments: [
		{ type: 'creature', creature_id: 'mermaid',        rarity: 'legendary', emoji: '🧜‍♀️', label: '美人鱼',     },
		{ type: 'creature', creature_id: 'narwhal',        rarity: 'legendary', emoji: '🐳', label: '独角鲸',     },
		{ type: 'creature', creature_id: 'glow_jellyfish', rarity: 'legendary', emoji: '✨', label: '发光水母',   },
		{ type: 'creature', creature_id: 'seadragon',      rarity: 'epic',      emoji: '👑', label: '海龙',       },
		{ type: 'creature', creature_id: 'shark',          rarity: 'epic',      emoji: '🦈', label: '鲨鱼',       },
		{ type: 'creature', creature_id: 'whale',          rarity: 'epic',      emoji: '🐋', label: '鲸鱼',       },
		{ type: 'shells',   amount: 150,                   rarity: 'shells',    emoji: '🐚', label: '贝壳×150',  },
		{ type: 'pearls',   amount: 8,                     rarity: 'pearls',    emoji: '🦪', label: '珍珠×8',    },
	],

	init(canvasId) {
		this.canvas = document.getElementById(canvasId);
		if (!this.canvas) return;
		this.ctx = this.canvas.getContext('2d');
		const size = Math.min(340, window.innerWidth - 40);
		this.canvas.width = size;
		this.canvas.height = size;
	},

	getSegments(boxType, isFestival) {
		if (boxType === 'legendary' && isFestival) {
			return this.festivalLegendarySegments;
		}
		return this.segments[boxType] || this.segments.normal;
	},

	draw(boxType, isFestival) {
		if (!this.ctx) return;
		const ctx = this.ctx;
		const w = this.canvas.width;
		const h = this.canvas.height;
		const cx = w / 2;
		const cy = h / 2;
		const radius = w / 2 - 8;
		const segs = this.getSegments(boxType, isFestival);
		const numSegs = segs.length;
		const arcSize = (Math.PI * 2) / numSegs;

		ctx.clearRect(0, 0, w, h);

		// 外圈阴影
		ctx.save();
		ctx.shadowColor = 'rgba(0,0,0,0.5)';
		ctx.shadowBlur = 20;
		ctx.beginPath();
		ctx.arc(cx, cy, radius + 6, 0, Math.PI * 2);
		ctx.fillStyle = '#1a1a2e';
		ctx.fill();
		ctx.restore();

		// 绘制每个扇区
		for (let i = 0; i < numSegs; i++) {
			const startAngle = this.currentAngle + i * arcSize - Math.PI / 2;
			const endAngle = startAngle + arcSize;

			// 扇区填充 - 按稀有度上色
			const segColor = this.RARITY_COLOR[segs[i].rarity] || '#666';
			ctx.beginPath();
			ctx.moveTo(cx, cy);
			ctx.arc(cx, cy, radius, startAngle, endAngle);
			ctx.closePath();
			ctx.fillStyle = segColor;
			ctx.fill();

			// 扇区边框 - 细线分隔
			ctx.strokeStyle = 'rgba(255,255,255,0.35)';
			ctx.lineWidth = 1;
			ctx.stroke();

			// emoji + 文字同一行
			ctx.save();
			ctx.translate(cx, cy);
			ctx.rotate(startAngle + arcSize / 2);
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';

			ctx.shadowColor = 'rgba(0,0,0,0.7)';
			ctx.shadowBlur = 3;
			ctx.font = `${Math.round(radius * 0.095)}px "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif`;
			ctx.fillStyle = '#FFFFFF';
			ctx.fillText(`${segs[i].emoji} ${segs[i].label}`, radius * 0.52, 0);

			ctx.restore();
		}

		// 中心圆
		ctx.beginPath();
		ctx.arc(cx, cy, radius * 0.18, 0, Math.PI * 2);
		const centerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 0.18);
		centerGrad.addColorStop(0, '#FFF');
		centerGrad.addColorStop(1, '#E0E0E0');
		ctx.fillStyle = centerGrad;
		ctx.fill();
		ctx.strokeStyle = 'rgba(0,0,0,0.2)';
		ctx.lineWidth = 2;
		ctx.stroke();

		// 中心文字
		ctx.font = `bold ${Math.round(radius * 0.14)}px "PingFang SC", "Microsoft YaHei", sans-serif`;
		ctx.fillStyle = '#1a1a2e';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText('抽奖', cx, cy);

		// 指针（红色倒三角，向下指向扇形格子内部）
		ctx.save();
		ctx.beginPath();
		ctx.moveTo(cx, cy - radius + 14);     // 尖端，深入格子内部
		ctx.lineTo(cx - 14, cy - radius - 10);
		ctx.lineTo(cx + 14, cy - radius - 10);
		ctx.closePath();
		ctx.fillStyle = '#FF1744';
		ctx.fill();
		ctx.strokeStyle = 'rgba(255,255,255,0.6)';
		ctx.lineWidth = 2;
		ctx.stroke();
		ctx.restore();

		// 外圈装饰环
		ctx.beginPath();
		ctx.arc(cx, cy, radius + 2, 0, Math.PI * 2);
		ctx.strokeStyle = 'rgba(255,255,255,0.3)';
		ctx.lineWidth = 3;
		ctx.stroke();
	},

	spin(boxType, isFestival, callback) {
		if (this.spinning) return;
		this.spinning = true;

		const segs = this.getSegments(boxType, isFestival);
		const numSegs = segs.length;
		const arcSize = (Math.PI * 2) / numSegs;

		// 随机选一个目标格子
		const targetIdx = Math.floor(Math.random() * numSegs);
		const targetSegment = segs[targetIdx];

		// 指针在顶部（-PI/2），目标格子中心要对齐到顶部
		const targetAngle = -(targetIdx * arcSize + arcSize / 2);
		// 从当前角度转到目标角度，加上整数圈确保多转
		const fullSpins = (5 + Math.floor(Math.random() * 4)) * Math.PI * 2;
		const totalRotation = targetAngle - this.currentAngle + fullSpins;

		const startAngle = this.currentAngle;
		const startTime = performance.now();
		const duration = 4000 + Math.random() * 1000;
		let lastTickSeg = Math.floor(((this.currentAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / arcSize);

		const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

		const animate = (now) => {
			const elapsed = now - startTime;
			const progress = Math.min(elapsed / duration, 1);
			const easedProgress = easeOutCubic(progress);



			this.currentAngle = startAngle + totalRotation * easedProgress;

			// Tick sound when crossing segment boundary
			const normAngle = ((this.currentAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
			const curSeg = Math.floor(normAngle / arcSize);
			if (curSeg !== lastTickSeg && typeof Sound !== 'undefined') {
				Sound.playWheelTick();
				lastTickSeg = curSeg;
			}

			this.draw(boxType, isFestival);

			if (progress < 1) {
				this.animFrame = requestAnimationFrame(animate);
			} else {
				// 最终角度精确锁定目标格子正中心（绝不卡缝）
				this.currentAngle = targetAngle;
				this.draw(boxType, isFestival);
				this.spinning = false;
				if (callback) callback(targetSegment, targetIdx);
			}
		};

		this.animFrame = requestAnimationFrame(animate);
	}
};
