<script>
  let revealed = $state(false);
</script>

<div
  class="tree text-[200px] overflow-hidden text-white w-fit h-fit"
  class:revealed
>
  huuuuuuh
</div>

<button class="text-white" onclick={() => (revealed = true)}>Reveal</button>
<button class="text-white" onclick={() => (revealed = false)}>Unreveal</button>

<style>
  .tree {
    background-color: white;
    background-image: url("/branches/3.svg");
    filter: invert(1);
    /* background-position: center; */
    background-repeat: no-repeat;
    background-size: 100% auto;

    clip-path: circle(0% at 0% 60%);
    transition: clip-path 1.2s ease-out;
  }

  .tree.revealed {
    clip-path: circle(150% at 0% 60%);
  }
</style>
