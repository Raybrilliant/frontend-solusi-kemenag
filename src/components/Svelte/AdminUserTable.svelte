<script lang="ts">
    import Icon from "@iconify/svelte";
    import { createColumnHelper } from "@tanstack/table-core";
    import * as XLSX from "xlsx";
    import Table from "./Table.svelte";

    let {
        apiUrl = "/api/admin/user",
        apiKategori = "/api/admin/kategori",
        bulkUrl = "/api/admin/user/bulk",
    } = $props();

    type UserRow = {
        id?: number;
        nama?: string;
        nip?: string;
        role?: string;
        categoryId?: number | null;
        createdAt?: string;
        aktif?: boolean;
    };
    type CategoryRow = { id: number; title?: string };
    type BulkItem = {
        id?: number;
        nip: string;
        nama: string;
        password?: string;
        role?: "super_admin" | "admin" | "operator" | "humas" | "asn";
        aktif?: boolean;
        categoryId?: number | null;
    };
    type BulkResult = {
        total: number;
        created: number;
        updated: number;
        failed: number;
        createdRows?: UserRow[];
        updatedRows?: UserRow[];
        failedRows?: Array<{
            index: number;
            nip?: string | null;
            nama?: string | null;
            message: string;
        }>;
    } | null;

    const allowedRoles = ["super_admin", "admin", "operator", "humas", "asn"];

    let data = $state<UserRow[]>([]);
    let kategoriList = $state<CategoryRow[]>([]);
    let loading = $state(true);
    let selected = $state<UserRow[]>([]);
    let searchTerm = $state("");
    let limit = $state(20);
    let pagination = $state({ page: 1, limit: 20, total: 0, totalPages: 1 });
    let page = $state(1);

    let bulkOpen = $state(false);
    let bulkLoading = $state(false);
    let bulkSubmitting = $state(false);
    let bulkError = $state("");
    let bulkSuccess = $state("");
    let bulkFileName = $state("");
    let bulkPreview = $state<BulkItem[]>([]);
    let bulkSkippedRows = $state<string[]>([]);
    let bulkDefaultPassword = $state("");
    let bulkResult = $state<BulkResult>(null);

    // ── Fetch kategori (sekali) ──────────────────────────
    $effect(() => {
        fetch(apiKategori)
            .then((r) => r.json())
            .then((katData) => {
                kategoriList = Array.isArray(katData)
                    ? katData
                    : (katData.data ?? []);
            })
            .catch(() => {});
    });

    // ── Server-side fetch dengan debounce ────────────────
    let _debounce: any;

    $effect(() => {
        const q = searchTerm;
        const p = page;
        clearTimeout(_debounce);
        _debounce = setTimeout(
            () => {
                loading = true;
                const params = new URLSearchParams({
                    page: String(p),
                    limit: String(limit),
                });
                if (q.trim()) params.set("q", q.trim());
                fetch(`${apiUrl}?${params}`)
                    .then((r) => r.json())
                    .then((res) => {
                        data = Array.isArray(res) ? res : (res.data ?? []);
                        if (res.pagination) {
                            pagination = res.pagination;
                            limit = res.pagination.limit;
                        }
                        loading = false;
                    })
                    .catch(() => {
                        loading = false;
                    });
            },
            q.trim() ? 300 : 0,
        );
        return () => clearTimeout(_debounce);
    });

    // ── Reset page ke 1 saat search berubah ─────────────
    $effect(() => {
        searchTerm;
        page = 1;
    });

    // ── Row range helper ─────────────────────────────────
    const rowInfo = $derived.by(() => {
        if (pagination.total === 0) return "";
        const start = (pagination.page - 1) * pagination.limit + 1;
        const end = Math.min(
            pagination.page * pagination.limit,
            pagination.total,
        );
        return `Menampilkan ${start}&#8211;${end} dari ${pagination.total}`;
    });

    function getKategoriName(categoryId: number | null | undefined) {
        if (!categoryId) return "–";
        const kat = kategoriList.find((k) => k.id === categoryId);
        return kat?.title ?? `#${categoryId}`;
    }
    function roleBadge(role: string) {
        switch (role) {
            case "super_admin":
                return { cls: "bg-black/8 text-ink", label: "Super Admin" };
            case "admin":
                return { cls: "bg-red-50 text-red-700", label: "Admin" };
            case "humas":
                return { cls: "bg-green/10 text-green", label: "Humas" };
            case "operator":
                return { cls: "bg-blue-50 text-blue-700", label: "Operator" };
            case "asn":
                return { cls: "bg-purple-50 text-purple-700", label: "ASN" };
            default:
                return { cls: "bg-ink/5 text-ink/50", label: role ?? "–" };
        }
    }

    const col = createColumnHelper<UserRow>();
    const columns = [
        col.accessor("id", { header: "ID", enableSorting: true, size: 55 }),
        col.accessor("nama", { header: "Nama", enableSorting: true }),
        col.accessor("nip", { header: "NIP", enableSorting: true }),
        col.accessor("role", {
            header: "Role",
            enableSorting: true,
            size: 100,
        }),
        col.accessor("categoryId", {
            header: "Kategori",
            enableSorting: true,
            size: 160,
        }),
        col.accessor("createdAt", {
            header: "Dibuat",
            enableSorting: true,
            size: 110,
        }),
        col.display({
            id: "_aksi",
            header: "Aksi",
            enableSorting: false,
            size: 110,
        }),
    ];

    function formatDate(dateStr: string | undefined) {
        if (!dateStr) return "–";
        try {
            return new Date(dateStr).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
            });
        } catch {
            return dateStr;
        }
    }

    async function handleDelete(row: UserRow) {
        if (!confirm(`Hapus user "${row.nama || row.nip}"?`)) return;
        await fetch(`${apiUrl}/${row.id}`, { method: "DELETE" });
        data = data.filter((d) => d.id !== row.id);
        selected = selected.filter((s) => s.id !== row.id);
        if (data.length === 0 && page > 1) page = page - 1;
    }

    function deleteSelected() {
        if (!confirm(`Hapus ${selected.length} user terpilih?`)) return;
        Promise.all(
            selected.map((r) =>
                fetch(`${apiUrl}/${r.id}`, { method: "DELETE" }),
            ),
        ).then(() => {
            const ids = new Set(selected.map((r) => r.id));
            data = data.filter((d) => !ids.has(d.id));
            selected = [];
            if (data.length === 0 && page > 1) page = page - 1;
        });
    }

    function quoteCSV(v: any) {
        const s = String(v ?? "");
        return s.includes(",") || s.includes('"') || s.includes("\n")
            ? '"' + s.replace(/"/g, '""') + '"'
            : s;
    }
    function toCSVRows(rows: UserRow[]) {
        const headers = ["ID", "Nama", "NIP", "Role", "Kategori", "Dibuat"];
        const body = rows.map((r) => [
            r.id,
            r.nama,
            r.nip,
            r.role,
            getKategoriName(r.categoryId),
            formatDate(r.createdAt),
        ]);
        const csv = [headers, ...body]
            .map((row) => row.map(quoteCSV).join(","))
            .join("\n");
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([csv]));
        a.download = "users.csv";
        a.click();
    }
    function exportCSV() {
        toCSVRows(data);
    }
    function exportSelected() {
        toCSVRows(selected);
    }

    // ── Bulk import helpers ──────────────────────────────
    function downloadBulkTemplate() {
        const headers = [
            "id",
            "nip",
            "nama",
            "password",
            "role",
            "aktif",
            "categoryId",
            "kategori",
        ];
        const sample = [
            ["", "19876543210001", "Ahmad Fauzi", "", "asn", "true", "", ""],
            [
                "",
                "19876543210002",
                "Siti Aminah",
                "",
                "operator",
                "true",
                "3",
                "",
            ],
        ];
        const csv = [headers, ...sample]
            .map((row) => row.map(quoteCSV).join(","))
            .join("\n");
        const a = document.createElement("a");
        a.href = URL.createObjectURL(
            new Blob([csv], { type: "text/csv;charset=utf-8;" }),
        );
        a.download = "template-bulk-user.csv";
        a.click();
    }

    function resetBulkState() {
        bulkError = "";
        bulkSuccess = "";
        bulkFileName = "";
        bulkPreview = [];
        bulkSkippedRows = [];
        bulkResult = null;
    }
    function normalizeHeader(value: unknown) {
        return String(value ?? "")
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "")
            .replace(/[_-]/g, "");
    }
    function parseBooleanValue(value: unknown): boolean | undefined {
        if (typeof value === "boolean") return value;
        const raw = String(value ?? "")
            .trim()
            .toLowerCase();
        if (!raw) return undefined;
        if (["true", "1", "ya", "yes", "aktif"].includes(raw)) return true;
        if (["false", "0", "tidak", "no", "nonaktif"].includes(raw))
            return false;
        return undefined;
    }
    function parseNumberValue(value: unknown): number | undefined {
        if (typeof value === "number" && Number.isFinite(value)) return value;
        const raw = String(value ?? "").trim();
        if (!raw) return undefined;
        const n = Number(raw);
        return Number.isFinite(n) ? n : undefined;
    }
    function findCategoryId(
        rawValue: unknown,
        rawCategoryName: unknown,
    ): number | null | undefined {
        const cid = parseNumberValue(rawValue);
        if (cid !== undefined) return cid;
        const name = String(rawCategoryName ?? "")
            .trim()
            .toLowerCase();
        if (!name) return undefined;
        const match = kategoriList.find(
            (item) =>
                String(item.title ?? "")
                    .trim()
                    .toLowerCase() === name,
        );
        return match?.id;
    }
    function parseRoleValue(value: unknown): BulkItem["role"] | undefined {
        const raw = String(value ?? "")
            .trim()
            .toLowerCase();
        if (!raw) return undefined;
        return allowedRoles.includes(raw)
            ? (raw as BulkItem["role"])
            : undefined;
    }
    function buildBulkItem(rawRow: Record<string, unknown>) {
        const item: Partial<BulkItem> = {};
        const rowInfo: string[] = [];
        const firstOf = (...keys: string[]) => {
            for (const key of keys) {
                if (key in rawRow) return rawRow[key];
            }
            return undefined;
        };
        const id = parseNumberValue(firstOf("id", "userid"));
        const nip = String(firstOf("nip", "nomorindukpegawai") ?? "").trim();
        const nama = String(
            firstOf("nama", "fullname", "namalengkap") ?? "",
        ).trim();
        const password = String(firstOf("password", "pass") ?? "").trim();
        const role = parseRoleValue(firstOf("role", "jabatan", "hakakses"));
        const aktif = parseBooleanValue(
            firstOf("aktif", "active", "isactive", "statusaktif"),
        );
        const categoryId = findCategoryId(
            firstOf("categoryid", "kategoriid", "category", "kategori"),
            firstOf("kategori", "categoryname", "categorytitle"),
        );
        if (id !== undefined) item.id = id;
        if (nip) item.nip = nip;
        if (nama) item.nama = nama;
        if (password) item.password = password;
        if (role) item.role = role;
        if (aktif !== undefined) item.aktif = aktif;
        if (categoryId !== undefined) item.categoryId = categoryId;
        if (!nip && !nama)
            rowInfo.push("baris dilewati karena NIP dan Nama kosong");
        else {
            if (!nip) rowInfo.push("NIP kosong");
            if (!nama) rowInfo.push("Nama kosong");
            if (
                String(firstOf("role", "jabatan", "hakakses") ?? "").trim() &&
                !role
            )
                rowInfo.push("role tidak dikenali");
            if (
                String(
                    firstOf("aktif", "active", "isactive", "statusaktif") ?? "",
                ).trim() &&
                aktif === undefined
            )
                rowInfo.push("nilai aktif tidak dikenali");
            if (
                String(
                    firstOf(
                        "categoryid",
                        "kategoriid",
                        "category",
                        "kategori",
                    ) ?? "",
                ).trim() &&
                categoryId === undefined
            )
                rowInfo.push("kategori/categoryId tidak dikenali");
        }
        return { item, issues: rowInfo };
    }

    async function handleBulkFileChange(event: Event) {
        const input = event.currentTarget as HTMLInputElement;
        const file = input.files?.[0];
        resetBulkState();
        if (!file) return;
        const lower = file.name.toLowerCase();
        if (
            !lower.endsWith(".xlsx") &&
            !lower.endsWith(".xls") &&
            !lower.endsWith(".csv")
        ) {
            bulkError =
                "Gunakan file Excel/CSV dengan ekstensi .xlsx, .xls, atau .csv.";
            input.value = "";
            return;
        }
        bulkLoading = true;
        bulkFileName = file.name;
        try {
            const buffer = await file.arrayBuffer();
            const workbook = XLSX.read(buffer, { type: "array" });
            const sheetName = workbook.SheetNames[0];
            if (!sheetName) throw new Error("Sheet pertama tidak ditemukan.");
            const sheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
                sheet,
                { defval: "" },
            );
            if (!rows.length) throw new Error("File tidak berisi data user.");
            const mappedRows = rows.map((row) => {
                const normalized: Record<string, unknown> = {};
                for (const [key, value] of Object.entries(row))
                    normalized[normalizeHeader(key)] = value;
                return normalized;
            });
            const nextPreview: BulkItem[] = [];
            const nextSkipped: string[] = [];
            mappedRows.forEach((row, index) => {
                const { item, issues } = buildBulkItem(row);
                if (!item.nip && !item.nama)
                    nextSkipped.push(
                        `Baris ${index + 2}: ${issues.join(", ")}`,
                    );
                else if (item.nip && item.nama)
                    nextPreview.push(item as BulkItem);
                else
                    nextSkipped.push(
                        `Baris ${index + 2}: ${issues.join(", ") || "data belum lengkap"}`,
                    );
            });
            bulkPreview = nextPreview;
            bulkSkippedRows = nextSkipped;
            if (!nextPreview.length)
                throw new Error(
                    "Tidak ada baris valid yang bisa dikirim. Pastikan kolom NIP dan Nama terisi.",
                );
        } catch (error) {
            bulkError =
                error instanceof Error
                    ? error.message
                    : "Gagal membaca file Excel.";
            bulkPreview = [];
        } finally {
            bulkLoading = false;
            input.value = "";
        }
    }

    async function submitBulkImport() {
        if (!bulkPreview.length) {
            bulkError = "Belum ada data valid untuk diimport.";
            return;
        }
        if (bulkDefaultPassword && bulkDefaultPassword.trim().length < 6) {
            bulkError = "Password default minimal 6 karakter.";
            return;
        }
        bulkSubmitting = true;
        bulkError = "";
        bulkSuccess = "";
        bulkResult = null;
        try {
            const payload = {
                ...(bulkDefaultPassword.trim()
                    ? { defaultPassword: bulkDefaultPassword.trim() }
                    : {}),
                items: bulkPreview,
            };
            const res = await fetch(bulkUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const json = await res.json();
            if (!res.ok || json?.success === false)
                throw new Error(
                    json?.message ?? "Bulk import user gagal diproses.",
                );
            bulkResult = json.data ?? null;
            bulkSuccess = json.message ?? "Bulk import user berhasil diproses.";
            // Refetch halaman saat ini
            page = page;
        } catch (error) {
            bulkError =
                error instanceof Error
                    ? error.message
                    : "Bulk import user gagal diproses.";
        } finally {
            bulkSubmitting = false;
        }
    }
</script>

<div class="flex flex-col gap-4 mb-4">
    <div
        class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3"
    >
        <div class="flex items-center gap-2">
            <input
                type="text"
                placeholder="Cari nama, NIP, role..."
                class="border bg-white/50 border-black/10 rounded py-2 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-1 transition-colors w-56"
                bind:value={searchTerm}
            />
        </div>
        <div class="flex flex-wrap items-center gap-2">
            <button
                onclick={() => {
                    bulkOpen = !bulkOpen;
                    bulkError = "";
                    bulkSuccess = "";
                }}
                class="flex items-center gap-1.5 px-3 py-2 bg-white text-ink/70 text-xs font-semibold border border-black/10 hover:bg-black/2 transition-colors cursor-pointer"
                type="button"
                ><Icon icon="mdi:file-excel-outline" class="w-4 h-4" />Bulk
                Excel</button
            >
            <button
                onclick={exportCSV}
                class="flex items-center gap-1.5 px-3 py-2 bg-ink/5 text-ink/60 text-xs font-semibold border border-black/10 hover:bg-ink/10 transition-colors cursor-pointer"
                type="button"
                ><Icon icon="mdi:download" class="w-3.5 h-3.5" />Export</button
            >
            <a
                href="/admin/manajemenUser/tambah"
                class="flex items-center gap-1.5 px-4 py-2 bg-green text-white text-sm font-semibold border border-black/10 transition-colors hover:bg-green/90"
                ><Icon icon="mdi:plus" class="w-3.5 h-3.5" />Tambah</a
            >
        </div>
    </div>

    {#if bulkOpen}
        <section class="border border-black/10 bg-white p-4 md:p-5 rounded-xl">
            <div
                class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4"
            >
                <div>
                    <h3 class="text-lg font-bold text-ink">
                        Bulk Upsert User dari Excel
                    </h3>
                    <p class="text-sm text-ink/55 mt-1 max-w-3xl">
                        Upload file Excel/CSV berisi kolom seperti <span
                            class="font-semibold text-ink">nip</span
                        >, <span class="font-semibold text-ink">nama</span>,
                        <span class="font-semibold text-ink">role</span>,
                        <span class="font-semibold text-ink">aktif</span>,
                        <span class="font-semibold text-ink">categoryId</span>,
                        atau
                        <span class="font-semibold text-ink">kategori</span>.
                        Backend akan membuat user baru atau memperbarui user
                        yang sudah ada berdasarkan
                        <span class="font-semibold text-ink">id</span>
                        atau <span class="font-semibold text-ink">nip</span>.
                    </p>
                </div>
                <button
                    type="button"
                    onclick={downloadBulkTemplate}
                    class="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold border border-black/10 hover:bg-black/2 transition-colors cursor-pointer"
                    ><Icon
                        icon="mdi:file-download-outline"
                        class="w-4 h-4"
                    />Download Template</button
                >
            </div>
            <div class="grid grid-cols-1 xl:grid-cols-[1.3fr_0.7fr] gap-4 mt-5">
                <div
                    class="border border-dashed border-black/15 rounded-xl p-4 bg-black/2"
                >
                    <label
                        for="bulk-user-file"
                        class="text-sm font-semibold text-ink/75"
                        >File Excel / CSV</label
                    >
                    <input
                        id="bulk-user-file"
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        class="mt-2 block w-full text-sm file:mr-3 file:px-3 file:py-2 file:border-0 file:bg-green file:text-white file:font-semibold hover:file:bg-green/90"
                        onchange={handleBulkFileChange}
                        disabled={bulkLoading || bulkSubmitting}
                    />
                    <p class="text-xs text-ink/45 mt-2">
                        Gunakan sheet pertama. Header fleksibel, misalnya:
                        `nip`, `nama`, `role`, `aktif`, `categoryId`,
                        `kategori`.
                    </p>
                    {#if bulkFileName}<div
                            class="mt-3 flex items-center gap-2 text-sm text-ink/65"
                        >
                            <Icon
                                icon="mdi:file-document-outline"
                                class="w-4 h-4"
                            /><span>{bulkFileName}</span>
                        </div>{/if}
                    {#if bulkLoading}<div class="mt-4 text-sm text-ink/50">
                            Membaca file Excel...
                        </div>{/if}
                    {#if bulkError}<div
                            class="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                        >
                            {bulkError}
                        </div>{/if}
                    {#if bulkSuccess}<div
                            class="mt-4 rounded-lg border border-green/20 bg-green/8 px-3 py-2 text-sm text-green"
                        >
                            {bulkSuccess}
                        </div>{/if}
                </div>
                <div class="border border-black/10 rounded-xl p-4 bg-white">
                    <label
                        for="bulk-default-password"
                        class="text-sm font-semibold text-ink/75"
                        >Password Default</label
                    >
                    <input
                        id="bulk-default-password"
                        type="text"
                        bind:value={bulkDefaultPassword}
                        placeholder="Opsional, min. 6 karakter"
                        class="mt-2 w-full border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green focus:ring-offset-1"
                        disabled={bulkSubmitting}
                    />
                    <p class="text-xs text-ink/45 mt-2">
                        Dipakai backend jika ada baris user baru tanpa password
                        sendiri.
                    </p>
                    <div class="grid grid-cols-2 gap-3 mt-4">
                        <div
                            class="rounded-lg border border-black/8 p-3 bg-black/2"
                        >
                            <p
                                class="text-[10px] uppercase tracking-widest text-ink/40"
                            >
                                Preview Valid
                            </p>
                            <p class="text-2xl font-bold mt-1 text-ink">
                                {bulkPreview.length}
                            </p>
                        </div>
                        <div
                            class="rounded-lg border border-black/8 p-3 bg-black/2"
                        >
                            <p
                                class="text-[10px] uppercase tracking-widest text-ink/40"
                            >
                                Dilewati
                            </p>
                            <p class="text-2xl font-bold mt-1 text-ink">
                                {bulkSkippedRows.length}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onclick={submitBulkImport}
                        disabled={bulkSubmitting ||
                            bulkLoading ||
                            !bulkPreview.length}
                        class="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-green text-white text-sm font-semibold disabled:opacity-50 hover:bg-green/90 transition-colors cursor-pointer"
                        ><Icon
                            icon="mdi:database-import-outline"
                            class="w-4 h-4"
                        />{bulkSubmitting
                            ? "Memproses Import..."
                            : "Proses Bulk Upsert"}</button
                    >
                </div>
            </div>
            {#if bulkPreview.length > 0}
                <div
                    class="mt-5 border border-black/10 rounded-xl overflow-hidden"
                >
                    <div
                        class="px-4 py-3 bg-black/2 border-b border-black/8 flex items-center justify-between gap-3"
                    >
                        <div>
                            <h4 class="font-semibold text-ink">
                                Preview Data Valid
                            </h4>
                            <p class="text-xs text-ink/45 mt-0.5">
                                Menampilkan {Math.min(bulkPreview.length, 8)} dari
                                {bulkPreview.length} baris yang akan dikirim.
                            </p>
                        </div>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="min-w-full text-sm">
                            <thead class="bg-white"
                                ><tr
                                    class="text-left text-ink/45 border-b border-black/8"
                                    ><th class="px-4 py-3 font-semibold">NIP</th
                                    ><th class="px-4 py-3 font-semibold"
                                        >Nama</th
                                    ><th class="px-4 py-3 font-semibold"
                                        >Role</th
                                    ></tr
                                ></thead
                            ><tbody
                                >{#each bulkPreview.slice(0, 8) as item}<tr
                                        class="border-b border-black/5"
                                        ><td class="px-4 py-2 text-ink/70"
                                            >{item.nip}</td
                                        ><td
                                            class="px-4 py-2 font-medium text-ink"
                                            >{item.nama}</td
                                        ><td class="px-4 py-2 text-ink/60"
                                            >{item.role ?? "–"}</td
                                        ></tr
                                    >{/each}</tbody
                            >
                        </table>
                    </div>
                </div>
            {/if}
        </section>
    {/if}
</div>

<!-- ── Row info ─────────────────────────────────────────── -->
{#if rowInfo}
    <p class="text-xs text-ink/40 mb-3">{@html rowInfo}</p>
{/if}

<!-- ── Table ──────────────────────────────────────────── -->
<Table
    {data}
    {columns}
    {loading}
    disablePagination
    enableSelection
    onSelectionChange={(rows: UserRow[]) => (selected = rows)}
    class="bg-white"
>
    {#snippet renderCell(cell: any)}
        {#if cell.column.id === "id"}
            <span class="font-mono text-xs font-bold text-ink/60"
                >{cell.getValue()}</span
            >
        {:else if cell.column.id === "nama"}
            <span class="font-semibold text-ink text-sm">{cell.getValue()}</span
            >
        {:else if cell.column.id === "nip"}
            <span class="text-sm text-ink/70 font-mono">{cell.getValue()}</span>
        {:else if cell.column.id === "role"}
            {@const r = roleBadge(cell.getValue())}
            <span
                class="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold {r.cls}"
                >{r.label}</span
            >
        {:else if cell.column.id === "categoryId"}
            <span class="text-xs text-ink/60"
                >{getKategoriName(cell.getValue())}</span
            >
        {:else if cell.column.id === "createdAt"}
            <span class="text-xs text-ink/50"
                >{formatDate(cell.getValue())}</span
            >
        {:else if cell.column.id === "_aksi"}
            {@const row = cell.row.original}
            <div class="flex items-center gap-1">
                <a
                    href={`/admin/manajemenUser/edit?id=${row.id}`}
                    class="w-7 h-7 flex items-center justify-center rounded-lg border border-black/10 hover:bg-black/4 text-ink/50 hover:text-ink transition-colors"
                    aria-label="Edit"
                    ><Icon icon="mdi:pencil" class="w-3.5 h-3.5" /></a
                >
                <button
                    onclick={() => handleDelete(row)}
                    class="w-7 h-7 flex items-center justify-center rounded-lg border border-black/10 hover:bg-red-50 text-ink/50 hover:text-red-500 transition-colors cursor-pointer"
                    aria-label="Hapus"
                    ><Icon icon="mdi:delete" class="w-3.5 h-3.5" /></button
                >
            </div>
        {/if}
    {/snippet}
</Table>

<!-- ── Pagination ───────────────────────────────────────── -->
{#if pagination.totalPages > 1}
    <div class="flex items-center gap-2 mt-4">
        <button
            onclick={() => {
                page = Math.max(1, page - 1);
            }}
            disabled={page === 1}
            class="px-3 py-1.5 border border-ink/20 text-xs font-bold uppercase hover:bg-ink/5 disabled:opacity-40 transition-colors cursor-pointer"
            >← Prev</button
        >
        <span class="text-xs text-ink/50"
            >Halaman {page} / {pagination.totalPages}</span
        >
        <button
            onclick={() => {
                page = Math.min(pagination.totalPages, page + 1);
            }}
            disabled={page === pagination.totalPages}
            class="px-3 py-1.5 border border-ink/20 text-xs font-bold uppercase hover:bg-ink/5 disabled:opacity-40 transition-colors cursor-pointer"
            >Next →</button
        >
    </div>
{/if}

<!-- ── Bulk action bar ─────────────────────────────────── -->
{#if selected.length > 0}
    <div
        class="flex items-center gap-3 mt-4 px-4 py-3 bg-black/5 border border-black/10 rounded"
    >
        <span class="text-xs font-semibold text-ink/70"
            >{selected.length} terpilih</span
        >
        <button
            onclick={exportSelected}
            class="text-xs font-semibold text-ink/50 hover:text-ink transition-colors cursor-pointer"
            >Export terpilih</button
        >
        <button
            onclick={deleteSelected}
            class="ml-auto text-xs font-semibold text-red-500 hover:text-red-600 transition-colors cursor-pointer"
            >Hapus terpilih</button
        >
    </div>
{/if}
