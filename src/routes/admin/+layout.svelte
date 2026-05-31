<script lang="ts">
  let { children, data } = $props();
</script>

{#if data.admin}
  <header class="admin-bar">
    <a class="brand" href="/admin">dibs admin</a>
    <nav>
      <a href="/">Public site</a>
      <form method="POST" action="/admin/logout">
        <button type="submit" class="link-button">Log out</button>
      </form>
    </nav>
  </header>
{/if}

{@render children()}
