<script lang="ts">
  import { enhance } from '$app/forms';

  let { data, form } = $props();

  function formatDate(value: string | Date) {
    return new Date(value).toLocaleString();
  }
</script>

<svelte:head>
  <title>Tenants - dibs admin</title>
</svelte:head>

<main class="admin-shell">
  <div class="page-title">
    <div>
      <h1>Sellers</h1>
      <p>Disable accounts or issue a temporary password. Disabling signs them out immediately.</p>
    </div>
  </div>

  {#if form?.error}
    <p class="error">{form.error}</p>
  {/if}
  {#if form?.temporaryPassword}
    <p class="panel success-note">
      Temporary password for #{form.resetForId}: <code>{form.temporaryPassword}</code> — shown once,
      share it securely.
    </p>
  {/if}

  {#if data.tenants.length === 0}
    <p class="empty">No seller accounts yet. Create an invite on the Invites page.</p>
  {:else}
    <div class="table-list">
      {#each data.tenants as tenant (tenant.id)}
        <article class="admin-row">
          <div>
            <h2>{tenant.displayName || tenant.email}</h2>
            <div class="meta-row">
              <span>{tenant.email}</span>
              <span>{tenant.itemCount} item{tenant.itemCount === 1 ? '' : 's'}</span>
              <span>{tenant.status === 'active' ? 'Active' : 'Disabled'}</span>
              <span>Joined {formatDate(tenant.createdAt)}</span>
            </div>
            {#if tenant.contactUrl}
              <code class="invite-link">{tenant.contactUrl}</code>
            {:else}
              <p class="muted">No contact link set — buyers fall back to the site-wide contact.</p>
            {/if}
          </div>
          <div class="row-actions">
            <div class="quick-actions" role="group" aria-label={`Actions for ${tenant.email}`}>
              <form method="POST" action="?/toggle" use:enhance>
                <input type="hidden" name="id" value={tenant.id} />
                <input type="hidden" name="status" value={tenant.status === 'active' ? 'disable' : 'enable'} />
                <button class="button" type="submit">
                  {tenant.status === 'active' ? 'Disable' : 'Enable'}
                </button>
              </form>
              <form method="POST" action="?/resetPassword" use:enhance>
                <input type="hidden" name="id" value={tenant.id} />
                <button class="button" type="submit">Reset password</button>
              </form>
            </div>
          </div>
        </article>
      {/each}
    </div>
  {/if}
</main>
