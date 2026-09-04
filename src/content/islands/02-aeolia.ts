import type { Island } from '../types'

/**
 * 岛 2 —— 埃俄利亚 · 风王的浮岛
 *
 * 本岛的推理形状是《Obra Dinn》式的"间接指认"：M-202 只给你一双手，脸被挡住。
 * 你必须靠家书里一句闲话（谁总在擦铜戒）把这双手接到一个名字上。
 * 证物之间是链式的，单看任何一件都没有意义。
 */
export const AEOLIA: Island = {
  id: 'aeolia',
  index: 2,
  name: '风王的浮岛',
  greek: 'ΑΙΟΛΙΑ',
  subtitle: '第三段记忆 · 你在这里离家最近，也输得最彻底',
  arrival: [
    '整座岛围着一圈青铜的墙，被海风擦了不知多少年，亮得能照出人影。',
    '墙里有十二间风室，门都关着。贴上去能听见里面有东西在转，很有耐心地转。',
    '中央的台座是空的。上面有一个圆形的凹痕，是某种很大的袋子长年压出来的。',
  ],
  bounds: [16, 14],
  ground: '#8a8f7d',
  spawn: [0, 11],
  departure: [0, 12.8],
  departureRequirement: 4,
  terrain: [
    { kind: 'box', position: [-13.5, 0], size: [4, 26], height: 6.5, color: '#6f7a63', solid: true },
    { kind: 'box', position: [13.5, 0], size: [4, 26], height: 6.5, color: '#6f7a63', solid: true },
    { kind: 'box', position: [0, -13], size: [30, 4], height: 7, color: '#5f6a55', solid: true },
    { kind: 'cylinder', position: [0, -2], size: [2.4, 2.4], height: 0.45, color: '#a08a4e', solid: false },
    { kind: 'box', position: [-8, -8.5], size: [3.2, 3.2], height: 4.2, color: '#6f7a63', solid: true },
    { kind: 'box', position: [-3, -9.5], size: [3.2, 3.2], height: 4.2, color: '#6f7a63', solid: true },
    { kind: 'box', position: [3, -9.5], size: [3.2, 3.2], height: 4.2, color: '#6f7a63', solid: true },
    { kind: 'box', position: [8, -8.5], size: [3.2, 3.2], height: 4.2, color: '#6f7a63', solid: true },
  ],
  decorations: [
    { kind: 'column', position: [-6.5, 3.5], scale: 1.2 },
    { kind: 'column', position: [6.5, 3.5], scale: 1.2 },
    { kind: 'column', position: [-6.5, -3.5], scale: 1.2 },
    { kind: 'column', position: [6.5, -3.5], scale: 1.2 },
    { kind: 'urn', position: [-2.2, -4.6] },
    { kind: 'urn', position: [2.4, -4.4], scale: 0.9 },
    { kind: 'wave', position: [-10, 12.5], scale: 1.3 },
    { kind: 'wave', position: [10, 12.5], scale: 1.3 },
    { kind: 'rock', position: [11.5, 8.5], scale: 1.6 },
    { kind: 'rock', position: [-11.0, 7.5], scale: 1.2 },
  ],

  evidence: [
    {
      id: 'E-201',
      island: 'aeolia',
      kind: 'object',
      name: '风袋的银绳',
      position: [0, -3.8],
      examine: [
        '一根三指粗的银线绳，缠在空台座上。绳头散开着，没有断——是解开的。',
        '重新系上去的那个结你认得：水手结，好解，一拉就开。',
        '当年你亲手绑的那个不是这种。你绑的是外科结，越挣越紧，你绑完还在上头压了三道封蜡。',
        '有人解开了它，然后随手系了个自己顺手的结。',
      ],
      grantsFacts: ['F-aeolia-knot'],
    },
    {
      id: 'E-202',
      island: 'aeolia',
      kind: 'trace',
      name: '青铜地面上的抓痕',
      position: [-2.8, -1.2],
      examine: [
        '台座周围的铜地上有一片乱七八糟的划痕，是指甲和铜扣一起蹭出来的。',
        '划痕集中在台座的一侧，而且是从外往里抓——有人被吸住了，正在往回够什么东西。',
        '风袋开的那一瞬间，站得最近的人是最先被卷起来的。',
      ],
      grantsFacts: ['F-aeolia-scratch'],
    },
    {
      id: 'E-203',
      island: 'aeolia',
      kind: 'inscription',
      name: '十二风室的方位盘',
      position: [-9.0, -5.5],
      examine: [
        '一块青铜圆盘，十二根指针，每根对着一间风室。盘沿刻着风名。',
        '有人用炭在盘背面写过东西，字迹又小又工整：',
        '「西风：九日不歇，正合我们的路。其余十一间不可开。」',
        '「若西风止，即到家。」',
        '船上只有一个人会算这个。他不上桨，夜里躺在甲板上看星星，别人笑他没用。',
      ],
      grantsFacts: ['F-aeolia-dial'],
    },
    {
      id: 'E-204',
      island: 'aeolia',
      kind: 'inscription',
      name: '没能寄出的家书',
      position: [7.5, -5.0],
      examine: [
        '一片薄木板，两面都写满了，字挤得快要看不清。开头是「给我的妻」。',
        '「……船长把一只牛皮袋子绑在台座上，谁也不许碰。他自己守了九天九夜没合眼。」',
        '「九天。他连撒尿都让人替他扶着绳子。你说袋子里要不是金子，一个人能这样？」',
        '「克里托斯也这么想。他昨晚一直在擦他那枚铜戒，擦到天亮。他说他母亲给他戴上这枚戒指的时候，说过一句话：属于你的东西，别人替你收着，那就不是你的了。」',
        '落款是「得摩斯」。字到最后一行忽然断了，木板边缘有烧焦的痕迹。',
      ],
      grantsFacts: ['F-aeolia-letter', 'F-aeolia-ring'],
    },
    {
      id: 'E-205',
      island: 'aeolia',
      kind: 'body',
      name: '礁石上的遗骸',
      position: [10.5, 6.5],
      examine: [
        '一具摔碎的骸骨，卡在礁石缝里，姿势是从很高的地方掉下来的那种。',
        '风把船吹回来的时候，有人还站在桅杆上。他没有下来得及。',
        '他手里还有半块炭。指骨的姿势像是刚写完什么东西——不是写在木板上，是写在自己手心里。',
        '掌骨的位置能辨认出一个词的下半截：「……ΑΝΕΜΟΣ」（风）。',
      ],
      grantsFacts: ['F-aeolia-fell'],
      tableau: 'M-201',
    },
    {
      id: 'E-206',
      island: 'aeolia',
      kind: 'inscription',
      name: '埃俄罗斯的记事石板',
      position: [-6.5, -10.5],
      examine: [
        '风王把每一条经过的船都记在石板上，一行一条，字是烧进去的。',
        '「伊萨卡人。予以西风一支，余十一支缚于袋中。第一日启程。」',
        '「第九日：西风止。其船已在故土视野之内，岸上有炊烟。」',
        '「第九日夜：袋启。十一风齐出。其船退回本岛，历时九时辰。」',
        '「不再予之。凡为神明所恨者，不可再助。」',
        '石板最下面还有一行，刻得很轻，像是犹豫过：「——其人自己并未开袋。然亦不能不算其过。」',
      ],
      grantsFacts: ['F-aeolia-log', 'F-aeolia-smoke'],
    },
  ],

  tableaux: [
    {
      id: 'M-201',
      island: 'aeolia',
      title: '第九夜',
      echo: '他睡了。他九天没合眼，现在他睡了。',
      echoSpeaker: '一个压低的声音',
      center: [0, -2.0],
      grantsFacts: ['F-aeolia-nightwatch'],
      figures: [
        {
          id: 'watch-a',
          label: '蹲在台座边的人',
          position: [-1.6, -3.4],
          facing: 0.6,
          pose: 'kneel',
          detail:
            '他一只手已经搭在银绳上了，另一只手举起来做了个"嘘"的手势。左手无名指上有一枚铜戒，被擦得比周围的青铜还亮。',
        },
        {
          id: 'watch-b',
          label: '站着的人',
          position: [1.8, -3.8],
          facing: 3.6,
          pose: 'stand',
          detail:
            '他抱着手臂站在旁边，眉头皱着，但没有阻止。他怀里露出一片木板的角——写满了字，还没写完。',
        },
        {
          id: 'watch-c',
          label: '在桅杆上的人',
          position: [4.2, -0.8],
          facing: 4.2,
          pose: 'reach',
          detail:
            '他没有参与，他爬在桅杆上，一手抓索具，一手指着东边。他在喊什么。他看见了岸上的炊烟。',
        },
        {
          id: 'sleeper',
          label: '睡着的人',
          position: [-3.8, 0.6],
          facing: 1.57,
          pose: 'lie',
          detail: '他靠着船舷睡着了，一只手还攥着绳头。九天九夜之后，他终于撑不住了。是你。',
        },
      ],
    },
    {
      id: 'M-202',
      island: 'aeolia',
      title: '解结的手',
      echo: '就看一眼。看一眼就系回去。',
      echoSpeaker: '一个很轻的声音',
      center: [0, -2.0],
      grantsFacts: ['F-aeolia-hand'],
      figures: [
        {
          id: 'hands',
          label: '解绳的一双手',
          position: [0, -2.6],
          facing: 0,
          pose: 'reach',
          detail:
            '定影只留下了这双手——脸被袋子本身挡住了，怎么绕都看不见。\n\n左手无名指上有一枚铜戒，戒圈内侧被磨得发白，说明主人常年转动它。右手正在拆一个外科结，拆得很慢，很小心，指甲缝里有蜡屑。',
        },
        {
          id: 'bag',
          label: '牛皮袋',
          position: [0, -1.4],
          facing: 0,
          pose: 'stand',
          detail: '袋口刚裂开一道缝。缝里透出来的不是金光，是灰白色的、正在旋转的东西。',
        },
      ],
    },
  ],

  ledger: [
    {
      id: 'L-201',
      island: 'aeolia',
      prompt: '那封没能寄出的家书，是谁写的？',
      slots: [{ label: '出自', pool: 'crew', answer: 'demos' }],
    },
    {
      id: 'L-202',
      island: 'aeolia',
      prompt: '摔死在礁石上的那具遗骸是谁？',
      slots: [{ label: '他是', pool: 'crew', answer: 'ourania' }],
    },
    {
      id: 'L-203',
      island: 'aeolia',
      prompt: '家书里提到的、整夜擦拭铜戒的那个人是谁？',
      slots: [{ label: '他是', pool: 'crew', answer: 'kritos' }],
    },
    {
      id: 'L-204',
      island: 'aeolia',
      prompt: '亲手解开风袋的是谁？',
      slots: [{ label: '解开它的是', pool: 'crew', answer: 'kritos' }],
      appearsWhen: { has: 'F-aeolia-hand' },
    },
    {
      id: 'L-205',
      island: 'aeolia',
      prompt: '他为什么要解开那只袋子？',
      slots: [{ label: '因为他', pool: 'aeolia-motive', answer: 'gold' }],
    },
    {
      id: 'L-206',
      island: 'aeolia',
      prompt: '袋子被解开的那一刻，船离伊萨卡有多远？',
      slots: [{ label: '当时', pool: 'aeolia-distance', answer: 'smoke' }],
    },
  ],

  npcs: [
    {
      id: 'aeolus',
      name: '埃俄罗斯',
      position: [0, -11.0],
      facing: 0,
      entries: [
        { node: 'knows-all', when: { locked: 'L-204' } },
        { node: 'closed' },
      ],
      nodes: [
        {
          id: 'closed',
          speaker: '埃俄罗斯',
          text: '（青铜门没有开。声音是从门缝里出来的，像风穿过一条很窄的巷子。）\n\n又是你。门不会开第二次。走吧。',
          choices: [
            { text: '「我不是来要风的。」', goto: 'not-wind' },
            { text: '「你至少告诉我那晚发生了什么。」', goto: 'that-night' },
          ],
        },
        {
          id: 'not-wind',
          speaker: '埃俄罗斯',
          text: '哦？\n\n（门缝里的风停了一下。）\n\n上一次你说的也是这句。上一次你说完就跪下了，抱着我的门槛哭。你哭了很久，我差点就心软了。',
          choices: [
            { text: '「我这次不会跪。」', goto: 'that-night' },
            { text: '「……我不记得那件事了。」', goto: 'forgot' },
          ],
        },
        {
          id: 'forgot',
          speaker: '埃俄罗斯',
          text: '不记得？（他笑了一声，门轴跟着响。）那你比我想的还要惨一点。\n\n好吧。我记得。我全都记得，我这一行就是记账的。石板在西边，自己去读。',
          choices: [{ text: '（结束对话）' }],
        },
        {
          id: 'that-night',
          speaker: '埃俄罗斯',
          text: '你的船在我这儿泊了一个月，你讲特洛伊讲了一个月，我听得很高兴。所以我给了你风。\n\n第九天，我在这儿看见你的船退回来了。十一支风一起出笼，那不是任何人能挡住的。\n\n我在门口看着你的人把船划进港。你从船头爬下来，膝盖是软的。',
          choices: [
            { text: '「你为什么不肯再帮一次？」', goto: 'why-not' },
            { text: '「不是我开的袋子。」', goto: 'not-me' },
          ],
        },
        {
          id: 'why-not',
          speaker: '埃俄罗斯',
          text: '因为帮一个被神恨着的人，等于替他挡刀。我是风的看门人，不是盾牌。\n\n何况——第一次是我看走眼。你不是运气不好的人，你是被点了名的人。这两种我都见过，第二种碰不得。',
          choices: [{ text: '（结束对话）' }],
        },
        {
          id: 'not-me',
          speaker: '埃俄罗斯',
          text: '我知道不是你。\n\n（很长的沉默。）\n\n我石板上写着呢。可那有什么用？袋子是交到你手上的。九天里你没让任何人碰它，第九天你睡着了——你不是坏，你是撑不住了。\n\n撑不住也是过错。神明不管这些分别。',
          choices: [{ text: '（结束对话）' }],
        },
        {
          id: 'knows-all',
          speaker: '埃俄罗斯',
          text: '（门开了一道缝，只有一道。）\n\n你查出来是谁了。\n\n我等这句话等了很多年。不是为了你——是为了我石板上那一行。我一直没敢把名字补上去，因为我不知道。',
          choices: [
            { text: '「是克里托斯。」（说出名字）', sets: ['aeolia_named'], goto: 'named' },
            { text: '「名字我留着。是我没看住袋子。」', sets: ['aeolia_took_blame'], goto: 'blame' },
          ],
        },
        {
          id: 'named',
          speaker: '埃俄罗斯',
          text: '克里托斯。……我记下了。\n\n（石板上有什么东西在烧灼。）\n\n这对他不公平，但对你公平。真相大多数时候就是这样分配的。他现在可以走了——名字被写下来的人，才有资格离开。',
          choices: [{ text: '（结束对话）' }],
        },
        {
          id: 'blame',
          speaker: '埃俄罗斯',
          text: '（门又合上了一点。）\n\n你护着他。这很像你——你在特洛伊城下也是这么护着你的人的，我听你讲过。\n\n可是护着他，他就永远留在这块石头上了。归乡录不收含糊的句子，孩子。',
          choices: [{ text: '（结束对话）' }],
        },
      ],
    },
    {
      id: 'daughter',
      name: '风王的女儿',
      position: [-8.5, 2.5],
      facing: 1.6,
      entries: [
        { node: 'hint2', when: { has: 'F-aeolia-letter' } },
        { node: 'hint1' },
      ],
      nodes: [
        {
          id: 'hint1',
          speaker: '风王的女儿',
          text: '（她坐在墙头上晃着脚，手里转着一根羽毛。）\n\n嘘。我父亲不许我跟你说话。他说你是"被点了名的"。\n\n我觉得他就是拉不下脸。他那天在门后头站了一整夜，我看见的。',
          choices: [
            { text: '「你那天晚上看见什么了？」', goto: 'saw' },
            { text: '「他站在门后干什么？」', goto: 'behind' },
          ],
        },
        {
          id: 'saw',
          speaker: '风王的女儿',
          text: '我看见你们的船退回来。十一支风推着它，像十一只手推一个不肯走的小孩。\n\n还有一件事——船靠岸之前，有个人从桅杆上掉下来了。掉在礁石上。别人都在忙着收帆，没人管他。',
          choices: [{ text: '（结束对话）' }],
        },
        {
          id: 'behind',
          speaker: '风王的女儿',
          text: '他在等你敲门。\n\n他等了一整夜。你没敲——你在船上跟你的人吵架，吵到天亮。等你终于走过来的时候，他已经把自己说服了。\n\n大人就是这样。晚一步，就变成另一个决定了。',
          choices: [{ text: '（结束对话）' }],
        },
        {
          id: 'hint2',
          speaker: '风王的女儿',
          text: '你手里那块木板，是从礁石那边捡的吧？\n\n那个写字的人，他被吹回来的时候还活着。他爬上岸，坐在我们墙根底下写完了最后一段，然后就没动了。\n\n他写完了，但他没有寄。他一直等着有人问他。',
          choices: [
            { text: '「他写的最后一句是什么？」', goto: 'last-line' },
            { text: '「谢谢你。」', trust: 1, goto: 'last-line' },
          ],
        },
        {
          id: 'last-line',
          speaker: '风王的女儿',
          text: '「我不怪他。九天没睡的是船长，睁着眼睛盯了九天的也是他。我们只是等得太久了，久到开始觉得他欠我们一个交代。」\n\n……然后就断了。',
          choices: [{ text: '（结束对话）' }],
        },
      ],
    },
    {
      id: 'eurylochus',
      name: '欧律洛科斯',
      position: [5.5, 5.5],
      facing: 2.8,
      entries: [
        { node: 'after', when: { has: 'F-aeolia-hand' } },
        { node: 'main' },
      ],
      nodes: [
        {
          id: 'main',
          speaker: '欧律洛科斯',
          text: '这地方我做梦都梦见。九天，我们看着伊萨卡从一条线变成一座山，能闻见岸上烧木头的味道。\n\n然后一夜之间又变回一条线，然后什么都没有了。',
          choices: [
            { text: '「守夜的是哪几个？」', goto: 'watch' },
            { text: '「你当时在哪？」', goto: 'where' },
          ],
        },
        {
          id: 'watch',
          speaker: '欧律洛科斯',
          text: '第九夜守夜的是三个人。一个在台座边，一个在旁边站着，还有一个爬在桅杆上看岸。\n\n三个我都认得，但我不告诉你是谁——不是我小气，是我说了不算数。归乡录只认你自己挖出来的东西。',
          choices: [{ text: '（结束对话）' }],
        },
        {
          id: 'where',
          speaker: '欧律洛科斯',
          text: '我在下面睡着。船一颠我就醒了，跑上甲板的时候袋子已经空了一半。\n\n我这辈子没见过那种场面。风不是从袋子里"吹"出来的，是"倒"出来的，像有人把一整片天倒扣下来。',
          choices: [{ text: '（结束对话）' }],
        },
        {
          id: 'after',
          speaker: '欧律洛科斯',
          text: '那双手你看见了。铜戒。\n\n……我早就知道是他。我在船上认出来了，我一直没说。\n\n他后来在特里那基亚饿得只剩一把骨头，还把自己那份分给别人。我看着他那样，怎么开得了口。',
          choices: [
            { text: '「你该说的。」', trust: -1, goto: 'should' },
            { text: '「换我我也说不出口。」', trust: 1, goto: 'understand' },
          ],
        },
        {
          id: 'should',
          speaker: '欧律洛科斯',
          text: '是。我该说的。\n\n我瞒了他一个人，代价是我们十二个都得留在原地。这笔账我到现在都没算明白。',
          choices: [{ text: '（结束对话）' }],
        },
        {
          id: 'understand',
          speaker: '欧律洛科斯',
          text: '（他看了你一会儿。）\n\n你现在能说这句话，是因为你也不再是当年那个人了。当年你会把他从桨座上拎起来扔进海里。\n\n……说不定那样更好。至少痛快。',
          choices: [{ text: '（结束对话）' }],
        },
      ],
    },
  ],

  choice: {
    id: 'C-3',
    title: '青铜门前的决定',
    prompt:
      '风王的门开了一道缝。他的石板上有一行空着的字，等一个名字。\n\n克里托斯已经死了，死在饥饿和雷火里。写不写他的名字，对他而言早就不重要了——重要的是你。',
    position: [0, -9.0],
    availableWhen: { locked: 'L-204' },
    options: [
      {
        id: 'name-him',
        label: '说出克里托斯的名字',
        outcome:
          '你把名字说出口。石板上凭空烧出三个字。\n\n墙根底下有个影子站起来了，朝你这边看了很久，然后往东边走。他没有道歉，你也没有原谅——归乡录不管这些，它只管准确。',
        sets: ['aeolia_named'],
        crew: 2,
      },
      {
        id: 'take-blame',
        label: '把责任揽到自己身上',
        outcome:
          '「是我睡着了，」你说，「记我的名字。」\n\n风王沉默了很久，然后门合上了。石板上那一行仍然空着。\n\n墙根底下那个影子没有动。他留在这里——不是因为他有罪，是因为没有人肯把他的事写完。',
        sets: ['aeolia_took_blame'],
        trust: 1,
      },
      {
        id: 'demand',
        label: '再向风王要一次风',
        outcome:
          '你走上前，把手按在青铜门上，说出了那句你十年前没敢说的话：再给我一次。\n\n门后的风停了整整三息。\n\n然后它从十二间风室一起冲出来，把你按在地上，按了很久。等你能爬起来的时候，门缝已经用铜水封死了。',
        sets: ['aeolia_demanded'],
        wrath: 3,
        trust: -1,
      },
    ],
  },
}
