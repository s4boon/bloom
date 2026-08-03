<script lang="ts">
  import { onMount } from "svelte";
  import { textureLoader } from "$lib/texture-loader.svelte";
  import { webglStatus } from "$lib/webgl-status.svelte";

  const FADE_MS = 400;
  const WRITE_MS = 3200;
  const LAG_MS = 1800;
  const ERASE_MS = 3200;
  const HOLD_MS = 2000;
  const CYCLE_MS = LAG_MS + ERASE_MS + HOLD_MS;

  let ready = $derived(textureLoader.allLoaded && webglStatus.ready);
  let fading = $state(false);
  let visible = $state(true);
  let pathEl: SVGPathElement;
  let len = 0;
  let animStart = 0;
  let rafId = 0;
  let fadeTimeout: number;

  function dispatchEraseComplete() {
    const event = new CustomEvent("splash-erase-complete");
    window.dispatchEvent(event);
  }

  onMount(() => {
    const handleEraseComplete = () => {
      if (ready && !fading) {
        fading = true;
        fadeTimeout = setTimeout(() => {
          visible = false;
        }, FADE_MS);
      }
    };

    window.addEventListener("splash-erase-complete", handleEraseComplete);
    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(fadeTimeout);
      window.removeEventListener("splash-erase-complete", handleEraseComplete);
    };
  });

  function easeInOutQuad(x: number): number {
    return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
  }

  function frontPosition(
    elapsed: number,
    delay: number,
    duration: number,
  ): number {
    const t = elapsed - delay;
    if (t <= 0) return 0;
    if (t >= duration) return len;
    return len * easeInOutQuad(t / duration);
  }

  function frame(now: number) {
    if (!pathEl) {
      rafId = requestAnimationFrame(frame);
      return;
    }

    if (len === 0) len = pathEl.getTotalLength();
    if (animStart === 0) animStart = now;

    const elapsed = (now - animStart) % CYCLE_MS;
    const writeFront = frontPosition(elapsed, 0, WRITE_MS);
    const eraseFront = frontPosition(elapsed, LAG_MS, ERASE_MS);
    const windowEnd = writeFront;
    const windowStart = Math.min(eraseFront, windowEnd);
    const width = Math.max(windowEnd - windowStart, 0);

    pathEl.style.strokeDasharray = `${width} ${len + 10}`;
    pathEl.style.strokeDashoffset = `${-windowStart}`;

    const eraseProgress = len > 0 ? eraseFront / len : 0;

    if (eraseProgress >= 1) {
      dispatchEraseComplete();
    }

    if (fading) return;

    rafId = requestAnimationFrame(frame);
  }
</script>

{#if visible}
  <div id="splash" class:fading>
    <svg
      id="bloom"
      viewBox="0 0 119.97875 53.305199"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        bind:this={pathEl}
        class="stroke-current text-white"
        d="m 6.2926764,39.654043 c 0,0 -8.159926,-1.954683 -4.68498,-12.317439 1.131992,-3.37577 4.263865,-5.672061 7.02931,-7.794724 6.8217296,-5.236046 10.7487966,-8.370044 10.7487966,-8.370044 l 4.343705,-4.7780511 c 0,0 3.257765,-4.591865 0.465399,-5.584725 C 21.402532,-0.1837951 20.99919,11.513169 20.99919,11.513169 l -0.248202,7.756564 c 0,0 -0.307065,15.056421 -0.434371,17.31266 -0.127316,2.256241 -1.272105,10.471448 -4.343719,8.578864 -3.071612,-1.892623 1.241055,-16.211302 1.241055,-16.211302 0,0 3.785214,-13.000012 11.045388,-19.2673501 7.260168,-6.267333 10.455885,-3.381856 10.455885,-3.381856 0,0 5.088317,1.272077 1.706446,11.0453881 -3.38187,9.773309 -7.769705,11.342832 -12.658755,11.231513 -1.311849,-0.02966 -3.133664,-1.272078 -0.620507,-2.233905 2.916736,-1.116262 11.324621,1.706442 12.193359,8.377114 0.868736,6.670677 -3.568031,13.372365 -3.568031,13.372365 0,0 -7.353271,8.749444 -10.269747,1.706444 -2.916478,-7.042963 16.785259,-14.923639 16.785259,-14.923639 0,0 5.423965,-1.519107 7.632488,-3.164724 3.909856,-2.913283 7.548539,-6.978497 9.233204,-11.345315 1.684667,-4.366816 1.795501,-4.344668 1.90633,-7.669673 0.110875,-3.3249991 -2.604578,-4.3113901 -2.604578,-4.3113901 0,0 -2.970332,-0.676082 -5.552755,2.5491401 -2.582416,3.225275 -3.945666,13.776589 -3.923493,17.323246 0.01196,1.947329 -0.201631,6.19092 0.03198,9.775693 0.191835,2.944064 0.810742,5.421616 1.032027,6.00697 0.432941,1.145203 1.795503,2.682185 3.879166,0.908866 2.083668,-1.773355 4.19576,-8.111506 5.054997,-9.884901 0.859235,-1.773319 1.927503,-2.905308 1.927503,-2.905308 0,0 -3.716873,10.5567 2.061504,11.837041 6.181254,1.3696 7.492329,-13.521681 2.305328,-14.74085 -5.186997,-1.219162 -2.970332,7.115462 0.221658,8.844479 3.191998,1.728978 5.253496,0.199538 5.253496,0.199538 0,0 1.312613,-0.804045 2.205584,-1.950714 0.892973,-1.146629 3.480165,-4.178372 3.480165,-4.178372 0,0 -4.267561,8.592617 0.853418,11.050061 3.841645,1.843507 9.886338,-8.578478 4.389,-13.676811 0,0 -3.344115,-1.73294 -4.096476,2.499087 -0.752358,4.232033 6.930294,8.957889 9.921774,5.470347 2.99147,-3.487542 4.87467,-5.501666 4.87467,-5.501666 l 0.50159,9.655267 c 0,0 1.56741,-12.617707 4.3731,-13.260366 0,0 2.82134,-1.912251 4.42011,1.990647 1.59877,3.902857 0.68967,8.636496 0.68967,8.636496 0,0 -0.42319,3.040793 -2.38248,2.272727 -1.95928,-0.768028 0.12538,-5.9248 0.12538,-5.9248 0,0 2.33545,-6.050308 6.14429,-4.984423 3.80882,1.065809 1.66035,6.501141 1.79384,11.285398 0.13348,4.784257 2.5872,5.359478 4.80499,3.275937 2.2178,-2.083504 3.17714,-9.618362 6.06593,-13.166347"
      />
    </svg>
  </div>
{/if}

<style>
  #splash {
    position: fixed;
    inset: 0;
    z-index: 999;
    display: flex;
    align-items: center;
    justify-content: center;
    background: black;
    transition: opacity 400ms ease;
    opacity: 1;
  }
  #splash.fading {
    opacity: 0;
    pointer-events: none;
  }
  #bloom {
    width: min(50vw, 340px);
    height: auto;
  }
  #bloom path {
    fill: none;
    stroke-width: 1;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
</style>
