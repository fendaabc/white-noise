/**
 * 校园模式音效配置
 * 包含"学霸/学渣"模式的所有音效定义和配置
 */

// 校园模式音效配置
const campusSoundConfig = {
  // ========== 课堂宇宙 ==========
  headTeacher: {
    path: "audio/campus/head-teacher.mp3", // 这将是默认音频，用户可以替换
    name: "班主任",
    icon: "👨‍🏫",
    category: "classroom",
    type: "standard", // 标准音频文件，支持用户自定义
    description: "整栋楼就你们班最吵！看我干嘛？我脸上有答案？",
    defaultContent: [
      "整栋楼就你们班最吵！",
      "看我干嘛？我脸上有答案？",
      "体育老师今天有事，这节课上数学！",
      "我再讲两分钟就下课",
      "你们是我带过最差的一届"
    ]
  },

  mathTeacher: {
    path: "audio/campus/math-teacher.mp3",
    name: "数学老师",
    icon: "📐",
    category: "classroom",
    type: "standard",
    description: "这又是一道送分题！看懂了吗？好，我们看下一题",
    defaultContent: [
      "这又是一道送分题！",
      "看懂了吗？好，我们看下一题",
      "这道题很简单，我们来看下一题",
      "这个知识点要考的！",
      "同学们，黑板上的解题步骤要记住"
    ]
  },

  chineseTeacher: {
    path: "audio/campus/chinese-teacher.mp3",
    name: "语文老师",
    icon: "📖",
    category: "classroom",
    type: "standard",
    description: "全文背诵！请同学们有感情地朗读课文",
    defaultContent: [
      "全文背诵！",
      "请同学们有感情地朗读课文",
      "这篇课文的中心思想是...",
      "注意标点符号的用法",
      "课后第三题要写作文"
    ]
  },

  englishTeacher: {
    path: "audio/campus/english-teacher.mp3",
    name: "英语老师",
    icon: "🔤",
    category: "classroom",
    type: "standard",
    description: "OK, class. Read after me... Apple!",
    defaultContent: [
      "OK, class. Read after me...",
      "Apple, A-P-P-L-E, apple!",
      "Very good! Next word...",
      "Please open your textbook to page 25",
      "Homework: recite the new words"
    ]
  },

  physicsTeacher: {
    path: "audio/campus/physics-teacher.mp3",
    name: "物理老师",
    icon: "⚛️",
    category: "classroom",
    type: "standard",
    description: "根据牛顿第二定律...这个实验现象说明了什么？",
    defaultContent: [
      "根据牛顿第二定律...",
      "这个实验现象说明了什么？",
      "请注意观察这个物理现象",
      "同学们要理解这个公式的含义",
      "下节课我们做电学实验"
    ]
  },

  // ========== 校园生活 ==========
  schoolBell: {
    path: "audio/campus/school-bell.mp3",
    name: "下课铃声",
    icon: "🔔",
    category: "campus-life",
    type: "standard",
    description: "经典的校园电铃声，唤起无数回忆",
    loop: true
  },

  morningExercise: {
    path: "audio/campus/morning-exercise.mp3",
    name: "课间操",
    icon: "🤸",
    category: "campus-life",
    type: "standard",
    description: "时代在召唤，青春正飞扬...",
    defaultContent: [
      "时代在召唤，青春正飞扬",
      "雏鹰起飞，向着太阳",
      "现在开始做第八套广播体操",
      "伸展运动，一二三四..."
    ]
  },

  sportsDay: {
    path: "audio/campus/sports-day.mp3",
    name: "运动会",
    icon: "🏃",
    category: "campus-life",
    type: "standard",
    description: "发令枪响、加油呐喊声，青春的激情",
    defaultContent: [
      "各就各位，预备——砰！",
      "加油！加油！冲啊！",
      "三年二班，永远第一！",
      "友谊第一，比赛第二",
      "超越自我，挑战极限"
    ]
  },

  eveningStudy: {
    path: "audio/campus/evening-study.mp3",
    name: "晚自习",
    icon: "✍️",
    category: "campus-life",
    type: "standard",
    description: "安静的学习氛围，翻书声、写字声、咳嗽声",
    ambientSounds: [
      "翻书声",
      "笔尖在纸上的沙沙声",
      "远处的咳嗽声",
      "老师巡视的脚步声"
    ]
  },

  dormTalk: {
    path: "audio/campus/dorm-talk.mp3",
    name: "宿舍夜话",
    icon: "🤫",
    category: "campus-life",
    type: "standard",
    description: "熄灯后的窃窃私语和憋笑声",
    ambientSounds: [
      "压低的说话声",
      "憋笑声",
      "风扇嗡嗡声",
      "翻身声"
    ]
  },

  // ========== 摸鱼时光 ==========
  canteen: {
    path: "audio/campus/canteen.mp3",
    name: "小卖部",
    icon: "🏪",
    category: "leisure",
    type: "standard",
    description: "课间休息的热闹，撕开零食包装的声音",
    ambientSounds: [
      "拥挤的人声",
      "撕开零食包装声",
      "老板，拿瓶可乐！",
      "收银机的声音"
    ]
  },

  arcadeHall: {
    path: "audio/campus/arcade-hall.mp3",
    name: "游戏厅",
    icon: "🕹️",
    category: "leisure",
    type: "standard",
    description: "90年代怀旧，拳皇、街霸的背景音乐",
    ambientSounds: [
      "街机游戏音效",
      "摇杆和按键声",
      "激烈的对战音效",
      "投币声"
    ]
  },

  // ========== 考试周专区 ==========
  examRoom: {
    path: "audio/campus/exam-room.mp3",
    name: "考试铃声",
    icon: "📝",
    category: "exam",
    type: "standard",
    description: "考试开始和结束的铃声，紧张感满满",
    variants: ["开始考试", "还剩30分钟", "考试结束"]
  },

  libraryAmbient: {
    path: "audio/campus/library.mp3",
    name: "图书馆",
    icon: "📚",
    category: "study",
    type: "standard",
    description: "安静的学习氛围，偶尔的翻页声",
    ambientSounds: [
      "轻微的翻页声",
      "椅子移动声",
      "空调的低频声",
      "偶尔的咳嗽声"
    ]
  }
};

