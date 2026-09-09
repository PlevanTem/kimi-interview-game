import { CALYPSO_CAVE, CALYPSO_TREES } from '../../world/calypso-layout';
import { CALYPSO_CAVE_BLOCKERS } from '../../world/calypso-assets';
import { COASTAL_ASSETS } from '../../world/sea-worn';
import { CEDAR_STUMPS } from '../../world/late-assets';
import { placeNarrativeAsset } from '../../world/narrative-assets';
import { TEXT } from '../../content/script';
import {
  boatHull,
  pole,
  sailCloth,
} from '../../world/props';
import type { Act } from './types';

const T = TEXT.calypso;

/**
 * 第六幕 · 卡吕普索之岛
 *
 * 明朗永昼：洞居生活、四泉草地与面海独处。
 * 空间开放，细节集中在七年生活与离开的证据上。
 */
export const calypso: Act = {
  def: {
    id: 'calypso',
    act: 6,
    title: '卡吕普索之岛',
    subtitle: '第七年',
    tone: '永生的代价。这里什么都好，好到没有尽头——而他要的恰恰是一个有尽头的人生。',
    env: 'endlessDay',
    audio: 'endlessDay',
    spawn: { x: 4, z: 33, yaw: -0.15 },
    memoryId: 'calypso.axe',
    arrival: { pan: 0.55, seconds: 9 },
    interactables: [
      {
        id: 'calypso.hollow',
        kind: 'clue',
        prompt: '坐下来看海',
        lines: T.clue.hollow,
        x: 24,
        z: 14,
        y: 0.7,
        radius: 3.4,
      },
      {
        id: 'calypso.spring',
        kind: 'clue',
        prompt: '看四道泉',
        lines: T.clue.spring,
        x: -12,
        z: 3,
        y: 0.4,
        radius: 3.4,
      },
      {
        id: 'calypso.stumps',
        kind: 'clue',
        prompt: '数树桩',
        lines: T.clue.stumps,
        x: 10,
        z: -5,
        y: 0.5,
        radius: 3.6,
      },
      {
        id: 'calypso.loom',
        kind: 'clue',
        prompt: '看织了一半的布',
        lines: T.clue.loom,
        x: -14,
        z: -9,
        y: 1.4,
      },
      {
        id: 'calypso.robe',
        kind: 'clue',
        prompt: '看那件衣服',
        lines: T.clue.robe,
        x: -15.8,
        z: -14.2,
        y: 1.5,
      },
      {
        id: 'calypso.host',
        kind: 'talk',
        prompt: '和卡吕普索说话',
        lines: T.talk,
        speaker: T.npcName,
        modelAsset: 'game.nostos.character.calypso',
        modelHeight: 1.9,
        x: -7,
        z: -9,
        y: 1.1,
        radius: 3.4,
      },
      {
        id: 'calypso.axe',
        kind: 'memory',
        prompt: '拿起斧子',
        lines: T.memory,
        x: 10,
        z: -19,
        y: 0.6,
        radius: 2.8,
      },
      {
        id: 'calypso.depart',
        kind: 'depart',
        prompt: '上自己造的船',
        lines: [],
        x: 6,
        z: 36,
        y: 0.8,
        radius: 3.6,
        requiresMemory: true,
      },
    ],
    vision: {
      viewerAnchored: true,
      id: 'calypso.vision',
      duration: 66,
      stage: { x: 10, y: 0.6, z: -19 },
      beats: [
        {
          at: 0.8,
          line: T.vision[0],
          camera: { yaw: 0, pitch: 0.03, fov: -5, ease: 3 },
          motif: { kind: 'standing', x: 0, y: 2.0, z: -8, size: 4, grow: 2.4 },
        },
        {
          at: 5.4,
          line: T.vision[1],
          motif: { kind: 'wave', x: 0, y: 1.0, z: -15, size: 18, grow: 3.4, ink: 'shadow', opacity: 0.42 },
          camera: { yaw: 0.12, pitch: -0.02, fov: -2, ease: 4.5 },
        },
        {
          at: 11.6,
          line: T.vision[2],
          motif: { kind: 'threshold', x: -7.5, y: 3.2, z: -12, size: 8, grow: 2.4, ink: 'shadow', opacity: 0.55 },
          camera: { yaw: -0.24, ease: 4 },
        },
        {
          at: 18.0,
          line: T.vision[3],
          motif: { kind: 'wreath', x: 0, y: 4.4, z: -10, size: 5.6, grow: 2.2 },
          camera: { yaw: 0, pitch: 0.08, fov: -9, ease: 3.5 },
          exposure: 1.28,
        },
        {
          at: 24.6,
          line: T.vision[4],
          motif: { kind: 'shades', x: 6.5, y: 2.4, z: -12, size: 9, grow: 2.6, ink: 'shadow', opacity: 0.5 },
        },
        { at: 31.4, line: T.vision[5] },
        {
          at: 36.4,
          line: T.vision[6],
          camera: { yaw: 0, pitch: 0, fov: -13, ease: 2.4 },
        },
        {
          at: 41.6,
          line: T.vision[7],
          exposure: 0.88,
        },
        {
          at: 47.6,
          line: T.vision[8],
        },
        {
          at: 53.2,
          line: T.vision[9],
          motif: { kind: 'galley', x: 0, y: 4.6, z: -20, size: 15, grow: 2.6 },
          camera: { yaw: 0.05, pitch: -0.03, fov: 3, ease: 4 },
        },
      ],
    },
  },

  terrain: {
    seed: 20260701, radius: 40, size: 96, segments: 240,
    heightProfile: 'calypso', amplitude: 0, dome: 1.75, ridge: 0,
    detail: 'sand', detailStrength: .28,
    colorFlat: 0x829166, colorSteep: 0xabaa80, colorHigh: 0x9ca779,
    heightStart: 2.5, heightEnd: 5,
  },

  dress(d) {
    // Exactly twenty felled trees, in three authored patches; index 19 supports the axe.
    CEDAR_STUMPS.forEach(({x,z},i)=>placeNarrativeAsset(d,'game.nostos.prop.cedar_stump',{x,z,yaw:i*1.7,block:.42},1900+i));
    CALYPSO_TREES.forEach(({x,z,scale},i)=>placeNarrativeAsset(d,'game.nostos.environment.calypso_cedar',{x,z,scale,yaw:i*.63,block:.3},1950+i));
    placeNarrativeAsset(d,'game.nostos.environment.calypso_cave',{x:CALYPSO_CAVE.x,z:CALYPSO_CAVE.z,y:CALYPSO_CAVE.floor},2100);
    d.blockers.push(...CALYPSO_CAVE_BLOCKERS);
    placeNarrativeAsset(d,'game.nostos.environment.calypso_four_rills',{x:0,z:0,y:0});
    placeNarrativeAsset(d,'game.nostos.environment.calypso_paths',{x:0,z:0,y:0});
    placeNarrativeAsset(d,'game.nostos.prop.calypso_seat_rock',{x:24,z:14,yaw:-.5,block:1.15});
    placeNarrativeAsset(d,'game.nostos.prop.weighted_loom',{x:-14,z:-9,y:CALYPSO_CAVE.floor,yaw:.42,block:.65},2100);
    placeNarrativeAsset(d,'game.nostos.prop.unworn_robe',{x:-15.8,z:-14.2,y:CALYPSO_CAVE.floor,yaw:.65},2110);
    placeNarrativeAsset(d,'game.nostos.character.calypso',{x:-7,z:-9,y:CALYPSO_CAVE.floor,yaw:.18,block:.3});
    placeNarrativeAsset(d,'game.nostos.prop.calypso_domestic_set',{x:-12,z:-14.7,y:CALYPSO_CAVE.floor},2120);
    placeNarrativeAsset(d,'game.nostos.prop.calypso_axe',{x:10,z:-19,lift:.59,yaw:.6},2131);
    // Functional rock groups, not a random pebble carpet.
    const rocks=[[-24,14,1.2],[-28,-5,1.3],[-4,-24,.9],[26,20,.9],[19,-23,1.1],[30,-12,.8],[13,27,.7]];
    rocks.forEach(([x,z,r],i)=>d.place(COASTAL_ASSETS['game.nostos.environment.sea_rock'](r!,2200+i),'limestone',{x:x!,z:z!,lift:-.12,scale:[1.5,.65,1],yaw:i*.7,block:r!*.7}));
    const plants=[[-18,8],[-23,10],[-19,-7],[-21,-18],[-2,-23],[25,-5],[28,4],[25,19],[14,25],[-10,23],[4,9],[14,11]];
    plants.forEach(([x,z],i)=>d.place(COASTAL_ASSETS['game.nostos.environment.coastal_leaves'](1.5,2300+i),'olive',{x:x!,z:z!,yaw:i*1.8}));
    d.place(boatHull(6.2,2300),'driftwood',{x:6,z:36,lift:.42,yaw:-.28,tiltZ:.05});
    d.place(pole(4.4,.11,2301),'driftwood',{x:6.2,z:35.6,lift:.76,tiltX:.1});
    d.place(sailCloth(3,3,.35,2302),'cloth',{x:6.2,z:35.5,lift:3.2});
  },
};
