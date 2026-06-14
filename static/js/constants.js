// constants.js - 全局常量，单一数据源
const C = {
    // 海洋生物 emoji 映射
    CREATURE_EMOJIS: {
        clownfish: '🐠', seahorse: '🦑', starfish: '⭐', jellyfish: '🫧',
        pufferfish: '🐡', turtle: '🐢', octopus: '🐙', stingray: '🦈',
        dolphin: '🐬', whale: '🐋', shark: '🦈', seadragon: '🐲',
        mermaid: '🧜‍♀️', narwhal: '🐳', glow_jellyfish: '✨'
    },

    // 默认 emoji（未匹配的生物用）
    DEFAULT_CREATURE_EMOJI: '🐟',

    // 稀有度名称
    RARITY_NAMES: {
        common: '普通', rare: '稀有', epic: '史诗', legendary: '传说'
    },

    // 稀有度颜色
    RARITY_COLORS: {
        common: '#9E9E9E', rare: '#4FC3F7', epic: '#AB47BC', legendary: '#FFD700'
    },

    // 用户等级体系
    LEVELS: [
        { min: 0,  title: '探险新手',   title_en: 'Explorer Newbie',    emoji: '🐠' },
        { min: 5,  title: '见习水手',   title_en: 'Junior Sailor',      emoji: '⚓' },
        { min: 12, title: '海洋探险家', title_en: 'Ocean Explorer',     emoji: '🐬' },
        { min: 22, title: '深海冒险家', title_en: 'Deep Sea Adventurer', emoji: '🦈' },
        { min: 35, title: '海洋大师',   title_en: 'Ocean Master',       emoji: '🐋' },
        { min: 50, title: '海洋传说',   title_en: 'Ocean Legend',       emoji: '🧜' }
    ],

    // 盲盒配置
    BOX_CONFIG: {
        normal:    { cost_shells: 50,  cost_pearls: 0, weights: [60, 25, 10, 5] },
        rare:      { cost_shells: 200, cost_pearls: 0, weights: [10, 50, 30, 10] },
        legendary: { cost_shells: 0,   cost_pearls: 5, weights: [0, 0, 60, 40] }
    },

    // 盲盒 emoji
    BOX_EMOJIS: {
        normal: '📦', rare: '🎁', legendary: '👑'
    },

    // 时间段信息
    TIME_PERIODS: {
        dawn:  { greeting: 'Good Morning!',   sub: '晨间学习', emoji: '🌅', desc: '一日之计在于晨，开启元气满满的一天' },
        day:   { greeting: 'Good Afternoon!', sub: '日间学习', emoji: '☀️', desc: '阳光正好，正是学习好时光' },
        dusk:  { greeting: 'Good Evening!',   sub: '傍晚学习', emoji: '🌇', desc: '日落时分，温故而知新' },
        night: { greeting: 'Good Night!',     sub: '夜间学习', emoji: '🌟', desc: '夜深人静，专注学习的好时刻' }
    },

    // 重复生物补偿贝壳
    DUPLICATE_REWARDS: {
        common: 15, rare: 40, epic: 80, legendary: 150
    },

    // 等级计算
    getLevelInfo(totalTasks) {
        let info = this.LEVELS[0];
        for (const lv of this.LEVELS) {
            if (totalTasks >= lv.min) info = lv;
        }
        return info;
    }
};
