# Code Refactoring Design — 代码重构

**Date:** 2026-06-14  
**Status:** Draft  
**Priority:** C (最高优先级)

---

## 1. 动机

当前代码存在以下结构性问题：

- **Emoji 映射重复**：`creatureEmojis` 在 `sprites.js`、`interaction.js`、`blindbox.js`、`app.js` 共 4 个文件中各自定义
- **稀有度配置重复**：`rarityNames`、`rarityColors` 在 `interaction.js` 和 `blindbox.js` 中重复
- **无统一常量模块**：颜色、名称、盲盒配置、等级信息散落各处
- **app.js 职责过多**（464行）：混入登录认证、面板管理、图鉴弹窗、签到、时间检测、启动引导
- **tasks.js 过于庞大**（523行）：9种任务类型挤在一个文件
- **main.css 过大**（1159行）：主题变量、布局、组件样式混在一起
- **隐式全局依赖**：所有模块挂 `window` 下，无明确加载顺序约束

---

## 2. 目标

1. 消除重复代码，建立单一数据源
2. 每个 JS 文件不超过 300 行，单一职责
3. 明确模块依赖关系（通过加载顺序保证）
4. **不改变任何运行时行为** — 纯内部结构调整

---

## 3. 新增文件

### 3.1 `js/constants.js` — 公共常量（~50行）

从各处提取并统一管理：

```js
const C = {
    // 生物emoji映射
    CREATURE_EMOJIS: {
        clownfish: '🐠', seahorse: '🦑', starfish: '⭐', jellyfish: '🫧',
        pufferfish: '🐡', turtle: '🐢', octopus: '🐙', stingray: '🦈',
        dolphin: '🐬', whale: '🐋', shark: '🦈', seadragon: '🐲',
        mermaid: '🧜‍♀️', narwhal: '🐳', glow_jellyfish: '✨'
    },

    // 稀有度配置
    RARITY: {
        names: { common: '普通', rare: '稀有', epic: '史诗', legendary: '传说' },
        colors: {
            common: '#9E9E9E', rare: '#4FC3F7',
            epic: '#AB47BC', legendary: '#FFD700'
        }
    },

    // 用户等级
    LEVELS: [
        { min: 0,  title: '探险新手', title_en: 'Explorer Newbie', emoji: '🐠' },
        { min: 5,  title: '见习水手', title_en: 'Junior Sailor',     emoji: '⚓' },
        { min: 12, title: '海洋探险家', title_en: 'Ocean Explorer',   emoji: '🐬' },
        { min: 22, title: '深海冒险家', title_en: 'Deep Sea Adventurer', emoji: '🦈' },
        { min: 35, title: '海洋大师', title_en: 'Ocean Master',      emoji: '🐋' },
        { min: 50, title: '海洋传说', title_en: 'Ocean Legend',      emoji: '🧜' }
    ],

    // 盲盒配置
    BOX_CONFIG: {
        normal:    { cost_shells: 50,  cost_pearls: 0, weights: [60, 25, 10, 5] },
        rare:      { cost_shells: 200, cost_pearls: 0, weights: [10, 50, 30, 10] },
        legendary: { cost_shells: 0,   cost_pearls: 5, weights: [0, 0, 60, 40] }
    },

    // 时间段信息
    TIME_PERIODS: {
        dawn:  { greeting: 'Good Morning!',   sub: '晨间学习', emoji: '🌅', desc: '一日之计在于晨' },
        day:   { greeting: 'Good Afternoon!', sub: '日间学习', emoji: '☀️', desc: '阳光正好' },
        dusk:  { greeting: 'Good Evening!',   sub: '傍晚学习', emoji: '🌇', desc: '温故而知新' },
        night: { greeting: 'Good Night!',     sub: '夜间学习', emoji: '🌟', desc: '夜深人静' }
    }
};
```

### 3.2 `js/auth.js` — 登录认证（~100行）

从 `app.js` 拆出，职责：
- `Auth.sendCode()` — 发送验证码
- `Auth.login()` — 登录
- `Auth.logout()` — 登出
- `Auth.countdown` / `Auth.timer` — 倒计时状态

依赖：`API`、`State`、`App.onLoginSuccess`

### 3.3 `js/collection.js` — 海洋图鉴（~60行）

从 `app.js` 拆出，职责：
- `Collection.show()` — 打开图鉴弹窗
- `Collection.close()` — 关闭图鉴弹窗
- `Collection._render(data)` — 渲染图鉴内容

依赖：`API`、`C`（常量）

---

## 4. 拆分旧文件

### 4.1 `tasks.js`（523行）→ 1个路由 + 4个模块

#### `js/tasks-router.js`（~80行）
- `Tasks.loadTasksForCategory(category)`
- `Tasks.renderTaskList(tasks)`
- `Tasks.openTask(taskId)` — 根据 `task.type` 分发到各模块
- `Tasks.completeTask(task)` — 统一的完成回调
- `Tasks.showModal(html)` / `Tasks.closeModal()` — 弹窗工具
- `Tasks.getDailyItems(arr, count)` — 每日选题工具

