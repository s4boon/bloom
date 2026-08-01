<script lang="ts">
  import { getRandomMask } from "./masks";
  const mask = getRandomMask();
  console.log(mask);
</script>

<a
  href="/projects"
  class="relative my-6 w-fit h-fit px-2 py-1 font-qinferly text-xl link clearing cursor-pointer"
  data-text="Projects"
  style:--bg-url="url('{mask.url}')"
  style:--bg-scale-x={mask.scale.x}
  style:--bg-origin-x={mask.origin.x}
  style:--bg-origin-y={mask.origin.y}
>
  Projects
</a>

<style>
  .link {
    z-index: inherit;
    color: white;
    mix-blend-mode: difference;
    cursor: pointer;
  }

  .link::before {
    content: attr(data-text);
    position: absolute;
    inset: 0;

    background: var(--bg-url) left / var(--bg-scale-x) auto no-repeat;
    /* background-position: var(--bg-position-x) var(--bg-position-y); */
    color: transparent;

    transition: clip-path 1.2s ease-out;
    clip-path: circle(0% at var(--bg-origin-x) var(--bg-origin-y));
  }

  .link:hover::before {
    clip-path: circle(150% at var(--bg-origin-x) var(--bg-origin-y));
  }
</style>
