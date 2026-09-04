import type { Island } from '../types'

/**
 * 岛 0 —— 洛托法戈斯 · 食忘忧果之岛（教学关）
 *
 * 教学目标，按玩家会自然遇到的顺序排：
 *   1. 走路与检视（沙上足迹就在出生点正前方）
 *   2. 记忆定影是什么（陌生尸体，一段没有推理负担的定影）
 *   3. 证物如何解锁人名（护身符 → 佩里墨得斯出现在下拉框里）
 *   4. 三条一组校验（本岛恰好 3 条，填满即锁定，玩家第一次听见锁定音）
 *   5. 关键抉择不可撤销
 */
export const LOTUS: Island = {
  id: 'lotus',
  index: 0,
  name: '食忘忧果之岛',
  greek: 'ΛΩΤΟΦΑΓΟΙ',
  subtitle: '第一段记忆 · 你在这里第一次弄丢了人',
  arrival: [
    '海雾散开的时候，白沙滩就在眼前，安静得像一张没写过字的纸。',
    '你不记得来过这里。但手里的杖在发烫——摩涅莫绪涅说过，杖发烫的地方，就是你丢过东西的地方。',
    '沙上有脚印。不止一组。',
  ],
  bounds: [17, 13],
  ground: '#d9a05b',
  spawn: [0, 8],
  departure: [0, 11.4],
  departureRequirement: 3,
  terrain: [
    { kind: 'box', position: [-13, -6], size: [7, 5], height: 2.4, color: '#b8834a', solid: true },
    { kind: 'box', position: [12.5, -7], size: [6, 4], height: 1.8, color: '#b8834a', solid: true },
    { kind: 'cylinder', position: [-6.5, -9.5], size: [1.6, 1.6], height: 3.1, color: '#a8763f', solid: true },
    { kind: 'cylinder', position: [7.5, -10], size: [1.4, 1.4], height: 2.6, color: '#a8763f', solid: true },
    { kind: 'box', position: [0, -12.4], size: [30, 2], height: 1.2, color: '#8f6335', solid: true },
  ],
  decorations: [
    { kind: 'wave', position: [-9, 11.5], scale: 1.4 },
    { kind: 'wave', position: [0, 12.2], scale: 1.6 },
    { kind: 'wave', position: [9, 11.5], scale: 1.4 },
    { kind: 'lotus', position: [-4.4, -4.2] },
    { kind: 'lotus', position: [-2.6, -5.8], scale: 0.85 },
    { kind: 'lotus', position: [-6.1, -6.4], scale: 1.15 },
    { kind: 'lotus', position: [-3.2, -7.6], scale: 0.9 },
    { kind: 'lotus', position: [1.4, -6.2], scale: 1.05 },
    { kind: 'lotus', position: [3.6, -4.8], scale: 0.8 },
    { kind: 'olive', position: [10.5, -2.4], scale: 1.2 },
    { kind: 'olive', position: [-11.2, 1.8] },
    { kind: 'rock', position: [6.8, 5.2], scale: 1.3 },
    { kind: 'rock', position: [-8.4, 6.6] },
    { kind: 'rock', position: [13.5, 3.2], scale: 0.9 },
  ],

  evidence: [
    {
      id: 'E-001',
      island: 'lotus',
      kind: 'trace',
      name: '沙上的脚印',
      position: [1.8, 4.6],
      examine: [
        '三组脚印从潮线出发，朝内陆的花丛去。',
        '回来的只有两组。而且这两组回程的脚印踩得很深、很乱——像是有人一边走一边在拖什么东西。',
        '第三组脚印没有回来。它在花丛边缘就停住了，然后原地打了很多转，越踩越深，最后消失。',
      ],
      grantsFacts: ['F-lotus-three'],
    },
    {
      id: 'E-002',
      island: 'lotus',
      kind: 'object',
      name: '半啃的莲果',
      position: [-3.4, -3.2],
      examine: [
        '一枚咬了一半的果子，切面已经氧化成暗褐色，但汁水还没干透。',
        '齿印很小，靠上排牙用力——是个还年轻的人，而且吃得很急。',
        '果子落在花丛外沿，不在里面。他是拿着它往回走的时候才吃的。',
      ],
      grantsFacts: ['F-lotus-fruit'],
    },
    {
      id: 'E-003',
      island: 'lotus',
      kind: 'object',
      name: '刻名的护身符',
      position: [-5.8, -2.1],
      examine: [
        '一块海豚形状的铅牌，穿孔处的皮绳断了，断口毛糙，是被扯断的。',
        '背面用小刀刻着七个字母：ΠΕΡΙΜΗΔΗΣ。',
        '你认得这个名字。掌帆手，睡觉打呼，说自己这辈子没求过任何一位神。',
        '——但你想不起他的脸。',
      ],
      grantsFacts: ['F-lotus-amulet'],
    },
    {
      id: 'E-004',
      island: 'lotus',
      kind: 'inscription',
      name: '倾颓的界碑',
      position: [8.2, -1.4],
      examine: [
        '一块半埋进沙里的石碑，字被风蚀得只剩沟槽，但还读得出来。',
        '「食此花者，忘其归途；不复思归，亦不复苦。」',
        '底下有一行更小的、后来才刻上去的字：「他们并非不幸。是我们不肯让他们留下。」',
      ],
      grantsFacts: ['F-lotus-stone'],
    },
    {
      id: 'E-005',
      island: 'lotus',
      kind: 'trace',
      name: '小艇的缆绳',
      position: [-1.2, 9.4],
      examine: [
        '缆绳断成两截，断口平整——是刀割的，不是磨断的。',
        '关键是割痕的朝向：刀是从艇内往外划的。',
        '割绳的人当时坐在艇上。他不是要留下来，他是要走，而且怕有人拦他。',
      ],
      grantsFacts: ['F-lotus-rope'],
      tableau: 'M-002',
    },
    {
      id: 'E-006',
      island: 'lotus',
      kind: 'body',
      name: '潮线上的陌生人',
      position: [11.6, 7.8],
      examine: [
        '一具已经风干的尸体，卡在两块礁石之间，姿势很松弛，像是躺下来睡的。',
        '衣料的织法你没见过，比你们的旧得多——这个人在这里躺了很多年，不是你的人。',
        '他手里攥着一枝莲花，花还是完整的。他没有挣扎过。',
        '杖在发烫。这里有一段还没散掉的记忆。',
      ],
      grantsFacts: ['F-lotus-stranger'],
      tableau: 'M-001',
    },
  ],

  tableaux: [
    {
      id: 'M-001',
      island: 'lotus',
      title: '潮线上的旅人',
      echo: '别拉我。我总算不难受了。',
      echoSpeaker: '陌生的旅人',
      center: [11.6, 7.8],
      grantsFacts: ['F-lotus-walked'],
      figures: [
        {
          id: 'stranger',
          label: '陌生的旅人',
          position: [11.6, 7.2],
          facing: 0.2,
          pose: 'stand',
          detail: '他正朝海里走，水已经没到膝盖。脸上的表情是放松的，甚至是高兴的。手里那枝莲花举得很高，怕沾湿。',
        },
        {
          id: 'companion',
          label: '拉着他的人',
          position: [10.2, 8.6],
          facing: -0.9,
          pose: 'reach',
          detail: '另一个人从后面抓他的胳膊，身子往后仰，脚在沙里犁出两道沟。他抓不住——那个人的袖子是空的，人已经往前去了。',
        },
      ],
    },
    {
      id: 'M-002',
      island: 'lotus',
      title: '三人上岸',
      echo: '就尝一口。尝一口能怎么样？',
      echoSpeaker: '一个还没忘记自己的人',
      center: [-1.2, 4.2],
      grantsFacts: ['F-lotus-scene'],
      unlocksOptions: ['perimedes'],
      figures: [
        {
          id: 'walker-a',
          label: '走在最前的人',
          position: [-2.8, 2.4],
          facing: 3.0,
          pose: 'stand',
          detail: '他已经在嚼了。腮帮鼓着，右手还捏着半个果子——就是你在花丛边捡到的那半个。脖子上空空的，皮绳的印子还红着。',
        },
        {
          id: 'walker-b',
          label: '中间的人',
          position: [-0.6, 3.6],
          facing: 3.1,
          pose: 'stand',
          detail: '他回头在看船的方向，一只手挡在眼睛上方。他还没吃。',
        },
        {
          id: 'walker-c',
          label: '落在后面的人',
          position: [1.2, 5.0],
          facing: 2.8,
          pose: 'kneel',
          detail: '他蹲下来在系鞋带，或者只是在拖延。他的表情跟另外两个不一样——他知道这地方不对劲。',
        },
      ],
    },
  ],

  ledger: [
    {
      id: 'L-001',
      island: 'lotus',
      prompt: '沙里那枚刻名的护身符，属于哪一位同船者？',
      slots: [{ label: '他是', pool: 'crew', answer: 'perimedes' }],
    },
    {
      id: 'L-002',
      island: 'lotus',
      prompt: '那个记不起自己名字的人，真实身份是谁？',
      slots: [{ label: '他是', pool: 'crew', answer: 'perimedes' }],
    },
    {
      id: 'L-003',
      island: 'lotus',
      prompt: '礁石间那具陌生的尸体，死因是什么？',
      slots: [{ label: '死于', pool: 'lotus-cause', answer: 'walked-in' }],
    },
  ],

  npcs: [
    {
      id: 'eurylochus',
      name: '欧律洛科斯',
      position: [4.2, 6.4],
      facing: 3.4,
      entries: [
        { node: 'after-lock', when: { lockedCount: 3 } },
        { node: 'has-amulet', when: { has: 'F-lotus-amulet' } },
        { node: 'intro' },
      ],
      nodes: [
        {
          id: 'intro',
          speaker: '欧律洛科斯',
          text: '你又忘了我是谁，是不是。……没关系。我是欧律洛科斯，你妹妹的丈夫，你的副手。我已经死了，这你大概也忘了。',
          choices: [
            { text: '「你为什么还跟着我？」', goto: 'why' },
            { text: '「这座岛上发生过什么？」', goto: 'what' },
            { text: '「杖为什么会发烫？」', goto: 'staff' },
          ],
        },
        {
          id: 'why',
          speaker: '欧律洛科斯',
          text: '因为我回不去。我们十二个都回不去——没人替我们把话说完，冥府就不收。你查明白一个，就有一个能走。',
          choices: [
            { text: '「那我从哪查起？」', goto: 'what' },
            { text: '「……我会查完的。」', trust: 1, goto: 'what' },
          ],
        },
        {
          id: 'what',
          speaker: '欧律洛科斯',
          text: '三个人上岸打水。回来两个。第三个我们找了一整天，找到的时候他坐在花丛里，笑着问我们是谁。',
          choices: [
            { text: '「他叫什么？」', goto: 'name-unknown' },
            { text: '「你们把他带回去了吗？」', goto: 'dragged' },
          ],
        },
        {
          id: 'name-unknown',
          speaker: '欧律洛科斯',
          text: '你在问我？我记得的东西比你还少——我死在后面几座岛上。名字得你自己去挖。他身上应该掉了点什么。',
          choices: [{ text: '（结束对话）' }],
        },
        {
          id: 'dragged',
          speaker: '欧律洛科斯',
          text: '你下令把他绑在桨座下面。他一路都很平静，只是不停地问我们要去哪。到第三天他不问了。',
          choices: [{ text: '（结束对话）' }],
        },
        {
          id: 'staff',
          speaker: '欧律洛科斯',
          text: '杖会认死人和死人留下的东西。它烫，就说明那件东西上头还挂着一段没散的记忆。你举着它站过去，那一刻会重新立起来。',
          choices: [
            { text: '「我能改变它吗？」', goto: 'cannot' },
            { text: '「知道了。」', goto: 'what' },
          ],
        },
        {
          id: 'cannot',
          speaker: '欧律洛科斯',
          text: '不能。你只能看。这十年你已经过完了一遍——现在你只是回来把它读懂。',
          choices: [{ text: '（结束对话）' }],
        },
        {
          id: 'has-amulet',
          speaker: '欧律洛科斯',
          text: '海豚牌子……对，是他的。他老说这玩意儿不管用，可从来没摘下来过。原来是被扯断的。',
          choices: [
            { text: '「所以忘名的那个就是他。」', goto: 'confirm' },
            { text: '「他后来怎么了？」', goto: 'dragged' },
          ],
        },
        {
          id: 'confirm',
          speaker: '欧律洛科斯',
          text: '你写下来。写在归乡录上，别只是嘴上说。神明不听嘴上说的。',
          choices: [{ text: '（结束对话）' }],
        },
        {
          id: 'after-lock',
          speaker: '欧律洛科斯',
          text: '刚才那一声……我听见了。你写对了三条，它们就再也改不了了。他刚刚从我旁边走过去，朝东边。他冲我点了下头。',
          choices: [
            { text: '「还剩十一个。」', trust: 1, goto: 'eleven' },
            { text: '（沉默）' },
          ],
        },
        {
          id: 'eleven',
          speaker: '欧律洛科斯',
          text: '还剩十一个。往南走，那边有座岛，洞很深。你在那儿干的事……你自己去看吧。',
          choices: [{ text: '（结束对话）' }],
        },
      ],
    },
    {
      id: 'nameless',
      name: '忘了名字的人',
      position: [-7.6, -0.8],
      facing: 1.2,
      entries: [
        { node: 'told', when: { locked: 'L-002' } },
        { node: 'amulet', when: { has: 'F-lotus-amulet' } },
        { node: 'first' },
      ],
      nodes: [
        {
          id: 'first',
          speaker: '？？？',
          text: '……你好。你是来接我的吗？我好像在等一条船。也可能不是。总之我在等。',
          choices: [
            { text: '「你叫什么名字？」', goto: 'no-name' },
            { text: '「你在等谁？」', goto: 'waiting' },
          ],
        },
        {
          id: 'no-name',
          speaker: '？？？',
          text: '我想过这个问题。想了很久。……我知道我有名字，就像我知道我有影子一样。可是我低头看，影子在，名字不在。',
          choices: [{ text: '（结束对话）' }],
        },
        {
          id: 'waiting',
          speaker: '？？？',
          text: '一个会喊我名字的人吧。我想只要有人喊出来，我就能想起来了。可是这些年谁也没来。',
          choices: [{ text: '（结束对话）' }],
        },
        {
          id: 'amulet',
          speaker: '？？？',
          text: '（他看着你手里那块海豚形的铅牌，眼睛慢慢睁大了。）那个……那个我见过。那个是不是我的？',
          choices: [
            { text: '「上面刻着佩里墨得斯。」', goto: 'reveal' },
            { text: '「我还不确定。」', goto: 'unsure' },
          ],
        },
        {
          id: 'unsure',
          speaker: '？？？',
          text: '哦。……那你确定了以后，回来告诉我一声，好吗？我一直在这儿。我哪也去不了。',
          choices: [{ text: '（结束对话）' }],
        },
        {
          id: 'reveal',
          speaker: '佩里墨得斯',
          text: '佩里墨得斯。佩里墨得斯。……对，是这个。是这个声音。（他捂住脸，肩膀在抖。）我原来是有名字的。',
          choices: [
            { text: '「你是我的掌帆手。」', trust: 1, goto: 'sail' },
            { text: '「对不起，我来得太晚了。」', goto: 'late' },
          ],
        },
        {
          id: 'sail',
          speaker: '佩里墨得斯',
          text: '掌帆手……难怪我总觉得手里该有根绳子。船长，我是不是给你添了很大的麻烦？',
          choices: [{ text: '（结束对话）' }],
        },
        {
          id: 'late',
          speaker: '佩里墨得斯',
          text: '晚也没关系。你到底还是来了。有些人是没人来的——你看见礁石那边那个了吗？他等了几百年，没人知道他叫什么。',
          choices: [{ text: '（结束对话）' }],
        },
        {
          id: 'told',
          speaker: '佩里墨得斯',
          text: '写上去了？那我就能走了。……船长，最后一件事：别为我难过。那朵花不疼的。真的不疼。',
          choices: [{ text: '（结束对话）' }],
        },
      ],
    },
  ],

  choice: {
    id: 'C-1',
    title: '花丛边的决定',
    prompt:
      '佩里墨得斯站在花丛边上，等你开口。当年你在这里做过一个决定，现在你要重新做一次——这一次，它会决定他能不能跟你回去。',
    position: [-3.0, 0.8],
    availableWhen: { locked: 'L-002' },
    options: [
      {
        id: 'drag',
        label: '把他绑上船带走',
        outcome:
          '你伸手抓住他的手腕，像当年那样。他没有挣扎，只是很轻地说了句「好」。\n\n绳子勒进皮肉的时候他也没喊。他跟着你上了船，也跟着你回了海上——这一次，他知道自己是谁。',
        sets: ['lotus_dragged'],
        crew: 1,
        trust: 1,
      },
      {
        id: 'leave',
        label: '让他留在这里',
        outcome:
          '你松开手。他朝花丛走了两步，又回头看你一眼，然后就没再回头。\n\n他会一直留在这座岛上，一直很平静。你替他写完了那几行字，但他自己不打算用。',
        sets: ['lotus_left'],
      },
      {
        id: 'taste',
        label: '你也尝一口那朵花',
        outcome:
          '你摘下一朵，放进嘴里。汁水是甜的，比你想象的甜得多。\n\n有那么一瞬间，海的方向、船的方向、伊萨卡的方向，全都变得无所谓了。\n\n你吐了出来。但味道留在舌头上，而且不肯走。',
        sets: ['ate_lotus'],
        wrath: 1,
        trust: -1,
      },
    ],
  },
}
