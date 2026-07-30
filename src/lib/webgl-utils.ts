export type ErrorCallback = (msg: string) => void;

const errorRE = /ERROR:\s*\d+:(\d+)/gi;

function defaultError(msg: string): void {
  console.error(msg);
}

function addLineNumbersWithError(src: string, log = ""): string {
  const matches = [...log.matchAll(errorRE)];

  const lineNoToErrorMap = new Map<number, string>(
    matches.map((m, i) => {
      const lineNo = Number(m[1]);
      const next = matches[i + 1];
      const end = next ? next.index : log.length;
      const msg = log.substring(m.index!, end);
      return [lineNo - 1, msg];
    }),
  );

  return src
    .split("\n")
    .map((line, lineNo) => {
      const err = lineNoToErrorMap.get(lineNo);
      return `${lineNo + 1}: ${line}${err ? `\n\n^^^ ${err}` : ""}`;
    })
    .join("\n");
}

export function loadShader(
  gl: WebGL2RenderingContext,
  source: string,
  type: GLenum,
  errorCallback: ErrorCallback = defaultError,
): WebGLShader | null {
  const shader = gl.createShader(type);

  if (!shader) {
    errorCallback("Failed to create shader.");
    return null;
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? "";
    errorCallback(
      `Shader compile error:\n${log}\n${addLineNumbersWithError(source, log)}`,
    );
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

export function createProgram(
  gl: WebGL2RenderingContext,
  shaders: WebGLShader[],
  attribs?: string[],
  locations?: number[],
  errorCallback: ErrorCallback = defaultError,
): WebGLProgram | null {
  const program = gl.createProgram();

  if (!program) {
    errorCallback("Failed to create program.");
    return null;
  }

  for (const shader of shaders) {
    gl.attachShader(program, shader);
  }

  if (attribs) {
    attribs.forEach((attrib, i) => {
      gl.bindAttribLocation(program, locations?.[i] ?? i, attrib);
    });
  }

  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    errorCallback(gl.getProgramInfoLog(program) ?? "Program link failed.");
    gl.deleteProgram(program);
    return null;
  }

  return program;
}

export function createProgramFromSources(
  gl: WebGL2RenderingContext,
  shaderSources: [string, string],
  attribs?: string[],
  locations?: number[],
  errorCallback?: ErrorCallback,
): WebGLProgram | null {
  const vertexShader = loadShader(
    gl,
    shaderSources[0],
    gl.VERTEX_SHADER,
    errorCallback,
  );

  const fragmentShader = loadShader(
    gl,
    shaderSources[1],
    gl.FRAGMENT_SHADER,
    errorCallback,
  );

  if (!vertexShader || !fragmentShader) {
    return null;
  }

  return createProgram(
    gl,
    [vertexShader, fragmentShader],
    attribs,
    locations,
    errorCallback,
  );
}

export function resizeCanvasToDisplaySize(
  canvas: HTMLCanvasElement,
  multiplier = window.devicePixelRatio,
): boolean {
  const width = Math.floor(canvas.clientWidth * multiplier);
  const height = Math.floor(canvas.clientHeight * multiplier);

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
    return true;
  }

  return false;
}
