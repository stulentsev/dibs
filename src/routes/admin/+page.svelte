<script lang="ts">
  import { enhance } from '$app/forms';
  import { confirmEnhance } from '$lib/confirm-submit';
  import { formatPrice, formatStatus } from '$lib/format';

  let { data, form } = $props();
</script>

<svelte:head>
  <title>Admin - dibs</title>
</svelte:head>

<main class="admin-shell">
  <div class="page-title">
    <div>
      <h1>Items</h1>
      <p>Manage published state, listing status, photos, and item details.</p>
    </div>
    <a class="button primary" href="/admin/items/new">New item</a>
  </div>

  {#if form?.error}
    <p class="error">{form.error}</p>
  {/if}

  <div class="view-toggle" role="group" aria-label="Item views">
    <a class="button" href="/admin" aria-current={data.recentlyDeleted ? undefined : 'page'}>
      All items
    </a>
    <a
      class="button"
      href="/admin?recently_deleted=1"
      aria-current={data.recentlyDeleted ? 'page' : undefined}
    >
      Recently deleted
    </a>
  </div>

  {#if data.items.length === 0}
    <p class="empty">
      {data.recentlyDeleted ? 'No recently deleted items.' : 'No items yet.'}
    </p>
  {:else}
    <div class="table-list">
      {#each data.items as item (item.id)}
        <article class="admin-row">
          {#if item.firstPhoto}
            <img src={item.firstPhoto.path} alt={item.firstPhoto.altText || item.title} />
          {:else}
            <div class="placeholder small">No photo</div>
          {/if}
          <div>
            <h2>{item.title}</h2>
            <div class="meta-row">
              <span>{formatPrice(item)}</span>
              <span>{formatStatus(item.status)}</span>
              <span>{item.published ? 'Published' : 'Unpublished'}</span>
              {#if item.category}<span>{item.category}</span>{/if}
            </div>
          </div>
          <div class="row-actions">
            {#if data.recentlyDeleted}
              <div class="quick-actions" role="group" aria-label={`Quick actions for ${item.title}`}>
                <form method="POST" action="?/restoreItem" use:enhance>
                  <input type="hidden" name="id" value={item.id} />
                  <button class="button" type="submit">Restore</button>
                </form>
              </div>
            {:else}
              <div class="quick-actions" role="group" aria-label={`Quick actions for ${item.title}`}>
                <span>Quick actions</span>
                {#if item.status === 'claimed'}
                  <form method="POST" action="?/unclaimItem" use:enhance>
                    <input type="hidden" name="id" value={item.id} />
                    <button class="button" type="submit">Unclaim</button>
                  </form>
                  <form method="POST" action="?/markItemGone" use:enhance>
                    <input type="hidden" name="id" value={item.id} />
                    <button class="button" type="submit">Gone</button>
                  </form>
                {:else}
                  <form method="POST" action="?/claimItem" use:enhance>
                    <input type="hidden" name="id" value={item.id} />
                    <button class="button" type="submit">Claim</button>
                  </form>
                {/if}
                <a class="button" href={`/admin/items/${item.id}`}>Edit</a>
                <form
                  method="POST"
                  action="?/deleteItem"
                  use:enhance={confirmEnhance(`Are you sure you want to delete ${item.title}?`)}
                >
                  <input type="hidden" name="id" value={item.id} />
                  <button class="button danger" type="submit">Delete</button>
                </form>
              </div>
            {/if}
          </div>
        </article>
      {/each}
    </div>
  {/if}
</main>
