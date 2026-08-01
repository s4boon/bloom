import { canvasSpace } from "./canvas-space.svelte";

export let RENDER_CONFIG = {
  AOE: 40,
  BASE_LIFETIME: 1.0,
  MIN_RADIUS: 10,
  MAX_RADIUS: 30,
  // SHOW_FPS: $state(false),
  ROTATION_DIRECTION: null,
  ROTATION_SPEED: 2.0,
  ATLAS_UNIT_X: 5,
  ATLAS_UNIT_Y: 5,
};

export type Flower = {
  origin: { x: number; y: number };
  max_radius: number;
  spawn_time: number;
  animation_time: number;
  despawn_time: number; // -1 while alive, set once it starts fading out
  flower_atlas: { x: number; y: number };
  rotation: {
    speed_factor: number;
    direction: -1 | 1;
  };
};

// let trail_flowers: Flower[] = $state([]);
export function addFlower(
  flowers: Flower[],
  mouse: { x: number; y: number },
  clearings?: DOMRect[],
): boolean {
  const now = performance.now() * 0.001;
  const dpr = window.devicePixelRatio || 1;
  const r =
    randomInt(RENDER_CONFIG.MAX_RADIUS, RENDER_CONFIG.MIN_RADIUS) *
    canvasSpace.dpr;

  const new_flower: Flower = {
    origin: {
      x: mouse.x + randomInt(RENDER_CONFIG.AOE, -RENDER_CONFIG.AOE),
      y: mouse.y + randomInt(RENDER_CONFIG.AOE, -RENDER_CONFIG.AOE),
    },
    max_radius: r,
    spawn_time: now,
    animation_time: randomInt(50, 300) * 0.001,
    despawn_time: now + 1.0 + Math.random() * 0.6,
    flower_atlas: {
      x: randomInt(0, 20),
      y: randomInt(0, 20),
    }, //texture is a 5 by 5 texture atlas
    // 4 should be enough but going above does not matter since i set texture wrap to repeat
    // i put 20 cus 4 was NOT enough idk why so now im sure we get all parts, with the chance of some parts appearing more often
    rotation: {
      direction: Math.random() >= 0.5 ? 1 : -1,
      speed_factor: Math.random() * 2 + 1,
    },
  };

  if (isValid(flowers, new_flower, clearings ?? [])) {
    flowers.push(new_flower);
    return true;
  }
  return false;
}

function isValid(flowers: Flower[], flower: Flower, clearings: DOMRect[]) {
  let invalid = clearings.some((clearing) => {
    return inRect(flower, clearing);
  });
  if (invalid) {
    return false;
  }
  invalid = flowers.some((d) => {
    // Ignore flowers that are already despawning — fine to spawn on top of them
    // if (d.despawn_time !== -1) return false;
    // dont do that if all ur flowers have a despawn time set at creation, leaving for hindsight
    const d_sq =
      Math.pow(flower.origin.x - d.origin.x, 2) +
      Math.pow(flower.origin.y - d.origin.y, 2);
    const rs_sq = Math.pow(flower.max_radius + d.max_radius, 2);
    return d_sq <= rs_sq;
  });
  return !invalid;
}

function inRect(flower: Flower, rect: DOMRect) {
  const { left, right, top, bottom } = canvasSpace.rectToCanvas(rect);
  const { x, y } = flower.origin;
  return x >= left && x <= right && y >= top && y <= bottom;
}

export function randomInt(hi: number, lo = 0) {
  return Math.floor(lo + Math.random() * (hi - lo));
}
