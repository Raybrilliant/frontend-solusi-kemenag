<script lang="ts">
    import { onMount } from "svelte";
    import {
        toUploadProxyUrl,
        uploadFilenameFromUrl,
    } from "../../lib/upload-url";

    let {
        value = { time: Date.now(), blocks: [], version: "2.31.0" },
        onChange = () => {},
        placeholder = "Tulis isi berita di sini...",
        readOnly = false,
    } = $props();

    let holderId = `editor-${Math.random().toString(36).slice(2)}`;
    let loading = $state(true);
    let error = $state("");
    let editor: any = null;
    let activeUploadFilenames = new Set<string>();
    const pendingDeleteFilenames = new Set<string>();

    function collectEditorUploadFilenames(content: any): Set<string> {
        const filenames = new Set<string>();
        for (const block of content?.blocks ?? []) {
            if (block?.type !== "image") continue;
            const filename = uploadFilenameFromUrl(block?.data?.file?.url);
            if (filename) filenames.add(filename);
        }
        return filenames;
    }

    function diffRemovedUploads(before: Set<string>, after: Set<string>) {
        return [...before].filter((filename) => !after.has(filename));
    }

    async function cleanupRemovedUploads(filenames: string[]) {
        const unique = filenames.filter(
            (filename) =>
                filename &&
                !activeUploadFilenames.has(filename) &&
                !pendingDeleteFilenames.has(filename),
        );

        for (const filename of unique) pendingDeleteFilenames.add(filename);

        await Promise.allSettled(
            unique.map(async (filename) => {
                try {
                    await fetch(`/api/upload/${encodeURIComponent(filename)}`, {
                        method: "DELETE",
                    });
                } finally {
                    pendingDeleteFilenames.delete(filename);
                }
            }),
        );
    }

    function normalizeContent(content) {
        return (
            content ?? {
                time: Date.now(),
                blocks: [],
                version: "2.31.0",
            }
        );
    }

    async function initEditor() {
        loading = true;
        error = "";
        const initialContent = normalizeContent(value);
        activeUploadFilenames = collectEditorUploadFilenames(initialContent);

        try {
            const [
                { default: EditorJS },
                { default: Paragraph },
                { default: Header },
                { default: ImageTool },
                { default: List },
                { default: Checklist },
                { default: Quote },
                { default: Delimiter },
                { default: Table },
                { default: CodeTool },
                { default: InlineCode },
                { default: Marker },
                { default: Warning },
                { default: Embed },
            ] = await Promise.all([
                import("@editorjs/editorjs"),
                import("@editorjs/paragraph"),
                import("@editorjs/header"),
                import("@editorjs/image"),
                import("@editorjs/list"),
                import("@editorjs/checklist"),
                import("@editorjs/quote"),
                import("@editorjs/delimiter"),
                import("@editorjs/table"),
                import("@editorjs/code"),
                import("@editorjs/inline-code"),
                import("@editorjs/marker"),
                import("@editorjs/warning"),
                import("@editorjs/embed"),
            ]);

            editor = new EditorJS({
                holder: holderId,
                readOnly,
                autofocus: !readOnly,
                minHeight: 420,
                placeholder,
                inlineToolbar: ["bold", "italic", "marker", "link"],
                data: initialContent,
                tools: {
                    paragraph: {
                        class: Paragraph,
                        inlineToolbar: true,
                        config: {
                            preserveBlank: true,
                        },
                    },
                    header: {
                        class: Header,
                        inlineToolbar: ["bold", "italic", "marker", "link"],
                        config: {
                            placeholder: "Judul bagian",
                            levels: [2, 3, 4],
                            defaultLevel: 2,
                        },
                    },
                    image: {
                        class: ImageTool,
                        config: {
                            uploader: {
                                async uploadByFile(file: File) {
                                    const fd = new FormData();
                                    fd.append("file", file);

                                    const res = await fetch("/api/upload-dokumen", {
                                        method: "POST",
                                        body: fd,
                                    });
                                    const json = await res.json();

                                    if (!res.ok || json.success === false) {
                                        throw new Error(
                                            json.message ??
                                                "Gagal mengunggah gambar.",
                                        );
                                    }

                                    return {
                                        success: 1,
                                        file: {
                                            url: toUploadProxyUrl(
                                                json.data?.url,
                                                json.data?.nama ?? file.name,
                                            ),
                                            name: json.data?.nama ?? file.name,
                                        },
                                    };
                                },
                                async uploadByUrl(url: string) {
                                    return {
                                        success: 1,
                                        file: { url: toUploadProxyUrl(url) || url },
                                    };
                                },
                            },
                        },
                    },
                    list: {
                        class: List,
                        inlineToolbar: true,
                    },
                    checklist: {
                        class: Checklist,
                        inlineToolbar: true,
                    },
                    quote: {
                        class: Quote,
                        inlineToolbar: true,
                        config: {
                            quotePlaceholder: "Kutipan",
                            captionPlaceholder: "Sumber",
                        },
                    },
                    delimiter: Delimiter,
                    table: {
                        class: Table,
                        inlineToolbar: true,
                    },
                    code: CodeTool,
                    marker: Marker,
                    inlineCode: InlineCode,
                    warning: {
                        class: Warning,
                        inlineToolbar: true,
                    },
                    embed: {
                        class: Embed,
                        config: {
                            services: {
                                youtube: true,
                                instagram: true,
                                facebook: true,
                                x: true,
                            },
                        },
                    },
                },
                async onChange(api) {
                    const saved = await api.saver.save();
                    const nextUploadFilenames =
                        collectEditorUploadFilenames(saved);
                    const removedUploadFilenames = diffRemovedUploads(
                        activeUploadFilenames,
                        nextUploadFilenames,
                    );

                    activeUploadFilenames = nextUploadFilenames;
                    if (removedUploadFilenames.length > 0) {
                        cleanupRemovedUploads(removedUploadFilenames);
                    }

                    onChange(saved);
                },
            });

            await editor.isReady;
            loading = false;
        } catch (err) {
            error = err?.message ?? "Editor gagal dimuat.";
            loading = false;
        }
    }

    onMount(() => {
        initEditor();

        return () => {
            editor?.destroy();
        };
    });
