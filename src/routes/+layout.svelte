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
  import { addFlower, RENDER_CONFIG, type Flower } from "$lib/flowers.svelte";
  import { canvasSpace } from "$lib/canvas-space.svelte";
  import { textureLoader } from "$lib/texture-loader.svelte";

  let { children } = $props();

  let fps = $state(0);
  let mouse = { x: 0, y: 0 };
  let flowers: Flower[] = [];
  const texture_urls = ["/textures/5X5.png"];
  textureLoader.loadAll(texture_urls);

  const MAX_DISCS = 4096;
  // origin(2) + max_radius(1) + spawn_time(1) + animation_time(1) + despawn_time(1) + flower(2) + rotation(1)
  const FLOATS_PER_INSTANCE = 2 + 1 + 1 + 1 + 1 + 2 + 1;
  const STRIDE = FLOATS_PER_INSTANCE * 4; // bytes

  function mouse_listener(e: MouseEvent) {
    const now = performance.now() * 0.001;
    mouse = canvasSpace.clientToCanvas(e.clientX, e.clientY);
    for (let index = 0; index < 10; index++) {
      addFlower(flowers, { x: mouse.x, y: mouse.y });
    }

    // mark flowers that just left the AOE as despawning
    flowers.forEach((flower) => {
      if (flower.despawn_time !== -1) return;

      const d_sq =
        Math.pow(flower.origin.x - mouse.x, 2) +
        Math.pow(flower.origin.y - mouse.y, 2);
      const rs_sq = Math.pow(RENDER_CONFIG.AOE + 100, 2);
      const inside = d_sq <= rs_sq;

      if (!inside) {
        flower.despawn_time = now;
      }
    });
  }

  onMount(() => {
    window.addEventListener("mousemove", mouse_listener);
    const canvas = document.querySelector<HTMLCanvasElement>("#c")!;
    const gl = canvas.getContext("webgl2", {
      antialias: true,
    })!;
    canvasSpace.set(canvas);

    if (!gl) return;

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
      MAX_DISCS * FLOATS_PER_INSTANCE * 4,
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
    const instanceData = new Float32Array(MAX_DISCS * FLOATS_PER_INSTANCE);

    let lastFrame = performance.now();

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    gl.bindVertexArray(vao);

    function render() {
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

      //prune flowers
      flowers = flowers.filter((flower) => {
        if (flower.despawn_time === -1) return true;
        return time - flower.despawn_time < flower.animation_time;
      });

      const count = Math.min(flowers.length, MAX_DISCS);

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

    return () => window.removeEventListener("mousemove", mouse_listener);
  });
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<main class="relative w-full h-full p-px">
  <div class="fps-counter">
    {fps} FPS
  </div>
  <div class="absolute top-0 left-0 -z-20">
    <canvas id="c" class="bg-black"></canvas>
  </div>
  {@render children()}
</main>

<style>
  .fps-counter {
    position: fixed;
    top: 12px;
    left: 12px;

    padding: 8px 12px;

    color: white;
    font-family: monospace;
    font-size: 14px;

    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(8px);

    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 8px;

    user-select: none;
    pointer-events: none;
  }

  canvas {
    width: 100vw;
    height: 100vh;
    display: block;
    touch-action: none;
  }
</style>
