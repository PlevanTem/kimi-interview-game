import type { Island } from '../types'

/**
 * 尾声 —— 伊萨卡海岸
 *
 * 这不是一个关卡，是结算场景：没有证物、没有归乡录条目、没有可解的谜。
 * 玩家能做的只有两件事——把册子交上去，或者再回头看一眼自己写下的东西。
 * 雅典娜会逐条读，读到空白就停一下。那一下停顿就是本作对"没查完"的全部惩罚。
 */
export const ITHACA: Island = {
  id: 'ithaca',
  index: 5,
  name: '伊萨卡海岸',
  greek: 'ΙΘΑΚΗ',
  subtitle: '尾声 · 你要把册子交上去了',
  arrival: [
    '你认得这块沙滩的坡度。你认得那三块礁石排开的样子。你认得岸上那棵橄榄树往哪边歪。',
    '你不记得自己是怎么认得的——归乡录上没有这一页。有些东西不需要写下来也在。',
    '有人站在潮线上等你。她背对着海，手里什么都没拿。',
  ],
  bounds: [14, 12],
  ground: '#d2b477',
  spawn: [0, 9],
  departure: [0, -6.5],
  departureRequirement: 0,
  terrain: [
    { kind: 'box', position: [-12, -2], size: [6, 18], height: 2.8, color: '#a89060', solid: true },
    { kind: 'box', position: [12, -2], size: [6, 18], height: 2.8, color: '#a89060', solid: true },
    { kind: 'box', position: [0, -11.5], size: [28, 4], height: 3.5, color: '#8f7a50', solid: true },
    { kind: 'cylinder', position: [-6.5, -7.5], size: [1.4, 1.4], height: 2.2, color: '#9a8355', solid: true },
    { kind: 'cylinder', position: [6.5, -7.5], size: [1.4, 1.4], height: 2.2, color: '#9a8355', solid: true },
  ],
  decorations: [
    { kind: 'olive', position: [-4.5, -8.5], scale: 1.5 },
    { kind: 'olive', position: [8.5, -5.5], scale: 1.1 },
    { kind: 'rock', position: [-8.5, 6.5], scale: 1.4 },
    { kind: 'rock', position: [-5.5, 8.5] },
    { kind: 'rock', position: [8.0, 7.5], scale: 1.2 },
    { kind: 'wave', position: [-7, 10.5], scale: 1.5 },
    { kind: 'wave', position: [0, 11.2], scale: 1.7 },
    { kind: 'wave', position: [7, 10.5], scale: 1.5 },
    { kind: 'flame', position: [0, -9.0], scale: 0.8 },
    { kind: 'column', position: [-2.5, -6.0] },
    { kind: 'column', position: [2.5, -6.0] },
  ],

  evidence: [],
  tableaux: [],
  ledger: [],

  npcs: [
    {
      id: 'athena',
      name: '雅典娜',
      position: [0, 3.5],
      facing: 3.14,
      entries: [
        { node: 'complete', when: { lockedCount: 27 } },
        { node: 'partial', when: { lockedCount: 12 } },
        { node: 'thin' },
      ],
      nodes: [
        {
          id: 'thin',
          speaker: '雅典娜',
          text: '（她朝你伸出手，等着接那本册子。）\n\n就这些？\n\n你在外面走了这么久，带回来的是这么薄的一本。',
          choices: [
            { text: '「有些事我查不出来。」', goto: 'excuse' },
            { text: '「我知道。还差很多。」', goto: 'know' },
          ],
        },
        {
          id: 'excuse',
          speaker: '雅典娜',
          text: '查不出来，还是不肯查？\n\n（她收回手。）算了。规矩是规矩——你走完了五座岛，我就得让你上岸。\n\n只是你要想清楚：上岸的是你，留下的是他们。',
          choices: [{ text: '（结束对话）' }],
        },
        {
          id: 'know',
          speaker: '雅典娜',
          text: '你知道就好。\n\n（她的语气软了一点点。）我不催你。潮水一天涨落两次，你要回头再走一趟，我在这儿等着。\n\n册子交上来就不能改了，这个你记着。',
          choices: [{ text: '（结束对话）' }],
        },
        {
          id: 'partial',
          speaker: '雅典娜',
          text: '（她翻着册子，一页一页地读。读得很慢。）\n\n有几页写得很好。护身符那一段，还有羊腹底下那一段——写这些的时候你没有替自己留情面，这不容易。\n\n（她翻到后面，停住了。）\n\n这里还是空的。',
          choices: [
            { text: '「我再去一趟。」', goto: 'again' },
            { text: '「就这样吧。」', goto: 'enough' },
          ],
        },
        {
          id: 'again',
          speaker: '雅典娜',
          text: '去吧。海路是通的，五座岛都还在原地。\n\n（她把册子递回来。）拿好。这本册子上每多一行字，就少一个人站在原地等。',
          choices: [{ text: '（结束对话）' }],
        },
        {
          id: 'enough',
          speaker: '雅典娜',
          text: '（她看了你很久。）\n\n"就这样吧"。你在城墙下面从来不说这句话。\n\n……好。那就这样。',
          choices: [{ text: '（结束对话）' }],
        },
        {
          id: 'complete',
          speaker: '雅典娜',
          text: '（她翻完了最后一页，很久没有说话。）\n\n三十条。一条不缺。\n\n（她抬起头。）你知道你写了什么吗，奥德修斯？你写了一份罪状，而且大部分罪名在你自己名下。\n\n木桩是你削的。名字是你喊的。牛被宰的时候你在睡觉，醒了以后你也吃了。这些没有一条是我逼你写的。',
          choices: [
            { text: '「这本来就是我做的。」', goto: 'mine' },
            { text: '「你们拿走了我的记性，就是为了让我自己找回来？」', goto: 'why' },
          ],
        },
        {
          id: 'mine',
          speaker: '雅典娜',
          text: '（她点头。）\n\n这十年你不是在受罚。你是在被要求看清楚。\n\n波塞冬要的是让你痛苦一辈子。我改了一个字——我让你痛苦，但我让你知道为什么。这是我能替你争到的全部。',
          choices: [{ text: '（结束对话）' }],
        },
        {
          id: 'why',
          speaker: '雅典娜',
          text: '因为一个人说不出自己做过什么，他就没有资格说"我回来了"。\n\n（她把册子合上，递还给你。）\n\n回家的路从来不在海上。在这本册子里。你自己走完了。',
          choices: [{ text: '（结束对话）' }],
        },
      ],
    },
  ],

  choice: {
    id: 'C-6',
    title: '把册子交上去',
    prompt:
      '雅典娜伸着手，等你。\n\n交上去以后就不能再改了——没写完的那几页会永远空着，写在上面的每一句都会永远算数。\n\n往前走，或者回头再看一眼你写下的东西。',
    position: [0, 0],
    options: [
      {
        id: 'submit',
        label: '把归乡录交给她',
        outcome: '你把册子放进她手里。\n\n她低头翻开第一页。海的声音忽然停了。',
        sets: ['submitted'],
      },
    ],
  },
}
