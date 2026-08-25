<script lang="ts">
  import { enhance } from '$app/forms';

  let { data, form } = $props();

  const values = $derived({
    username: form?.values?.username ?? data.profile.username,
    displayName: form?.values?.displayName ?? data.profile.displayName ?? '',
    contactType: form?.values?.contactType ?? data.profile.contactType ?? 'whatsapp',
    contactValue: form?.values?.contactValue ?? data.profile.contactValue ?? ''
  });
  let selectedContactType = $state<string>();
  const activeContactType = $derived(selectedContactType ?? values.contactType);
</script>

<svelte:head>
  <title>Profile - dibs admin</title>
</svelte:head>

<main class="admin-shell">
  <div class="page-title">
    <div>
      <h1>Profile</h1>
      <p>Update how you sign in and how buyers contact you. A contact method is required to publish items.</p>
    </div>
  </div>

  <form class="panel narrow form-grid" method="POST" use:enhance>
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

    <label>
      Account identity
      <input value={data.profile.identity} readonly />
      <span class="muted">Your identity is permanent and cannot be changed.</span>
    </label>
    <label>
      Username
      <input
        name="username"
        autocomplete="username"
        minlength="3"
        maxlength="64"
        pattern="[A-Za-z0-9][A-Za-z0-9._-]*"
        value={values.username}
        required
      />
    </label>
    <label>
      Display name <span class="muted">(optional, shown on your items)</span>
      <input name="display_name" maxlength="80" value={values.displayName} />
    </label>
    <label>
      Contact method
      <select
        name="contact_type"
        value={values.contactType}
        onchange={(event) => (selectedContactType = event.currentTarget.value)}
      >
        <option value="whatsapp">WhatsApp</option>
        <option value="email">Email</option>
      </select>
    </label>
    <label>
      Contact value
      <input
        name="contact_value"
        placeholder={activeContactType === 'email' ? 'seller@example.com' : '+1 555 123 4567'}
        value={values.contactValue}
        required
      />
      <span class="muted">
        {activeContactType === 'email'
          ? 'Email addresses are normalized to lowercase.'
          : 'Use an international phone number for WhatsApp.'}
      </span>
    </label>
    <button class="button primary" type="submit">Save profile</button>
  </form>
</main>
