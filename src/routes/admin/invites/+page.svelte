<script lang="ts">
  import { enhance } from '$app/forms';

  let { data, form } = $props();

  function inviteLink(token: string) {
    return `${data.siteUrl}/signup?token=${encodeURIComponent(token)}`;
  }

  function formatDate(value: string | Date) {
    return new Date(value).toLocaleString();
  }
</script>

<svelte:head>
  <title>Invites - dibs admin</title>
</svelte:head>

<main class="admin-shell">
  <div class="page-title">
    <div>
      <h1>Invites</h1>
      <p>Only people with an unused, unexpired invite link can create a seller account.</p>
    </div>
  </div>

  {#if form?.error}
    <p class="error">{form.error}</p>
  {/if}

  <form class="panel" method="POST" action="?/create" use:enhance>
    <label>
      Expires after (days)
      <input name="expires_days" type="number" min="1" max="30" value="7" />
    </label>
    <button class="button primary" type="submit">Create invite link</button>
  </form>

  {#if data.invites.length === 0}
    <p class="empty">No invites yet.</p>
  {:else}
    <div class="table-list">
      {#each data.invites as invite (invite.id)}
        <article class="admin-row">
          <div>
            <h2>Invite #{invite.id}</h2>
            <div class="meta-row">
              <span>Created {formatDate(invite.createdAt)}</span>
              <span>Expires {formatDate(invite.expiresAt)}</span>
              {#if invite.usedAt}
                <span>Used {formatDate(invite.usedAt)}</span>
              {:else if new Date(invite.expiresAt) < new Date()}
                <span>Expired</span>
              {:else}
                <span>Unused</span>
              {/if}
            </div>
            {#if !invite.usedAt}
              <code class="invite-link">{inviteLink(invite.token)}</code>
            {/if}
          </div>
          {#if !invite.usedAt}
            <div class="row-actions">
              <form method="POST" action="?/revoke" use:enhance>
                <input type="hidden" name="id" value={invite.id} />
                <button class="button danger" type="submit">Revoke</button>
              </form>
            </div>
          {/if}
        </article>
      {/each}
    </div>
  {/if}
</main>
