<script lang="ts">
  let { data, form } = $props();
</script>

<svelte:head>
  <title>Create seller account - dibs</title>
</svelte:head>

<main class="auth-shell">
  {#if !data.valid}
    <div class="panel narrow">
      <h1>Invalid invite</h1>
      <p class="error">This invite link is invalid, expired, or already used.</p>
      <p>Ask the site owner for a fresh invite link.</p>
    </div>
  {:else}
    <form class="panel narrow" method="POST">
      <h1>Create your seller account</h1>
      <input type="hidden" name="token" value={data.token} />

      {#if form?.errors}
        {#each form.errors as error}
          <p class="error">{error}</p>
        {/each}
      {/if}

      <label>
        Email
        <input name="email" type="email" autocomplete="email" value={form?.email ?? ''} required />
      </label>
      <label>
        Display name <span class="muted">(optional, shown on your items)</span>
        <input name="display_name" maxlength="80" value={form?.displayName ?? ''} />
      </label>
      <label>
        Contact link <span class="muted">(optional, e.g. WhatsApp click-to-chat URL)</span>
        <input name="contact_url" type="url" placeholder="https://" />
      </label>
      <label>
        Password <span class="muted">(at least 8 characters)</span>
        <input name="password" type="password" autocomplete="new-password" minlength="8" required />
      </label>
      <button class="button primary" type="submit">Create account</button>
    </form>
  {/if}
</main>
