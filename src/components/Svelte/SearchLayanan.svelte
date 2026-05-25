<script>
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';

  let { services, subServices } = $props();

  let query   = $state('');
  let focused = $state(false);
  let rootEl  = $state(null);

  const isOpen = $derived(query.trim().length >= 3 && focused);

  const grouped = $derived.by(() => {
    if (query.trim().length < 3) return [];
    const q = query.trim().toLowerCase();

    const matched = subServices.filter(s =>
      s.title.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q)
    );

    const map = new Map();
    for (const sub of matched) {
      if (!map.has(sub.relatedServiceId)) {
        map.set(sub.relatedServiceId, {
          service: services.find(s => s.id === sub.relatedServiceId),
          items: []
        });
      }
      map.get(sub.relatedServiceId).items.push(sub);
    }
    return [...map.values()];
  });

  const totalFound = $derived(grouped.reduce((n, g) => n + g.items.length, 0));

  function highlight(text, q) {
    if (!q || q.length < 3) return text;
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return text.replace(
      new RegExp(`(${safe})`, 'gi'),
      '<mark style="background:#F6C744;padding:0 2px;font-style:normal">$1</mark>'
    );
  }

  function close() { focused = false; }

  function handleWindowClick(e) {
    if (rootEl && !rootEl.contains(e.target)) close();
  }
</script>

<svelte:window onclick={handleWindowClick} onkeydown={e => e.key === 'Escape' && close()} />

<div bind:this={rootEl} class="relative border-2 border-ink rounded-lg bg-white/60 p-5" >

  <!-- ── Input ─────────────────────────────────────────── -->
  <div class="relative">
    <svg
      class="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
      style="opacity:.4"
      width="20" height="20" viewBox="0 0 24 24" fill="currentColor"
    >
      <path d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z"/>
    </svg>
    <input
      type="text"
      placeholder="Cari layanan... (minimal 3 huruf)"
      bind:value={query}
      onfocus={() => focused = true}
      class="w-full pl-12 pr-10 py-4 border-2 border-ink/10 bg-white text-sm outline-none
             focus:border-green transition-colors"
    />
    {#if query.length > 0}
      <button
        onclick={() => { query = ''; focused = true; }}
        class="absolute right-4 top-1/2 -translate-y-1/2 transition-opacity"
        style="opacity:.4"
        onmouseenter={e => e.currentTarget.style.opacity='1'}
        onmouseleave={e => e.currentTarget.style.opacity='.4'}
        aria-label="Hapus pencarian"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>
        </svg>
      </button>
    {/if}
  </div>

  <!-- ── Dropdown ───────────────────────────────────────── -->
  {#if isOpen}
    <div
      class="absolute top-full left-0 right-0 z-50 bg-white border border-ink/10 shadow-xl mt-1 max-h-120 overflow-y-auto"
      transition:fly={{ y: -8, duration: 200, easing: cubicOut }}
    >
      {#if grouped.length === 0}
        <div class="px-5 py-10 text-center">
          <svg class="mx-auto mb-3 opacity-20" width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z"/>
          </svg>
          <p class="text-sm opacity-50">Tidak ada layanan yang sesuai dengan</p>
          <p class="text-sm font-semibold mt-0.5">"{query}"</p>
        </div>

      {:else}
        {#each grouped as group}
          <!-- Group header -->
          <div class="flex items-center gap-3 px-5 py-2.5 border-b border-ink/8 sticky top-0 bg-ink/3">
            {#if group.service}
              <div style="color:#0F6B44;width:16px;height:16px;display:flex;align-items:center;shrink-0:true">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  {@html group.service.iconBody}
                </svg>
              </div>
              <span class="text-xs font-black uppercase tracking-wider" style="opacity:.55">{group.service.title}</span>
            {/if}
            <span class="ml-auto text-[10px] font-bold px-2 py-0.5" style="background:rgba(15,107,68,.1);color:#0F6B44">
              {group.items.length} layanan
            </span>
          </div>

          <!-- Items -->
          {#each group.items as sub, idx}
            <a
              href={`/subLayanan/${sub.id}`}
              onclick={close}
              class="flex items-center gap-4 px-5 py-3.5 border-b border-ink/6 transition-colors group/row"
              style="background:white"
              onmouseenter={e => e.currentTarget.style.background='rgba(15,107,68,.03)'}
              onmouseleave={e => e.currentTarget.style.background='white'}
            >
              <!-- Icon -->
              <div class="w-9 h-9 flex items-center justify-center shrink-0" style="background:rgba(15,107,68,.08);color:#0F6B44">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  {@html sub.iconBody}
                </svg>
              </div>

              <!-- Text -->
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold leading-tight">{@html highlight(sub.title, query)}</p>
                <p class="text-xs mt-0.5 truncate" style="opacity:.5">{@html highlight(sub.description, query)}</p>
              </div>

              <!-- Badges + Arrow -->
              <div class="flex items-center gap-1.5 shrink-0">
                <span class="text-[10px] font-bold uppercase px-2 py-1" style="background:rgba(17,17,17,.06)">{sub.progress}</span>
                <span class="text-[10px] font-bold uppercase px-2 py-1" style="background:rgba(15,107,68,.1);color:#0F6B44">{sub.cost}</span>
                <div class="w-7 h-7 flex items-center justify-center ml-1 opacity-0 group-hover/row:opacity-100 transition-opacity" style="background:#F6C744">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M6.4 18L5 16.6 14.6 7H6V5h12v12h-2V8.4z"/></svg>
                </div>
              </div>
            </a>
          {/each}
        {/each}

        <!-- Total found -->
        <div class="px-5 py-3 border-t border-ink/8 text-center" style="opacity:.4">
          <p class="text-xs">{totalFound} layanan ditemukan untuk "{query}"</p>
        </div>
      {/if}
    </div>
  {/if}

</div>
