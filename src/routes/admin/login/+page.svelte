<script lang="ts">
  let { form } = $props();
</script>

<svelte:head>
  <title>Admin login - dibs</title>
</svelte:head>

<main class="auth-shell">
  <form class="panel narrow" method="POST">
    <h1>Admin login</h1>
    {#if form?.error}
      <p class="error">{form.error}</p>
      {/if}
      <label>
        Username
      <input name="identifier" autocomplete="username" required />
    </label>
    <label>
      Password
      <input name="password" type="password" autocomplete="current-password" required />
    </label>
    <button class="button primary" type="submit">Log in</button>
  </form>
</main>
