<script lang="ts">
  import { page } from "$app/state"; // Use '$app/stores' if on SvelteKit < 2.0
</script>

<div class="error-container">
  {#if page.status === 404}
    <h1>404: Page Not Found</h1>
    <p>Sorry, the page you are looking for does not exist.</p>
  {:else}
    <h1>Error {page.status}</h1>
    <p>{page.error?.message || "Something went wrong."}</p>
  {/if}

  <a href="/">Return to Home</a>
</div>

<style>
  .error-container {
    text-align: center;
    padding: 4rem 2rem;
  }
</style>
