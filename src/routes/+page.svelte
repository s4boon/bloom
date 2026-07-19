<script lang="ts">
  import { onMount } from "svelte";
  import vertexShaderSource from "$lib/shaders/vertex.glsl?raw";
  import fragmentShaderSource from "$lib/shaders/fragment.glsl?raw";
  import {
    createProgramFromSources,
    resizeCanvasToDisplaySize,
  } from "$lib/webglutils";

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

    const positionAttributeLocation = gl.getAttribLocation(
      program,
      "a_position",
    );

    const resolutionUniformLocation = gl.getUniformLocation(
      program,
      "u_resolution",
    );

    const colorLocation = gl.getUniformLocation(program, "u_color");
    const radiusUniformLocation = gl.getUniformLocation(program, "u_radius");
    const originUniformLocation = gl.getUniformLocation(program, "u_origin");
    const lifetimeUniformLocation = gl.getUniformLocation(
      program,
      "u_lifetime",
    ); //vec3(spawn_time, despawn_time, animation_time)
    const timeUniformLocation = gl.getUniformLocation(program, "u_time");

    // Create buffer
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(), gl.STATIC_DRAW);

    // Create VAO
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    gl.enableVertexAttribArray(positionAttributeLocation);

    gl.vertexAttribPointer(
      positionAttributeLocation,
      2, // components
      gl.FLOAT, // type
      false, // normalize
      0, // stride
      0, // offset
    );
    resizeCanvasToDisplaySize(canvas);
    gl.viewport(0, 0, canvas.width, canvas.height);

    type Disc = {
      origin: { x: number; y: number };
      halfR: number;
      color: {
        x: number;
        y: number;
        z: number;
      };
      spawn_time: number;
      despawn_time: number;
      animation_time: number;
    };

    let discs: Array<Disc> = [];
    // canvas.onmousemove = (e) => {
    //   // console.log("shite", e.clientX, e.clientY);
    //   for (let index = 0; index < 10; index++) {
    //     const d: Disc = {
    //       origin: {
    //         x: randomInt(e.clientX + 100, Math.max(0, e.clientX - 100)),
    //         y: randomInt(e.clientY + 100, Math.max(0, e.clientY - 100)),
    //       },

    //       radius: randomInt(40, 20),
    //       color: { x: Math.random(), y: Math.random(), z: Math.random() },
    //     };
    //     if (isValid(d)) {
    //       discs.push(d);
    //     }
    //   }
    //   discs = discs.filter((disc) => {
    //     return (
    //       Math.abs(disc.origin.x - e.clientX) < 400 &&
    //       Math.abs(disc.origin.y - e.clientY) < 400
    //     );
    //   });
    // };

    window.onpointermove = (e) => {
      const rect = canvas.getBoundingClientRect();

      // Convert browser mouse coordinates -> WebGL canvas coordinates
      const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);

      const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);

      for (let index = 0; index < 10; index++) {
        const spread = 80;

        const d: Disc = {
          origin: {
            x: mouseX + randomInt(spread, -spread),
            y: mouseY + randomInt(spread, -spread),
          },
          halfR: randomInt(50, 10),
          color: {
            x: Math.random(),
            y: Math.random(),
            z: Math.random(),
          },
          spawn_time: (performance.now() - start_time) * 0.001,
          despawn_time: 0,
          animation_time: 0.1,
        };

        if (isValid(d)) {
          discs.push(d);
        }
      }

      discs = discs.filter((disc) => {
        return (
          Math.abs(disc.origin.x - mouseX) < 400 &&
          Math.abs(disc.origin.y - mouseY) < 400
        );
      });
    };

    function isValid(disc: Disc) {
      const idx = discs.findIndex((d) => {
        const d_sq =
          Math.pow(disc.origin.x - d.origin.x, 2) +
          Math.pow(disc.origin.y - d.origin.y, 2);
        const rs_sq = Math.pow(disc.halfR + d.halfR, 2);
        return d_sq <= rs_sq;
      });
      if (idx == -1) {
        return true;
      }
      return false;
    }

    let lastFrame = performance.now();

    function render() {
      const now = performance.now();
      const dt = now - lastFrame;
      lastFrame = now;
      const fps = 1000 / dt;

      console.log(fps);
      const time = (now - start_time) * 0.001;
      // Keep canvas drawing buffer synced with CSS size
      if (resizeCanvasToDisplaySize(canvas)) {
        gl.viewport(0, 0, canvas.width, canvas.height);
      }
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      gl.useProgram(program);
      gl.bindVertexArray(vao);

      // Update resolution every frame
      gl.uniform2f(resolutionUniformLocation, canvas.width, canvas.height);

      discs.forEach((disc) => {
        // Put a rectangle in the position buffer
        const x1 = disc.origin.x - disc.halfR;
        const x2 = disc.origin.x + disc.halfR;
        const y1 = disc.origin.y - disc.halfR;
        const y2 = disc.origin.y + disc.halfR;

        gl.uniform1f(radiusUniformLocation, disc.halfR);
        gl.uniform2f(originUniformLocation, disc.origin.x, disc.origin.y);
        gl.uniform3f(
          lifetimeUniformLocation,
          disc.spawn_time,
          disc.despawn_time,
          disc.animation_time,
        );
        gl.uniform4f(
          colorLocation,
          disc.color.x,
          disc.color.y,
          disc.color.z,
          1,
        );
        gl.uniform1f(timeUniformLocation, time);

        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array([x1, y1, x2, y1, x1, y2, x1, y2, x2, y1, x2, y2]),
          gl.STATIC_DRAW,
        );

        // Draw the rectangle.
        var primitiveType = gl.TRIANGLES;
        var offset = 0;
        var count = 6;
        gl.drawArrays(primitiveType, offset, count);
      });
      requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
  });

  function randomInt(hi: number, lo = 0) {
    return Math.floor(lo + Math.random() * (hi - lo));
  }
</script>

<canvas id="c" class="bg-black"></canvas>

<style>
  canvas {
    width: 100vw;
    height: 100vh;
    display: block;
    touch-action: none;
  }
</style>