#### `js/tasks-vocab.js`（~180行）
- `TasksVocab.showVocabulary(task)` — 单词回顾
- `TasksVocab.showFlashcard(task)` — 极速闪卡
- `TasksVocab.showSpelling(task)` — 拼写挑战
- `TasksVocab._bindVocabNav(...)` — 内部辅助

#### `js/tasks-listening.js`（~130行）
- `TasksListening.showMiniListening(task)` — 迷你听力
- `TasksListening.showListeningComp(task)` — 听力理解

#### `js/tasks-speaking.js`（~100行）
- `TasksSpeaking.showReading(task)` — 朗读练习
- `TasksSpeaking.showTranslation(task)` — 翻译练习

#### `js/tasks-meta.js`（~70行）
- `TasksMeta.showCheckin(task)` — 签到
- `TasksMeta.showSummary(task)` — 今日复盘

### 4.2 `app.js`（464行 → ~200行）

拆出 Auth 和 Collection 后，剩余职责：
- `App.init()` — 启动引导
- `App.getTimePeriod()` / `detectTimePeriod()` / `updateGreeting()` — 时间管理
- `App.showLogin()` / `hideLogin()` / `onLoginSuccess()` — 登录UI状态
- `App.toggleProfilePopup()` / `closeProfilePopup()` — 个人面板
- `App.togglePracticeMenu()` / `closePracticeMenu()` — 练习子菜单
- `App.openPanel(type, category)` / `closePanel()` — 面板路由
- `App.renderPracticePanel(body, activeCategory)` — 练习面板渲染
- `App.quickCheckin()` — 快捷签到

---

## 5. 修改的旧文件

### `sprites.js`
- 删除 `creatureEmojis` 对象
- `draw()` 中改为引用 `C.CREATURE_EMOJIS`
- `drawFallback()` 同理

### `interaction.js`
- 删除 `creatureEmojis`、`rarityNames`、`rarityColors` 本地定义
- 改用 `C.CREATURE_EMOJIS`、`C.RARITY.names`、`C.RARITY.colors`

### `blindbox.js`
- 删除 `creatureEmojis` 本地定义
- 删除 `rarityNames` 本地定义
- 改用 `C` 常量

### `app.js`
- 删除 `creatureEmojis`、`rarityNames` 本地定义
- 删除 `TIME_PERIODS` 内联对象（在 `getTimeInfo()` 中），改用 `C.TIME_PERIODS`
- 删除 `box_config` 内联对象（在 `app.py` 中也有重复），前端改用 `C.BOX_CONFIG`
- `LEVELS` 移到 `C`，`app.py` 保持不变（后端独立）

### `index.html`
- `<script>` 标签按依赖顺序重排（constants 最先，app 最后）
- 新增的 JS 文件按需引入

---

## 6. 不修改的文件

| 文件 | 原因 |
|------|------|
| `api.js` | 职责单一，API 封装 |
| `state.js` | 职责单一，状态管理 |
| `sprites.js` | 只改常量引用 |
| `swim-ai.js` | 职责单一，游动算法 |
| `environment.js` | 职责单一，装饰绘制 |
| `lighting.js` | 职责单一，光照系统 |
| `particles.js` | 职责单一，粒子系统 |
| `aquarium.js` | 水族馆主控，职责清晰 |
| `app.py` | 后端，本次不改 |
| 所有 CSS 文件 | CSS 重构留到后续 |

---

## 7. 验证标准

- [ ] 所有页面正常加载，无 JS 报错
- [ ] 登录/登出流程正常
- [ ] 9种任务类型全部可打开、可完成
- [ ] 盲盒抽取正常（3种类型）
- [ ] 水族馆生物正常显示和游动
- [ ] 图鉴正常展示和关闭
- [ ] 签到和快捷签到正常
- [ ] 个人信息弹窗正常
- [ ] 时间段切换正常
- [ ] 每个 JS 文件不超过 300 行

---

## 8. HTML 加载顺序

```html
<!-- 1. 常量 — 无依赖 -->
<script src="/js/constants.js"></script>

<!-- 2. 基础模块 — 只依赖常量 -->
<script src="/js/api.js"></script>
<script src="/js/state.js"></script>

<!-- 3. 任务模块 — 依赖 API、State -->
<script src="/js/tasks-router.js"></script>
<script src="/js/tasks-vocab.js"></script>
<script src="/js/tasks-listening.js"></script>
<script src="/js/tasks-speaking.js"></script>
<script src="/js/tasks-meta.js"></script>

<!-- 4. 水族馆子模块 — 独立 -->
<script src="/js/sprites.js"></script>
<script src="/js/swim-ai.js"></script>
<script src="/js/environment.js"></script>
<script src="/js/lighting.js"></script>
<script src="/js/particles.js"></script>
<script src="/js/interaction.js"></script>
<script src="/js/aquarium.js"></script>

<!-- 5. 面板模块 -->
<script src="/js/blindbox.js"></script>

<!-- 6. 主控制器 — 依赖以上所有 -->
<script src="/js/auth.js"></script>
<script src="/js/collection.js"></script>
<script src="/js/app.js"></script>
```
