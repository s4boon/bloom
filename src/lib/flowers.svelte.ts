import { canvasSpace } from "./canvas-space.svelte";

export const RENDER_CONFIG = {
  AOE: 40,
  BASE_LIFETIME: 1.0,
  MIN_RADIUS: 10,
  MAX_RADIUS: 30,
  MAX_FLOWERS: 4096,
  ROTATION_DIRECTION: null,
  ROTATION_SPEED: 2.0,
  ATLAS_UNIT_X: 5,
  ATLAS_UNIT_Y: 4,
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

type Spawner = {
  timeoutId: number | null;
  minDelay: number;
  maxDelay: number;
  spawn: () => void;
};

class FlowerManager {
  flowers: Flower[] = [];
  private spawners: Map<string, Spawner> = new Map();
  private clearings: DOMRect[] = [];

  private isValid(flower: Flower, avoid_clearings: boolean) {
    const clearings = avoid_clearings ? this.clearings : [];
    let invalid = clearings.some((clearing) => inRect(flower, clearing));
    if (invalid) return false;

    invalid = this.flowers.some((d) => {
      const d_sq =
        Math.pow(flower.origin.x - d.origin.x, 2) +
        Math.pow(flower.origin.y - d.origin.y, 2);
      const rs_sq = Math.pow(flower.max_radius + d.max_radius, 2);
      return d_sq <= rs_sq;
    });
    return !invalid;
  }

  addFlower(
    mouse: { x: number; y: number },
    avoid_clearings: boolean,
    base_lifetime = 1,
  ): boolean {
    if (this.flowers.length >= RENDER_CONFIG.MAX_FLOWERS) return false;

    const now = performance.now() * 0.001;
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
      despawn_time: now + base_lifetime + Math.random() * 0.6,
      flower_atlas: {
        x: randomInt(0, 20),
        y: randomInt(0, 20),
      },
      rotation: {
        direction: Math.random() >= 0.5 ? 1 : -1,
        speed_factor: Math.random() * 2 + 1,
      },
    };

    if (this.isValid(new_flower, avoid_clearings)) {
      this.flowers.push(new_flower);
      return true;
    }
    return false;
  }

  despawnAOE(mouse: { x: number; y: number }) {
    this.flowers.forEach((flower) => {
      if (flower.despawn_time !== -1) return;

      const d_sq =
        Math.pow(flower.origin.x - mouse.x, 2) +
        Math.pow(flower.origin.y - mouse.y, 2);
      const rs_sq = Math.pow(RENDER_CONFIG.AOE + 100, 2);

      if (d_sq > rs_sq) {
        flower.despawn_time = performance.now() * 0.001;
      }
    });
  }

  prune() {
    const now = performance.now() * 0.001;
    this.flowers = this.flowers.filter(
      (flower) => flower.despawn_time + flower.animation_time > now,
    );
  }

  registerSpawner(
    key: string,
    opts: { minDelay: number; maxDelay: number; spawn: () => void },
  ) {
    this.stopSpawner(key);
    const spawner: Spawner = { timeoutId: null, ...opts };
    this.spawners.set(key, spawner);
    this.scheduleNext(key);
  }

  private scheduleNext(key: string) {
    const spawner = this.spawners.get(key);
    if (!spawner) return;

    const delay =
      spawner.minDelay + Math.random() * (spawner.maxDelay - spawner.minDelay);

    spawner.timeoutId = window.setTimeout(() => {
      spawner.spawn();
      this.scheduleNext(key);
    }, delay);
  }

  stopSpawner(key: string) {
    const spawner = this.spawners.get(key);
    if (spawner?.timeoutId !== null && spawner) {
      clearTimeout(spawner.timeoutId);
    }
    this.spawners.delete(key);
  }

  stopAllSpawners() {
    for (const key of this.spawners.keys()) {
      this.stopSpawner(key);
    }
  }

  set clearing(c: DOMRect[]) {
    this.clearings = c;
  }
}

function inRect(flower: Flower, rect: DOMRect) {
  const { left, right, top, bottom } = rect;
  const { x, y } = flower.origin;
  return x >= left && x <= right && y >= top && y <= bottom;
}

export function randomInt(hi: number, lo = 0) {
  return Math.floor(lo + Math.random() * (hi - lo));
}

export const flowerManager = new FlowerManager();
