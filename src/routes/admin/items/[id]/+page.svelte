<script lang="ts">
  import { statuses } from '$lib/item-status';

  let { data, form } = $props();

  const price = $derived(
    data.item.priceCents === null ? '' : (data.item.priceCents / 100).toFixed(2)
  );
</script>

<svelte:head>
  <title>Edit {data.item.title} - dibs</title>
</svelte:head>

<main class="admin-shell">
  <div class="page-title">
    <div>
      <h1>Edit item</h1>
      <p>{data.item.title}</p>
    </div>
    <div class="row-actions">
      <a class="button" href="/admin">Back</a>
      <form method="POST" action="?/deleteItem">
        <button class="button danger" type="submit">Delete item</button>
      </form>
    </div>
  </div>

  {#if form?.errors}
    <div class="error">
      {#each form.errors as error}
        <p>{error}</p>
      {/each}
    </div>
  {/if}
  {#if form?.success}
    <p class="success">{form.success}</p>
  {/if}

  <section class="admin-columns">
    <form class="panel form-grid" method="POST" action="?/update">
      <label>
        Title
        <input name="title" maxlength="180" value={data.item.title} required />
      </label>
      <label>
        Description
        <textarea name="description" rows="6" required>{data.item.description}</textarea>
      </label>
      <div class="split">
        <label>
          Price
          <input name="price" type="number" min="0" step="0.01" value={price} />
        </label>
        <label class="check">
          <input name="is_free" type="checkbox" checked={data.item.isFree} />
          Free
        </label>
      </div>
      <div class="split">
        <label>
          Status
          <select name="status">
            {#each statuses as status}
              <option value={status} selected={status === data.item.status}>{status.replace('_', ' ')}</option>
            {/each}
          </select>
        </label>
        <label class="check">
          <input name="published" type="checkbox" checked={data.item.published} />
          Published
        </label>
      </div>
      <label>
        Category
        <input name="category" maxlength="120" value={data.item.category ?? ''} />
      </label>
      <label>
        Pickup notes
        <textarea name="pickup_notes" rows="3">{data.item.pickupNotes ?? ''}</textarea>
      </label>
      <button class="button primary" type="submit">Save item</button>
    </form>

    <section class="panel photos-panel">
      <h2>Photos</h2>
      <form class="upload-form" method="POST" action="?/uploadPhotos" enctype="multipart/form-data">
        <input name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple required />
        <button class="button primary" type="submit">Upload</button>
      </form>

      {#if data.photos.length === 0}
        <p class="empty">No photos uploaded.</p>
      {:else}
        <div class="photo-list">
          {#each data.photos as photo, index}
            <article class="photo-row">
              <img src={photo.path} alt={photo.altText || data.item.title} />
              <div class="photo-controls">
                <form method="POST" action="?/updatePhotoAlt">
                  <input type="hidden" name="photo_id" value={photo.id} />
                  <label>
                    Alt text
                    <input name="alt_text" maxlength="200" value={photo.altText ?? ''} />
                  </label>
                  <button class="button" type="submit">Save alt</button>
                </form>
                <div class="row-actions">
                  <form method="POST" action="?/movePhoto">
                    <input type="hidden" name="photo_id" value={photo.id} />
                    <input type="hidden" name="direction" value="up" />
                    <button class="button" type="submit" disabled={index === 0}>Up</button>
                  </form>
                  <form method="POST" action="?/movePhoto">
                    <input type="hidden" name="photo_id" value={photo.id} />
                    <input type="hidden" name="direction" value="down" />
                    <button class="button" type="submit" disabled={index === data.photos.length - 1}>Down</button>
                  </form>
                  <form method="POST" action="?/deletePhoto">
                    <input type="hidden" name="photo_id" value={photo.id} />
                    <button class="button danger" type="submit">Delete</button>
                  </form>
                </div>
              </div>
            </article>
          {/each}
        </div>
      {/if}
    </section>
  </section>
</main>
