<script lang="ts">
  import { onMount } from "svelte";
  import vertexShaderSource from "$lib/shaders/vertex.glsl?raw";
  import fragmentShaderSource from "$lib/shaders/fragment.glsl?raw";
  import {
    createProgramFromSources,
    resizeCanvasToDisplaySize,
  } from "$lib/webglutils";

  let fps = $state(0);

  const MAX_DISCS = 4096;
  // origin(2) + max_radius(1) + color(4) + spawn_time(1) + animation_time(1) + despawn_time(1)
  const FLOATS_PER_INSTANCE = 2 + 1 + 4 + 1 + 1 + 1;
  const STRIDE = FLOATS_PER_INSTANCE * 4; // bytes
  const DESPAWN_DURATION = 0.15; // seconds

  onMount(() => {
    const start_time = performance.now();
    const canvas = document.querySelector<HTMLCanvasElement>("#c")!;
    const gl = canvas.getContext("webgl2")!;

    if (!gl) return;

    const program = createProgramFromSources(gl, [
      vertexShaderSource,
      fragmentShaderSource,
    ]);

    if (!program) return;

    const positionLoc = gl.getAttribLocation(program, "a_position");
    const originLoc = gl.getAttribLocation(program, "a_origin");
    const maxRadiusLoc = gl.getAttribLocation(program, "a_max_radius");
    const colorLoc = gl.getAttribLocation(program, "a_color");
    const spawnTimeLoc = gl.getAttribLocation(program, "a_spawn_time");
    const animationTimeLoc = gl.getAttribLocation(program, "a_animation_time");
    const despawnTimeLoc = gl.getAttribLocation(program, "a_despawn_time");

    const resolutionUniformLocation = gl.getUniformLocation(
      program,
      "u_resolution",
    );
    const timeUniformLocation = gl.getUniformLocation(program, "u_time");
    const despawnDurationUniformLocation = gl.getUniformLocation(
      program,
      "u_despawn_duration",
    );

    // Static unit quad (two triangles), scaled by max_radius in the vertex shader
    const quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
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
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    // Instance attributes, from instanceBuffer, interleaved
    gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);

    gl.enableVertexAttribArray(originLoc);
    gl.vertexAttribPointer(originLoc, 2, gl.FLOAT, false, STRIDE, 0);
    gl.vertexAttribDivisor(originLoc, 1);

    gl.enableVertexAttribArray(maxRadiusLoc);
    gl.vertexAttribPointer(maxRadiusLoc, 1, gl.FLOAT, false, STRIDE, 2 * 4);
    gl.vertexAttribDivisor(maxRadiusLoc, 1);

    gl.enableVertexAttribArray(colorLoc);
    gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, STRIDE, 3 * 4);
    gl.vertexAttribDivisor(colorLoc, 1);

    gl.enableVertexAttribArray(spawnTimeLoc);
    gl.vertexAttribPointer(spawnTimeLoc, 1, gl.FLOAT, false, STRIDE, 7 * 4);
    gl.vertexAttribDivisor(spawnTimeLoc, 1);

    gl.enableVertexAttribArray(animationTimeLoc);
    gl.vertexAttribPointer(animationTimeLoc, 1, gl.FLOAT, false, STRIDE, 8 * 4);
    gl.vertexAttribDivisor(animationTimeLoc, 1);

    gl.enableVertexAttribArray(despawnTimeLoc);
    gl.vertexAttribPointer(despawnTimeLoc, 1, gl.FLOAT, false, STRIDE, 9 * 4);
    gl.vertexAttribDivisor(despawnTimeLoc, 1);

    gl.bindVertexArray(null);

    resizeCanvasToDisplaySize(canvas);
    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Static uniform, set once
    gl.useProgram(program);
    gl.uniform1f(despawnDurationUniformLocation, DESPAWN_DURATION);

    type Disc = {
      origin: { x: number; y: number };
      max_radius: number;
      color: { x: number; y: number; z: number };
      spawn_time: number;
      animation_time: number;
      despawn_time: number; // -1 while alive, set once it starts fading out
    };

    let discs: Array<Disc> = [];

    // Reused scratch buffer to avoid per-frame allocation
    const instanceData = new Float32Array(MAX_DISCS * FLOATS_PER_INSTANCE);
    const SPREAD = 80;
    const AOE = SPREAD + 300;
    const MIN_RADIUS = 10;
    const MAX_RADIUS = 50;

    window.onpointermove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
      const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
      const now = (performance.now() - start_time) * 0.001;

      for (let index = 0; index < 10; index++) {
        const r = randomInt(MAX_RADIUS, MIN_RADIUS);

        const d: Disc = {
          origin: {
            x: mouseX + randomInt(SPREAD, -SPREAD),
            y: mouseY + randomInt(SPREAD, -SPREAD),
          },
          max_radius: r,
          color: {
            x: Math.random(),
            y: Math.random(),
            z: Math.random(),
          },
          spawn_time: now,
          animation_time: randomInt(50, 300) * 0.001,
          despawn_time: -1,
        };

        if (isValid(d)) {
          discs.push(d);
        }
      }

      // Mark discs that just left the AOE as despawning, instead of removing
      // them outright — they'll keep shrinking until render() prunes them.
      discs.forEach((disc) => {
        if (disc.despawn_time !== -1) return; // already despawning

        const d_sq =
          Math.pow(disc.origin.x - mouseX, 2) +
          Math.pow(disc.origin.y - mouseY, 2);
        const rs_sq = Math.pow(AOE, 2);
        const inside = d_sq <= rs_sq;

        if (!inside) {
          disc.despawn_time = now;
        }
      });
    };

    function isValid(disc: Disc) {
      const idx = discs.findIndex((d) => {
        // Ignore discs that are already despawning — fine to spawn on top of them
        if (d.despawn_time !== -1) return false;
        const d_sq =
          Math.pow(disc.origin.x - d.origin.x, 2) +
          Math.pow(disc.origin.y - d.origin.y, 2);
        const rs_sq = Math.pow(disc.max_radius + d.max_radius, 2);
        return d_sq <= rs_sq;
      });
      return idx == -1;
    }

    let lastFrame = performance.now();

    function render() {
      const now = performance.now();
      const dt = now - lastFrame;
      lastFrame = now;
      fps = Math.round(1000 / dt);

      const time = (now - start_time) * 0.001;

      // Prune discs that have fully finished their despawn (shrink) animation
      discs = discs.filter((disc) => {
        if (disc.despawn_time === -1) return true;
        return time - disc.despawn_time < DESPAWN_DURATION;
      });

      if (resizeCanvasToDisplaySize(canvas)) {
        gl.viewport(0, 0, canvas.width, canvas.height);
      }
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      gl.useProgram(program);
      gl.bindVertexArray(vao);
      gl.uniform2f(resolutionUniformLocation, canvas.width, canvas.height);
      gl.uniform1f(timeUniformLocation, time);

      const count = Math.min(discs.length, MAX_DISCS);

      for (let i = 0; i < count; i++) {
        const disc = discs[i];
        const o = i * FLOATS_PER_INSTANCE;

        instanceData[o] = disc.origin.x;
        instanceData[o + 1] = disc.origin.y;
        instanceData[o + 2] = disc.max_radius;
        instanceData[o + 3] = disc.color.x;
        instanceData[o + 4] = disc.color.y;
        instanceData[o + 5] = disc.color.z;
        instanceData[o + 6] = 1; // alpha
        instanceData[o + 7] = disc.spawn_time;
        instanceData[o + 8] = disc.animation_time;
        instanceData[o + 9] = disc.despawn_time;
      }

      gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
      gl.bufferSubData(
        gl.ARRAY_BUFFER,
        0,
        instanceData.subarray(0, count * FLOATS_PER_INSTANCE),
      );

      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, count);

      requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
  });

  function randomInt(hi: number, lo = 0) {
    return Math.floor(lo + Math.random() * (hi - lo));
  }
</script>

<div class="fps-counter">
  {fps} FPS
</div>

<canvas id="c" class="bg-black"></canvas>

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
