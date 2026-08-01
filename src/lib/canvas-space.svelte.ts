// canvas-space.svelte.ts
class CanvasSpace {
  private canvas: HTMLCanvasElement | null = null;

  set(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  private get metrics() {
    if (!this.canvas) throw new Error("Canvas not set — call set() first");
    const rect = this.canvas.getBoundingClientRect();
    return {
      canvas: this.canvas,
      rect,
      scaleX: this.canvas.width / rect.width,
      scaleY: this.canvas.height / rect.height,
    };
  }

  // client (viewport) coords -> canvas-pixel space
  clientToCanvas(clientX: number, clientY: number) {
    const { rect, scaleX, scaleY } = this.metrics;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  // DOMRect (viewport space) -> canvas-pixel space, same conversion as inRect used
  rectToCanvas(domRect: DOMRect): DOMRect {
    const { rect, scaleX, scaleY } = this.metrics;

    const left = (domRect.left - rect.left) * scaleX;
    const top = (domRect.top - rect.top) * scaleY;
    const width = domRect.width * scaleX;
    const height = domRect.height * scaleY;

    return new DOMRect(left, top, width, height);
  }

  get dpr() {
    return window.devicePixelRatio || 1;
  }

  get width() {
    return this.element.width;
  }

  get height() {
    return this.element.height;
  }

  randomPoint() {
    return {
      x: Math.random() * this.width,
      y: Math.random() * this.height,
    };
  }

  get element() {
    if (!this.canvas) throw new Error("Canvas not set");
    return this.canvas;
  }
}

export const canvasSpace = new CanvasSpace();
