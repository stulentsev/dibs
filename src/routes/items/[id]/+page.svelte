<script lang="ts">
  import { formatPrice } from '$lib/format';

  let { data } = $props();
</script>

<svelte:head>
  <title>{data.item.title} - dibs</title>
  <meta name="description" content={data.item.description} />
</svelte:head>

<main class="shell">
  <header class="site-header">
    <a class="brand" href="/">dibs</a>
    <a class="admin-link" href="/">Back</a>
  </header>

  <article class="detail">
    <div class="gallery">
      {#if data.photos.length}
        {#each data.photos as photo}
          <img src={photo.path} alt={photo.altText || data.item.title} />
        {/each}
      {:else}
        <div class="placeholder large">No photo</div>
      {/if}
    </div>

    <section class="detail-body">
      <div class="detail-heading">
        <h1>{data.item.title}</h1>
        <strong>{formatPrice(data.item)}</strong>
      </div>
      {#if data.item.category}
        <div class="meta-row">
          <span>{data.item.category}</span>
        </div>
      {/if}
      {#if data.item.status === 'claimed'}
        <p class="reserved-note">Temporarily reserved — might be available soon</p>
      {/if}
      <p>{data.item.description}</p>

      {#if data.item.pickupNotes}
        <h2>Pickup</h2>
        <p>{data.item.pickupNotes}</p>
      {/if}

      <div class="detail-actions">
        <a class="button primary" href={data.contactUrl} rel="noreferrer" target="_blank">
          {data.contactLabel}
        </a>
        {#if data.admin}
          <a class="button" href={`/admin/items/${data.item.id}`}>Manage</a>
        {/if}
      </div>
    </section>
  </article>
</main>
