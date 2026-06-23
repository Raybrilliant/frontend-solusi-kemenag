<script lang="ts">
    import type { Cell } from "@tanstack/table-core";
    import Icon from "@iconify/svelte";
    import { createColumnHelper } from "@tanstack/table-core";
    import Table from "./Table.svelte";
    import {
        getAgenPerubahanMockList,
        type AgenPerubahanItem,
    } from "../../lib/agen-perubahan-mock";

    let { apiUrl = "/api/admin/agen-perubahan" } = $props();

    let data = $state<AgenPerubahanItem[]>([]);
    let loading = $state(true);
    let searchTerm = $state("");
    let toast = $state<{ type: string; msg: string } | null>(null);
    let usingMock = $state(false);
    let limit = $state(20);
    let pagination = $state({ page: 1, limit: 20, total: 0, totalPages: 1 });
    let page = $state(1);

    let _debounce: ReturnType<typeof setTimeout>;

    function showToast(type: string, msg: string) {
        toast = { type, msg };
        setTimeout(() => (toast = null), 3500);
    }

    function normalizeItem(item: any): AgenPerubahanItem {
        return {
            id: String(item?.id ?? item?._id ?? crypto.randomUUID()),
            nama: String(item?.nama ?? item?.name ?? "Agen Perubahan"),
            jabatan: String(item?.jabatan ?? item?.position ?? ""),
            unitKerja: String(item?.unitKerja ?? item?.workUnit ?? ""),
            tahun: Number(item?.tahun ?? item?.year ?? new Date().getFullYear()),
            foto: String(item?.foto ?? item?.photo ?? item?.image ?? ""),
            inovasi: String(item?.inovasi ?? item?.innovation ?? ""),
            deskripsi: String(item?.deskripsi ?? item?.description ?? ""),
            latarBelakang: String(
                item?.latarBelakang ?? item?.background ?? "",
            ),
            tujuan: Array.isArray(item?.tujuan)
                ? item.tujuan.map((value: unknown) => String(value ?? ""))
                : [],
            hasil: Array.isArray(item?.hasil) ? item.hasil : [],
            updatedAt:
                item?.updatedAt ?? item?.updated_at ?? item?.createdAt ?? "",
        };
    }

    function applyMock(query = "") {
        const all = getAgenPerubahanMockList().map(normalizeItem);
        const q = query.trim().toLowerCase();
        const filtered = !q
            ? all
            : all.filter((item) =>
                  [
                      item.id,
                      item.nama,
                      item.jabatan,
                      item.unitKerja,
                      item.inovasi,
                      item.deskripsi,
                  ]
                      .join(" ")
                      .toLowerCase()
                      .includes(q),
              );

        data = filtered;
        pagination = {
            page: 1,
            limit: filtered.length || limit,
            total: filtered.length,
            totalPages: 1,
        };
        usingMock = true;
        loading = false;
    }

    $effect(() => {
        const q = searchTerm;
        const p = page;
        clearTimeout(_debounce);
        _debounce = setTimeout(
            async () => {
                loading = true;
                const params = new URLSearchParams({
                    page: String(p),
                    limit: String(limit),
                });
                if (q.trim()) params.set("q", q.trim());

                try {
                    const res = await fetch(`${apiUrl}?${params}`);
                    if (!res.ok) throw new Error("Gagal memuat data.");
                    const json = await res.json();
                    data = (Array.isArray(json) ? json : (json.data ?? [])).map(
                        normalizeItem,
                    );
                    pagination = json.pagination ?? {
                        page: 1,
                        limit,
                        total: data.length,
                        totalPages: 1,
                    };
                    usingMock = false;
                } catch {
                    applyMock(q);
                } finally {
                    loading = false;
                }
            },
            q.trim() ? 300 : 0,
        );

        return () => clearTimeout(_debounce);
    });

    $effect(() => {
        searchTerm;
        page = 1;
    });

    const rowInfo = $derived.by(() => {
        if (pagination.total === 0) return "";
        const start = (pagination.page - 1) * pagination.limit + 1;
        const end = Math.min(
            pagination.page * pagination.limit,
            pagination.total,
        );
        return `Menampilkan ${start}–${end} dari ${pagination.total} agen perubahan`;
    });

    const col = createColumnHelper<AgenPerubahanItem>();
    const columns = [
        col.accessor("id", { header: "ID", enableSorting: true, size: 90 }),
        col.accessor("nama", { header: "Agen", enableSorting: true }),
        col.accessor("inovasi", { header: "Inovasi", enableSorting: true }),
        col.accessor("unitKerja", {
            header: "Unit Kerja",
            enableSorting: true,
        }),
        col.accessor("tahun", {
            header: "Tahun",
            enableSorting: true,
            size: 90,
        }),
        col.display({
            id: "tujuanCount",
            header: "Tujuan",
            enableSorting: false,
            size: 100,
        }),
        col.display({
            id: "hasilCount",
            header: "Before/After",
            enableSorting: false,
            size: 120,
        }),
        col.accessor("updatedAt", {
            header: "Update Terakhir",
            enableSorting: true,
        }),
        col.display({
            id: "_aksi",
            header: "Aksi",
            enableSorting: false,
            size: 120,
        }),
    ];

    function formatDate(value?: string) {
        if (!value) return usingMock ? "Data mock" : "Belum ada";
        const d = new Date(value);
        if (Number.isNaN(d.getTime()))
            return usingMock ? "Data mock" : "Belum ada";
        return new Intl.DateTimeFormat("id-ID", {
            dateStyle: "medium",
            timeStyle: "short",
        }).format(d);
    }

    async function handleDelete(row: AgenPerubahanItem) {
        if (!confirm(`Hapus agen perubahan \"${row.nama}\"?`)) return;

        if (usingMock) {
            data = data.filter((item) => item.id !== row.id);
            pagination = {
                ...pagination,
                total: Math.max(0, pagination.total - 1),
            };
            showToast("success", "Data dihapus pada mode demo.");
            return;
        }

        try {
            const res = await fetch(`${apiUrl}/${row.id}`, {
                method: "DELETE",
            });
            const json = await res.json();
            if (!res.ok || json.success === false) {
                throw new Error(
                    json.message ?? "Gagal menghapus agen perubahan.",
                );
            }
            data = data.filter((item) => item.id !== row.id);
            showToast("success", "Agen perubahan berhasil dihapus.");
        } catch (err) {
            showToast("error", (err as Error).message || "Terjadi kesalahan.");
        }
    }
