import type { Island } from '../types'

/**
 * 岛 4 —— 特里那基亚 · 太阳神的牛群之岛（道德高潮）
 *
 * 本岛的重量在于两件事：
 *   1. 玩家要指认三具雷击遗骸，其中一具是**一路陪着他的那个人**。欧律洛科斯就站
 *      在旁边，看着玩家把他自己的名字填进那一格。
 *   2. C-5 是终局抉择：怎么记载这一段。它不改变已经发生的事，只决定归乡录上
 *      留下哪一句话——而结局判定读的正是那句话。
 */
export const THRINACIA: Island = {
  id: 'thrinacia',
  index: 4,
  name: '太阳神的牛群之岛',
  greek: 'ΘΡΙΝΑΚΙΗ',
  subtitle: '第五段记忆 · 你在这里睡着了',
  arrival: [
    '草是金色的，一直金到海边。牛群散在坡上，不吃草，只是站着，朝着太阳的方向。',
    '它们的数目从很久以前就没变过——不生，不死，不多，不少。',
    '海滩上有一条船的残骸，龙骨朝天，中间焦黑，像是被人从上面按了一个指印。',
  ],
  bounds: [18, 15],
  ground: '#c9a742',
  spawn: [0, 12],
  departure: [0, 13.6],
  departureRequirement: 5,
  terrain: [
    { kind: 'box', position: [-14, 2], size: [6, 20], height: 3.2, color: '#a8873a', solid: true },
    { kind: 'box', position: [14.5, 0], size: [6, 22], height: 3.6, color: '#a8873a', solid: true },
    { kind: 'box', position: [0, -13.5], size: [36, 4], height: 4.5, color: '#8f7330', solid: true },
    { kind: 'box', position: [-7.5, -8.5], size: [5, 4], height: 0.3, color: '#7d6a4c', solid: false },
    { kind: 'cylinder', position: [0, -6.5], size: [2.8, 2.8], height: 0.5, color: '#b8934a', solid: false },
    { kind: 'cylinder', position: [9.5, -9], size: [2.2, 2.2], height: 3.4, color: '#967c34', solid: true },
  ],
  decorations: [
    { kind: 'cattle', position: [-9.5, 4.5] },
    { kind: 'cattle', position: [-6.5, 6.5], scale: 0.95 },
    { kind: 'cattle', position: [-11.0, 8.0], scale: 1.1 },
    { kind: 'cattle', position: [7.5, 5.5] },
    { kind: 'cattle', position: [10.5, 7.5], scale: 1.05 },
    { kind: 'cattle', position: [4.5, 8.5], scale: 0.9 },
    { kind: 'cattle', position: [12.5, 3.0], scale: 1.0 },
    { kind: 'flame', position: [0, -6.5], scale: 1.1 },
    { kind: 'rock', position: [-12.5, -6.0], scale: 1.4 },
    { kind: 'rock', position: [12.0, -5.0], scale: 1.2 },
    { kind: 'wave', position: [-8, 13.0], scale: 1.4 },
    { kind: 'wave', position: [8, 13.0], scale: 1.4 },
    { kind: 'urn', position: [2.5, -5.0] },
  ],

  evidence: [
    {
      id: 'E-401',
      island: 'thrinacia',
      kind: 'trace',
      name: '祭坛上的牛皮与牛肉',
      position: [0, -4.8],
      examine: [
        '祭坛的石面上还摊着几张牛皮。',
        '它们在动。',
        '不是风吹的——是从内侧一鼓一鼓地动，像底下还有东西在呼吸。你伸手按住一张，它在你掌心下面收缩了一下。',
        '穿在木叉上的肉块也一样。烤焦的那一面在滋滋地响，而没烤的那一面在低低地叫，声音很闷，像隔着一堵墙。',
        '这些牛是不死的。杀了也不死。他们吃了整整六天不肯闭嘴的肉。',
      ],
      grantsFacts: ['F-thrinacia-hides'],
    },
    {
      id: 'E-402',
      island: 'thrinacia',
      kind: 'inscription',
      name: '岩壁上的划痕',
      position: [-11.5, -4.0],
      examine: [
        '一面背风的岩壁，密密麻麻全是划痕，五道一组。',
        '数一数是三十组。三十天。',
        '前二十道旁边还有小字：「捕鱼三」「海鸟一」「无」「无」「无」……',
        '从第二十一天起，小字全都是「无」。',
        '第二十九天的位置有一行不一样的字，划得很用力：「船长仍不许。船长说宁可饿死。」',
        '第三十天没有小字。只有一道划痕，划到一半断了。',
      ],
      grantsFacts: ['F-thrinacia-days'],
    },
    {
      id: 'E-403',
      island: 'thrinacia',
      kind: 'inscription',
      name: '忒瑞西阿斯的警告石',
      position: [7.5, -3.5],
      examine: [
        '一块从别处搬来的石头，上面的字是你自己刻的——你认得自己的刻法。',
        '「盲者忒瑞西阿斯于冥府所言，字字记之：」',
        '「至特里那基亚，见赫利俄斯之牛群。不动其一毛，则众人虽苦犹可归。」',
        '「若动之，则船毁，众人尽亡。纵你独存，亦必迟归，失尽同伴，乘他人之舟。」',
        '石头被人推倒过，又被扶起来。倒下时磕掉的那一角，就在旁边的草里。',
      ],
      grantsFacts: ['F-thrinacia-prophecy'],
    },
    {
      id: 'E-404',
      island: 'thrinacia',
      kind: 'object',
      name: '祭祀用的空罐',
      position: [2.2, -5.4],
      examine: [
        '一只祭酒罐，倒扣着，罐底朝天。里面一滴酒都没有。',
        '罐口沾着的不是酒渣，是干掉的水碱。',
        '他们没有酒了。他们用清水代替酒，往祭坛上浇。',
        '旁边还有一小堆橡树叶——没有大麦，他们撕了树叶充当祭粮。',
        '这不是亵渎。这是一群饿到不行的人，在尽他们最后能尽的礼数。',
      ],
      grantsFacts: ['F-thrinacia-libation'],
    },
    {
      id: 'E-405',
      island: 'thrinacia',
      kind: 'body',
      name: '祭坛旁的遗骸',
      position: [-2.5, -7.2],
      examine: [
        '雷劈过的骨头是黑的，而且脆。这一具的右手还保持着握刀的形状。',
        '刀在旁边，刀刃上有一道缺口——砍在骨头上崩的。',
        '他的左肘上有一块凸起的旧伤，是很多年前在青铜门旁边磕的，磕在桨架上。',
        '你认得这块疤。你昨天还看见它。',
      ],
      grantsFacts: ['F-thrinacia-knife'],
      tableau: 'M-402',
    },
    {
      id: 'E-406',
      island: 'thrinacia',
      kind: 'body',
      name: '海边的遗骸',
      position: [5.5, 8.5],
      examine: [
        '这一具是趴着的，朝向海。他大概是想跑到水里去。',
        '头发里还别着一把木梳，缺了四根齿，梳背上有十七道刻痕。',
        '第十八道刻到一半，没刻完。',
      ],
      grantsFacts: ['F-thrinacia-comb'],
    },
    {
      id: 'E-407',
      island: 'thrinacia',
      kind: 'body',
      name: '船骸下的遗骸',
      position: [-5.5, 9.5],
      examine: [
        '压在龙骨下面，只露出一只手。',
        '手指上有一枚铜戒，戒圈内侧磨得发白。雷把周围的木头都烧焦了，唯独这枚戒指还是亮的。',
        '你把它取下来，戒圈内侧有一行极小的字：「属于你的东西，别人替你收着，那就不是你的了。」',
      ],
      grantsFacts: ['F-thrinacia-ring'],
    },
    {
      id: 'E-408',
      island: 'thrinacia',
      kind: 'body',
      name: '山坡上的遗骸',
      position: [-9.0, 0.5],
      examine: [
        '这一具没有被雷劈到。他是坐着死的，背靠石头，面朝牛群。',
        '骨头轻得吓人。肋骨之间的间距大得不正常——他是饿死的，而且饿了很久。',
        '他手边有一只碗，碗里是干掉的海水。',
        '离他不到十步的地方就是祭坛，祭坛上堆着六天吃不完的肉。',
      ],
      grantsFacts: ['F-thrinacia-abstainer'],
      tableau: 'M-403',
    },
    {
      id: 'E-409',
      island: 'thrinacia',
      kind: 'trace',
      name: '山洞里的凹痕',
      position: [-7.5, -6.5],
      examine: [
        '一个背风的小山洞，地上的干草被压出一个人形的凹痕，头的位置有一块当枕头的石头。',
        '凹痕很深，说明这个人在这里躺了很久，而且睡得很沉。',
        '洞口的草是从外面往里倒的——有人在洞口站过，站了一会儿，然后走开了。没有叫醒他。',
        '杖在发烫。',
      ],
      grantsFacts: ['F-thrinacia-cave'],
      tableau: 'M-401',
    },
  ],

  tableaux: [
    {
      id: 'M-401',
      island: 'thrinacia',
      title: '第三十天的饥饿',
      echo: '别叫他。他一醒过来就又要拦着我们了。',
      echoSpeaker: '一个哑掉的声音',
      center: [-7.5, -6.5],
      grantsFacts: ['F-thrinacia-asleep'],
      figures: [
        {
          id: 'sleeper',
          label: '洞里睡着的人',
          position: [-7.5, -7.4],
          facing: 1.57,
          pose: 'lie',
          detail:
            '他睡得很沉，一只手垫在脸下面。三十天里他是最后一个还站着说"不许动"的人，现在他撑不住了。\n\n是你。',
        },
        {
          id: 'peeker',
          label: '洞口的人',
          position: [-7.5, -4.8],
          facing: 4.71,
          pose: 'stand',
          detail:
            '他扒着洞口往里看了一眼，确认了什么，然后转身对身后的人比了个手势。\n\n他的左肘上有一块凸起的旧疤。',
        },
        {
          id: 'waiting',
          label: '在坡下等着的人们',
          position: [-6.0, -3.2],
          facing: 4.4,
          pose: 'stand',
          detail: '四个人挤在坡下，都在往洞口看。他们手里已经拿着刀了。有一个人没有拿。',
        },
      ],
    },
    {
      id: 'M-402',
      island: 'thrinacia',
      title: '第一刀',
      echo: '饿死是最难看的死法。让我们赌一次——回去以后给太阳神盖一座庙，赔他一群金牛。',
      echoSpeaker: '一个你很熟的声音',
      center: [-2.5, -7.2],
      grantsFacts: ['F-thrinacia-first'],
      figures: [
        {
          id: 'cutter',
          label: '举刀的人',
          position: [-2.5, -6.4],
          facing: 0.4,
          pose: 'reach',
          detail:
            '他一只手按着牛的脖子，另一只手举着刀。他在回头对别人说话，脸完全朝着定影的这一侧——你看得一清二楚。\n\n左肘上有一块旧疤。是他。',
        },
        {
          id: 'cattle-victim',
          label: '第一头牛',
          position: [-1.0, -7.6],
          facing: 2.0,
          pose: 'stand',
          detail: '它没有挣扎，也没有躲。它就那么站着，头微微低下来，像是知道会发生什么，也知道这没有用。',
        },
        {
          id: 'crowd',
          label: '围着的人',
          position: [-4.4, -5.6],
          facing: 0.8,
          pose: 'stand',
          detail: '三个人围在旁边，有两个已经跪下来准备接血了。第三个背过身去，两手捂着耳朵。',
        },
        {
          id: 'refuser',
          label: '走开的人',
          position: [-6.8, -2.8],
          facing: 2.2,
          pose: 'stand',
          detail: '他正在往坡上走，背对着所有人。他手里什么都没拿。他一次都没有回头。',
        },
      ],
    },
    {
      id: 'M-403',
      island: 'thrinacia',
      title: '唯一没有吃的人',
      echo: '我认得它们每一头。我从小放牛。……我下不去嘴。',
      echoSpeaker: '一个很平静的声音',
      center: [-9.0, 0.5],
      grantsFacts: ['F-thrinacia-refused'],
      figures: [
        {
          id: 'starving',
          label: '坐在石头边的人',
          position: [-9.0, 0.5],
          facing: 3.14,
          pose: 'sit',
          detail:
            '他靠着石头坐着，面朝牛群。手边一只碗，碗里是海水。\n\n他瘦得不成样子，但腰背是直的。他一直看着那些牛，像是在跟它们道歉，又像是在守着它们。',
        },
        {
          id: 'offering',
          label: '递肉过来的人',
          position: [-7.4, 1.4],
          facing: 4.0,
          pose: 'kneel',
          detail:
            '有人蹲在他旁边，手里托着一块肉往前递，另一只手在抹眼睛。他递了很久，手都举酸了。\n\n那块肉最后被放在了地上。第二天它还在那里。',
        },
      ],
    },
    {
      id: 'M-404',
      island: 'thrinacia',
      title: '宙斯的雷',
      echo: '——父亲，若他们不受罚，我便下到冥府去，从今往后只照亮死人。',
      echoSpeaker: '赫利俄斯',
      center: [-2.0, 6.0],
      grantsFacts: ['F-thrinacia-bolt', 'F-thrinacia-threat'],
      figures: [
        {
          id: 'ship',
          label: '离岸的船',
          position: [-2.0, 7.5],
          facing: 0,
          pose: 'stand',
          detail:
            '船刚离岸没多远，帆是满的。甲板上的人在往回看这座岛，有几个在笑——他们吃饱了，六天来第一次吃饱。',
        },
        {
          id: 'helmsman',
          label: '掌舵的人',
          position: [-3.4, 6.4],
          facing: 3.0,
          pose: 'stand',
          detail:
            '他一个人站在舵边，没有笑。他在看天。云是从正上方压下来的，不是从任何一个方向刮来的——那不是风暴的样子。\n\n是你。',
        },
        {
          id: 'bolt',
          label: '正在落下的东西',
          position: [-2.0, 4.2],
          facing: 0,
          pose: 'stand',
          detail: '一道白色的直线，从云里下来，还没有碰到桅杆。定影把它停在了距离桅顶三尺的地方。',
        },
      ],
    },
  ],

  ledger: [
    {
      id: 'L-401',
      island: 'thrinacia',
      prompt: '祭坛旁那具还握着刀的遗骸是谁？',
      slots: [{ label: '他是', pool: 'crew', answer: 'eurylochus' }],
    },
    {
      id: 'L-402',
      island: 'thrinacia',
      prompt: '海边那具头发里别着木梳的遗骸是谁？',
      slots: [{ label: '他是', pool: 'crew', answer: 'elpenor' }],
    },
    {
      id: 'L-403',
      island: 'thrinacia',
      prompt: '压在船骸下、手指上戴着铜戒的遗骸是谁？',
      slots: [{ label: '他是', pool: 'crew', answer: 'kritos' }],
    },
    {
      id: 'L-404',
      island: 'thrinacia',
      prompt: '第一个动手宰牛的人是谁？',
      slots: [{ label: '他是', pool: 'crew', answer: 'eurylochus' }],
      appearsWhen: { has: 'F-thrinacia-first' },
    },
    {
      id: 'L-405',
      island: 'thrinacia',
      prompt: '唯一一个一口都没有吃、最后饿死的人是谁？',
      slots: [{ label: '他是', pool: 'crew', answer: 'philoitios' }],
      appearsWhen: { has: 'F-thrinacia-abstainer' },
    },
    {
      id: 'L-406',
      island: 'thrinacia',
      prompt: '牛被宰的时候，奥德修斯在做什么？',
      slots: [{ label: '他当时', pool: 'thrinacia-doing', answer: 'asleep' }],
    },
    {
      id: 'L-407',
      island: 'thrinacia',
      prompt: '船最终是被什么毁掉的？',
      slots: [{ label: '毁于', pool: 'thrinacia-wreck', answer: 'zeus-bolt' }],
    },
    {
      id: 'L-408',
      island: 'thrinacia',
      prompt: '宙斯为什么要降下这道雷？',
      slots: [{ label: '因为', pool: 'thrinacia-why', answer: 'helios-threat' }],
      appearsWhen: { has: 'F-thrinacia-threat' },
    },
  ],

  npcs: [
    {
      id: 'lampetie',
      name: '拉姆珀提厄',
      position: [8.0, 2.0],
      facing: 4.0,
      entries: [
        { node: 'after', when: { locked: 'L-405' } },
        { node: 'first' },
      ],
      nodes: [
        {
          id: 'first',
          speaker: '拉姆珀提厄',
          text: '（她站在牛群中间，一只手搭在一头牛的背上。她的影子朝着和太阳相反的方向，短得不正常。）\n\n你还敢回来。\n\n我数过了。你们杀了七头。七头，我父亲的牛群里从此永远少七头——它们不会再长回来，它们本来是不死的。',
          choices: [
            { text: '「我当时不在场。」', goto: 'excuse' },
            { text: '「我知道。我是回来把这件事写清楚的。」', goto: 'record' },
          ],
        },
        {
          id: 'excuse',
          speaker: '拉姆珀提厄',
          text: '你不在场。\n\n（她笑了一下，很短。）你是他们的头。他们饿了三十天，你也饿了三十天，可你是拿主意的那个。你一睡，主意就没人拿了。\n\n不在场也是一种在场，凡人。',
          choices: [{ text: '（结束对话）' }],
        },
        {
          id: 'record',
          speaker: '拉姆珀提厄',
          text: '写清楚？\n\n（她转过来看你。）好啊。那你写。但我告诉你一件事——写清楚不等于洗干净。有些事你越写清楚，你自己越难看。\n\n你敢不敢写到那一步？',
          choices: [
            { text: '「敢。」', trust: 1, goto: 'dare' },
            { text: '「我不知道。」', goto: 'dare' },
          ],
        },
        {
          id: 'dare',
          speaker: '拉姆珀提厄',
          text: '那就去。山洞在西边坡上，祭坛在中间，船骸在海边。你要的都在那儿。\n\n还有一个人在东边坡上坐着。他是这里唯一一个我不恨的人。',
          choices: [{ text: '（结束对话）' }],
        },
        {
          id: 'after',
          speaker: '拉姆珀提厄',
          text: '你找到他了。\n\n（她的声音第一次软下来。）他叫菲罗提俄斯。我知道他的名字——我在这座岛上待了几千年，他是唯一一个我记住名字的凡人。\n\n他饿死之前，每天早上还替我把走散的牛赶回来。他一头都没碰。',
          choices: [
            { text: '「我父亲从不许我们碰它们。他也是这么说的。」', goto: 'both' },
            { text: '「你为什么不救他？」', goto: 'why-not' },
          ],
        },
        {
          id: 'both',
          speaker: '拉姆珀提厄',
          text: '（她点点头。）\n\n所以我才恨得这么久。不是因为七头牛——牛是我父亲的事。\n\n是因为你们里面明明有一个人做对了，而他死得比谁都惨。做对了也没用，这件事我到现在都消化不了。',
          choices: [{ text: '（结束对话）' }],
        },
        {
          id: 'why-not',
          speaker: '拉姆珀提厄',
          text: '我没有那个权。我是看牛的，不是发赏的。\n\n（很长的沉默。）\n\n……而且我承认，我当时在等。我在等他撑不住，等他也去拿一块肉。那样这件事就简单了，那样我就可以恨你们全部。\n\n他没有。他一直坐到最后。',
          choices: [{ text: '（结束对话）' }],
        },
      ],
    },
    {
      id: 'philoitios',
      name: '坡上坐着的人',
      position: [-9.5, 2.5],
      facing: 3.14,
      entries: [
        { node: 'named', when: { locked: 'L-405' } },
        { node: 'silent' },
      ],
      nodes: [
        {
          id: 'silent',
          speaker: '（坡上的影子）',
          text: '（他坐在石头边上，面朝牛群，一动不动。）\n\n（你叫他，他没有回头。杖照过去的时候，他的轮廓亮了一下，又暗下去。）\n\n（他还在等一个名字。）',
          choices: [{ text: '（离开）' }],
        },
        {
          id: 'named',
          speaker: '菲罗提俄斯',
          text: '（他转过头来了。）\n\n船长。\n\n（他的声音很平静，一点都不像饿死的人。）你写上去了。我在这儿坐了很久，久到我自己都快忘了我为什么要坐着。',
          choices: [
            { text: '「你本可以吃的。没有人会怪你。」', goto: 'could' },
            { text: '「你为什么不吃？」', goto: 'why' },
            { text: '「对不起。我睡着了。」', trust: 1, goto: 'asleep' },
          ],
        },
        {
          id: 'could',
          speaker: '菲罗提俄斯',
          text: '我知道没人会怪我。\n\n那正是最难的地方，船长。没人拦着我，没人看着我，所有人都劝我吃，肉就放在我脚边上放了一整天。\n\n不吃这件事，是我自己一个人跟自己较的劲。较赢了也没人知道。',
          choices: [{ text: '（结束对话）' }],
        },
        {
          id: 'why',
          speaker: '菲罗提俄斯',
          text: '我从小放牛。我认得牛看人的样子。\n\n那些牛不躲，也不叫。它们知道自己不会死——所以它们不是被杀，它们是被没完没了地伤害。\n\n我要是吃了那口肉，我这辈子放过的每一头牛都白放了。',
          choices: [{ text: '（结束对话）' }],
        },
        {
          id: 'asleep',
          speaker: '菲罗提俄斯',
          text: '（他摇摇头。）\n\n你睡着是因为你三十天没合眼。这个我知道，我看着你熬的。\n\n可是船长——你醒过来以后，你也吃了。\n\n（他没有责备的意思，他只是在陈述。）我看见的。第七天早上，你从洞里出来，看见祭坛，站了很久，然后你走过去拿了一块。\n\n我不怪你。我只是希望你写的时候，别把这一句漏掉。',
          choices: [
            { text: '「我不会漏掉。」', trust: 1, goto: 'promise' },
            { text: '（低下头）', goto: 'promise' },
          ],
        },
        {
          id: 'promise',
          speaker: '菲罗提俄斯',
          text: '那就够了。\n\n（他站起来，拍了拍身上的土——一个放了一辈子牛的人的习惯动作。）\n\n我跟你回去。不是因为你查清了我怎么死的，是因为你肯把你自己那一块也写进去。',
          choices: [{ text: '（结束对话）' }],
        },
      ],
    },
    {
      id: 'eurylochus',
      name: '欧律洛科斯',
      position: [3.0, 4.5],
      facing: 3.4,
      entries: [
        { node: 'confronted', when: { locked: 'L-404' } },
        { node: 'seen', when: { has: 'F-thrinacia-first' } },
        { node: 'main' },
      ],
      nodes: [
        {
          id: 'main',
          speaker: '欧律洛科斯',
          text: '（他没有跟你一起往坡上走。他站在原地，看着那片牛群。）\n\n到了。\n\n这是最后一座了，船长。查完这里，你就全知道了。',
          choices: [
            { text: '「你在怕什么？」', goto: 'afraid' },
            { text: '「你死在这里，对吗？」', goto: 'died' },
          ],
        },
        {
          id: 'afraid',
          speaker: '欧律洛科斯',
          text: '我怕你查完以后就不需要我跟着了。\n\n（他笑了一下。）开玩笑的。……一半是玩笑。',
          choices: [{ text: '（结束对话）' }],
        },
        {
          id: 'died',
          speaker: '欧律洛科斯',
          text: '嗯。我死在这里。\n\n祭坛那边有一具还握着刀的，那是我。你去看吧，我不拦你。\n\n刀刃上有个缺口，是我砍崩的。我这辈子没杀过牛，第一次就砍在骨头上了。',
          choices: [{ text: '（结束对话）' }],
        },
        {
          id: 'seen',
          speaker: '欧律洛科斯',
          text: '（他看见杖还亮着，整个人僵了一下。）\n\n你把那一段立起来了。\n\n……我早就跟你说过，我做过两次这样的事。第一次是在门外站着看。第二次不是站着看。',
          choices: [
            { text: '「是你第一个动的手。」', goto: 'admit' },
            { text: '「你说过你会拦着他们。」', trust: -1, goto: 'admit' },
          ],
        },
        {
          id: 'admit',
          speaker: '欧律洛科斯',
          text: '是我。\n\n我不辩解。但我想让你知道我当时在想什么——我在想第二十九天那行字：「船长仍不许，船长说宁可饿死。」\n\n我在想，你说这话的时候，你还有力气说话。而克里托斯那天已经站不起来了。\n\n我不是在替他们出头。我是受不了再看着一个人躺下去。',
          choices: [
            { text: '「我明白。」', trust: 1, goto: 'understood' },
            { text: '「你把他们全害死了。」', trust: -2, goto: 'blamed' },
          ],
        },
        {
          id: 'understood',
          speaker: '欧律洛科斯',
          text: '（他愣了一下，然后很慢地坐到地上。）\n\n十年了。我等这三个字等了十年。\n\n……这不代表我做对了。你别搞错。这只代表我终于可以停下来了。',
          choices: [{ text: '（结束对话）' }],
        },
        {
          id: 'blamed',
          speaker: '欧律洛科斯',
          text: '（他没有还嘴。）\n\n是。我把他们全害死了。\n\n那你写吧。一个字都别替我留。……本来就该是这样。',
          choices: [{ text: '（结束对话）' }],
        },
        {
          id: 'confronted',
          speaker: '欧律洛科斯',
          text: '（他站在你旁边，看着归乡录上他自己的名字。）\n\n写好了。两条都有我——一条说我是那具握着刀的骨头，一条说我是第一个动手的。\n\n（他伸手想碰那一页，手穿过去了。）\n\n谢谢你没有手软。这十年我最怕的就是你手软。',
          choices: [
            { text: '「我还差最后一件事。」', goto: 'last' },
            { text: '（沉默）' },
          ],
        },
        {
          id: 'last',
          speaker: '欧律洛科斯',
          text: '我知道。你还得决定这一段怎么写。\n\n（他看着海。）\n\n船长，最后跟你说一句话，说完我就闭嘴：\n\n这件事里没有一个人是清白的，也没有一个人是坏人。你要是想找一个人来担，随便找哪个都能担得起来。\n\n所以你怎么写都行。但你得知道你写的是什么。',
          choices: [{ text: '（结束对话）' }],
        },
      ],
    },
  ],

  choice: {
    id: 'C-5',
    title: '这一段该怎么写',
    prompt:
      '归乡录翻到了最后一页。前面所有条目都已经落定，改不了了。\n\n这一页不一样——这一页不是填空，是一句话。神明会读这一句，然后决定放你回哪里去。\n\n三十天的饥饿，七头不死的牛，一场没人拦得住的雷。这件事，你打算怎么记？',
    position: [0, -10.4],
    availableWhen: { locked: 'L-406' },
    options: [
      {
        id: 'blame-crew',
        label: '「我的人背弃了他们发过的誓。」',
        outcome:
          '你写下这一句。字迹很稳。\n\n这句话没有一个字是假的——他们确实发过誓，也确实背弃了。\n\n只是你写完抬头的时候，坡上那几个影子都往后退了半步。他们没有反驳，他们只是退开了一点，像是忽然想起自己和你不是一伙的。',
        sets: ['blame_crew'],
        wrath: 1,
        crew: 1,
        trust: -2,
      },
      {
        id: 'blame-self',
        label: '「我睡着了。他们饿了三十天，而我是拿主意的那个。」',
        outcome:
          '你写下这一句，然后又加了一行：「第七天早上，我也吃了。」\n\n写完你合上册子，手在抖。\n\n没有人说话。过了很久，坡上那个瘦得只剩骨头的影子站起来，朝你走了两步，然后所有的影子都朝你走了两步。\n\n他们没有原谅你。他们只是决定跟你一起走。',
        sets: ['blame_self'],
        crew: 3,
        trust: 2,
      },
      {
        id: 'blame-gods',
        label: '「是神明先饿死了我们。」',
        outcome:
          '你写下这一句，写得又深又重，笔尖划破了纸。\n\n这句话也不假。三十天的逆风是神给的，忒瑞西阿斯的警告是神给的，一群不死的牛摆在饿死的人面前——这个安排也是神想出来的。\n\n海面上响了一声，很远，像是有人在很高的地方冷笑了一下。\n\n杖上的光灭了。',
        sets: ['blame_gods'],
        wrath: 4,
        trust: -1,
      },
    ],
  },
}
