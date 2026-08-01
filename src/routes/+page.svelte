<script lang="ts">
  import Link from "./link.svelte";
</script>

<div class="route-main gap-2 p-2 *:border *:border-indigo-500">
  <div class="l grid justify-end overflow-hidden">
    <Link />
    <Link />
    <Link />
    <Link />
  </div>
  <div class="b clearing">
    <h1
      class="text-8xl font-qinferly pt-4 mix-blend-difference relative"
      data-text="Bloom"
    >
      Bloom
    </h1>
    <div class="font-nostalgia text-xl mix-blend-difference">
      & grow your imagination
    </div>
  </div>
  <div class="c">
    <p>
      Lorem ipsum dolor sit amet consectetur adipisicing elit. Natus
      exercitationem quod eius ex explicabo, dolor, at neque non dolorem minima
      expedita tenetur quisquam. Labore ipsum molestias voluptatum, officia
      distinctio magni vero hic officiis possimus. Fugiat repellat error nihil
      amet ducimus?
    </p>
  </div>
  <div class="n"><h1>Saboon</h1></div>
</div>

<style>
  .b {
    grid-area: b;
  }
  .l {
    grid-area: l;
  }
  .c {
    grid-area: c;
  }
  .n {
    grid-area: n;
  }
</style>
