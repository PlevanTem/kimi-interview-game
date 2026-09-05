import './styles.css';
import './probe';
import { Game } from './game/flow';
import { previewAct } from './game/local-preview';
import { preloadMemoryMotifs } from './world/memory-silhouettes';

/**
 * 《归航 · NOSTOS》入口。
 *
 * 第一人称步行叙事探索。走、看、触碰——只有这三个动词。
 */
const container = document.getElementById('app');
if (!container) throw new Error('#app not found');

async function bootstrap(target: HTMLElement): Promise<void> {
  await preloadMemoryMotifs();
  const game = new Game(target);

  window.__nostos = {
    state: () => game.debugState(),
    teleport: (id: string) => game.debugTeleport(id),
    interact: () => game.debugInteract(),
    skipVision: () => game.debugSkipVision(),
    skipNarration: () => game.debugSkipNarration(),
    gotoAct: (index: number) => game.debugGotoAct(index),
    view: (pose) => game.debugView(pose),
    actCount: game.actCount,
  };
  const preview = previewAct();
  if (preview !== null) game.debugGotoAct(preview);
}

void bootstrap(container).catch((error: unknown) => {
  console.error('NOSTOS bootstrap failed', error);
  container.textContent = '回忆图像加载失败，请刷新重试。';
});
