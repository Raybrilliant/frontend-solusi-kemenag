<script>
    import Icon from "@iconify/svelte";
    import * as XLSX from "xlsx";
    let {
        questionsUrl = "/api/admin/survei/questions",
        responsesUrl = "/api/admin/survei/responses",
        answersUrl = "/api/admin/survei/responses/answers",
    } = $props();

    const surveyTypes = [
        {
            value: "SPKP",
            label: "SPKP",
            title: "Survei Persepsi Kualitas Pelayanan",
            tone: "bg-sky-100 text-sky-700",
        },
        {
            value: "SPAK",
            label: "SPAK",
            title: "Survei Persepsi Anti Korupsi",
            tone: "bg-amber-100 text-amber-700",
        },
    ];

    const tabs = [
        { id: "questions", label: "Pertanyaan" },
        { id: "responses", label: "Hasil Respons" },
        { id: "monthly", label: "Nilai Bulanan" },
    ];

    // Mapping kode demografi (integer) -> label, dipakai di tabel respons & export.
    const pendidikanLabels = {
        1: "Tidak Sekolah",
        2: "SD/sederajat",
        3: "SMP/sederajat",
        4: "SMA/sederajat",
        5: "D1/D2/D3",
        6: "D4/S1",
        7: "S2",
        8: "S3",
    };
    const pekerjaanLabels = {
        1: "ASN (PNS/PPPK)",
        2: "TNI/POLRI",
        3: "Swasta",
        4: "Wiraswasta",
        5: "Ibu Rumah Tangga",
        6: "Pelajar/Mahasiswa",
        7: "Petani/Nelayan",
        8: "Pekerja Lepas/Freelance",
        9: "Pensiunan",
        10: "Tidak Bekerja",
        11: "Lain-lain",
    };
    const disabilitasLabels = {
        1: "Fisik",
        2: "Intelektual",
        3: "Mental",
        4: "Sensory",
    };

    function labelPendidikan(code) {
        if (code === null || code === undefined || code === "") return "-";
        return pendidikanLabels[Number(code)] ?? String(code);
    }
    function labelPekerjaan(code) {
        if (code === null || code === undefined || code === "") return "-";
        return pekerjaanLabels[Number(code)] ?? String(code);
    }
    function labelUsia(usia) {
        if (usia === null || usia === undefined || usia === "") return "-";
        return `${usia} thn`;
    }
    function labelDisabilitas(value) {
        if (!value) return "Tidak";
        const parts = String(value)
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean)
            .map((p) => disabilitasLabels[Number(p)] ?? `Kode ${p}`);
        return parts.length ? parts.join(", ") : "Tidak";
    }

    let activeType = $state("SPKP");
    let activeTab = $state("questions");
    let questions = $state([]);
    let questionsLoading = $state(true);
    let questionsError = $state("");
    let responses = $state([]);
    let responsesLoading = $state(true);
    let responsesError = $state("");
    let responsePage = $state(1);
    let responsePagination = $state({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 1,
    });
    let ticketSearch = $state("");
    let ticketFilter = $state("");
    let monthlyLoading = $state(false);
    let monthlyError = $state("");
    let monthlyItems = $state([]);
    let monthlyResponses = $state([]);
    let exportingMonthly = $state(false);
    let monthlyUpdatedAt = $state("");
    let mode = $state("create");
    let selected = $state(null);
    let formQuestion = $state("");
    let formSortOrder = $state(1);
    let formIsActive = $state(true);
    let saving = $state(false);
    let deleting = $state(false);
    let exportingResponses = $state(false);
    let toast = $state(null);

    const currentType = $derived(
        surveyTypes.find((item) => item.value === activeType) ?? surveyTypes[0],
    );

    const activeQuestions = $derived(
        questions.filter((item) => item.isActive).length,
    );

    const inactiveQuestions = $derived(
        questions.filter((item) => !item.isActive).length,
    );

    const monthlyRows = $derived.by(() => {
        const map = new Map();
        for (const item of monthlyItems) {
            const month = parseAnswerMonth(item);
            if (!month) continue;

            const key = `${item.surveyType}-${month.key}`;
            const row = map.get(key) ?? {
                key,
                surveyType: item.surveyType,
                month: month.label,
                timestamp: month.timestamp,
                answerCount: 0,
                responseIds: new Set(),
                scoreTotal: 0,
                scoreCount: 0,
            };

            row.answerCount += 1;
            if (item.responseId) row.responseIds.add(item.responseId);
            const score = Number(item.nilai);
            if (Number.isFinite(score)) {
                row.scoreTotal += score;
                row.scoreCount += 1;
            }
            map.set(key, row);
        }

        return Array.from(map.values())
            .map((row) => ({
                ...row,
                responseCount: row.responseIds.size,
            }))
            .sort(
                (a, b) =>
                    b.timestamp - a.timestamp ||
                    a.surveyType.localeCompare(b.surveyType),
            );
    });

    const monthlyByType = $derived(
        surveyTypes.map((type) => ({
            ...type,
            rows: monthlyRows.filter((row) => row.surveyType === type.value),
        })),
    );

    const questionRows = $derived.by(() => {
        const map = new Map();
        for (const item of monthlyItems) {
            const score = Number(item.nilai);
            if (!Number.isFinite(score)) continue;

            const questionId = item.questionId ?? "unknown";
            const key = `${item.surveyType}-${questionId}`;
            const row = map.get(key) ?? {
                key,
                surveyType: item.surveyType,
                questionId,
                question: item.question ?? `Pertanyaan #${String(questionId)}`,
                answerCount: 0,
                responseIds: new Set(),
                scoreTotal: 0,
                scoreCount: 0,
            };

            row.answerCount += 1;
            if (item.responseId) row.responseIds.add(item.responseId);
            row.scoreTotal += score;
            row.scoreCount += 1;
            map.set(key, row);
        }

        return Array.from(map.values())
            .map((row) => ({
                ...row,
                responseCount: row.responseIds.size,
                average: averageScore(row),
            }))
            .sort(
                (a, b) =>
                    a.average - b.average ||
                    a.surveyType.localeCompare(b.surveyType) ||
                    String(a.question).localeCompare(String(b.question)),
            );
    });

        const questionByType = $derived(
        surveyTypes.map((type) => ({
            ...type,
            rows: questionRows.filter((row) => row.surveyType === type.value),
        })),
    );

    // Daftar respons unik per permohonan (demografi + kritik/saran + kepercayaan)
    // untuk ditampilkan di menu Nilai Bulanan. Karena SPKP & SPAK menyimpan
    // kritik/kepercayaan yang sama, cukup ambil satu per tiket.
    const feedbackRows = $derived.by(() => {
        const map = new Map();
        for (const r of monthlyResponses) {
            if (!map.has(r.permohonanId)) map.set(r.permohonanId, r);
        }
        return [...map.values()].sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
        );
    });

    const kepercayaanAvg = $derived.by(() => {
        if (!feedbackRows.length) return { pusat: 0, daerah: 0 };
        const sum = (key) =>
            feedbackRows.reduce(
                (s, r) => s + (Number(r[key]) || 0),
                0,
            ) / feedbackRows.length;
        return { pusat: sum("kepercayaanPusat"), daerah: sum("kepercayaanDaerah") };
    });

    // Daftar kritik & saran anonim (hanya teks, tanpa identitas).
    const kritikSaranRows = $derived(
        feedbackRows
            .map((r) => (r.kritikSaran ?? "").trim())
            .filter((teks) => teks.length > 0),
    );

    function formatSkala(num) {
        return Number(num).toLocaleString("id-ID", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    }

    function showToast(type, msg) {
        toast = { type, msg };
        setTimeout(() => (toast = null), 3500);
    }

    function formatDate(value) {
        if (!value) return "-";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "-";
        return new Intl.DateTimeFormat("id-ID", {
            dateStyle: "medium",
            timeStyle: "short",
        }).format(date);
    }

    function parseAnswerMonth(item) {
        const date = new Date(item.submittedAt ?? item.createdAt);
        if (!Number.isNaN(date.getTime())) {
            return {
                key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
                label: date.toLocaleDateString("id-ID", {
                    month: "long",
                    year: "numeric",
                }),
                timestamp: new Date(
                    date.getFullYear(),
                    date.getMonth(),
                    1,
                ).getTime(),
            };
        }

        const match = String(item.month ?? "").match(/^(\d{4})-(\d{1,2})/);
        if (!match) return null;

        const year = Number(match[1]);
        const month = Number(match[2]) - 1;
        const fallbackDate = new Date(year, month, 1);
        if (Number.isNaN(fallbackDate.getTime())) return null;

        return {
            key: `${year}-${String(month + 1).padStart(2, "0")}`,
            label: fallbackDate.toLocaleDateString("id-ID", {
                month: "long",
                year: "numeric",
            }),
            timestamp: fallbackDate.getTime(),
        };
    }

    function averageScore(row) {
        if (!row.scoreCount) return 0;
        return row.scoreTotal / row.scoreCount;
    }

    function formatScore(row) {
        if (!row.scoreCount) return "-";
        return averageScore(row).toLocaleString("id-ID", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    }

    function scoreTone(row) {
        const score = averageScore(row);
        if (score < 3) return "bg-red-50 text-red-600";
        if (score < 4) return "bg-amber-100 text-amber-700";
        return "bg-green/10 text-green";
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#39;");
    }

    function sanitizeFilePart(value) {
        return String(value ?? "")
            .trim()
            .replace(/[^a-zA-Z0-9_-]+/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "")
            .toLowerCase();
    }

    function nextSortOrder() {
        return questions.length
            ? Math.max(
                  ...questions.map((item) => Number(item.sortOrder) || 0),
              ) + 1
            : 1;
    }

    function resetForm() {
        mode = "create";
        selected = null;
        formQuestion = "";
        formSortOrder = nextSortOrder();
        formIsActive = true;
    }

    function openEdit(item) {
        mode = "edit";
        selected = item;
        formQuestion = item.question ?? "";
        formSortOrder = Number(item.sortOrder ?? 1);
        formIsActive = Boolean(item.isActive);
        activeTab = "questions";
    }

    async function loadQuestions(type = activeType) {
        questionsLoading = true;
        questionsError = "";
        try {
            const qs = new URLSearchParams({ surveyType: type });
            const res = await fetch(`${questionsUrl}?${qs}`, {
                credentials: "same-origin",
            });
            const json = await res.json();
            if (json.success === false) {
                questionsError =
                    json.message ?? "Gagal memuat pertanyaan survei.";
                questions = [];
                return;
            }
            questions = (json.data ?? []).sort(
                (a, b) =>
                    (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0),
            );
            if (mode === "create") formSortOrder = nextSortOrder();
        } catch (e) {
            questionsError = String(e);
            questions = [];
        } finally {
            questionsLoading = false;
        }
    }

    async function loadResponses(
        type = activeType,
        page = responsePage,
        ticket = ticketFilter,
    ) {
        responsesLoading = true;
        responsesError = "";
        try {
            const qs = new URLSearchParams({
                surveyType: type,
                page: String(page),
                limit: "10",
            });
            if (ticket.trim()) qs.set("ticketId", ticket.trim());
            const res = await fetch(`${responsesUrl}?${qs}`, {
                credentials: "same-origin",
            });
            const json = await res.json();
            if (json.success === false) {
                responsesError = json.message ?? "Gagal memuat hasil survei.";
                responses = [];
                return;
            }
            responses = json.data ?? [];
            responsePagination = json.pagination ?? {
                page,
                limit: 10,
                total: responses.length,
                totalPages: 1,
            };
        } catch (e) {
            responsesError = String(e);
            responses = [];
        } finally {
            responsesLoading = false;
        }
    }

    async function loadMonthly() {
        monthlyLoading = true;
        monthlyError = "";
        try {
            const [results, responsesRes] = await Promise.all([
                Promise.all(
                    surveyTypes.map(async (type) => {
                        const items = [];
                        let page = 1;
                        let totalPages = 1;

                        while (page <= totalPages && page <= 20) {
                            const qs = new URLSearchParams({
                                surveyType: type.value,
                                period: "12",
                                page: String(page),
                                limit: "500",
                            });
                            const res = await fetch(`${answersUrl}?${qs}`, {
                                credentials: "same-origin",
                            });
                            const json = await res.json();
                            if (json.success === false) {
                                throw new Error(
                                    json.message ??
                                        `Gagal memuat rekap ${type.value}.`,
                                );
                            }
                            items.push(...(json.data ?? []));
                            totalPages = Number(json.pagination?.totalPages) || 1;
                            page += 1;
                        }

                        return items;
                    }),
                ),
                (async () => {
                    // Ambil semua respons (kedua tipe) untuk kritik/saran &
                    // kepercayaan. /responses tidak memfilter periode.
                    const all = [];
                    let page = 1;
                    let totalPages = 1;
                    while (page <= totalPages && page <= 50) {
                        const qs = new URLSearchParams({
                            page: String(page),
                            limit: "100",
                        });
                        const res = await fetch(`${responsesUrl}?${qs}`, {
                            credentials: "same-origin",
                        });
                        const json = await res.json();
                        if (json.success === false) {
                            throw new Error(
                                json.message ?? "Gagal memuat respons.",
                            );
                        }
                        all.push(...(json.data ?? []));
                        totalPages = Number(json.pagination?.totalPages) || 1;
                        page += 1;
                    }
                    return all;
                })(),
            ]);
            monthlyItems = results.flat();
            monthlyResponses = responsesRes;
            monthlyUpdatedAt = new Date().toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
            });
        } catch (e) {
            monthlyError = String(e);
            monthlyItems = [];
            monthlyResponses = [];
        } finally {
            monthlyLoading = false;
        }
    }

    async function saveQuestion() {
        if (!formQuestion.trim()) {
            showToast("error", "Pertanyaan wajib diisi.");
            return;
        }

        saving = true;
        try {
            const payload = {
                surveyType: activeType,
                question: formQuestion.trim(),
                isActive: formIsActive,
                sortOrder: Number(formSortOrder) || 1,
            };
            const isCreate = mode === "create";
            const url = isCreate
                ? questionsUrl
                : `${questionsUrl}/${selected.id}`;
            const res = await fetch(url, {
                method: isCreate ? "POST" : "PUT",
                credentials: "same-origin",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const json = await res.json();
            if (json.success === false) {
                showToast("error", json.message ?? "Gagal menyimpan.");
                return;
            }
            await loadQuestions(activeType);
            resetForm();
            showToast(
                "success",
                isCreate
                    ? "Pertanyaan survei berhasil ditambahkan."
                    : "Pertanyaan survei berhasil diperbarui.",
            );
        } catch (e) {
            showToast("error", String(e));
        } finally {
            saving = false;
        }
    }

    async function deleteQuestion() {
        if (!selected) return;
        if (!confirm(`Hapus pertanyaan "${selected.question}"?`)) return;

        deleting = true;
        try {
            const res = await fetch(`${questionsUrl}/${selected.id}`, {
                method: "DELETE",
                credentials: "same-origin",
            });
            const json = await res.json();
            if (json.success === false) {
                showToast("error", json.message ?? "Gagal menghapus.");
                return;
            }
            await loadQuestions(activeType);
            resetForm();
            showToast("success", "Pertanyaan survei berhasil dihapus.");
        } catch (e) {
            showToast("error", String(e));
        } finally {
            deleting = false;
        }
    }

    function applyTicketFilter() {
        responsePage = 1;
        ticketFilter = ticketSearch.trim();
    }

    function clearTicketFilter() {
        ticketSearch = "";
        ticketFilter = "";
        responsePage = 1;
    }

    function downloadExcelFile(html, filename) {
        const blob = new Blob(["\ufeff", html], {
            type: "application/vnd.ms-excel;charset=utf-8",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }

    async function exportResponsesToExcel() {
        exportingResponses = true;
        try {
            const allResponses = [];
            let page = 1;
            let totalPages = 1;

            while (page <= totalPages && page <= 100) {
                const qs = new URLSearchParams({
                    surveyType: activeType,
                    page: String(page),
                    limit: "500",
                });
                if (ticketFilter.trim()) {
                    qs.set("ticketId", ticketFilter.trim());
                }

                const res = await fetch(`${responsesUrl}?${qs}`, {
                    credentials: "same-origin",
                });
                const json = await res.json();
                if (json.success === false) {
                    throw new Error(
                        json.message ?? "Gagal mengekspor hasil survei.",
                    );
                }

                allResponses.push(...(json.data ?? []));
                totalPages = Number(json.pagination?.totalPages) || 1;
                page += 1;
            }

            if (allResponses.length === 0) {
                showToast("error", "Tidak ada respons untuk diekspor.");
                return;
            }

            const fileNameParts = [
                "hasil-respons",
                activeType,
                ticketFilter
                    ? `tiket-${sanitizeFilePart(ticketFilter)}`
                    : "semua",
                new Date().toISOString().slice(0, 10),
            ].filter(Boolean);
            const fileName = `${fileNameParts.join("-")}.xlsx`;

            // Format export: nama, no-telpon, tanggal layanan, pendidikan,
            // usia, pekerjaan, disabilitas. Tanpa mapping (nilai raw).
            const rows = allResponses.map((item) => ({
                nama: item.applicantName ?? "",
                "no-telpon": item.applicantPhone ?? "",
                "tanggal layanan": item.tanggalMenerimaLayanan ?? "",
                pendidikan: item.pendidikanTerakhir ?? "",
                usia: item.usia ?? "",
                pekerjaan: item.jenisPekerjaan ?? "",
                disabilitas: item.disabilitas ?? "",
            }));
            const ws = XLSX.utils.json_to_sheet(rows, {
                header: [
                    "nama",
                    "no-telpon",
                    "tanggal layanan",
                    "pendidikan",
                    "usia",
                    "pekerjaan",
                    "disabilitas",
                ],
            });
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Hasil Respons");
            XLSX.writeFile(wb, fileName);
            showToast("success", "File Excel berhasil diunduh.");
        } catch (e) {
            showToast("error", String(e));
        } finally {
            exportingResponses = false;
        }
    }

    async function exportMonthlyToExcel() {
        if (monthlyLoading) {
            showToast("error", "Nilai bulanan masih dimuat.");
            return;
        }
        exportingMonthly = true;
        try {
            // Ambil semua respons (demografi + kritik/kepercayaan).
            const allResponses = [];
            let rPage = 1;
            let rTotal = 1;
            while (rPage <= rTotal && rPage <= 50) {
                const qs = new URLSearchParams({
                    page: String(rPage),
                    limit: "100",
                });
                const res = await fetch(`${responsesUrl}?${qs}`, {
                    credentials: "same-origin",
                });
                const json = await res.json();
                if (json.success === false) {
                    throw new Error(
                        json.message ?? "Gagal memuat respons.",
                    );
                }
                allResponses.push(...(json.data ?? []));
                rTotal = Number(json.pagination?.totalPages) || 1;
                rPage += 1;
            }

            // Ambil semua jawaban per pertanyaan (period besar = semua data).
            const allAnswers = [];
            let aPage = 1;
            let aTotal = 1;
            while (aPage <= aTotal && aPage <= 50) {
                const qs = new URLSearchParams({
                    period: "9999",
                    page: String(aPage),
                    limit: "500",
                });
                const res = await fetch(`${answersUrl}?${qs}`, {
                    credentials: "same-origin",
                });
                const json = await res.json();
                if (json.success === false) {
                    throw new Error(
                        json.message ?? "Gagal memuat jawaban.",
                    );
                }
                allAnswers.push(...(json.data ?? []));
                aTotal = Number(json.pagination?.totalPages) || 1;
                aPage += 1;
            }

            if (!allResponses.length) {
                showToast("error", "Tidak ada respons untuk diekspor.");
                return;
            }

            // Kelompokkan respons per tiket (SPKP + SPAK).
            const respByPerm = new Map();
            for (const r of allResponses) {
                const entry = respByPerm.get(r.permohonanId) ?? {};
                entry[r.surveyType] = r;
                respByPerm.set(r.permohonanId, entry);
            }

            // Jawaban per responseId => questionId => nilai.
            const ansByResp = new Map();
            for (const a of allAnswers) {
                const m = ansByResp.get(a.responseId) ?? new Map();
                m.set(a.questionId, a.nilai);
                ansByResp.set(a.responseId, m);
            }

            // Daftar pertanyaan unik per tipe (diambil dari jawaban),
            // diurutkan berdasarkan questionId agar kolom konsisten.
            const collectQs = (type) => {
                const seen = new Set();
                const list = [];
                for (const a of allAnswers) {
                    if (a.surveyType !== type) continue;
                    if (seen.has(a.questionId)) continue;
                    seen.add(a.questionId);
                    list.push({
                        questionId: a.questionId,
                        question: a.question,
                    });
                }
                return list.sort((x, y) => x.questionId - y.questionId);
            };
            const spkpQs = collectQs("SPKP");
            const spakQs = collectQs("SPAK");

            const spkpHeaders = spkpQs.map(
                (q) => `SPKP - ${q.question}`,
            );
            const spakHeaders = spakQs.map(
                (q) => `SPAK - ${q.question}`);
            const header = [
                "nama",
                "no-telpon",
                "tanggal layanan",
                "pendidikan",
                "usia",
                "pekerjaan",
                "disabilitas",
                ...spkpHeaders,
                ...spakHeaders,
                "kritik saran",
                "kepercayaan pusat",
                "kepercayaan daerah",
            ];

            const rows = [...respByPerm.keys()]
                .sort()
                .map((pid) => {
                    const grp = respByPerm.get(pid);
                    const base = grp.SPKP ?? grp.SPAK ?? {};
                    const spkpAns = grp.SPKP
                        ? ansByResp.get(grp.SPKP.id)
                        : undefined;
                    const spakAns = grp.SPAK
                        ? ansByResp.get(grp.SPAK.id)
                        : undefined;

                    const row = {
                        nama: base.applicantName ?? "",
                        "no-telpon": base.applicantPhone ?? "",
                        "tanggal layanan": base.tanggalMenerimaLayanan ?? "",
                        pendidikan: base.pendidikanTerakhir ?? "",
                        usia: base.usia ?? "",
                        pekerjaan: base.jenisPekerjaan ?? "",
                        disabilitas: base.disabilitas ?? "",
                    };
                    for (const q of spkpQs) {
                        row[`SPKP - ${q.question}`] =
                            spkpAns?.get(q.questionId) ?? "";
                    }
                    for (const q of spakQs) {
                        row[`SPAK - ${q.question}`] =
                            spakAns?.get(q.questionId) ?? "";
                    }
                    row["kritik saran"] = base.kritikSaran ?? "";
                    row["kepercayaan pusat"] =
                        base.kepercayaanPusat ?? "";
                    row["kepercayaan daerah"] =
                        base.kepercayaanDaerah ?? "";
                    return row;
                });

            const ws = XLSX.utils.json_to_sheet(rows, { header });
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Nilai Survei");
            const fileName = `nilai-survei-${new Date()
                .toISOString()
                .slice(0, 10)}.xlsx`;
            XLSX.writeFile(wb, fileName);
            showToast("success", "File Excel berhasil diunduh.");
        } catch (e) {
            showToast("error", String(e));
        } finally {
            exportingMonthly = false;
        }
    }

    function switchType(type) {
        activeType = type;
        responsePage = 1;
        resetForm();
    }

    $effect(() => {
        const type = activeType;
        loadQuestions(type);
    });

    $effect(() => {
        const type = activeType;
        const page = responsePage;
        const ticket = ticketFilter;
        loadResponses(type, page, ticket);
    });

    $effect(() => {
        loadMonthly();
    });
</script>

{#if toast}
    <div
        class={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 shadow-xl max-w-sm rounded ${
            toast.type === "success"
                ? "bg-green text-white"
                : "bg-red-600 text-white"
        }`}
    >
        <p class="text-sm font-semibold">{toast.msg}</p>
        <button
            onclick={() => (toast = null)}
            class="ml-auto opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
            aria-label="Tutup"
        >
            <Icon icon="mdi:close" width="16" height="16" />
        </button>
    </div>
{/if}

<div class="space-y-5">
    <section class="grid grid-cols-1 md:grid-cols-3 gap-3">
        {#each surveyTypes as type}
            <button
                onclick={() => switchType(type.value)}
                class={`text-left border p-4 transition-colors ${
                    activeType === type.value
                        ? "border-green bg-green/6"
                        : "border-black/10 bg-white hover:bg-black/[0.02]"
                }`}
            >
                <div class="flex items-center justify-between gap-3">
                    <span
                        class={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold ${type.tone}`}
                    >
                        {type.label}
                    </span>
                    {#if activeType === type.value}
                        <Icon icon="mdi:check" class="w-5 h-5 text-green" />
                    {/if}
                </div>
                <h2 class="mt-3 font-bold text-ink">{type.title}</h2>
                <p class="text-xs text-ink/45 mt-1">
                    Kelola pertanyaan dan pantau respons untuk tipe {type.label}.
                </p>
            </button>
        {/each}
    </section>

    <section class="flex flex-wrap items-center gap-2 border-b border-black/8">
        {#each tabs as tab}
            <button
                onclick={() => (activeTab = tab.id)}
                class={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
                    activeTab === tab.id
                        ? "border-green text-green"
                        : "border-transparent text-ink/45 hover:text-ink"
                }`}
            >
                {tab.label}
            </button>
        {/each}
    </section>

    {#if activeTab === "questions"}
        <section
            class="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-5 items-start"
        >
            <div class="bg-white border border-black/10">
                <div
                    class="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-black/8"
                >
                    <div>
                        <h2 class="font-bold uppercase text-ink">
                            Pertanyaan {currentType.label}
                        </h2>
                        <p class="text-xs text-ink/45 mt-1">
                            {activeQuestions} aktif, {inactiveQuestions} nonaktif.
                        </p>
                    </div>
                    <button
                        onclick={resetForm}
                        class="px-3 py-2 bg-green text-white text-xs font-bold uppercase hover:bg-green/90 transition-colors"
                    >
                        Tambah Pertanyaan
                    </button>
                </div>

                {#if questionsLoading}
                    <div class="py-16 text-center text-sm text-ink/40">
                        Memuat pertanyaan...
                    </div>
                {:else if questionsError}
                    <div class="py-16 text-center text-sm text-red-500">
                        {questionsError}
                    </div>
                {:else if questions.length === 0}
                    <div class="py-16 text-center text-sm text-ink/40">
                        Belum ada pertanyaan untuk {currentType.label}.
                    </div>
                {:else}
                    <div class="overflow-x-auto">
                        <table class="w-full text-sm">
                            <thead>
                                <tr
                                    class="bg-black/[0.02] border-b border-black/8"
                                >
                                    <th
                                        class="px-4 py-3 text-left text-[11px] uppercase tracking-wide text-ink/40"
                                        >Urut</th
                                    >
                                    <th
                                        class="px-4 py-3 text-left text-[11px] uppercase tracking-wide text-ink/40"
                                        >Pertanyaan</th
                                    >
                                    <th
                                        class="px-4 py-3 text-left text-[11px] uppercase tracking-wide text-ink/40"
                                        >Status</th
                                    >
                                    <th
                                        class="px-4 py-3 text-left text-[11px] uppercase tracking-wide text-ink/40"
                                        >Update</th
                                    >
                                </tr>
                            </thead>
                            <tbody>
                                {#each questions as item}
                                    <tr
                                        onclick={() => openEdit(item)}
                                        class={`border-b border-black/5 cursor-pointer hover:bg-green/4 ${
                                            selected?.id === item.id
                                                ? "bg-green/6"
                                                : ""
                                        }`}
                                    >
                                        <td
                                            class="px-4 py-3 font-mono text-xs text-ink/55"
                                        >
                                            {item.sortOrder}
                                        </td>
                                        <td
                                            class="px-4 py-3 font-medium text-ink"
                                        >
                                            {item.question}
                                        </td>
                                        <td class="px-4 py-3">
                                            <span
                                                class={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                                    item.isActive
                                                        ? "bg-green/10 text-green"
                                                        : "bg-black/6 text-ink/45"
                                                }`}
                                            >
                                                {item.isActive
                                                    ? "Aktif"
                                                    : "Nonaktif"}
                                            </span>
                                        </td>
                                        <td
                                            class="px-4 py-3 text-xs text-ink/45 whitespace-nowrap"
                                        >
                                            {formatDate(item.updatedAt)}
                                        </td>
                                    </tr>
                                {/each}
                            </tbody>
                        </table>
                    </div>
                {/if}
            </div>

            <aside class="bg-white border border-black/10 p-5">
                <div class="flex items-start justify-between gap-3 mb-5">
                    <div>
                        <p
                            class="text-xs font-bold text-ink/40 uppercase tracking-wider"
                        >
                            {mode === "create" ? "Tambah" : "Edit"}
                        </p>
                        <h3 class="text-lg font-bold text-ink mt-1">
                            Pertanyaan {currentType.label}
                        </h3>
                    </div>
                    {#if mode === "edit"}
                        <button
                            onclick={resetForm}
                            class="text-xs font-semibold text-green hover:underline"
                        >
                            Baru
                        </button>
                    {/if}
                </div>

                <div class="space-y-4">
                    <div>
                        <label
                            for="survey-question"
                            class="text-sm font-semibold text-ink/70"
                        >
                            Pertanyaan
                        </label>
                        <textarea
                            id="survey-question"
                            bind:value={formQuestion}
                            rows="5"
                            class="mt-1 w-full border border-black/10 bg-white px-3 py-2 text-sm focus:outline-none focus:border-green"
                            placeholder="Tulis pertanyaan survei..."
                        ></textarea>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label
                                for="survey-sort-order"
                                class="text-sm font-semibold text-ink/70"
                            >
                                Urutan
                            </label>
                            <input
                                id="survey-sort-order"
                                bind:value={formSortOrder}
                                type="number"
                                min="1"
                                class="mt-1 w-full border border-black/10 bg-white px-3 py-2 text-sm focus:outline-none focus:border-green"
                            />
                        </div>
                        <label
                            class="mt-6 flex items-center gap-2 text-sm font-semibold text-ink/70"
                        >
                            <input
                                bind:checked={formIsActive}
                                type="checkbox"
                                class="w-4 h-4 accent-green"
                            />
                            Aktif
                        </label>
                    </div>

                    <button
                        onclick={saveQuestion}
                        disabled={saving}
                        class="w-full bg-green text-white py-3 text-sm font-bold uppercase disabled:opacity-60 hover:bg-green/90 transition-colors"
                    >
                        {saving ? "Menyimpan..." : "Simpan Pertanyaan"}
                    </button>

                    {#if mode === "edit"}
                        <button
                            onclick={deleteQuestion}
                            disabled={deleting}
                            class="w-full border border-red-200 text-red-600 py-3 text-sm font-bold uppercase disabled:opacity-60 hover:bg-red-50 transition-colors"
                        >
                            {deleting ? "Menghapus..." : "Hapus Pertanyaan"}
                        </button>
                    {/if}
                </div>
            </aside>
        </section>
    {:else if activeTab === "responses"}
        <section class="bg-white border border-black/10">
            <div
                class="p-4 border-b border-black/8 flex flex-wrap items-center justify-between gap-3"
            >
                <div>
                    <h2 class="font-bold uppercase text-ink">
                        Hasil Respons {currentType.label}
                    </h2>
                    <p class="text-xs text-ink/45 mt-1">
                        Total {responsePagination.total} respons masuk.
                    </p>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                    <input
                        bind:value={ticketSearch}
                        onkeydown={(event) => {
                            if (event.key === "Enter") applyTicketFilter();
                        }}
                        type="text"
                        placeholder="Cari nomor tiket"
                        class="border border-black/10 px-3 py-2 text-sm focus:outline-none focus:border-green"
                    />
                    <button
                        onclick={applyTicketFilter}
                        class="px-3 py-2 bg-green text-white text-xs font-bold uppercase"
                    >
                        Cari
                    </button>
                    <button
                        onclick={exportResponsesToExcel}
                        disabled={exportingResponses || responsesLoading}
                        class="px-3 py-2 border border-black/10 text-xs font-bold uppercase disabled:opacity-50"
                    >
                        {exportingResponses ? "Mengekspor..." : "Export Excel"}
                    </button>
                    {#if ticketFilter}
                        <button
                            onclick={clearTicketFilter}
                            class="px-3 py-2 border border-black/10 text-xs font-bold uppercase"
                        >
                            Reset
                        </button>
                    {/if}
                </div>
            </div>

            {#if responsesLoading}
                <div class="py-16 text-center text-sm text-ink/40">
                    Memuat respons...
                </div>
            {:else if responsesError}
                <div class="py-16 text-center text-sm text-red-500">
                    {responsesError}
                </div>
            {:else if responses.length === 0}
                <div class="py-16 text-center text-sm text-ink/40">
                    Belum ada respons.
                </div>
            {:else}
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="bg-black/[0.02] border-b border-black/8">
                                <th
                                    class="px-4 py-3 text-left text-[11px] uppercase tracking-wide text-ink/40"
                                    >Tiket</th
                                >
                                <th
                                    class="px-4 py-3 text-left text-[11px] uppercase tracking-wide text-ink/40"
                                    >Pemohon</th
                                >
                                <th
                                    class="px-4 py-3 text-left text-[11px] uppercase tracking-wide text-ink/40"
                                    >Layanan</th
                                >
                                <th
                                    class="px-4 py-3 text-left text-[11px] uppercase tracking-wide text-ink/40"
                                    >Profil Responden</th
                                >
                                <th
                                    class="px-4 py-3 text-left text-[11px] uppercase tracking-wide text-ink/40"
                                    >Tanggal</th
                                >
                            </tr>
                        </thead>
                        <tbody>
                            {#each responses as item}
                                <tr class="border-b border-black/5">
                                    <td
                                        class="px-4 py-3 font-mono text-xs text-ink/70 whitespace-nowrap"
                                    >
                                        {item.permohonanId}
                                    </td>
                                    <td class="px-4 py-3">
                                        <p class="font-semibold text-ink">
                                            {item.applicantName}
                                        </p>
                                        <p class="text-xs text-ink/40">
                                            {item.applicantPhone}
                                        </p>
                                    </td>
                                    <td class="px-4 py-3 text-ink/70">
                                        {item.serviceTitle}
                                    </td>
                                    <td class="px-4 py-3 text-xs text-ink/55">
                                        <p>
                                            <span class="text-ink/35"
                                                >Pendidikan:</span
                                            >
                                            {labelPendidikan(
                                                item.pendidikanTerakhir,
                                            )}
                                        </p>
                                        <p>
                                            <span class="text-ink/35"
                                                >Usia:</span
                                            >
                                            {labelUsia(item.usia)}
                                        </p>
                                        <p>
                                            <span class="text-ink/35"
                                                >Pekerjaan:</span
                                            >
                                            {labelPekerjaan(
                                                item.jenisPekerjaan,
                                            )}
                                        </p>
                                        <p>
                                            <span class="text-ink/35"
                                                >Disabilitas:</span
                                            >
                                            {labelDisabilitas(
                                                item.disabilitas,
                                            )}
                                        </p>
                                    </td>
                                    <td
                                        class="px-4 py-3 text-xs text-ink/45 whitespace-nowrap"
                                    >
                                        {#if item.tanggalMenerimaLayanan}
                                            <p>
                                                <span class="text-ink/35"
                                                    >Menerima:</span
                                                >
                                                {item.tanggalMenerimaLayanan}
                                            </p>
                                        {/if}
                                        <p>
                                            <span class="text-ink/35"
                                                >Submit:</span
                                            >
                                            {formatDate(item.createdAt)}
                                        </p>
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>

                <div class="p-4 flex items-center justify-between gap-3">
                    <button
                        onclick={() =>
                            (responsePage = Math.max(1, responsePage - 1))}
                        disabled={responsePage <= 1}
                        class="px-3 py-2 border border-black/10 text-xs font-bold uppercase disabled:opacity-40"
                    >
                        Sebelumnya
                    </button>
                    <span class="text-xs text-ink/45">
                        Halaman {responsePagination.page} dari {responsePagination.totalPages}
                    </span>
                    <button
                        onclick={() =>
                            (responsePage = Math.min(
                                responsePagination.totalPages,
                                responsePage + 1,
                            ))}
                        disabled={responsePage >= responsePagination.totalPages}
                        class="px-3 py-2 border border-black/10 text-xs font-bold uppercase disabled:opacity-40"
                    >
                        Berikutnya
                    </button>
                </div>
            {/if}
        </section>
    {:else}
        <section class="bg-white border border-black/10 p-5">
            <div class="flex flex-wrap items-start justify-between gap-3 mb-5">
                <div>
                    <h2 class="font-bold uppercase text-ink">
                        Nilai Bulanan Per Tipe Survei
                    </h2>
                    <p class="text-xs text-ink/45 mt-1">
                        Rekap dihitung dari endpoint nilai jawaban per
                        pertanyaan selama 12 bulan terakhir.
                    </p>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                    <button
                        onclick={exportMonthlyToExcel}
                        disabled={
                            monthlyLoading || exportingMonthly || !monthlyItems.length
                        }
                        class="px-3 py-2 border border-black/10 text-xs font-bold uppercase disabled:opacity-50"
                    >
                        {exportingMonthly ? "Mengekspor..." : "Export Excel"}
                    </button>
                    <button
                        onclick={loadMonthly}
                        disabled={monthlyLoading}
                        class="px-3 py-2 bg-green text-white text-xs font-bold uppercase disabled:opacity-60"
                    >
                        {monthlyLoading ? "Memuat..." : "Refresh"}
                    </button>
                </div>
            </div>

            {#if monthlyError}
                <div class="py-12 text-center text-sm text-red-500">
                    {monthlyError}
                </div>
            {:else if monthlyLoading}
                <div class="py-12 text-center text-sm text-ink/40">
                    Memuat nilai bulanan...
                </div>
            {:else}
                <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
                    {#each monthlyByType as type}
                        <article class="border border-black/10 p-4">
                            <div class="flex items-start justify-between gap-3">
                                <div>
                                    <span
                                        class={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold ${type.tone}`}
                                    >
                                        {type.label}
                                    </span>
                                    <h3 class="font-bold text-ink mt-2">
                                        {type.title}
                                    </h3>
                                </div>
                                <span class="text-xs text-ink/35">
                                    {type.rows.reduce(
                                        (sum, row) => sum + row.responseCount,
                                        0,
                                    )}
                                    respons
                                </span>
                            </div>

                            {#if type.rows.length === 0}
                                <p class="py-8 text-sm text-ink/35">
                                    Belum ada respons.
                                </p>
                            {:else}
                                <div class="mt-4 overflow-x-auto">
                                    <table class="w-full text-sm">
                                        <thead>
                                            <tr class="border-b border-black/8">
                                                <th
                                                    class="py-2 text-left text-[11px] uppercase text-ink/40"
                                                    >Bulan</th
                                                >
                                                <th
                                                    class="py-2 text-right text-[11px] uppercase text-ink/40"
                                                    >Nilai</th
                                                >
                                                <th
                                                    class="py-2 text-right text-[11px] uppercase text-ink/40"
                                                    >Respons</th
                                                >
                                                <th
                                                    class="py-2 text-right text-[11px] uppercase text-ink/40"
                                                    >Jawaban</th
                                                >
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {#each type.rows as row}
                                                <tr
                                                    class="border-b border-black/5"
                                                >
                                                    <td
                                                        class="py-2 text-ink/70"
                                                    >
                                                        {row.month}
                                                    </td>
                                                    <td
                                                        class="py-2 text-right font-bold text-green"
                                                    >
                                                        {formatScore(row)}
                                                    </td>
                                                    <td
                                                        class="py-2 text-right font-mono text-xs text-ink/55"
                                                    >
                                                        {row.responseCount}
                                                    </td>
                                                    <td
                                                        class="py-2 text-right font-mono text-xs text-ink/55"
                                                    >
                                                        {row.answerCount}
                                                    </td>
                                                </tr>
                                            {/each}
                                        </tbody>
                                    </table>
                                </div>
                            {/if}
                        </article>
                    {/each}
                </div>
                <div class="mt-6">
                    <div
                        class="flex flex-wrap items-end justify-between gap-3 mb-3"
                    >
                        <div>
                            <h3 class="font-bold uppercase text-ink">
                                Nilai Per Pertanyaan
                            </h3>
                            <p class="text-xs text-ink/45 mt-1">
                                Pertanyaan bernilai paling rendah ditampilkan di
                                urutan atas sebagai bahan evaluasi layanan.
                            </p>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
                        {#each questionByType as type}
                            <article class="border border-black/10 p-4">
                                <div
                                    class="flex items-start justify-between gap-3"
                                >
                                    <div>
                                        <span
                                            class={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold ${type.tone}`}
                                        >
                                            {type.label}
                                        </span>
                                        <h4 class="font-bold text-ink mt-2">
                                            Evaluasi {type.label}
                                        </h4>
                                    </div>
                                    {#if type.rows[0]}
                                        <span
                                            class={`px-2.5 py-1 rounded-full text-[11px] font-bold ${scoreTone(type.rows[0])}`}
                                        >
                                            Terendah {formatScore(type.rows[0])}
                                        </span>
                                    {/if}
                                </div>

                                {#if type.rows.length === 0}
                                    <p class="py-8 text-sm text-ink/35">
                                        Belum ada nilai jawaban.
                                    </p>
                                {:else}
                                    <div class="mt-4 overflow-x-auto">
                                        <table class="w-full text-sm">
                                            <thead>
                                                <tr
                                                    class="border-b border-black/8"
                                                >
                                                    <th
                                                        class="py-2 text-left text-[11px] uppercase text-ink/40"
                                                        >Pertanyaan</th
                                                    >
                                                    <th
                                                        class="py-2 text-right text-[11px] uppercase text-ink/40"
                                                        >Nilai</th
                                                    >
                                                    <th
                                                        class="py-2 text-right text-[11px] uppercase text-ink/40"
                                                        >Jawaban</th
                                                    >
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {#each type.rows as row, index}
                                                    <tr
                                                        class="border-b border-black/5 align-top"
                                                    >
                                                        <td class="py-2 pr-3">
                                                            <p
                                                                class="text-ink/75 leading-snug"
                                                            >
                                                                {row.question}
                                                            </p>
                                                            {#if index === 0}
                                                                <span
                                                                    class="mt-1 inline-flex text-[11px] font-semibold text-red-600"
                                                                >
                                                                    Nilai
                                                                    terendah
                                                                </span>
                                                            {/if}
                                                        </td>
                                                        <td
                                                            class="py-2 text-right"
                                                        >
                                                            <span
                                                                class={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold ${scoreTone(row)}`}
                                                            >
                                                                {formatScore(
                                                                    row,
                                                                )}
                                                            </span>
                                                        </td>
                                                        <td
                                                            class="py-2 text-right font-mono text-xs text-ink/55"
                                                        >
                                                            {row.answerCount}
                                                        </td>
                                                    </tr>
                                                {/each}
                                            </tbody>
                                        </table>
                                    </div>
                                {/if}
                            </article>
                        {/each}
                    </div>
                </div>

                <div class="mt-6">
                    <h3 class="font-bold uppercase text-ink">
                        Kritik, Saran & Tingkat Kepercayaan
                    </h3>
                    <p class="text-xs text-ink/45 mt-1">
                        Kritik/saran dan skala kepercayaan (1-10) yang
                        diisi responden sebelum tahap profil.
                    </p>

                    {#if feedbackRows.length === 0}
                        <p class="py-8 text-sm text-ink/35">
                            Belum ada data.
                        </p>
                    {:else}
                        <div
                            class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4"
                        >
                            <div class="border border-black/10 p-4">
                                <p class="text-xs text-ink/45">
                                    Rata-rata Kepercayaan Pemerintah Pusat
                                </p>
                                <p class="text-2xl font-bold text-green mt-1">
                                    {formatSkala(kepercayaanAvg.pusat)}
                                    <span class="text-sm text-ink/40">/10</span>
                                </p>
                            </div>
                            <div class="border border-black/10 p-4">
                                <p class="text-xs text-ink/45">
                                    Rata-rata Kepercayaan Pemerintah Daerah
                                </p>
                                <p class="text-2xl font-bold text-green mt-1">
                                    {formatSkala(kepercayaanAvg.daerah)}
                                    <span class="text-sm text-ink/40">/10</span>
                                </p>
                            </div>
                        </div>

                        <div class="mt-4">
                            <p class="text-xs font-bold uppercase tracking-wide text-ink/40 mb-3">
                                Daftar Kritik & Saran (anonim)
                            </p>
                            {#if kritikSaranRows.length === 0}
                                <p class="text-sm text-ink/35">
                                    Belum ada kritik & saran.
                                </p>
                            {:else}
                                <ul class="space-y-2">
                                    {#each kritikSaranRows as teks}
                                        <li
                                            class="border border-black/8 bg-black/[0.02] px-4 py-3 text-sm text-ink/75"
                                        >
                                            {teks}
                                        </li>
                                    {/each}
                                </ul>
                            {/if}
                        </div>
                    {/if}
                </div>

                {#if monthlyUpdatedAt}
                    <p class="text-xs text-ink/35 mt-4">
                        Terakhir diperbarui pukul {monthlyUpdatedAt}.
                    </p>
                {/if}
            {/if}
        </section>
    {/if}
</div>