</script>

<div class="editor-shell">
    <div id={holderId} class:invisible={loading || !!error}></div>

    {#if loading}
        <div class="editor-overlay flex items-center justify-center min-h-[420px]">
            <div
                class="w-8 h-8 border-2 border-green border-t-transparent rounded-full animate-spin"
            ></div>
        </div>
    {:else if error}
        <div
            class="editor-overlay min-h-[420px] rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700"
        >
            {error}
        </div>
    {/if}
</div>

<style>
    .editor-shell {
        position: relative;
        background: rgba(255, 255, 255, 0.88);
        border: 1px solid rgba(0, 0, 0, 0.08);
        border-radius: 20px;
        padding: 14px;
        min-height: 420px;
    }

    .editor-overlay {
        position: absolute;
        inset: 14px;
    }

    .editor-shell :global(.codex-editor) {
        padding-bottom: 0;
    }

    .editor-shell :global(.ce-toolbar__content),
    .editor-shell :global(.ce-block__content),
    .editor-shell :global(.ce-inline-toolbar),
    .editor-shell :global(.ce-conversion-toolbar) {
        max-width: 100%;
    }

    .editor-shell :global(.ce-block__content),
    .editor-shell :global(.ce-toolbar__content) {
        width: min(100%, 760px);
        margin-left: auto;
        margin-right: auto;
    }

    .editor-shell :global(.ce-paragraph),
    .editor-shell :global(.cdx-block) {
        color: rgba(18, 19, 17, 0.92);
    }

    .editor-shell :global(.ce-paragraph[data-placeholder]:empty::before) {
        color: rgba(18, 19, 17, 0.28);
        font-style: normal;
    }

    .editor-shell :global(.ce-header) {
        font-weight: 700;
        letter-spacing: 0;
        margin: 0.35rem 0;
    }

    .editor-shell :global(.ce-header[data-level="2"]) {
        font-size: 1.65rem;
        line-height: 1.2;
    }

    .editor-shell :global(.ce-header[data-level="3"]) {
        font-size: 1.25rem;
        line-height: 1.3;
    }

    .editor-shell :global(.ce-block--selected .ce-block__content) {
        background: rgba(15, 107, 68, 0.06);
    }

    .editor-shell :global(.ce-inline-toolbar),
    .editor-shell :global(.ce-conversion-toolbar),
    .editor-shell :global(.tc-popover),
    .editor-shell :global(.cdx-search-field),
    .editor-shell :global(.ce-popover) {
        border-radius: 14px;
    }

    .editor-shell :global(.ce-toolbar__plus),
    .editor-shell :global(.ce-toolbar__settings-btn),
    .editor-shell :global(.ce-inline-tool),
    .editor-shell :global(.ce-conversion-tool),
    .editor-shell :global(.ce-popover-item) {
        border-radius: 10px;
    }
</style>
