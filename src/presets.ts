/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GamePreset } from './types';

export const GAME_PRESETS: GamePreset[] = [
  {
    id: 'fantasy',
    title: '影之扉：遺落帝國',
    description: '經典黑暗奇幻冒險。踏入被遺落的聖安德烈大教堂地底，與古代巨石守護者周旋，奪取帝王遺物。',
    difficulty: '普通 (Normal)',
    style: '黑暗奇幻 / 古典跑團',
    iconName: 'Shield',
    characterClasses: [
      {
        className: '神聖聖騎士',
        description: '持有守護巨盾與神聖信念。擅長物理對抗、破壞阻礙、承受傷害。',
        stats: { str: 15, int: 8, dex: 9 },
        initialItems: ['破魔巨劍', '治療藥水'],
        hp: 120,
        mp: 40,
      },
      {
        className: '奧秘大魔法師',
        description: '通曉元素秘術與遠古預言。精通機關解謎、奧術研究、感知魔力。',
        stats: { str: 7, int: 16, dex: 9 },
        initialItems: ['符文法杖', '魔力藥膏', '古老懷錶'],
        hp: 80,
        mp: 100,
      },
      {
        className: '無影精靈刺客',
        description: '穿梭陰影的致命獵手。具備超凡身手與靈活敏捷，極度擅長躲避陷阱和鎖匠手藝。',
        stats: { str: 9, int: 9, dex: 16 },
        initialItems: ['幽魂短匕', '精緻開鎖器'],
        hp: 95,
        mp: 50,
      }
    ],
    initialScene: {
      storyText: '幽暗的迴廊中，火把的餘燼正在微微跳動。你推開了那扇沉重的大理石門，一股腐朽的皮革與古老羊皮紙的氣味撲面而來。空氣中瀰漫著細小的塵埃，在微弱的光線中飛舞。\n\n正前方是一座巨大的守護者石像，它巨大的紅色寶石眼球正凝視著你。當你踏入的那一刻，空中傳來沉重的齒輪咬合與石塊摩擦聲。「汝，尋求真理之人。」一陣空洞沙啞的聲音在你腦海中迴盪，「在此付出相應代價，或是化為永恆的塵土。」',
      illustrationPrompt: 'a grand ruins vault cathedral, giant stone guardian statue with glowing red gem eyes, flickering torches and dust particles flying in raw lighting, dark high fantasy oil painting',
      isEnding: false,
      choices: [
        {
          id: 'fan_1',
          text: '【力量檢定】拔出武器，重重砸向巨石守護者的底座凹槽以試圖摧毀運作機關！',
          requiresCheck: 'STR',
          difficulty: 12,
        },
        {
          id: 'fan_2',
          text: '【智慧檢定】在不觸碰守護者的情況下，冷靜思索周圍的古代碑文以破解巨石結界。',
          requiresCheck: 'INT',
          difficulty: 11,
        },
        {
          id: 'fan_3',
          text: '【敏捷檢定】在守護者巨臂砸落的瞬間，踏牆借力後空翻，越過那道即將關閉的石門！',
          requiresCheck: 'DEX',
          difficulty: 13,
        },
        {
          id: 'fan_4',
          text: '【道具限定】將身上的『古老懷錶』當作獻祭之物，放置在雕像腳下的星界圓盤中。',
          requiredItem: '古老懷錶'
        }
      ]
    }
  },
  {
    id: 'cyberpunk',
    title: '霓虹追獵：超時空矩陣',
    description: '賽博朋克反烏托邦冒險。作為自由極客，潛入「荒坂聯合生物」的中央大樓，駭入主控機房。',
    difficulty: '極具挑戰 (Hard)',
    style: '賽博朋克 / 電子骇客',
    iconName: 'Cpu',
    characterClasses: [
      {
        className: '獨行賽博傭兵',
        description: '全身充滿軍工級義體改裝。具備極強的生存爆發、肉體擊潰與物理破壞力。',
        stats: { str: 14, int: 7, dex: 11 },
        initialItems: ['螳螂刀改', '強化能量飲料'],
        hp: 110,
        mp: 30,
      },
      {
        className: '傳奇矩陣駭客',
        description: '神經網絡天才，裝載一流的網絡調諧器。能夠隔空控制安全設備與破解加密。',
        stats: { str: 6, int: 17, dex: 9 },
        initialItems: ['軍規甲板套裝', '超載補丁組', '荒坂工程憑證'],
        hp: 75,
        mp: 115,
      },
      {
        className: '街頭賽博極速者',
        description: '非法飆車族與街頭混子。擅長瞬間反應、電子逃生以及盜取機密接口。',
        stats: { str: 10, int: 10, dex: 14 },
        initialItems: ['高頻震動刃', '電磁手雷'],
        hp: 95,
        mp: 60,
      }
    ],
    initialScene: {
      storyText: '夜幕傾盆而下，帶著酸性的酸雨腐蝕著「荒坂聯合生物」大樓外牆。你穿著半透明的帶帽雨衣，縮在大樓23層的通風管邊緣。警哨無人機的探照燈猶如深海鯊魚在頭頂掠過，留下令人窒息的淡藍射線。\n\n「檢測到未授權侵入，安全等級提升中。」主控AI的冰冷女聲在空氣中響起。在你面前是一扇電子伺服控制閥，以及一個正在高頻轉動、散發致命強電能的三相電抗核心網。要通往機房內網，你必須盡快越過這裡！',
      illustrationPrompt: 'cyberpunk neon skyscraper rooftop, acid rain glistening, massive rotating computer server core with dangerous sparks, flying drone searches dark corridors, holographic advertisements, high detail cyberpunk anime key art',
      isEnding: false,
      choices: [
        {
          id: 'cyb_1',
          text: '【力量檢定】使用高能軍武，強行拉開充滿高壓靜電的機電閥門防護外網！',
          requiresCheck: 'STR',
          difficulty: 14,
        },
        {
          id: 'cyb_2',
          text: '【智慧檢定】連線神經接口，嘗試解鎖主控終端並上傳虛假安全漏洞覆蓋。',
          requiresCheck: 'INT',
          difficulty: 11,
        },
        {
          id: 'cyb_3',
          text: '【敏捷檢定】踩踏管壁進行快速短跳，以不可思議的極限節奏滑過高壓電弧！',
          requiresCheck: 'DEX',
          difficulty: 13,
        },
        {
          id: 'cyb_4',
          text: '【道具限定】刷入盜來的『荒坂工程憑證』，使系統自動判定你為特許工程師。',
          requiredItem: '荒坂工程憑證'
        }
      ]
    }
  },
  {
    id: 'cthulhu',
    title: '克蘇魯的幻夢與細語',
    description: '暗影懸疑與克蘇魯神話驚悚。來到無人的海濱小鎮印斯茅斯，追尋失蹤博士留下的古老異象。',
    difficulty: '極致硬核 (expert)',
    style: '神秘調查 / 精神恐怖',
    iconName: 'Compass',
    characterClasses: [
      {
        className: '硬派私家偵探',
        description: '經歷過世界大戰的前排士兵。意志堅定，體魄強健，善於應對肉體恐懼與戰鬥。',
        stats: { str: 13, int: 10, dex: 11 },
        initialItems: ['左輪手槍', '一盒鉛彈'],
        hp: 115,
        mp: 35,
      },
      {
        className: '神學系古文物學家',
        description: '深度研究深海圖騰與不可名狀預言的學者。對不可思議的神話體系有無人能比的理解力。',
        stats: { str: 7, int: 16, dex: 10 },
        initialItems: ['羊皮筆記本', '克蘇魯舊印護符', '防水火柴'],
        hp: 80,
        mp: 100,
      },
      {
        className: '街裝逃亡魔術手',
        description: '機敏的年輕小偷，擅長藏匿形跡、聲東擊西。最會利用直覺避開看不見的陰影。',
        stats: { str: 9, int: 9, dex: 16 },
        initialItems: ['反光鏡片', '強效迷幻煙草'],
        hp: 95,
        mp: 60,
      }
    ],
    initialScene: {
      storyText: '「七月十日，雨。印斯茅斯的港口散發著一股令我作嘔的魚腥味，那不是凡世海鮮應有的味道…」你一邊讀著阿米塔吉博士那散落的日記頁，一邊走進了布滿青苔的海潮地窖。一陣詭異的低潮旋律從地窖深海裂隙傳出，空地上擺放著一個滴著粘稠黑水的巨型螺殼，似乎有十幾條軟組織觸肢正緩緩在黑暗中舒展爬過。\n\n你的油燈開始劇烈抖動。一雙泛著冰冷黃色熒光的巨大眼球，在黑暗的潮濕裂隙中緩緩睜開，凝視著你僅剩的理性……',
      illustrationPrompt: 'dark damp sea cave with glowing mysterious eldritch eyes, giant wet nautilus shell on pagan altar, green algae dripping water, lovecraftian cosmic horror art style',
      isEnding: false,
      choices: [
        {
          id: 'cth_1',
          text: '【力量檢定】咬破手指，握緊左輪，試圖朝那團若隱若現的深淵觸肢猛然扣動板機！',
          requiresCheck: 'STR',
          difficulty: 13,
        },
        {
          id: 'cth_2',
          text: '【智慧檢定】大聲唱誦古老日記中記載的克蘇魯舊印召喚詞，藉此驅除地窖的黑暗邪祟！',
          requiresCheck: 'INT',
          difficulty: 12,
        },
        {
          id: 'cth_3',
          text: '【敏捷檢定】熄滅手提燈，乘著觸腕還未包圍你之前，無聲退回到石柱後方。',
          requiresCheck: 'DEX',
          difficulty: 12,
        },
        {
          id: 'cth_4',
          text: '【道具限定】高舉『克蘇魯舊印護符』，利用星之戰士的星辰遺物發散金黃防護死角。',
          requiredItem: '克蘇魯舊印護符'
        }
      ]
    }
  }
];