// 校园模式UI配置
const campusModeConfig = {
  // 界面主题配置
  theme: {
    primaryColor: "#4CAF50", // 青春绿色
    secondaryColor: "#FF9800", // 活力橙色
    backgroundColor: "#E8F5E8", // 淡绿背景
    textColor: "#2E7D32", // 深绿文字
    accentColor: "#FFC107" // 金黄强调色
  },

  // 背景图片配置
  backgrounds: [
    {
      name: "classroom",
      url: "backgrounds/campus/classroom.jpg",
      description: "温馨的教室环境"
    },
    {
      name: "playground",
      url: "backgrounds/campus/playground.jpg", 
      description: "青春的操场"
    },
    {
      name: "library",
      url: "backgrounds/campus/library.jpg",
      description: "安静的图书馆"
    },
    {
      name: "corridor",
      url: "backgrounds/campus/corridor.jpg",
      description: "熟悉的走廊"
    }
  ],

  // 动画效果配置
  animations: {
    modeSwitch: "slideFromRight", // 模式切换动画
    buttonHover: "bounce", // 按钮悬停效果
    iconRotation: true, // 图标旋转效果
    particleSystem: "notebooks" // 粒子系统：笔记本、铅笔等
  },

  // 音效分类
  categories: {
    classroom: {
      name: "课堂宇宙",
      icon: "🏫",
      description: "各科老师的经典语录"
    },
    "campus-life": {
      name: "校园生活", 
      icon: "🎒",
      description: "校园日常的声音记忆"
    },
    leisure: {
      name: "摸鱼时光",
      icon: "🎮", 
      description: "课余时间的快乐回忆"
    },
    exam: {
      name: "考试周",
      icon: "📝",
      description: "紧张刺激的考试氛围"
    },
    study: {
      name: "学习专区",
      icon: "📚",
      description: "专注学习的环境音"
    }
  }
};

// 默认音频内容（当用户没有自定义时使用的预设内容）
const defaultAudioContent = {
  headTeacher: {
    audioData: null, // 将来可以放置默认的音频数据或TTS生成的音频
    textContent: [
      "整栋楼就你们班最吵！",
      "看我干嘛？我脸上有答案？", 
      "体育老师今天有事，这节课上数学！",
      "我再讲两分钟就下课",
      "你们是我带过最差的一届",
      "把手机交上来！",
      "家长会上我要好好说说你们",
      "这次月考成绩很不理想"
    ]
  },
  // 可以为每个音效添加默认内容...
};

// 导出配置
if (typeof module !== 'undefined' && module.exports) {
  // Node.js环境
  module.exports = {
    campusSoundConfig,
    campusModeConfig,
    defaultAudioContent
  };
} else {
  // 浏览器环境
  window.campusSoundConfig = campusSoundConfig;
  window.campusModeConfig = campusModeConfig;
  window.defaultAudioContent = defaultAudioContent;
}