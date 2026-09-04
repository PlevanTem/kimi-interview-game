import type { SceneDef } from '../types';
import type { TerrainParams } from '../../world/terrain';
import type { Dresser } from './dresser';

/**
 * 一幕 = 数据（这一幕有什么、碰了会怎样）+ 地形参数 + 装配函数。
 *
 * 数据部分不依赖 three，可以被单元测试直接读；
 * 装配部分只在浏览器里跑，负责把石头长出来。
 */
export interface Act {
  def: SceneDef;
  terrain: TerrainParams;
  dress: (dresser: Dresser) => void;
}
