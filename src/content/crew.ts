import type { LedgerOption } from './types'

/**
 * 十二名同船者。
 *
 * 这份名册是整部游戏的推理骨架：同一个名字会在多座岛上以不同的证物形式复现
 * （岛 1 的铜扣 ↔ 岛 2 的家书 ↔ 岛 3 的腰带），跨岛互证。玩家在归乡录里
 * 填的每一个人名都来自这里。
 *
 * 名册条目**默认全部不可选**——只有当某件证物或某段记忆定影揭示了这个名字，
 * 对应选项才会出现在下拉框中。见 domain/ledger.ts 的 availableOptions()。
 */
export interface CrewMember extends LedgerOption {
  /** 希腊原文，铭文与刻名处使用。 */
  greek: string
  /** 一句话身份，检视名册时显示。 */
  role: string
  /** 揭示此人姓名所需的事实标记；集齐任意一条即解锁。 */
  revealedBy: string[]
}

export const CREW: CrewMember[] = [
  {
    id: 'odysseus',
    label: '奥德修斯',
    greek: 'ΟΔΥΣΣΕΥΣ',
    role: '伊萨卡之王，本船船长',
    revealedBy: ['F-start'],
  },
  {
    id: 'eurylochus',
    label: '欧律洛科斯',
    greek: 'ΕΥΡΥΛΟΧΟΣ',
    role: '副手，船长的妹夫，谨慎而多疑',
    revealedBy: ['F-start'],
  },
  {
    id: 'perimedes',
    label: '佩里墨得斯',
    greek: 'ΠΕΡΙΜΗΔΗΣ',
    role: '掌帆手，脖子上挂着刻名的护身符',
    revealedBy: ['F-lotus-amulet'],
  },
  {
    id: 'elpenor',
    label: '厄尔佩诺尔',
    greek: 'ΕΛΠΗΝΩΡ',
    role: '最年轻的一个，嗜酒，从不当值',
    revealedBy: ['F-cyclops-wine', 'F-aiaia-comb'],
  },
  {
    id: 'polites',
    label: '波利忒斯',
    greek: 'ΠΟΛΙΤΗΣ',
    role: '船长最亲近的伙伴，好奇心重',
    revealedBy: ['F-cyclops-buckle'],
  },
  {
    id: 'antiphos',
    label: '安提福斯',
    greek: 'ΑΝΤΙΦΟΣ',
    role: '桨手长，臂上有一道旧船桨磨出的疤',
    revealedBy: ['F-cyclops-oar'],
  },
  {
    id: 'eurybates',
    label: '欧律巴忒斯',
    greek: 'ΕΥΡΥΒΑΤΗΣ',
    role: '传令官，随身带一副骨骰',
    revealedBy: ['F-cyclops-dice'],
  },
  {
    id: 'misenus',
    label: '弥塞诺斯',
    greek: 'ΜΙΣΗΝΟΣ',
    role: '号手，吹一支刻着自己名字的骨笛',
    revealedBy: ['F-aiaia-flute'],
  },
  {
    id: 'kritos',
    label: '克里托斯',
    greek: 'ΚΡΙΤΟΣ',
    role: '守夜人，左手戴一枚铜戒',
    revealedBy: ['F-aeolia-ring'],
  },
  {
    id: 'demos',
    label: '得摩斯',
    greek: 'ΔΗΜΟΣ',
    role: '守夜人，写了一封永远没能寄出的家书',
    revealedBy: ['F-aeolia-letter'],
  },
  {
    id: 'ourania',
    label: '乌拉尼奥斯',
    greek: 'ΟΥΡΑΝΙΟΣ',
    role: '观星者，唯一读得懂风向盘的人',
    revealedBy: ['F-aeolia-dial'],
  },
  {
    id: 'philoitios',
    label: '菲罗提俄斯',
    greek: 'ΦΙΛΟΙΤΙΟΣ',
    role: '牧人出身，认得每一头牛',
    revealedBy: ['F-thrinacia-abstainer'],
  },
]

export const CREW_BY_ID = new Map(CREW.map((member) => [member.id, member]))

/** 非船员的答案选项（神祇、方式、原因等），按池分组。 */
export const EXTRA_OPTIONS: Record<string, LedgerOption[]> = {
  'lotus-cause': [
    { id: 'drowned', label: '溺水，被浪卷走' },
    { id: 'walked-in', label: '自愿走入海中' },
    { id: 'starved', label: '饿死在沙滩上' },
    { id: 'killed', label: '被岛民杀死' },
  ],
  'cyclops-method': [
    { id: 'ram-belly', label: '藏在羊腹之下' },
    { id: 'night-swim', label: '趁夜泅水离开' },
    { id: 'rolled-stone', label: '合力推开巨石' },
    { id: 'bribed', label: '用酒换取放行' },
  ],
  'cyclops-name': [
    { id: 'outis', label: '「无人」（ΟΥΤΙΣ）' },
    { id: 'true-name', label: '奥德修斯，拉厄耳忒斯之子' },
    { id: 'nobody-only', label: '他始终没能说出任何名字' },
  ],
  'aeolia-motive': [
    { id: 'gold', label: '以为袋中是船长独吞的黄金' },
    { id: 'mercy', label: '想放出风来加快归程' },
    { id: 'accident', label: '纯属失手，绳结自己松了' },
    { id: 'malice', label: '存心要让船永远回不去' },
  ],
  'aeolia-distance': [
    { id: 'smoke', label: '近到看得见岸上的炊烟' },
    { id: 'horizon', label: '刚刚望见伊萨卡的轮廓' },
    { id: 'far', label: '还有整整九天的航程' },
  ],
  'aiaia-reason': [
    { id: 'moly', label: '赫尔墨斯给的莫吕草' },
    { id: 'sword', label: '他拔剑先发制人' },
    { id: 'refused', label: '他根本没有喝那杯酒' },
    { id: 'favor', label: '女神对他另眼相待' },
  ],
  'aiaia-stuck': [
    { id: 'soul-gone', label: '他的魂已经下了冥府' },
    { id: 'drank-twice', label: '他喝了两次那杯酒' },
    { id: 'witch-forgot', label: '女巫忘记了他' },
    { id: 'never-human', label: '他本来就不是船上的人' },
  ],
  'thrinacia-doing': [
    { id: 'asleep', label: '在山洞中沉睡' },
    { id: 'praying', label: '独自在祭坛前祈祷' },
    { id: 'fishing', label: '在礁石上钓鱼' },
    { id: 'ate-too', label: '和众人一起分食' },
  ],
  'thrinacia-wreck': [
    { id: 'zeus-bolt', label: '宙斯的雷霆' },
    { id: 'storm', label: '一场寻常的风暴' },
    { id: 'poseidon', label: '波塞冬掀起的浪' },
    { id: 'rot', label: '船身早已朽坏' },
  ],
  'thrinacia-why': [
    { id: 'helios-threat', label: '赫利俄斯以不再照耀相胁' },
    { id: 'athena-asked', label: '雅典娜请求降罚' },
    { id: 'random', label: '并无缘由，神明本就任性' },
    { id: 'poseidon-asked', label: '波塞冬终于讨来了这道雷' },
  ],
}
