/**
 * 多结局判定。
 *
 * 三个隐藏计量贯穿全程，HUD 上只以符号呈现、从不显示数字：
 *
 * - **真相 T**：已锁定的归乡录条目数（满值 30）
 * - **怒 W**：众神之怒，由僭越性的抉择累加
 * - **安息 S**：已被送归的同船者亡魂数（0–12）
 *
 * 关于 S：荷马原典里未得安葬的死者无法进入冥府（厄尔佩诺尔正是为此拦住奥德修斯
 * 哀求）。本作沿用这条规则——奥德修斯是失忆后独自重访这些岛的，船员早已死尽；
 * 他每查明一个人的死法、并在那座岛上做出体面的处置，就有一个亡魂能跟他一起回去。
 * 所以"带多少人归乡"衡量的不是求生，而是他愿不愿意把真相查到底。
 *
 * 判定严格按下表**自上而下取第一个命中**——优先级本身就是叙事：忘记自己是谁
 * 压倒一切，其次是神怒，再次才轮到你究竟查明了多少。
 */

export interface EndingContext {
  truth: number
  wrath: number
  shades: number
  flags: ReadonlySet<string>
}

export interface Ending {
  id: string
  name: string
  greek: string
  /** 结局正文，逐段呈现。 */
  lines: string[]
  /** 结局的情绪基调，决定结局画面的配色。 */
  tone: 'dark' | 'bitter' | 'quiet' | 'warm'
}

/** 归乡录条目总数，五岛合计。 */
export const TRUTH_TOTAL = 30

/** 同船者总数。 */
export const SHADES_TOTAL = 12

const ENDINGS: Record<string, Ending> = {
  lethe: {
    id: 'lethe',
    name: '遗忘者',
    greek: 'ΛΗΘΗ',
    tone: 'dark',
    lines: [
      '你在那座岛上尝了一口花。',
      '起初只是些小事：一个桨手的名字，一场风的方向，你女儿出生那天的天色。',
      '后来是伊萨卡的形状，是你妻子织布时手的样子，是"回家"这个词本来的意思。',
      '归乡录停在了没写完的那一页。船还在走，海还在响，但船上那个人已经不再是谁了。',
      '有人在海上遇见过这条船。他们说舵手很和气，问他从哪来，他会笑一笑，说他忘了。',
    ],
  },
  hubris: {
    id: 'hubris',
    name: '僭越者',
    greek: 'ΥΒΡΙΣ',
    tone: 'dark',
    lines: [
      '你查清了一些事，但你始终没学会闭嘴。',
      '在洞口你喊出了自己的名字，在风王殿前你伸手再要一次，在牛群的灰烬上你说那是神的错。',
      '海面在你面前立起来，像一堵没有门的墙。',
      '很多年后，另一个人会在另一座岛上捡起一块刻着 ΟΔΥΣΣΕΥΣ 的木板，',
      '把它记进他自己的航海志里，作为一个不认识的死者。',
    ],
  },
  athanatos: {
    id: 'athanatos',
    name: '不朽者',
    greek: 'ΑΘΑΝΑΤΟΣ',
    tone: 'quiet',
    lines: [
      '你把每一条都写完了。三十条，一条不缺。',
      '你终于看清了那十年：不是神明在为难你，是你一次次做了那个当时看来最像样的决定。',
      '木桩是你削的。名字是你喊的。牛群被宰的时候，你在睡觉。',
      '他们一个一个从你身后走过去，走进那道光里。到最后只剩你还站在岸上。',
      '雅典娜说，现在轮到你了，你可以回去了。',
      '你看着东边那条通往伊萨卡的水路，看了很久，然后转过身，往岛的深处走。',
      '归乡录合上了。你不再需要它——你已经不打算归乡。',
    ],
  },
  monos: {
    id: 'monos',
    name: '孤舟者',
    greek: 'ΜΟΝΟΣ',
    tone: 'bitter',
    lines: [
      '十二个人跟你出海。最后一段路，只剩你一个人在划。',
      '有些名字你查清了，有些没有。没查清的那几个还留在他们死掉的那座岛上，',
      '在潮水线以上一点的地方，等一个永远不会有人来写的句子。',
      '伊萨卡的岸上有人在烧火。你把船拖上沙滩，坐了很久才站起来。',
      '你是回来了。但你带回来的只有你自己。',
    ],
  },
  nostos: {
    id: 'nostos',
    name: '归乡者',
    greek: 'ΝΟΣΤΟΣ',
    tone: 'warm',
    lines: [
      '你查清了那十年，一个名字一个名字地查。',
      '这不是荷马唱的那个版本——在他的版本里，你是独自上岸的。',
      '但你身后确实站着人。他们扛着桨，一句话不说，等你先走。',
      '你不能碰他们，他们也不再需要吃喝。但海风吹过来的时候，他们的衣角是动的。',
      '岸上的火光里有人直起身，手搭在额前朝这边看。',
      '你没有喊。你只是往前走了一步，让光照到脸上。',
    ],
  },
  anonymos: {
    id: 'anonymos',
    name: '无名者',
    greek: 'ΑΝΩΝΥΜΟΣ',
    tone: 'bitter',
    lines: [
      '归乡录交上去的时候，还有很多页是空的。',
      '雅典娜一条一条读下来。读到空白处，她就停一下，然后跳过去。',
      '"这些人，"她说，"你连他们怎么死的都说不上来。"',
      '你被允许上岸。神明守约，从不食言。',
      '只是岸上没有人认得你——他们看见一个眼熟的老水手，礼貌地让开路，',
      '就像让开任何一个从海上回来、说不清自己去过哪里的人。',
    ],
  },
}

/** 结局判定。按优先级自上而下，第一个命中即返回。 */
export function resolveEnding(ctx: EndingContext): Ending {
  const { truth, wrath, shades, flags } = ctx

  if (flags.has('ate_lotus') && truth < 12) return ENDINGS.lethe
  if (wrath >= 7) return ENDINGS.hubris
  if (truth >= 27 && shades >= 8 && flags.has('blame_self')) return ENDINGS.athanatos
  if (truth >= 20 && shades <= 2) return ENDINGS.monos
  if (truth >= 20) return ENDINGS.nostos
  return ENDINGS.anonymos
}

export const ALL_ENDINGS = Object.values(ENDINGS)
