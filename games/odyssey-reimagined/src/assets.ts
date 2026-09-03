import uiKeyframes from "../assets/previsual/ui-keyframes-v1.png";
import storyboard from "../assets/previsual/storyboard-saltcape-v1.png";
import heroTurnaround from "../assets/previsual/hero-turnaround-chibi-v3.png";
import heroActions from "../assets/previsual/hero-action-spritesheet-chibi-v2.png";
import modularBreakdown from "../assets/previsual/modular-asset-breakdown-v1.png";
import characterLineup from "../assets/previsual/main-character-lineup-v1.png";

export const previsualAssets = [
  { id: "ui", label: "关键步骤 UI / 画面节奏", src: uiKeyframes },
  { id: "story", label: "盐岬港剧情 Storyboard", src: storyboard },
  { id: "hero-turnaround", label: "主角三面全身与面部特写", src: heroTurnaround },
  { id: "hero", label: "主角十二动作关键姿势表", src: heroActions },
  { id: "parts", label: "装备与环境拆件", src: modularBreakdown },
  { id: "cast", label: "主要角色阵容", src: characterLineup },
] as const;

export { heroActions, heroTurnaround, uiKeyframes };
