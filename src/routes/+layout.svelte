<script lang="ts">
  import "./layout.css";
  import favicon from "$lib/assets/favicon.svg";

  import { onMount } from "svelte";
  import vertexShaderSource from "$lib/shaders/flowers.vs?raw";
  import fragmentShaderSource from "$lib/shaders/flowers.fs?raw";
  import {
    createProgramFromSources,
    resizeCanvasToDisplaySize,
  } from "$lib/webgl-utils";
  import { loadTexture } from "$lib";
  import { canvasSpace } from "$lib/canvas-space.svelte";
  import { textureLoader } from "$lib/texture-loader.svelte";
  import { flowerManager, RENDER_CONFIG } from "$lib/flowers.svelte";
  import { observeClassChanges } from "$lib/observer";

  let { children } = $props();

  let fps = $state(0);
  let mouse = { x: 0, y: 0 };
  // let flowers: Flower[] = [];
  let textures_loaded = $derived(textureLoader.allLoaded);
  const texture_urls = ["/textures/5X5.png"];
  textureLoader.loadAll(texture_urls);

  // origin(2) + max_radius(1) + spawn_time(1) + animation_time(1) + despawn_time(1) + flower(2) + rotation(1)
  const FLOATS_PER_INSTANCE = 2 + 1 + 1 + 1 + 1 + 2 + 1;
  const STRIDE = FLOATS_PER_INSTANCE * 4; // bytes

  function mouse_listener(e: MouseEvent) {
    mouse = canvasSpace.clientToCanvas(e.clientX, e.clientY);
    for (let index = 0; index < 10; index++) {
      flowerManager.addFlower({ x: mouse.x, y: mouse.y }, true);
    }
    // mark flowers that just left the AOE as despawning
    flowerManager.despawnAOE({ x: e.clientX, y: e.clientY });
  }

  function getClearings() {
    return Array.from(document.getElementsByClassName("clearing")).map((el) =>
      canvasSpace.rectToCanvas(el.getBoundingClientRect()),
    );
  }

  onMount(() => {
    const canvas = document.querySelector<HTMLCanvasElement>("#c")!;
    resizeCanvasToDisplaySize(canvas);
    const gl = canvas.getContext("webgl2", {
      antialias: true,
    })!;
    canvasSpace.set(canvas);

    if (!gl) return;

    function updateClearings() {
      resizeCanvasToDisplaySize(canvas);
      gl.viewport(0, 0, canvas.width, canvas.height);
      flowerManager.clearing = getClearings();
    }

    window.addEventListener("pointermove", mouse_listener);
    window.addEventListener("resize", updateClearings);

    const stopObserver = observeClassChanges(() => {
      flowerManager.clearing = getClearings();
    });

    // run once immediately, since the observer only fires on future changes
    flowerManager.clearing = getClearings();

    flowerManager.registerSpawner("ambient1", {
      minDelay: 3000,
      maxDelay: 5000,
      spawn: () => {
        flowerManager.addFlower(canvasSpace.randomPoint(), true, 5);
      },
    });
    flowerManager.registerSpawner("ambient2", {
      minDelay: 2000,
      maxDelay: 3000,
      spawn: () => {
        flowerManager.addFlower(canvasSpace.randomPoint(), true, 3);
      },
    });

    flowerManager.registerSpawner("cluster1", {
      minDelay: 5000,
      maxDelay: 7000,
      spawn: () => {
        const clusterSize = 10;
        const point = canvasSpace.randomPoint();
        for (let i = 0; i < clusterSize; i++) {
          const staggerDelay = i * (50 + Math.random() * 100);
          window.setTimeout(() => {
            flowerManager.addFlower(point, true, 4);
          }, staggerDelay);
        }
      },
    });

    const flower_program = createProgramFromSources(gl, [
      vertexShaderSource,
      fragmentShaderSource,
    ]);

    if (!flower_program) return;

    const positionLoc = gl.getAttribLocation(flower_program, "a_position");
    const texCoordLoc = gl.getAttribLocation(flower_program, "a_texCoord");

    const originLoc = gl.getAttribLocation(flower_program, "a_origin");
    const maxRadiusLoc = gl.getAttribLocation(flower_program, "a_max_radius");
    const spawnTimeLoc = gl.getAttribLocation(flower_program, "a_spawn_time");
    const animationTimeLoc = gl.getAttribLocation(
      flower_program,
      "a_animation_time",
    );
    const despawnTimeLoc = gl.getAttribLocation(
      flower_program,
      "a_despawn_time",
    );
    const flowerLoc = gl.getAttribLocation(flower_program, "a_flower");
    const rotationLoc = gl.getAttribLocation(flower_program, "a_rotation");

    const resolutionUniformLocation = gl.getUniformLocation(
      flower_program,
      "u_resolution",
    );
    const timeUniformLocation = gl.getUniformLocation(flower_program, "u_time");
    const textureUnifromLocation = gl.getUniformLocation(
      flower_program,
      "u_texture",
    );

    // Static unit quad (two triangles), scaled by max_radius in the vertex shader
    const quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -1, -1, 0, 0, 1, -1, 1, 0, -1, 1, 0, 1, -1, 1, 0, 1, 1, -1, 1, 0, 1, 1,
        1, 1,
      ]),
      gl.STATIC_DRAW,
    );

    // Dynamic per-instance buffer, preallocated to MAX_DISCS
    const instanceBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      RENDER_CONFIG.MAX_FLOWERS * FLOATS_PER_INSTANCE * 4,
      gl.DYNAMIC_DRAW,
    );

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    // a_position: per-vertex, from quadBuffer
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 4 * 4, 0);

    gl.enableVertexAttribArray(texCoordLoc);
    gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 4 * 4, 2 * 4);

    // Instance attributes, from instanceBuffer, interleaved
    gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);

    gl.enableVertexAttribArray(originLoc);
    gl.vertexAttribPointer(originLoc, 2, gl.FLOAT, false, STRIDE, 0);
    gl.vertexAttribDivisor(originLoc, 1);

    gl.enableVertexAttribArray(maxRadiusLoc);
    gl.vertexAttribPointer(maxRadiusLoc, 1, gl.FLOAT, false, STRIDE, 2 * 4);
    gl.vertexAttribDivisor(maxRadiusLoc, 1);

    gl.enableVertexAttribArray(spawnTimeLoc);
    gl.vertexAttribPointer(spawnTimeLoc, 1, gl.FLOAT, false, STRIDE, 3 * 4);
    gl.vertexAttribDivisor(spawnTimeLoc, 1);

    gl.enableVertexAttribArray(animationTimeLoc);
    gl.vertexAttribPointer(animationTimeLoc, 1, gl.FLOAT, false, STRIDE, 4 * 4);
    gl.vertexAttribDivisor(animationTimeLoc, 1);

    gl.enableVertexAttribArray(despawnTimeLoc);
    gl.vertexAttribPointer(despawnTimeLoc, 1, gl.FLOAT, false, STRIDE, 5 * 4);
    gl.vertexAttribDivisor(despawnTimeLoc, 1);

    gl.enableVertexAttribArray(flowerLoc);
    gl.vertexAttribPointer(flowerLoc, 2, gl.FLOAT, false, STRIDE, 6 * 4);
    gl.vertexAttribDivisor(flowerLoc, 1);

    gl.enableVertexAttribArray(rotationLoc);
    gl.vertexAttribPointer(rotationLoc, 1, gl.FLOAT, false, STRIDE, 8 * 4);
    gl.vertexAttribDivisor(rotationLoc, 1);

    gl.bindVertexArray(null);

    resizeCanvasToDisplaySize(canvas);
    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const texture = loadTexture(gl, "/textures/5X5.png");

    // Reused scratch buffer to avoid per-frame allocation
    const instanceData = new Float32Array(
      RENDER_CONFIG.MAX_FLOWERS * FLOATS_PER_INSTANCE,
    );

    let lastFrame = performance.now();

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    gl.bindVertexArray(vao);

    function render() {
      const flowers = flowerManager.flowers;
      if (resizeCanvasToDisplaySize(canvas)) {
        gl.viewport(0, 0, canvas.width, canvas.height);
      }
      const now = performance.now();
      const dt = now - lastFrame;
      lastFrame = now;
      fps = Math.round(1000 / dt);

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);

      const time = now * 0.001;

      flowerManager.prune();

      const count = Math.min(flowers.length, RENDER_CONFIG.MAX_FLOWERS);

      for (let i = 0; i < count; i++) {
        const flower = flowers[i];
        const o = i * FLOATS_PER_INSTANCE;

        instanceData[o] = flower.origin.x;
        instanceData[o + 1] = flower.origin.y;
        instanceData[o + 2] = flower.max_radius;
        instanceData[o + 3] = flower.spawn_time;
        instanceData[o + 4] = flower.animation_time;
        instanceData[o + 5] = flower.despawn_time;
        instanceData[o + 6] = flower.flower_atlas.x;
        instanceData[o + 7] = flower.flower_atlas.y;
        instanceData[o + 8] =
          flower.rotation.direction * flower.rotation.speed_factor;
      }

      gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
      gl.bufferSubData(
        gl.ARRAY_BUFFER,
        0,
        instanceData.subarray(0, count * FLOATS_PER_INSTANCE),
      );

      gl.useProgram(flower_program);
      gl.uniform1i(textureUnifromLocation, 0);
      gl.uniform2f(resolutionUniformLocation, canvas.width, canvas.height);
      gl.uniform1f(timeUniformLocation, time);

      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, count);

      requestAnimationFrame(render);
    }

    requestAnimationFrame(render);

    return () => {
      window.removeEventListener("pointermove", mouse_listener);
      window.removeEventListener("resize", updateClearings);
      flowerManager.stopAllSpawners();
      stopObserver();
    };
  });
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div id="page">
  <div id="top">
    <span class="font-mono text-xs text-accent-foreground/60"
      >Frames: {fps}</span
    >
  </div>
  <div id="left"></div>
  <main class="border-accent-foreground/60 border bg-transparent">
    {@render children()}
  </main>
  <div id="right"></div>
  <canvas
    id="c"
    class="absolute touch-none bg-background place-content-center top-0 left-0 -z-20 w-dvw h-dvh"
  ></canvas>
  <footer id="bot">
    <span class="font-mono text-xs text-accent-foreground/75">saboon</span>
  </footer>
</div>

<style>
  #page {
    width: 100dvw;
    height: 100dvh;
    display: grid;
    grid-template-columns: 1.5rem 1fr 1.5rem;
    grid-template-rows: 1.5rem 1fr 1.5rem;
    grid-template-areas:
      "t t t"
      "l m r"
      "b b b";
    height: 100vh;
    width: 100%;
  }
  main {
    grid-area: m;
  }
  #top {
    grid-area: t;
  }
  #bot {
    grid-area: b;
  }
  #left {
    grid-area: l;
  }
  #right {
    grid-area: r;
  }
  #top,
  #bot {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    background-color: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(8px);
    padding-inline: 1.5rem;
  }
  #left,
  #right {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    background-color: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(8px);
    padding-block: 1.5rem;
  }
</style>
