import { expect, it } from 'vitest';
import { isBlocked } from '../src/engine/collision';

it('blocks the full length of a wall and its end caps, preserving door gaps', () => {
  const walls = [{x:-5,z:0,endX:-1.2,endZ:0,radius:.5}, {x:1.2,z:0,endX:5,endZ:0,radius:.5}];
  expect(walls.some(w => isBlocked(-3,.3,w))).toBe(true);
  expect(walls.some(w => isBlocked(-1,.1,w))).toBe(true);
  expect(walls.some(w => isBlocked(0,0,w))).toBe(false);
  expect(walls.some(w => isBlocked(3,.6,w))).toBe(false);
});
it('supports oblique walls and existing circles without division by zero', () => {
  expect(isBlocked(2,2,{x:0,z:0,endX:4,endZ:4,radius:.4})).toBe(true);
  expect(isBlocked(2,3,{x:0,z:0,endX:4,endZ:4,radius:.4})).toBe(false);
  expect(isBlocked(0,0,{x:0,z:0,radius:1})).toBe(true);
  expect(isBlocked(2,0,{x:0,z:0,endX:0,endZ:0,radius:1})).toBe(false);
});
