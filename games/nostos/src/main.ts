import './styles.css';
import './probe';
import { Game } from './game/flow';

/**
 * 《归航 · NOSTOS》入口。
 *
 * 第一人称步行叙事探索。走、看、触碰——只有这三个动词。
 */
const container = document.getElementById('app');
if (!container) throw new Error('#app not found');

const game = new Game(container);

window.__nostos = {
  state: () => game.debugState(),
  teleport: (id: string) => game.debugTeleport(id),
  interact: () => game.debugInteract(),
  skipVision: () => game.debugSkipVision(),
  skipNarration: () => game.debugSkipNarration(),
  gotoAct: (index: number) => game.debugGotoAct(index),
  actCount: game.actCount,
};
