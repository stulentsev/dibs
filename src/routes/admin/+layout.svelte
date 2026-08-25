<script lang="ts">
  let { children, data } = $props();

  const isOwner = $derived(data.user?.role === 'owner');
</script>

{#if data.user}
  <header class="admin-bar">
    <a class="brand" href="/admin">dibs admin</a>
    <nav>
      <a href="/">Public site</a>
      <a href="/admin/profile">Profile</a>
      {#if isOwner}
        <a href="/admin/invites">Invites</a>
        <a href="/admin/tenants">Tenants</a>
      {/if}
      <form method="POST" action="/admin/logout">
        <button type="submit" class="link-button">Log out</button>
      </form>
    </nav>
  </header>
{/if}

{@render children()}
