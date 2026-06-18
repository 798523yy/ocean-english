// sound.js - Web Audio API 音效管理器
const Sound = {
	ctx: null,
	masterGain: null,
	musicNodes: [],
	musicPlaying: false,
	currentPeriod: null,
	ambientNodes: [],
	weatherNodes: [],
	_muted: false,
	_volume: 0.6,

	// ==========================================
	// 初始化
	// ==========================================

	init() {
		// AudioContext 懒初始化——首次用户交互时创建
		const resumeCtx = () => {
			if (this.ctx && this.ctx.state === 'suspended') {
				this.ctx.resume();
			}
		};
		document.addEventListener('click', resumeCtx, { once: false });
		document.addEventListener('touchstart', resumeCtx, { once: false });
	},

	ensureCtx() {
		if (this.ctx) return true;
		try {
			this.ctx = new (window.AudioContext || window.webkitAudioContext)();
			this.masterGain = this.ctx.createGain();
			this.masterGain.gain.value = this._muted ? 0 : this._volume;
			this.masterGain.connect(this.ctx.destination);
			return true;
		} catch (e) {
			console.warn('Web Audio API 不可用');
			return false;
		}
	},

	// ==========================================
	// 音量控制
	// ==========================================

	setMasterVolume(v) {
		this._volume = Math.max(0, Math.min(1, v));
		if (this.masterGain && !this._muted) {
			this.masterGain.gain.setTargetAtTime(this._volume, this.ctx.currentTime, 0.1);
		}
	},

	mute() {
		this._muted = true;
		if (this.masterGain) {
			this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
		}
	},

	unmute() {
		this._muted = false;
		if (this.masterGain) {
			this.masterGain.gain.setTargetAtTime(this._volume, this.ctx.currentTime, 0.1);
		}
	},

	// ==========================================
	// 工具：创建简单音调
	// ==========================================

	_tone(freq, type, duration, startTime, volume = 0.15) {
		if (!this.ensureCtx()) return null;
		const t = startTime || this.ctx.currentTime;
		const osc = this.ctx.createOscillator();
		const gain = this.ctx.createGain();
		osc.type = type || 'sine';
		osc.frequency.value = freq;
		gain.gain.setValueAtTime(0, t);
		gain.gain.linearRampToValueAtTime(volume, t + 0.005);
		gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
		osc.connect(gain);
		gain.connect(this.masterGain);
		osc.start(t);
		osc.stop(t + duration + 0.01);
		return { osc, gain };
	},

	_toneRamp(freqStart, freqEnd, type, duration, startTime, volume = 0.12) {
		if (!this.ensureCtx()) return null;
		const t = startTime || this.ctx.currentTime;
		const osc = this.ctx.createOscillator();
		const gain = this.ctx.createGain();
		osc.type = type || 'sine';
		osc.frequency.setValueAtTime(freqStart, t);
		osc.frequency.linearRampToValueAtTime(freqEnd, t + duration);
		gain.gain.setValueAtTime(0, t);
		gain.gain.linearRampToValueAtTime(volume, t + 0.01);
		gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
		osc.connect(gain);
		gain.connect(this.masterGain);
		osc.start(t);
		osc.stop(t + duration + 0.01);
		return { osc, gain };
	},

	_noise(duration, startTime, volume = 0.08) {
		if (!this.ensureCtx()) return null;
		const t = startTime || this.ctx.currentTime;
		const bufferSize = this.ctx.sampleRate * duration;
		const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
		const data = buffer.getChannelData(0);
		for (let i = 0; i < bufferSize; i++) {
			data[i] = Math.random() * 2 - 1;
		}
		const source = this.ctx.createBufferSource();
		source.buffer = buffer;
		const gain = this.ctx.createGain();
		gain.gain.setValueAtTime(volume, t);
		source.connect(gain);
		gain.connect(this.masterGain);
		source.start(t);
		source.stop(t + duration);
		return { source, gain };
	},

	_filteredNoise(lowFreq, highFreq, duration, startTime, volume = 0.06) {
		if (!this.ensureCtx()) return null;
		const t = startTime || this.ctx.currentTime;
		const bufferSize = this.ctx.sampleRate * Math.max(duration, 0.1);
		const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
		const data = buffer.getChannelData(0);
		for (let i = 0; i < bufferSize; i++) {
			data[i] = Math.random() * 2 - 1;
		}
		const source = this.ctx.createBufferSource();
		source.buffer = buffer;
		const bandpass = this.ctx.createBiquadFilter();
		bandpass.type = 'bandpass';
		bandpass.frequency.value = (lowFreq + highFreq) / 2;
		bandpass.Q.value = (lowFreq + highFreq) / 2 / (highFreq - lowFreq) * 1.5;
		const gain = this.ctx.createGain();
		gain.gain.setValueAtTime(volume, t);
		source.connect(bandpass);
		bandpass.connect(gain);
		gain.connect(this.masterGain);
		source.start(t);
		source.stop(t + duration);
		return { source, bandpass, gain };
	},

	// ==========================================
	// Task 2: UI 基础音效
	// ==========================================

	playClick() {
		this._toneRamp(800, 600, 'sine', 0.08, null, 0.08);
	},

	playModalOpen() {
		if (!this.ensureCtx()) return;
		const t = this.ctx.currentTime;
		this._toneRamp(300, 600, 'sine', 0.15, t, 0.06);
		// 加一点气声
		const bufSize = this.ctx.sampleRate * 0.12;
		const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
		const d = buf.getChannelData(0);
		for (let i = 0; i < bufSize; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
		const src = this.ctx.createBufferSource();
		src.buffer = buf;
		const hp = this.ctx.createBiquadFilter();
		hp.type = 'highpass';
		hp.frequency.value = 1500;
		const g = this.ctx.createGain();
		g.gain.setValueAtTime(0.03, t);
		src.connect(hp);
		hp.connect(g);
		g.connect(this.masterGain);
		src.start(t);
		src.stop(t + 0.12);
	},

	playModalClose() {
		this._toneRamp(600, 300, 'sine', 0.12, null, 0.05);
	},

	playSuccess() {
		if (!this.ensureCtx()) return;
		const t = this.ctx.currentTime;
		this._tone(523, 'triangle', 0.15, t, 0.1);
		this._tone(659, 'triangle', 0.15, t + 0.08, 0.1);
	},

	playError() {
		if (!this.ensureCtx()) return;
		const t = this.ctx.currentTime;
		this._tone(200, 'triangle', 0.2, t, 0.08);
		this._tone(180, 'triangle', 0.2, t + 0.06, 0.06);
	},

	playReward() {
		if (!this.ensureCtx()) return;
		const t = this.ctx.currentTime;
		this._tone(523, 'sine', 0.12, t, 0.1);
		this._tone(659, 'sine', 0.12, t + 0.1, 0.1);
		this._tone(784, 'sine', 0.15, t + 0.2, 0.1);
	},

	// ==========================================
	// Task 3: 特殊庆祝音效
	// ==========================================

	playCheckin() {
		if (!this.ensureCtx()) return;
		const t = this.ctx.currentTime;
		const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
		notes.forEach((freq, i) => {
			this._tone(freq, 'sine', 0.15, t + i * 0.1, 0.12);
		});
	},

	playLevelUp() {
		if (!this.ensureCtx()) return;
		const t = this.ctx.currentTime;
		const scale = [523, 587, 659, 698, 784, 880, 988, 1047]; // C Major
		scale.forEach((freq, i) => {
			this._tone(freq, 'sine', 0.12, t + i * 0.06, 0.1);
		});
		// 末尾加亮光
		setTimeout(() => {
			if (!this.ensureCtx()) return;
			const now = this.ctx.currentTime;
			this._tone(1319, 'triangle', 0.3, now, 0.08);
			this._tone(1568, 'triangle', 0.3, now + 0.04, 0.06);
		}, 500);
	},

	playTaskComplete() {
		if (!this.ensureCtx()) return;
		const t = this.ctx.currentTime;
		this._tone(587, 'triangle', 0.15, t, 0.1);
		this._tone(784, 'triangle', 0.2, t + 0.1, 0.1);
	},

	playLegendary() {
		if (!this.ensureCtx()) return;
		const t = this.ctx.currentTime;
		// 低音钟声
		this._tone(262, 'sine', 0.8, t, 0.12);
		// 和弦
		this._tone(523, 'sine', 0.6, t + 0.1, 0.08);
		this._tone(659, 'sine', 0.6, t + 0.12, 0.08);
		this._tone(784, 'sine', 0.7, t + 0.14, 0.08);
		// 高音余韵
		this._tone(1047, 'triangle', 0.5, t + 0.4, 0.05);
		this._tone(1319, 'triangle', 0.4, t + 0.45, 0.04);
	},

	// ==========================================
	// Task 4: 转盘音效
	// ==========================================

	playWheelStart() {
		if (!this.ensureCtx()) return;
		this._toneRamp(400, 800, 'sine', 0.2, null, 0.07);
	},

	playWheelTick() {
		if (!this.ensureCtx()) return;
		this._tone(1200, 'sine', 0.03, null, 0.05);
	},

	playWheelStop() {
		if (!this.ensureCtx()) return;
		const t = this.ctx.currentTime;
		this._tone(250, 'sine', 0.3, t, 0.1);
		this._tone(200, 'triangle', 0.4, t + 0.1, 0.06);
	},

	// ==========================================
	// Task 5: 水下环境音
	// ==========================================

	startAmbient() {
		if (!this.ensureCtx()) return;
		this.stopAmbient();

		// 水流底噪：持续低通白噪声
		this._startWaterDrone();

		// 气泡音：随机间隔触发
		this._scheduleBubble();
	},

	stopAmbient() {
		if (this.ambientNodes.length > 0) {
			this.ambientNodes.forEach(n => {
				try { n.stop(); } catch (e) { /* already stopped */ }
			});
			this.ambientNodes = [];
		}
		if (this._bubbleTimer) {
			clearTimeout(this._bubbleTimer);
			this._bubbleTimer = null;
		}
	},

	_startWaterDrone() {
		if (!this.ctx) return;
		// 创建持续的白噪声水流声
		const bufferSize = this.ctx.sampleRate * 2; // 2 秒循环
		const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
		const data = buffer.getChannelData(0);
		for (let i = 0; i < bufferSize; i++) {
			data[i] = Math.random() * 2 - 1;
		}
		const source = this.ctx.createBufferSource();
		source.buffer = buffer;
		source.loop = true;
		const lowpass = this.ctx.createBiquadFilter();
		lowpass.type = 'lowpass';
		lowpass.frequency.value = 300;
		lowpass.Q.value = 0.5;
		const gain = this.ctx.createGain();
		gain.gain.value = 0.015; // 极低音量
		source.connect(lowpass);
		lowpass.connect(gain);
		gain.connect(this.masterGain);
		source.start();
		this.ambientNodes.push(source);

		// 缓慢调制滤波器频率模拟水流变化
		const modInterval = setInterval(() => {
			if (!this.ctx || this.ambientNodes.indexOf(source) === -1) {
				clearInterval(modInterval);
				return;
			}
			lowpass.frequency.setTargetAtTime(
				200 + Math.random() * 200,
				this.ctx.currentTime,
				2
			);
		}, 3000);
	},

	_scheduleBubble() {
		const delay = 800 + Math.random() * 4000;
		this._bubbleTimer = setTimeout(() => {
			this.playBubble();
			this._scheduleBubble();
		}, delay);
	},

	playBubble() {
		if (!this.ensureCtx() || this.masterGain.gain.value < 0.001) return;
		const t = this.ctx.currentTime;
		const freq = 500 + Math.random() * 600;
		const dur = 0.08 + Math.random() * 0.15;
		const vol = 0.02 + Math.random() * 0.04;

		const bufferSize = this.ctx.sampleRate * dur;
		const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
		const data = buffer.getChannelData(0);
		for (let i = 0; i < bufferSize; i++) {
			data[i] = Math.random() * 2 - 1;
		}
		const source = this.ctx.createBufferSource();
		source.buffer = buffer;
		const bandpass = this.ctx.createBiquadFilter();
		bandpass.type = 'bandpass';
		bandpass.frequency.value = freq;
		bandpass.Q.value = 2;
		const gain = this.ctx.createGain();
		gain.gain.setValueAtTime(0, t);
		gain.gain.linearRampToValueAtTime(vol, t + 0.01);
		gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
		source.connect(bandpass);
		bandpass.connect(gain);
		gain.connect(this.masterGain);
		source.start(t);
		source.stop(t + dur);
	},

	// ==========================================
	// Task 6: 天气音效
	// ==========================================

	setWeather(weather) {
		this._clearWeather();
		if (weather === 'rainy') {
			this._startRain(0.02);
		} else if (weather === 'stormy') {
			this._startRain(0.04);
			this._scheduleThunder();
		} else if (weather === 'cloudy') {
			this._startWind(0.01);
		}
		// sunny: 无额外天气音，只有默认水下环境
	},

	_clearWeather() {
		if (this.weatherNodes.length > 0) {
			this.weatherNodes.forEach(n => {
				try { n.stop(); } catch (e) {}
			});
			this.weatherNodes = [];
		}
		if (this._thunderTimer) {
			clearTimeout(this._thunderTimer);
			this._thunderTimer = null;
		}
	},

	_startRain(volume) {
		if (!this.ctx) return;
		// 持续雨声: 白噪声 + lowpass 2000Hz
		const bufferSize = this.ctx.sampleRate * 1;
		const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
		const data = buffer.getChannelData(0);
		for (let i = 0; i < bufferSize; i++) {
			data[i] = Math.random() * 2 - 1;
		}
		const source = this.ctx.createBufferSource();
		source.buffer = buffer;
		source.loop = true;
		const lowpass = this.ctx.createBiquadFilter();
		lowpass.type = 'lowpass';
		lowpass.frequency.value = 2000;
		const gain = this.ctx.createGain();
		gain.gain.value = volume;
		source.connect(lowpass);
		lowpass.connect(gain);
		gain.connect(this.masterGain);
		source.start();
		this.weatherNodes.push(source);

		// 随机波动
		const modInterval = setInterval(() => {
			if (!this.ctx || this.weatherNodes.indexOf(source) === -1) {
				clearInterval(modInterval);
				return;
			}
			gain.gain.setTargetAtTime(volume * (0.7 + Math.random() * 0.6), this.ctx.currentTime, 0.5);
		}, 800);
	},

	_startWind(volume) {
		if (!this.ctx) return;
		const bufferSize = this.ctx.sampleRate * 2;
		const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
		const data = buffer.getChannelData(0);
		for (let i = 0; i < bufferSize; i++) {
			data[i] = Math.random() * 2 - 1;
		}
		const source = this.ctx.createBufferSource();
		source.buffer = buffer;
		source.loop = true;
		const lowpass = this.ctx.createBiquadFilter();
		lowpass.type = 'lowpass';
		lowpass.frequency.value = 100;
		const gain = this.ctx.createGain();
		gain.gain.value = volume;
		source.connect(lowpass);
		lowpass.connect(gain);
		gain.connect(this.masterGain);
		source.start();
		this.weatherNodes.push(source);
	},

	_scheduleThunder() {
		const delay = 3000 + Math.random() * 8000;
		this._thunderTimer = setTimeout(() => {
			this.playThunder();
			this._scheduleThunder();
		}, delay);
	},

	playThunder() {
		if (!this.ensureCtx()) return;
		const t = this.ctx.currentTime;
		const dur = 1.5 + Math.random() * 1.5;
		const bufferSize = this.ctx.sampleRate * dur;
		const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
		const data = buffer.getChannelData(0);
		// 棕噪声近似
		let last = 0;
		for (let i = 0; i < bufferSize; i++) {
			last = (last + (Math.random() * 2 - 1) * 0.02) / 1.01;
			data[i] = last * 3;
		}
		const source = this.ctx.createBufferSource();
		source.buffer = buffer;
		const lowpass = this.ctx.createBiquadFilter();
		lowpass.type = 'lowpass';
		lowpass.frequency.value = 150;
		const gain = this.ctx.createGain();
		gain.gain.setValueAtTime(0, t);
		gain.gain.linearRampToValueAtTime(0.15, t + 0.2);
		gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
		source.connect(lowpass);
		lowpass.connect(gain);
		gain.connect(this.masterGain);
		source.start(t);
		source.stop(t + dur);
	},

	// ==========================================
	// Task 7: 背景音乐（时段氛围 Pad）
	// ==========================================

	startMusic(period) {
		if (!this.ensureCtx()) return;
		this.stopMusic();
		this.currentPeriod = period;

		const chords = {
			dawn:  { notes: [262, 330, 392], vol: 0.025 },  // C4 E4 G4
			day:   { notes: [175, 220, 262], vol: 0.03 },  // F3 A3 C4
			dusk:  { notes: [147, 175, 220], vol: 0.025 }, // D3 F3 A3
			night: { notes: [110, 131, 165], vol: 0.02 },  // A2 C3 E3
		};

		const chord = chords[period] || chords.night;
		const now = this.ctx.currentTime;

		chord.notes.forEach((freq) => {
			// 每个音符用 2 个轻微 detuned 振荡器
			for (let d = 0; d < 2; d++) {
				const osc = this.ctx.createOscillator();
				const detune = d === 0 ? 0 : (Math.random() > 0.5 ? 1 : -1) * (3 + Math.random() * 7);
				osc.type = 'sine';
				osc.frequency.value = freq;
				osc.detune.value = detune;

				const lfo = this.ctx.createOscillator();
				lfo.type = 'sine';
				lfo.frequency.value = 0.08 + Math.random() * 0.12; // 慢速 LFO
				const lfoGain = this.ctx.createGain();
				lfoGain.gain.value = 0.015;
				lfo.connect(lfoGain);
				lfoGain.connect(osc.frequency);

				const lowpass = this.ctx.createBiquadFilter();
				lowpass.type = 'lowpass';
				lowpass.frequency.value = 600;

				const gain = this.ctx.createGain();
				gain.gain.setValueAtTime(0, now);
				gain.gain.linearRampToValueAtTime(chord.vol / 2, now + 2);
				gain.gain.linearRampToValueAtTime(chord.vol / 2 * (0.85 + Math.random() * 0.3), now + 4);

				osc.connect(lowpass);
				lowpass.connect(gain);
				gain.connect(this.masterGain);

				osc.start(now);
				lfo.start(now);

				this.musicNodes.push({ osc, lfo, lowpass, gain });
			}
		});

		this.musicPlaying = true;
	},

	stopMusic() {
		if (this.musicNodes.length > 0) {
			const now = this.ctx ? this.ctx.currentTime : 0;
			this.musicNodes.forEach(n => {
				try {
					n.gain.gain.cancelScheduledValues(now);
					n.gain.gain.setValueAtTime(n.gain.gain.value, now);
					n.gain.gain.linearRampToValueAtTime(0, now + 1);
					setTimeout(() => {
						try { n.osc.stop(); n.lfo.stop(); } catch (e) {}
					}, 1200);
				} catch (e) {}
			});
			this.musicNodes = [];
		}
		this.musicPlaying = false;
	},

	updateMusic(period) {
		if (period === this.currentPeriod && this.musicPlaying) return;
		this.stopMusic();
		if (period) this.startMusic(period);
	}
};

// 页面加载时初始化（绑定交互事件）
if (typeof document !== 'undefined') {
	Sound.init();

	// 全局按钮点击音效（捕获阶段，确保所有按钮都触发）
	document.addEventListener('click', (e) => {
		const target = e.target.closest('button, .action-fab, .practice-fab, .blindbox-action, .checkin-action, .friends-action, .btn-login, .btn-send-code, .btn-primary, .btn-secondary, .btn-redeem, .btn-settings, .btn-logout');
		if (target) Sound.playClick();
	}, true);
}
