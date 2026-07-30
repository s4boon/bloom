type Status = "pending" | "loaded" | "error";

class TextureLoader {
  status = $state<Map<string, Status>>(new Map());
  images = $state<Map<string, HTMLImageElement>>(new Map());

  async load(url: string) {
    this.status.set(url, "pending");
    try {
      const img = await loadImage(url);
      this.images.set(url, img);
      this.status.set(url, "loaded");
    } catch (e) {
      this.status.set(url, "error");
      console.error(e);
    }
  }

  loadAll(urls: string[]) {
    return Promise.all(urls.map((u) => this.load(u)));
  }

  get progress(): number {
    if (this.status.size === 0) return 0;
    const done = [...this.status.values()].filter(
      (s) => s !== "pending",
    ).length;
    return done / this.status.size;
  }

  get allLoaded(): boolean {
    return [...this.status.values()].every((s) => s === "loaded");
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load: ${src}`));
    img.src = src;
  });
}

export const textureLoader = new TextureLoader();
