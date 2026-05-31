<script lang="ts">
  import { statuses } from '$lib/item-status';

  let { form } = $props();
</script>

<svelte:head>
  <title>New item - dibs</title>
</svelte:head>

<main class="admin-shell">
  <div class="page-title">
    <div>
      <h1>New item</h1>
      <p>Create the listing first, then upload photos.</p>
    </div>
    <a class="button" href="/admin">Back</a>
  </div>

  <form class="panel form-grid" method="POST">
    {#if form?.errors}
      <div class="error">
        {#each form.errors as error}
          <p>{error}</p>
        {/each}
      </div>
    {/if}

    <label>
      Title
      <input name="title" maxlength="180" required />
    </label>
    <label>
      Description
      <textarea name="description" rows="5" required></textarea>
    </label>
    <div class="split">
      <label>
        Price
        <input name="price" type="number" min="0" step="0.01" placeholder="0.00" />
      </label>
      <label class="check">
        <input name="is_free" type="checkbox" />
        Free
      </label>
    </div>
    <div class="split">
      <label>
        Status
        <select name="status">
          {#each statuses as status}
            <option value={status}>{status.replace('_', ' ')}</option>
          {/each}
        </select>
      </label>
      <label class="check">
        <input name="published" type="checkbox" />
        Published
      </label>
    </div>
    <label>
      Category
      <input name="category" maxlength="120" />
    </label>
    <label>
      Pickup notes
      <textarea name="pickup_notes" rows="3"></textarea>
    </label>
    <button class="button primary" type="submit">Create item</button>
  </form>
</main>
