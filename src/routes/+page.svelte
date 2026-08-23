<script lang="ts">
  import { formatPrice } from '$lib/format';

  let { data } = $props();
</script>

<svelte:head>
  <title>dibs</title>
  <meta name="description" content="Neighborhood garage sale catalog" />
</svelte:head>

<main class="shell">
  <header class="site-header">
    <a class="brand" href="/">dibs</a>
    <a class="admin-link" href="/admin">Admin</a>
  </header>

  <section class="intro">
    <h1>Available items</h1>
    <p>Spring-cleaning finds for neighbors. Open an item to see photos, pickup notes, and the contact link.</p>
  </section>

  {#if data.items.length === 0}
    <p class="empty">No available items are published right now.</p>
  {:else}
    <div class="grid">
      {#each data.items as item}
        <a class="item-card" href={`/items/${item.id}`}>
          {#if item.firstPhoto}
            <img src={item.firstPhoto.path} alt={item.firstPhoto.altText || item.title} />
          {:else}
            <div class="placeholder">No photo</div>
          {/if}
          <div class="card-body">
            <div class="card-title-row">
              <h2>{item.title}</h2>
              <span>{formatPrice(item)}</span>
            </div>
            <p class="card-description">{item.description}</p>
            {#if item.status === 'claimed'}
              <p class="reserved-note">Temporarily reserved — might be available soon</p>
            {/if}
            {#if item.category}
              <div class="meta-row">
                <span>{item.category}</span>
              </div>
            {/if}
          </div>
        </a>
      {/each}
    </div>
  {/if}
</main>
