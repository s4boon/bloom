class WebglStatus {
  ready = $state(false);
  error = $state<string | null>(null);
}

export const webglStatus = new WebglStatus();
