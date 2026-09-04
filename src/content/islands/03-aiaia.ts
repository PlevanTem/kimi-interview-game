import type { Island } from '../types'

/**
 * 岛 3 —— 埃阿亚 · 女巫基尔克之岛
 *
 * 本岛是全作最纯粹的《Obra Dinn》式指认题：三头猪，三件随身物，你必须靠物件
 * 把三个名字对上号。真正的刀子在 L-303 与 L-307 —— 两条走完全不同证据链的
 * 条目，指向同一个人。玩家会先认出第三头猪是谁，再发现那头猪里其实早就没人了。
 */
export const AIAIA: Island = {
  id: 'aiaia',
  index: 3,
  name: '女巫的林中岛',
  greek: 'ΑΙΑΙΗ',
  subtitle: '第四段记忆 · 你在这里第一次分不清谁还是人',
  arrival: [
    '林子里安静得不正常。没有鸟。狼和狮子在树影里踱步，看见你也不扑，只是跟着走。',
    '它们的眼睛不像野兽的眼睛。它们看你的方式，像是在等你先开口。',
    '林子中央有一缕烟，直上直下，一点都不歪——这一带没有风。',
  ],
  bounds: [16, 15],
  ground: '#4e5b3f',
  spawn: [0, 12],
  departure: [0, 13.6],
  departureRequirement: 5,
  terrain: [
    { kind: 'box', position: [0, -6], size: [9, 7], height: 0.35, color: '#7d6a4c', solid: false },
    { kind: 'box', position: [-9.5, -1], size: [6, 6], height: 0.3, color: '#5c4a35', solid: false },
    { kind: 'box', position: [9.5, -3], size: [5.5, 5], height: 0.28, color: '#5c4a35', solid: false },
    { kind: 'box', position: [0, -13.5], size: [32, 4], height: 5, color: '#3a4531', solid: true },
    { kind: 'cylinder', position: [-13, 6], size: [2.0, 2.0], height: 4.5, color: '#3f4a35', solid: true },
    { kind: 'cylinder', position: [13, 6], size: [2.0, 2.0], height: 4.5, color: '#3f4a35', solid: true },
  ],
  decorations: [
    { kind: 'olive', position: [-6.5, 6.5], scale: 1.3 },
    { kind: 'olive', position: [6.0, 7.5], scale: 1.1 },
    { kind: 'olive', position: [-11.0, 10.0] },
    { kind: 'olive', position: [10.5, 10.5], scale: 1.2 },
    { kind: 'olive', position: [3.5, 3.0], scale: 0.9 },
    { kind: 'flame', position: [0, -2.2], scale: 0.9 },
    { kind: 'urn', position: [-3.0, -1.6] },
    { kind: 'urn', position: [2.8, -1.4], scale: 0.9 },
    { kind: 'rock', position: [-8.0, 3.5] },
    { kind: 'rock', position: [7.5, 1.5], scale: 1.2 },
  ],

  evidence: [
    {
      id: 'E-301',
      island: 'aiaia',
      kind: 'object',
      name: '断齿的木梳',
      position: [-8.5, -1.5],
      examine: [
        '猪圈的泥里踩着一把黄杨木梳，缺了四根齿，缺口是新旧不一的——断一根补一根地用了很多年。',
        '梳背上刻着一道一道的短痕，数一数是十七道。',
        '船上最年轻的那个有这个习惯：每喝醉一次就在梳子上划一道，说要拿给他母亲看，证明自己在外面也没学坏。',
      ],
      grantsFacts: ['F-aiaia-comb'],
    },
    {
      id: 'E-302',
      island: 'aiaia',
      kind: 'object',
      name: '打着水手结的腰带',
      position: [-10.5, -3.5],
      examine: [
        '一条皮腰带，扣子丢了，主人用一个水手结代替——好解，一拉就开。',
        '你在别的地方见过一模一样的结法。就在那只风袋的银绳上。',
        '腰带内侧被磨出一个圆形的浅坑，大小正好是一枚戒指长年别在里面的样子。',
      ],
      grantsFacts: ['F-aiaia-belt'],
    },
    {
      id: 'E-303',
      island: 'aiaia',
      kind: 'object',
      name: '刻名的骨笛',
      position: [-7.5, -4.5],
      examine: [
        '一支羊胫骨做的笛子，七个孔，孔沿被嘴唇磨得发亮。',
        '笛身上刻着 ΜΙΣΗΝΟΣ ——弥塞诺斯，号手。',
        '笛子是断的。不是踩断的，断口在中间，是从两头往中间掰断的。',
        '一头猪掰不断一支骨笛。掰断它的时候，这个人还有手。',
      ],
      grantsFacts: ['F-aiaia-flute'],
    },
    {
      id: 'E-304',
      island: 'aiaia',
      kind: 'object',
      name: '草药园里的坑',
      position: [9.0, -3.0],
      examine: [
        '药园齐整得像用尺子量过。只有一处例外：一株连根拔掉的空坑，泥还是松的。',
        '坑边残留着一点乳白色的根须，根是白的，花是黑的。',
        '莫吕草。凡人拔不动它，只有神能。',
        '整个园子里，这样的坑只有一个。也就是说，只有一个人拿到过它。',
      ],
      grantsFacts: ['F-aiaia-moly'],
    },
    {
      id: 'E-305',
      island: 'aiaia',
      kind: 'trace',
      name: '石屋地上的酒渍与碗',
      position: [0, -3.2],
      examine: [
        '地上摆着十二只碗，围成一圈。十一只都空了，碗底有一层暗红色的沉淀。',
        '第十二只是满的，摆得离圈子稍微远一点，像是有人端起来又放下了。',
        '门槛内侧的地上有一道拖拽的痕迹，从门口一直到圈子中央——有人是被拽进来的。',
        '门槛外侧没有第十二个人的脚印。他从来没进来过。',
      ],
      grantsFacts: ['F-aiaia-bowls'],
      tableau: 'M-301',
    },
    {
      id: 'E-306',
      island: 'aiaia',
      kind: 'object',
      name: '基尔克的织机',
      position: [3.5, -4.8],
      examine: [
        '一架很大的立式织机，织到一半停住了。织物上的图案是连续的，从左往右读：',
        '一群人走进一扇门。门里的人举着碗。碗放下之后，人的轮廓开始往下塌，四条腿着地。',
        '最右边一格还没织完，只有底纹：一个人形，但是空的——只有轮廓线，里面什么都没填。',
        '织到这一格的时候，织工把梭子放下了，再没拿起来过。',
      ],
      grantsFacts: ['F-aiaia-loom'],
    },
    {
      id: 'E-307',
      island: 'aiaia',
      kind: 'body',
      name: '屋角的骸骨',
      position: [-2.8, -7.6],
      examine: [
        '石屋最里面的角落，一堆很小的骨头，蜷成一团，被稻草半盖着。',
        '骨头的形状不对：一部分是人的，一部分不是。指骨的末端变宽变钝，正在往蹄子的方向长，但长到一半停住了。',
        '他死在中间那一步上。既不是人，也没能变成猪。',
        '骨头旁边压着半支断掉的骨笛——另外半支你在猪圈里见过。',
      ],
      grantsFacts: ['F-aiaia-bones'],
      tableau: 'M-303',
    },
    {
      id: 'E-308',
      island: 'aiaia',
      kind: 'inscription',
      name: '门楣上的刻字',
      position: [0, -2.0],
      examine: [
        '石屋门楣上刻着一行字，很旧了：ΚΙΡΚΗ。',
        '下面还有一行，字迹完全不同，是用刀尖草草划上去的，划得很深，像是划的人在发抖：',
        '「进门之前先数人。出门之后再数一次。」',
        '划这行字的人认得字。船上认得字的人不多。',
      ],
      grantsFacts: ['F-aiaia-lintel'],
      tableau: 'M-302',
    },
  ],

  tableaux: [
    {
      id: 'M-301',
      island: 'aiaia',
      title: '十二只碗',
      echo: '喝吧。路还长着呢。',
      echoSpeaker: '一个很好听的女声',
      center: [0, -3.2],
      grantsFacts: ['F-aiaia-scene'],
      figures: [
        {
          id: 'circe',
          label: '举着壶的女人',
          position: [0, -5.4],
          facing: 0,
          pose: 'stand',
          detail: '她站在圈子中央，正在往最后一只碗里倒。她的表情很平静，像是在做一件做过很多次的事。',
        },
        {
          id: 'drinker-a',
          label: '第一个喝的人',
          position: [-2.4, -2.6],
          facing: 3.0,
          pose: 'kneel',
          detail: '他已经喝完了，碗还举在嘴边。头发上别着一把断齿的木梳。',
        },
        {
          id: 'drinker-b',
          label: '正在喝的人',
          position: [2.2, -2.4],
          facing: 3.3,
          pose: 'stand',
          detail: '他腰上系着一条打水手结的皮带。他喝得很快，像是渴了很久。',
        },
        {
          id: 'drinker-c',
          label: '还没喝的人',
          position: [0.4, -1.2],
          facing: 3.14,
          pose: 'stand',
          detail:
            '他一手端着碗，一手还攥着一支骨笛。他在看门口的方向——他是唯一一个注意到少了个人的。',
        },
        {
          id: 'doorway',
          label: '门口的空处',
          position: [0, 0.8],
          facing: 0,
          pose: 'stand',
          detail: '门开着，门外的光里没有人。第十二只碗放在门槛内侧，满的。',
        },
      ],
    },
    {
      id: 'M-302',
      island: 'aiaia',
      title: '没有进门的人',
      echo: '我不进去。你们要进你们进。我就在这儿等。',
      echoSpeaker: '一个熟悉的声音',
      center: [0, 0.8],
      grantsFacts: ['F-aiaia-outside'],
      figures: [
        {
          id: 'refuser',
          label: '站在门外的人',
          position: [0.6, 1.8],
          facing: 3.14,
          pose: 'stand',
          detail:
            '他背靠着门柱，两手抱在胸前，眼睛盯着自己的脚。门里的人在叫他，他没有抬头。\n\n你认得这张脸。他现在就在林子外面等你。',
        },
        {
          id: 'carver',
          label: '正在门楣上刻字的人',
          position: [-1.4, 1.4],
          facing: 3.6,
          pose: 'reach',
          detail:
            '同一个人。定影把两个时刻叠在了一起——他后来又回到这扇门前，踮着脚，用刀尖在门楣上划字。他的手在抖。',
        },
      ],
    },
    {
      id: 'M-303',
      island: 'aiaia',
      title: '未归的形体',
      echo: '（没有话。只有一段很短的、走了调的笛声，吹到一半断了。）',
      echoSpeaker: '——',
      center: [-2.8, -7.6],
      grantsFacts: ['F-aiaia-death'],
      figures: [
        {
          id: 'dying',
          label: '变形到一半的人',
          position: [-2.8, -7.6],
          facing: 1.2,
          pose: 'kneel',
          detail:
            '他跪在角落里，一半的身体已经不是人的了。他两只手——还是手——正在把一支骨笛往两边掰。\n\n他在赶时间。他要在还有手的时候把它掰断，好让后来的人认出这是他。',
        },
        {
          id: 'witch-watching',
          label: '站在门口的女人',
          position: [-2.8, -4.6],
          facing: 4.71,
          pose: 'stand',
          detail:
            '她站在门口看着，没有过去。她的手举起来一半又放下了。\n\n这是她第一次遇到药起效到一半人就断气的情况。她不知道该怎么办。',
        },
      ],
    },
  ],

  ledger: [
    {
      id: 'L-301',
      island: 'aiaia',
      prompt: '猪圈里那把断齿木梳的主人是谁？',
      slots: [{ label: '他是', pool: 'crew', answer: 'elpenor' }],
    },
    {
      id: 'L-302',
      island: 'aiaia',
      prompt: '那条打着水手结的腰带，属于谁？',
      slots: [{ label: '他是', pool: 'crew', answer: 'kritos' }],
    },
    {
      id: 'L-303',
      island: 'aiaia',
      prompt: '那支被掰断的骨笛，属于谁？',
      slots: [{ label: '他是', pool: 'crew', answer: 'misenus' }],
    },
    {
      id: 'L-304',
      island: 'aiaia',
      prompt: '十二个人里，没有进那扇门的是谁？',
      slots: [{ label: '他是', pool: 'crew', answer: 'eurylochus' }],
      appearsWhen: { has: 'F-aiaia-bowls' },
    },
    {
      id: 'L-305',
      island: 'aiaia',
      prompt: '奥德修斯为什么没有变形？',
      slots: [{ label: '因为', pool: 'aiaia-reason', answer: 'moly' }],
    },
    {
      id: 'L-306',
      island: 'aiaia',
      prompt: '为什么有一头猪永远变不回人？',
      slots: [{ label: '因为', pool: 'aiaia-stuck', answer: 'soul-gone' }],
      appearsWhen: { has: 'F-aiaia-death' },
    },
    {
      id: 'L-307',
      island: 'aiaia',
      prompt: '石屋角落那具变形到一半的骸骨是谁？',
      slots: [{ label: '他是', pool: 'crew', answer: 'misenus' }],
      appearsWhen: { has: 'F-aiaia-bones' },
    },
  ],

  npcs: [
    {
      id: 'circe',
      name: '基尔克',
      position: [4.5, -1.0],
      facing: 4.2,
      entries: [
        { node: 'knows', when: { locked: 'L-307' } },
        { node: 'opened', when: { lockedCount: 12 } },
        { node: 'first' },
      ],
      nodes: [
        {
          id: 'first',
          speaker: '基尔克',
          text: '（她坐在织机前，没有回头。）\n\n又是一个从海上来的。你们身上都是一个味道——盐，还有一点点想家想到发馊的味道。\n\n我不接客了。要药自己去园子里拔，拔得动算你的。',
          choices: [
            { text: '「我来找三个人。」', goto: 'three' },
            { text: '「那些狼和狮子原来是人吗？」', goto: 'beasts' },
          ],
        },
        {
          id: 'beasts',
          speaker: '基尔克',
          text: '有些是。有些一直就是狼。\n\n区别不大——我把人变成什么，取决于他进门时本来更像什么。你的人变成猪，不是我挑的，是他们自己挑的。\n\n（她终于转过来看你。）你当年没变。我到现在还在想为什么。',
          choices: [{ text: '（结束对话）' }],
        },
        {
          id: 'three',
          speaker: '基尔克',
          text: '猪圈里现在还有三头。你自己去看。\n\n我劝你别抱希望——它们已经不认人了。变回去这件事有时限的，过了就过了。',
          choices: [
            { text: '「时限是什么？」', goto: 'limit' },
            { text: '「我要知道它们原来是谁。」', goto: 'who' },
          ],
        },
        {
          id: 'limit',
          speaker: '基尔克',
          text: '魂还在身体里的时候，怎么变都能变回来。魂一走，剩下的就只是一副还在喘气的壳。\n\n壳可以一直活着。它会吃，会睡，会哼哼。但你叫它名字，它不会抬头。',
          choices: [{ text: '（结束对话）' }],
        },
        {
          id: 'who',
          speaker: '基尔克',
          text: '我不知道它们是谁。我从来不问名字——十二个人进来，我看见的是十二个渴了的人。\n\n它们身上掉的东西我都留着，堆在圈边上。你想认，自己去认。这本来就该是你的活。',
          choices: [{ text: '（结束对话）' }],
        },
        {
          id: 'opened',
          speaker: '基尔克',
          text: '你写了不少东西在那本册子上。我看得见——写下去的字会发光，你自己看不见。\n\n（她放下梭子。）说吧。你想问什么。',
          choices: [
            { text: '「我当年为什么没变？」', goto: 'why-not-me' },
            { text: '「织机上最后那一格，你为什么不织了？」', goto: 'loom' },
          ],
        },
        {
          id: 'why-not-me',
          speaker: '基尔克',
          text: '因为有人在半路上拦住了你，塞给你一株黑花白根的草。\n\n那株草我园子里只少了一棵。凡人的手拔不动它——所以拦你的不是人。\n\n他为什么帮你，你得去问他。反正不是因为你讨人喜欢。',
          choices: [{ text: '（结束对话）' }],
        },
        {
          id: 'loom',
          speaker: '基尔克',
          text: '因为我不知道最后那一格该织什么。\n\n那一格是一个变到一半就停住的人。我织了一半就发现我没法给他填颜色——他不是人的颜色，也不是猪的颜色。\n\n我在这架机子前面坐了很多年。你要是能告诉我他叫什么，我就能织完。',
          choices: [{ text: '（结束对话）' }],
        },
        {
          id: 'knows',
          speaker: '基尔克',
          text: '（她站起来了。这是你见她第一次站起来。）\n\n弥塞诺斯。\n\n……我记住了。谢谢你。这件事压了我很久——不是愧疚，我不懂那个。是"没写完"，我受不了没写完的东西。',
          choices: [
            { text: '「那第三头猪呢？」', goto: 'the-pig' },
            { text: '「你本来可以救他的。」', goto: 'blame-her' },
          ],
        },
        {
          id: 'the-pig',
          speaker: '基尔克',
          text: '圈里那头？那里头没有人了，很多年前就没有了。\n\n它现在是一头真正的猪，活得比它当人的时候踏实。你要是想让它"变回来"，变回来的会是一具尸体。',
          choices: [{ text: '（结束对话）' }],
        },
        {
          id: 'blame-her',
          speaker: '基尔克',
          text: '是。我本来可以。\n\n我站在门口看了大概十息。十息里我想了三个办法，每个都可能有用。然后他就不动了。\n\n你是不是也有过这样的十息？（她看着你。）在洞里，在船尾，在牛群那边的山洞里。',
          choices: [{ text: '（结束对话）' }],
        },
      ],
    },
    {
      id: 'pig',
      name: '猪圈里的第三头猪',
      position: [-9.0, -2.5],
      facing: 1.0,
      entries: [{ node: 'only' }],
      nodes: [
        {
          id: 'only',
          speaker: '（第三头猪）',
          text: '（它抬起头看了你一眼，又低下去继续拱食槽。）\n\n（你叫了一声名字。它没有反应——不是听不懂的那种没反应，是根本没听见的那种。）\n\n（它身上很干净。有人一直在给它梳毛。）',
          choices: [
            { text: '（把手放在它背上）', goto: 'touch' },
            { text: '（走开）' },
          ],
        },
        {
          id: 'touch',
          speaker: '（第三头猪）',
          text: '（它没有躲。它站着让你摸了一会儿，然后打了个喷嚏，走开去喝水了。）\n\n（杖一点都不烫。这里没有记忆——一段记忆需要有人来记着，而这具身体里没有人。）',
          choices: [{ text: '（结束对话）' }],
        },
      ],
    },
    {
      id: 'eurylochus',
      name: '欧律洛科斯',
      position: [6.5, 6.0],
      facing: 3.0,
      entries: [
        { node: 'caught', when: { has: 'F-aiaia-outside' } },
        { node: 'main' },
      ],
      nodes: [
        {
          id: 'main',
          speaker: '欧律洛科斯',
          text: '（他站得离林子中央很远。）\n\n这座岛我可以陪你走，但那扇门我不进。我说过一次了。',
          choices: [
            { text: '「你上次也没进，对吧。」', goto: 'dodge' },
            { text: '「进去的有几个？」', goto: 'count' },
          ],
        },
        {
          id: 'dodge',
          speaker: '欧律洛科斯',
          text: '……我说过我在船上守着。\n\n（他看别处。）你查你的，别查我。我有什么好查的。',
          choices: [{ text: '（结束对话）' }],
        },
        {
          id: 'count',
          speaker: '欧律洛科斯',
          text: '十二只碗，你数过了吧。十一只是空的。\n\n（他停了一下。）你数碗，比数人准。',
          choices: [{ text: '（结束对话）' }],
        },
        {
          id: 'caught',
          speaker: '欧律洛科斯',
          text: '（他看见你手里的杖还亮着，脸色变了。）\n\n你把门口那一段立起来了。\n\n……好吧。是我。我站在门外，他们在里面叫我，我一步都没动。',
          choices: [
            { text: '「你救了你自己。」', trust: 1, goto: 'saved' },
            { text: '「你眼看着他们进去。」', trust: -1, goto: 'watched' },
            { text: '「门楣上那行字也是你刻的。」', goto: 'carved' },
          ],
        },
        {
          id: 'saved',
          speaker: '欧律洛科斯',
          text: '我救了我自己，然后跑回船上告诉你。你带着剑冲下来的时候，我拦在你前面说别去。\n\n你把我推开了。你去了，你还把他们弄回来了大半。\n\n所以我到底是对的还是错的？我这十年就想这一件事，想不明白。',
          choices: [{ text: '（结束对话）' }],
        },
        {
          id: 'watched',
          speaker: '欧律洛科斯',
          text: '（他没有反驳。）\n\n是。我看着。\n\n我这辈子做过两次这样的事：一次在这扇门外，一次在太阳神的牛群边上。区别是第二次我不是站着看——第二次是我先动的手。',
          choices: [{ text: '（结束对话）' }],
        },
        {
          id: 'carved',
          speaker: '欧律洛科斯',
          text: '「进门之前先数人，出门之后再数一次。」\n\n是我刻的。我刻完手抖了半天。\n\n我刻它不是为了警告后来的人，船长。我是刻给我自己看的——我想证明我当时不是怕，我是在数人。\n\n没用。刻上去也没用。',
          choices: [{ text: '（结束对话）' }],
        },
      ],
    },
  ],

  choice: {
    id: 'C-4',
    title: '猪圈边的决定',
    prompt:
      '基尔克站在织机旁边等你。第三头猪在食槽边上安安静静地吃着。\n\n她说过了：里面已经没有人。但她也说过，她可以试。',
    position: [-9.5, -5.0],
    availableWhen: { locked: 'L-303' },
    options: [
      {
        id: 'restore',
        label: '求她把弥塞诺斯变回来，代价是你留在这座岛上',
        outcome:
          '她试了。她试了整整一年——你在这座岛上住了一年，每天看她往那具身体里唤一个不在的人。\n\n最后变回来的是一具人形的尸体，安安静静躺在稻草上，手里没有笛子。\n\n你亲手把他埋了，在门槛外面，刻了名字。你花了一年，换回一座坟。\n\n但那天夜里，有一个影子第一次走出了那扇门。',
        sets: ['aiaia_restored'],
        crew: 2,
        trust: 1,
      },
      {
        id: 'take',
        label: '把它带上船',
        outcome:
          '你把它牵上船。它一路都很安静，吃得很好。\n\n第三天夜里它挣脱了绳子，从船舷跳了下去。你听见落水声的时候已经来不及了。\n\n它不是要逃。它只是一头猪，而猪不知道船外面是海。',
        sets: ['aiaia_took'],
      },
      {
        id: 'end-it',
        label: '结束它',
        outcome:
          '你走进猪圈。它抬头看了你一眼，又低下去。\n\n事情很快，它没有叫。\n\n基尔克在门口看着，一句话没说。等你出来的时候，她递给你一块布擦手，然后说了一句：\n\n「它本来不难受的。难受的是你。」',
        sets: ['aiaia_killed'],
        wrath: 1,
        trust: -2,
      },
    ],
  },
}
