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
  rectToCanvas(domRect: DOMRect) {
    const { rect, scaleX, scaleY } = this.metrics;
    return {
      left: (domRect.left - rect.left) * scaleX,
      right: (domRect.right - rect.left) * scaleX,
      top: (domRect.top - rect.top) * scaleY,
      bottom: (domRect.bottom - rect.top) * scaleY,
    };
  }

  get dpr() {
    return window.devicePixelRatio || 1;
  }

  get element() {
    if (!this.canvas) throw new Error("Canvas not set");
    return this.canvas;
  }
}

export const canvasSpace = new CanvasSpace();
