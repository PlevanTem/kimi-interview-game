import type { Island } from '../types'

/**
 * 岛 1 —— 波吕斐摩斯的洞窟
 *
 * 结构上的关键：本岛第一次让玩家挖出**对自己不利的真相**。
 * M-103 揭示奥德修斯在离岸时喊出了真名，这是全作神怒的源头，而且必须由玩家
 * 亲手写进归乡录才能锁定。你不是在为自己辩护，你是在给自己定罪。
 */
export const CYCLOPS: Island = {
  id: 'cyclops',
  index: 1,
  name: '独目巨人的洞窟',
  greek: 'ΚΥΚΛΩΨ',
  subtitle: '第二段记忆 · 你在这里学会了说谎，也忘了什么时候该闭嘴',
  arrival: [
    '洞口那块磨盘一样的石头是半开的，像一张说到一半停住的嘴。',
    '里面有羊的味道，有烧过的木头味，还有一种更陈的、甜腻的味道，你认得，但不想认。',
    '你听见深处有人在数数。很慢，很有耐心，一遍一遍从头数起。',
  ],
  bounds: [15, 16],
  ground: '#6b5340',
  spawn: [0, 13],
  departure: [0, 14.6],
  departureRequirement: 4,
  terrain: [
    { kind: 'box', position: [-11, 4], size: [8, 22], height: 5.5, color: '#4a382b', solid: true },
    { kind: 'box', position: [11, 4], size: [8, 22], height: 5.5, color: '#4a382b', solid: true },
    { kind: 'box', position: [0, -14.5], size: [30, 4], height: 6, color: '#3d2e24', solid: true },
    { kind: 'cylinder', position: [-4.5, 9.5], size: [2.6, 2.6], height: 4.2, color: '#54402f', solid: true },
    { kind: 'cylinder', position: [5.2, 9.0], size: [2.2, 2.2], height: 3.8, color: '#54402f', solid: true },
    { kind: 'box', position: [-5.5, -3], size: [4.5, 5], height: 1.1, color: '#5c4634', solid: false },
    { kind: 'cylinder', position: [6.5, -6], size: [1.8, 1.8], height: 2.4, color: '#54402f', solid: true },
  ],
  decorations: [
    { kind: 'flame', position: [0, -1.5], scale: 1.4 },
    { kind: 'sheep', position: [-6.8, -1.2] },
    { kind: 'sheep', position: [-5.2, -5.4], scale: 0.9 },
    { kind: 'sheep', position: [-7.4, -6.8], scale: 1.1 },
    { kind: 'sheep', position: [-3.8, -7.6], scale: 0.95 },
    { kind: 'rock', position: [8.2, 11.5], scale: 2.2 },
    { kind: 'rock', position: [7.0, 2.5], scale: 1.1 },
    { kind: 'rock', position: [-8.5, 6.0], scale: 1.3 },
    { kind: 'urn', position: [3.4, -3.2] },
    { kind: 'urn', position: [4.6, -2.0], scale: 0.85 },
  ],

  evidence: [
    {
      id: 'E-101',
      island: 'cyclops',
      kind: 'inscription',
      name: '洞壁上的刻痕',
      position: [-6.4, -6.8],
      examine: [
        '巨人用指甲在石头上划的计数，一道一道，五道一组。他在数羊。',
        '最上面一排是完整的：十二组多两道。往下几排开始出现被抹掉又重划的痕迹。',
        '最后一排只剩九道，划得很深，划了很多遍，石粉都堆在下面。',
        '他不是在数羊。羊没少。他是在数他还记得的、进过这个洞的人。',
      ],
      grantsFacts: ['F-cyclops-count'],
    },
    {
      id: 'E-102',
      island: 'cyclops',
      kind: 'object',
      name: '烧焦的橄榄木桩',
      position: [1.6, -2.4],
      examine: [
        '一根和船桅一样粗的橄榄木，一头削成尖，尖端烧得发黑发亮。',
        '削口是斜的，一刀一刀，右手用力，收尾干净——你看着这个削法愣了一下。',
        '这是你的削法。你现在低头看自己的手，还能想起来该怎么使那把刀。',
      ],
      grantsFacts: ['F-cyclops-stake'],
      tableau: 'M-101',
    },
    {
      id: 'E-103',
      island: 'cyclops',
      kind: 'body',
      name: '带铜扣的遗骸',
      position: [-2.8, -8.2],
      examine: [
        '骨头是碎的，不是被野兽咬碎的那种碎——是被一只很大的手攥住之后往石头上摔的那种碎。',
        '胸腔的位置有一枚铜扣，扣面上刻着一只不太像样的鸟。',
        '你记得这枚扣子。有人在船上被笑话过很多次，说这鸟画得像只湿抹布。他每次都笑得比别人还大声。',
        '他总是第一个跟着你进任何一个洞。这次也是。',
      ],
      grantsFacts: ['F-cyclops-buckle'],
    },
    {
      id: 'E-104',
      island: 'cyclops',
      kind: 'body',
      name: '握着断桨的遗骸',
      position: [2.4, -9.4],
      examine: [
        '这一具的姿势不一样：他是脸朝外倒下的，右手里还攥着半截桨，攥得很紧，指骨都嵌进木头里了。',
        '他不是在逃。他是转过身来，打算用那半截桨去打点什么。',
        '右臂的肱骨上有一道磨得发亮的旧痕——常年握桨的人才会磨出这个位置。',
      ],
      grantsFacts: ['F-cyclops-oar'],
    },
    {
      id: 'E-105',
      island: 'cyclops',
      kind: 'body',
      name: '散落骨骰的遗骸',
      position: [-1.2, -10.6],
      examine: [
        '尸骨旁边散着六枚骨头做的骰子，年头很久，棱角都磨圆了。',
        '有两枚滚进了石缝里，朝上的面都是六。',
        '船上只有一个人随身带骰子。他是传令官，替你把话喊到船头船尾去，喊完就蹲下来跟人赌半个饼。',
      ],
      grantsFacts: ['F-cyclops-dice'],
    },
    {
      id: 'E-106',
      island: 'cyclops',
      kind: 'trace',
      name: '并绑的羊毛与麻绳',
      position: [-6.2, -4.0],
      examine: [
        '几截麻绳还系在羊栏的木桩上，绳圈的间距是三只羊并排的宽度。',
        '绳子内侧沾着羊毛，也沾着别的东西：一小撮人的头发，还有干掉的血。',
        '有人在最底下待过。趴着，脸朝上，用手指抠住羊肚子上的毛，一动不敢动。',
      ],
      grantsFacts: ['F-cyclops-rope'],
      tableau: 'M-102',
    },
    {
      id: 'E-107',
      island: 'cyclops',
      kind: 'inscription',
      name: '巨人凿的五个字母',
      position: [8.5, -8.5],
      examine: [
        '洞壁上凿着五个歪歪扭扭的大字母，每一笔都有半人深：ΟΥΤΙΣ。',
        '「无人」。',
        '凿痕是新的，石屑还没被踩实。他是瞎了以后凿的——摸着凿的，所以歪。',
        '他把这个词凿在这里，是因为这是他唯一抓得住的东西。他被一个叫「无人」的人弄瞎了，说出去谁也不信。',
      ],
      grantsFacts: ['F-cyclops-outis'],
    },
    {
      id: 'E-108',
      island: 'cyclops',
      kind: 'object',
      name: '喝空的酒囊',
      position: [4.2, -1.2],
      examine: [
        '马戎给的那种酒，一份要兑二十份水才敢喝。这囊是原液喝干的。',
        '囊口的皮绳上缠着一小圈亚麻线，打了个很花哨的结——船上只有一个人会打这种结，年纪最小的那个，总在给自己的东西做记号。',
        '他把酒递上去的时候，大概觉得自己立了大功。',
      ],
      grantsFacts: ['F-cyclops-wine'],
    },
    {
      id: 'E-109',
      island: 'cyclops',
      kind: 'trace',
      name: '洞口外侧的血手印',
      position: [0, 12.2],
      examine: [
        '巨石外侧有一个巨大的手印，五指张开，是血按上去的。',
        '手印的朝向是往外的——他扶着石头追出去过，一直追到能听见海浪的地方。',
        '石头上还有一道深深的抓痕，是他后来站在这里，一遍一遍抓的。他在这儿站了很久，冲着海喊。',
        '杖烫得几乎握不住。',
      ],
      grantsFacts: ['F-cyclops-outside'],
      tableau: 'M-103',
    },
  ],

  tableaux: [
    {
      id: 'M-101',
      island: 'cyclops',
      title: '独眼熄灭时',
      echo: '按住他！按住！——别松手，谁也别松手！',
      echoSpeaker: '你自己的声音',
      center: [1.6, -2.4],
      grantsFacts: ['F-cyclops-who-carved'],
      figures: [
        {
          id: 'giant',
          label: '波吕斐摩斯',
          position: [1.6, -5.6],
          facing: 0,
          pose: 'lie',
          giant: true,
          detail: '他仰面倒着，一只手还举在半空。木桩已经进去了。这一刻他还没开始叫。',
        },
        {
          id: 'captain',
          label: '举着木桩的人',
          position: [1.6, -1.2],
          facing: 3.14,
          pose: 'reach',
          detail: '他压在木桩最上头，整个人的重量都挂上去了。你看得见他的侧脸——是你。年轻十岁，但确实是你。',
        },
        {
          id: 'hand-a',
          label: '扶桩的人（一）',
          position: [-0.4, -0.6],
          facing: 3.0,
          pose: 'reach',
          detail: '他闭着眼睛在使劲，扣子在胸口甩出来了，铜的，上头是只鸟。',
        },
        {
          id: 'hand-b',
          label: '扶桩的人（二）',
          position: [3.4, -0.8],
          facing: 3.3,
          pose: 'reach',
          detail: '这个人的右臂上有一道很亮的旧疤。他在往后仰，用整个背去顶。',
        },
      ],
    },
    {
      id: 'M-102',
      island: 'cyclops',
      title: '羊腹之下',
      echo: '别抖。它闻得出来你在抖。',
      echoSpeaker: '一个压低了的声音',
      center: [-6.2, -4.0],
      grantsFacts: ['F-cyclops-escape'],
      figures: [
        {
          id: 'ram',
          label: '最大的那只公羊',
          position: [-6.2, -4.0],
          facing: 1.57,
          pose: 'stand',
          detail: '三只羊并排绑着，中间那只肚子底下鼓出一块不属于羊的形状。一只人的手从羊毛里露出来，指关节发白。',
        },
        {
          id: 'giant-hand',
          label: '波吕斐摩斯',
          position: [-6.2, -0.4],
          facing: 4.71,
          pose: 'kneel',
          giant: true,
          detail: '他跪在羊栏口，一只手按在每只羊的背上，从头摸到尾。他摸的是背，从来没摸过肚子。他的眼窝是空的，还在淌东西。',
        },
      ],
    },
    {
      id: 'M-103',
      island: 'cyclops',
      title: '最后的呼喊',
      echo: '——是奥德修斯！攻陷特洛伊的奥德修斯，拉厄耳忒斯之子，伊萨卡的王！记住这个名字！',
      echoSpeaker: '你自己的声音',
      center: [0, 12.2],
      grantsFacts: ['F-cyclops-shouted', 'F-cyclops-curse'],
      figures: [
        {
          id: 'shouting',
          label: '站在船尾的人',
          position: [-1.6, 13.2],
          facing: 3.14,
          pose: 'stand',
          detail:
            '他站在船尾，两手拢在嘴边，整个身子朝岸上探过去。船上其他人都在拽他的衣服，有一个人干脆抱住了他的腰。他把他们全甩开了。是你。',
        },
        {
          id: 'blind-giant',
          label: '波吕斐摩斯',
          position: [0.8, 9.6],
          facing: 0,
          pose: 'reach',
          giant: true,
          detail:
            '他跪在礁石上，双手举向天，脸朝着海的方向。他听清了。他正在把这个名字一个字一个字地重复给他父亲听。',
        },
        {
          id: 'holding',
          label: '抱住他腰的人',
          position: [-2.8, 14.0],
          facing: 2.6,
          pose: 'reach',
          detail: '这个人死死抱着船尾那个人的腰往回拖，脸埋在他背上。他在喊什么，但没人听他的。',
        },
      ],
    },
  ],

  ledger: [
    {
      id: 'L-101',
      island: 'cyclops',
      prompt: '胸口带铜扣的那具遗骸是谁？',
      slots: [{ label: '他是', pool: 'crew', answer: 'polites' }],
    },
    {
      id: 'L-102',
      island: 'cyclops',
      prompt: '手里攥着断桨的那具遗骸是谁？',
      slots: [{ label: '他是', pool: 'crew', answer: 'antiphos' }],
    },
    {
      id: 'L-103',
      island: 'cyclops',
      prompt: '骨骰散落一地的那具遗骸是谁？',
      slots: [{ label: '他是', pool: 'crew', answer: 'eurybates' }],
    },
    {
      id: 'L-104',
      island: 'cyclops',
      prompt: '那根橄榄木桩，是谁削尖并烧硬的？',
      slots: [{ label: '出自', pool: 'crew', answer: 'odysseus' }],
    },
    {
      id: 'L-105',
      island: 'cyclops',
      prompt: '波吕斐摩斯最终向他父亲报出的，是哪一个名字？',
      slots: [{ label: '他喊的是', pool: 'cyclops-name', answer: 'true-name' }],
      appearsWhen: { has: 'F-cyclops-outis' },
    },
    {
      id: 'L-106',
      island: 'cyclops',
      prompt: '活下来的人是用什么办法离开这个洞的？',
      slots: [{ label: '靠的是', pool: 'cyclops-method', answer: 'ram-belly' }],
    },
  ],

  npcs: [
    {
      id: 'polyphemus',
      name: '波吕斐摩斯',
      position: [0, -11.5],
      facing: 0,
      giant: true,
      entries: [
        { node: 'knows', when: { flag: 'confessed' } },
        { node: 'shouted', when: { has: 'F-cyclops-shouted' } },
        { node: 'first' },
      ],
      nodes: [
        {
          id: 'first',
          speaker: '波吕斐摩斯',
          text: '（他没有转过来。）……七百二十九。七百三十。\n\n站住。你身上有海的味道，还有铁的味道。你是人。你是从船上来的。',
          choices: [
            { text: '「你在数什么？」', goto: 'counting' },
            { text: '「你眼睛是怎么瞎的？」', goto: 'blind' },
          ],
        },
        {
          id: 'counting',
          speaker: '波吕斐摩斯',
          text: '数天。从那天起的天数。我数到七百三十的时候就重新数，因为再往上我数不清了。\n\n我父亲说，只要我记得住那个名字，他就替我办事。可是那个名字是假的。',
          choices: [
            { text: '「什么名字？」', goto: 'outis' },
            { text: '「你父亲是谁？」', goto: 'father' },
          ],
        },
        {
          id: 'outis',
          speaker: '波吕斐摩斯',
          text: '「无人」。他说他叫无人。\n\n我被弄瞎的那天夜里我冲着外面喊——是无人在害我！是无人弄瞎了我！——外面那些人笑了一整夜。他们说，既然无人害你，那你就自己受着。',
          choices: [
            { text: '「那你后来知道他的真名了吗？」', goto: 'later' },
            { text: '（不说话）' },
          ],
        },
        {
          id: 'later',
          speaker: '波吕斐摩斯',
          text: '知道了。他自己喊给我听的。\n\n他都上船了，都走了，都安全了。然后他在海上停下来，站到船尾，把他的名字一个字一个字喊给我听。他要我知道是谁干的。\n\n他这一喊，我父亲就听见了。',
          choices: [{ text: '（结束对话）' }],
        },
        {
          id: 'father',
          speaker: '波吕斐摩斯',
          text: '摇撼大地的那一位。海是他的。\n\n你要走的时候记得——海是他的。你走多远都还在他手心里。',
          choices: [{ text: '（结束对话）' }],
        },
        {
          id: 'blind',
          speaker: '波吕斐摩斯',
          text: '一根烧过的木头。六个人抬着，最上面那个用整个身子压下来。\n\n我一开始以为是山塌了。人怎么会那么烫呢。',
          choices: [
            { text: '「他们为什么要这么做？」', goto: 'why' },
            { text: '「……对不起。」', goto: 'sorry-early' },
          ],
        },
        {
          id: 'why',
          speaker: '波吕斐摩斯',
          text: '因为我先吃了他们的人。这个我不否认。\n\n我把两个摔在墙上，像摔小狗一样。第二天早上又两个。我不觉得那有什么不对——羊也是被摔死的，从来没有羊来找我算账。\n\n后来我知道不一样了。羊不会记住我的名字，人会。',
          choices: [{ text: '（结束对话）' }],
        },
        {
          id: 'sorry-early',
          speaker: '波吕斐摩斯',
          text: '你替谁道歉？你又不认识我。\n\n（他停了很久。）……除非你认识。',
          choices: [{ text: '（结束对话）' }],
        },
        {
          id: 'shouted',
          speaker: '波吕斐摩斯',
          text: '（他忽然转过头，空眼窝正对着你。）\n\n你刚才站在洞口那块石头旁边。杖亮起来的时候我感觉到了——你把那天又立起来看了一遍，是不是。\n\n那你现在知道他叫什么了。',
          choices: [
            { text: '「奥德修斯。」（承认）', sets: ['confessed'], goto: 'confess' },
            { text: '「我不知道。」', goto: 'deny' },
          ],
        },
        {
          id: 'confess',
          speaker: '波吕斐摩斯',
          text: '（他很慢地点了一下头。）\n\n奥德修斯。我念了七百三十天。我以为再听见这三个字的时候我会把说话的人捏碎。\n\n可是你就站在那儿，而我什么也没做。……你老了。声音都塌了。',
          choices: [
            { text: '「是我干的。全部都是。」', goto: 'all-mine' },
            { text: '（等他说下去）', goto: 'all-mine' },
          ],
        },
        {
          id: 'all-mine',
          speaker: '波吕斐摩斯',
          text: '我告诉你一件我父亲不许我说的事。\n\n他答应替我报仇的时候提了个条件：你必须记不起自己做过什么。一个人扛着他不明白的惩罚走十年，比死难受。\n\n所以你的记性不是丢的，是被拿走的。你现在一条一条捡回来，就是在把它一条一条要回来。',
          choices: [{ text: '（结束对话）' }],
        },
        {
          id: 'deny',
          speaker: '波吕斐摩斯',
          text: '（他笑了一声，很短。）\n\n又是「无人」。你们这些人真是一点没变。\n\n走吧。反正海是我父亲的，你早晚要还。',
          choices: [{ text: '（结束对话）' }],
        },
        {
          id: 'knows',
          speaker: '波吕斐摩斯',
          text: '你还在。……羊圈那边第三根桩子底下，压着一块木牌，上面有三个人的名字。是我刻的。\n\n我不认字。我是照着他们衣服上的记号一笔一笔描的。描完我才发现，我记得他们每一个的样子。',
          choices: [{ text: '（结束对话）' }],
        },
      ],
    },
    {
      id: 'eurylochus',
      name: '欧律洛科斯',
      position: [-6.0, 6.5],
      facing: 2.4,
      entries: [
        { node: 'after', when: { has: 'F-cyclops-shouted' } },
        { node: 'main' },
      ],
      nodes: [
        {
          id: 'main',
          speaker: '欧律洛科斯',
          text: '我不进去。你自己进。……我当年也没进去，我在船上守着。这大概是我这辈子做过最对的一个决定，我到现在都为此觉得羞耻。',
          choices: [
            { text: '「里面有几个人？」', goto: 'count' },
            { text: '「你为什么羞耻？」', goto: 'shame' },
          ],
        },
        {
          id: 'count',
          speaker: '欧律洛科斯',
          text: '进去十二个，出来六个。你数数地上的骨头就知道对不对得上。\n\n有三具还能认出来是谁。剩下的……剩下的连是不是三个人都说不准了。',
          choices: [{ text: '（结束对话）' }],
        },
        {
          id: 'shame',
          speaker: '欧律洛科斯',
          text: '因为我劝过大家别进去。我说这洞主人不在，我们拿了奶酪就走。\n\n没人听我的。你也没听。然后我活到了下一座岛，他们没有。\n\n对的人活着，这件事本身就够让人难受的了。',
          choices: [
            { text: '「你说得对。是我错了。」', trust: 1, goto: 'end-shame' },
            { text: '「你只是运气好。」', trust: -1, goto: 'end-shame' },
          ],
        },
        {
          id: 'end-shame',
          speaker: '欧律洛科斯',
          text: '……随你怎么说。去把他们的名字挖出来吧，这个比较有用。',
          choices: [{ text: '（结束对话）' }],
        },
        {
          id: 'after',
          speaker: '欧律洛科斯',
          text: '你看见了？在船尾那段。\n\n抱住你腰的那个是我。我喊破了嗓子叫你闭嘴。你把我甩到甲板上，胳膊肘磕在桨架上，那道疤到我死都还在。',
          choices: [
            { text: '「如果我当时闭嘴，会不会不一样？」', goto: 'what-if' },
            { text: '「你早该把我打晕。」', trust: 1, goto: 'what-if' },
          ],
        },
        {
          id: 'what-if',
          speaker: '欧律洛科斯',
          text: '会。会完全不一样。\n\n他不知道你是谁，就没法诅咒你。他父亲抓不到一个没有名字的人。\n\n我们十二个都是死在那三句话上的，船长。就那三句话。',
          choices: [{ text: '（结束对话）' }],
        },
      ],
    },
  ],

  choice: {
    id: 'C-2',
    title: '洞口的决定',
    prompt:
      '波吕斐摩斯坐在洞的深处，空着的眼窝对着你的方向。他等了七百三十天。\n\n你可以走了——石头是半开的，没人拦你。但杖还在发烫。',
    position: [0, -8.0],
    availableWhen: { has: 'F-cyclops-shouted' },
    options: [
      {
        id: 'apologize',
        label: '走到他面前，报出你的名字并请求宽恕',
        outcome:
          '你走到他脚边，把名字说了第二遍——这一次不是喊的。\n\n他伸手过来，摸到你的头，停了很久。那只手能把你捏成一团，但它只是停在那里。\n\n「我不原谅你，」他说，「但我告诉我父亲，我已经数完了。」\n\n洞里那三具遗骸的位置忽然安静下来。杖凉了。',
        sets: ['cyclops_apologized', 'confessed'],
        wrath: -2,
        crew: 3,
        trust: 1,
      },
      {
        id: 'silent',
        label: '什么也不说，转身离开',
        outcome:
          '你退到洞口，脚踩碎了一块骨头。他的头转了过来。\n\n「又是无人。」他说。\n\n然后他继续数：七百三十一。七百三十二。\n\n你带走了你查到的东西，但你什么也没还给他。',
        sets: ['cyclops_silent'],
        crew: 1,
      },
      {
        id: 'mock',
        label: '再喊一次你的名字，让他记牢',
        outcome:
          '你站在洞口，把十年前那三句话原样又喊了一遍，一个字都没少。\n\n他没有暴怒。他只是慢慢站起来——站起来的时候你才想起他有多高——然后朝着海的方向，把这个名字重新念给他父亲听。\n\n洞外，浪声变了。',
        sets: ['cyclops_mocked'],
        wrath: 3,
        trust: -2,
      },
    ],
  },
}
