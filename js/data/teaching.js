/**
 * 教学内容数据。
 * 新增条目：在数组末尾追加对象即可，type 为 'bilibili' 或 'local'。
 */

export const teachingItems = [
  {
    id: 'forehand-clear',
    title: '正手高远球：从握拍到发力',
    desc: '掌握正手高远球的核心发力链条，让球飞行又高又远。',
    tags: ['基础', '发力'],
    level: '初级',
    duration: '08:24',
    views: 12480,
    type: 'bilibili',
    bvid: 'BV1bvMHz7EVJ',
    content: '正手高远球是羽毛球最基础也最重要的技术之一。核心要点：侧身、抬肘、手腕闪动。练习时注意非持拍手保持平衡，击球点尽量在身体前上方。'
  },
  {
    id: 'footwork',
    title: '米字步法训练',
    desc: '用米字步覆盖全场，提升移动效率和回位速度。',
    tags: ['步法', '移动'],
    level: '中级',
    duration: '12:05',
    views: 8632,
    type: 'bilibili',
    bvid: 'BV1HcmgBJE9G',
    content: '米字步法的关键在于启动小跳和回位。每个方向的蹬转要清晰，重心保持低而稳。建议每天练习 10 分钟，逐步增加速度。'
  },
  {
    id: 'backhand-serve',
    title: '反手发小球',
    desc: '精确控制发球过网高度，限制对手抢攻。',
    tags: ['发球', '双打'],
    level: '初级',
    duration: '06:18',
    views: 5210,
    type: 'local',
    src: 'videos/backhand-serve.mp4',
    content: '反手发小球是双打中的重要技术。拍面要稳定，拇指顶住拍柄宽面，触球瞬间短促发力。目标是让球贴网而过，落在前发球线附近。'
  }
];