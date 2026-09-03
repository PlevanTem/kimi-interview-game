import type { PathRules, Point } from '../domain/path';

export interface SegmentDefinition extends PathRules {
  id: string;
  label: string;
  guide: Point[];
}

const corridor = { minX: 0, maxX: 10, minY: -2.5, maxY: 2.5 };
const base = { anchorTolerance: 0.24, targetTolerance: 0.64, corridor };

export const segments: SegmentDefinition[] = [
  { ...base, id: 'step-01', label: '先让下一步可走', start: [0, 0], target: [10, 0], budget: 10.8, blocks: [], guide: [[0, 0], [10, 0]] },
  { ...base, id: 'step-02', label: '绕开眼前的空隙', start: [0, -1], target: [10, 1], budget: 11.8, blocks: [{ minX: 4, maxX: 6, minY: -0.35, maxY: 0.7 }], guide: [[0, -1], [3.5, -1.35], [6.5, -0.55], [10, 1]] },
  { ...base, id: 'step-03', label: '不必走成直线', start: [0, 1.2], target: [10, -1.1], budget: 12.4, blocks: [{ minX: 3.2, maxX: 5.2, minY: -0.25, maxY: 1.45 }], guide: [[0, 1.2], [2.6, -0.7], [5.8, -0.85], [10, -1.1]] },
  { ...base, id: 'step-04', label: '给犹豫留一点余地', start: [0, -1.4], target: [10, 0.8], budget: 13.2, blocks: [{ minX: 2.4, maxX: 4, minY: -2.5, maxY: -0.35 }, { minX: 6, maxX: 7.4, minY: 0.15, maxY: 2.5 }], guide: [[0, -1.4], [2, -0.1], [4.6, -0.1], [5.5, -0.8], [7.8, -0.8], [10, 0.8]] },
  { ...base, id: 'step-05', label: '路线可以转弯', start: [0, 0.8], target: [10, -0.7], budget: 14.2, blocks: [{ minX: 2.5, maxX: 4.3, minY: -0.1, maxY: 1.3 }, { minX: 5.7, maxX: 7.5, minY: -1.2, maxY: 0.1 }], guide: [[0, 0.8], [2.1, 1.55], [4.8, 1.45], [5.2, -1.5], [8, -1.5], [10, -0.7]] },
  { ...base, id: 'step-06', label: '先抵达，再回看', start: [0, -0.5], target: [10, 1.4], budget: 12.8, blocks: [{ minX: 4, maxX: 6, minY: -1, maxY: 0.75 }], guide: [[0, -0.5], [3.5, -1.35], [6.5, -1.25], [7.2, 0.8], [10, 1.4]] },
  { ...base, id: 'step-07', label: '保留一次重铺的权利', start: [0, 1.5], target: [10, -1.4], budget: 13, blocks: [{ minX: 4.2, maxX: 5.8, minY: -0.85, maxY: 1.1 }], guide: [[0, 1.5], [3.7, -1.25], [6.3, -1.3], [10, -1.4]] },
  { ...base, id: 'step-08', label: '把这一段走完', start: [0, 0], target: [10, 0], budget: 15.2, blocks: [{ minX: 2.4, maxX: 4, minY: -1, maxY: 1.1 }, { minX: 6, maxX: 7.6, minY: -1.1, maxY: 1 }], guide: [[0, 0], [2, -1.4], [4.5, -1.4], [5.5, 1.4], [8, 1.4], [10, 0]] }
];