</script>

{#if toast}
    <div
        class={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 shadow-xl max-w-sm rounded ${toast.type === "success" ? "bg-green text-white" : "bg-red-600 text-white"}`}
    >
        <p class="text-sm font-semibold">{toast.msg}</p>
        <button
            onclick={() => (toast = null)}
            class="ml-auto opacity-70 hover:opacity-100 transition-colors cursor-pointer"
        >
            <Icon icon="mdi:close" width="16" height="16" />
        </button>
    </div>
{/if}

<div class="flex flex-wrap items-center justify-between gap-3 mb-5">
    <div class="flex flex-wrap items-center gap-2">
        <input
            type="text"
            placeholder="Cari nama, inovasi, unit kerja..."
            class="border bg-white/50 border-black/10 rounded py-2 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-1 transition-colors w-72"
            bind:value={searchTerm}
        />
        {#if usingMock}
            <span
                class="inline-flex items-center gap-1.5 px-3 py-2 border border-amber-200 bg-amber-50 text-amber-700 text-sm font-semibold rounded"
            >
                <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                Mode demo mock
            </span>
        {/if}
    </div>

    <a
        href="/admin/agen-perubahan/tambah"
        class="flex items-center gap-1.5 px-4 py-2 bg-green text-white text-sm font-semibold border border-black/10 transition-colors hover:bg-green/90"
    >
        <Icon icon="mdi:plus" class="w-3.5 h-3.5" />Tambah Agen
    </a>
</div>

{#if rowInfo}
    <p class="text-xs text-ink/40 mb-3">{rowInfo}</p>
{/if}

<Table {data} {columns} {loading} disablePagination class="bg-white">
    {#snippet renderCell(cell: Cell<AgenPerubahanItem, unknown>)}
        {#if cell.column.id === "id"}
            <span class="font-mono text-xs font-bold text-ink/60"
                >{cell.getValue()}</span
            >
        {:else if cell.column.id === "nama"}
            {@const row = cell.row.original}
            <div class="min-w-0 flex items-center gap-3">
                <div class="w-11 h-11 rounded-xl overflow-hidden bg-black/5 border border-black/8 shrink-0">
                    {#if row.foto}
                        <img
                            src={row.foto}
                            alt={row.nama}
                            class="w-full h-full object-cover"
                        />
                    {:else}
                        <div class="w-full h-full flex items-center justify-center text-ink/25">
                            <Icon icon="mdi:account" class="w-5 h-5" />
                        </div>
                    {/if}
                </div>
                <div class="min-w-0">
                    <p class="font-semibold text-ink text-sm leading-tight">
                        {row.nama}
                    </p>
                    <p class="text-xs text-ink/45 mt-1 line-clamp-2 max-w-sm">
                        {row.jabatan || "Jabatan belum diisi"}
                    </p>
                </div>
            </div>
        {:else if cell.column.id === "inovasi"}
            <div class="min-w-0">
                <p class="text-sm font-semibold text-green">
                    {cell.getValue() || "-"}
                </p>
                <p class="text-xs text-ink/35 mt-1 line-clamp-2 max-w-sm">
                    {cell.row.original.deskripsi ||
                        "Belum ada deskripsi inovasi."}
                </p>
            </div>
        {:else if cell.column.id === "unitKerja"}
            <div class="min-w-0">
                <p class="text-sm text-ink/70">{cell.getValue() || "-"}</p>
                <p class="text-xs text-ink/35 mt-1">
                    {cell.row.original.jabatan || "Jabatan belum diisi"}
                </p>
            </div>
        {:else if cell.column.id === "tahun"}
            <span class="text-sm text-ink/65">{cell.getValue() || "-"}</span>
        {:else if cell.column.id === "tujuanCount"}
            <span
                class="inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold bg-green/10 text-green"
            >
                {cell.row.original.tujuan?.length ?? 0} tujuan
            </span>
        {:else if cell.column.id === "hasilCount"}
            <span
                class="inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold bg-black/5 text-ink/60"
            >
                {cell.row.original.hasil?.length ?? 0} blok
            </span>
        {:else if cell.column.id === "updatedAt"}
            <span class="text-xs text-ink/55"
                >{formatDate(cell.getValue() as string)}</span
            >
        {:else if cell.column.id === "_aksi"}
            {@const row = cell.row.original}
            <div class="flex items-center gap-1">
                <a
                    href={`/admin/agen-perubahan/${row.id}`}
                    class="w-7 h-7 flex items-center justify-center rounded-lg border border-black/10 hover:bg-black/4 text-ink/50 hover:text-ink transition-colors"
                    aria-label="Edit"
                >
                    <Icon icon="mdi:pencil" class="w-3.5 h-3.5" />
                </a>
                <button
                    onclick={() => handleDelete(row)}
                    class="w-7 h-7 flex items-center justify-center rounded-lg border border-black/10 hover:bg-red-50 text-ink/50 hover:text-red-500 transition-colors cursor-pointer"
                    aria-label="Hapus"
                >
                    <Icon icon="mdi:delete" class="w-3.5 h-3.5" />
                </button>
            </div>
        {/if}
    {/snippet}
</Table>
