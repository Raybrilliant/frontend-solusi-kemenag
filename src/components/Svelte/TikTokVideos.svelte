<script>
    import Icon from "@iconify/svelte";

    /**
     * @typedef {Object} TikTokVideo
     * @property {string} id
     * @property {string} url - Link asli TikTok (https://www.tiktok.com/@user/video/...)
     * @property {string} [src] - URL langsung video (diisi dari backend / link TikTok)
     * @property {string} [title]
     * @property {string} [username]
     * @property {string} [thumbnail]
     */

    /** @type {{ videos: TikTokVideo[], apiUrl?: string }} */
    let { videos = [], apiUrl = "" } = $props();

    const resolvedApiUrl = $derived(
        apiUrl ||
            (import.meta.env?.BACKEND_URL
                ? `${import.meta.env.BACKEND_URL.replace(/\/$/, "")}/api/v1/testimoni/`
                : ""),
    );

    let fetchedVideos = $state([]);
    let loading = $state(true);

    const hasPropVideos = $derived(videos.length > 0);

    const MAX_VIDEOS = 6;

    const sourceVideos = $derived(
        videos.length > 0
            ? videos.slice(0, MAX_VIDEOS)
            : fetchedVideos.slice(0, MAX_VIDEOS),
    );

    // Gandakan 3x untuk ilusi infinite scroll.
    const loopVideos = $derived([
        ...sourceVideos.map((v, i) => ({ ...v, _key: `${v.id}-a-${i}` })),
        ...sourceVideos.map((v, i) => ({ ...v, _key: `${v.id}-b-${i}` })),
        ...sourceVideos.map((v, i) => ({ ...v, _key: `${v.id}-c-${i}` })),
    ]);

    // Ambil dari prop jika ada; kalau tidak, fetch saat komponen visible.
    $effect(() => {
        if (hasPropVideos) {
            loading = false;
            return;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        fetch(resolvedApiUrl, { signal: controller.signal })
            .then((r) => {
                clearTimeout(timeoutId);
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            })
            .then((json) => {
                const list = json?.data ?? [];
                fetchedVideos = list.map((item) => ({
                    id: String(item.id ?? item._id ?? crypto.randomUUID()),
                    url: item.url,
                    title: item.title,
                    username: item.username,
                }));
            })
            .catch((err) => {
                console.warn("[TikTokVideos] Gagal memuat testimoni:", err);
            })
            .finally(() => {
                loading = false;
            });

        return () => {
            clearTimeout(timeoutId);
            controller.abort();
        };
    });

    let container = $state(null);
    let isDragging = $state(false);
    let startX = $state(0);
    let startScroll = $state(0);
    let velocity = $state(0);
    let lastX = $state(0);
    let rafId = $state(0);
    let activeVideoId = $state("");
    let initialScrollSet = $state(false);

    $effect(() => {
        // Mulai dari set tengah agar bisa scroll ke kiri maupun kanan.
        if (container && sourceVideos.length > 0 && !initialScrollSet) {
            const card = container.querySelector(".tt-card");
            if (card) {
                const gap = 16;
                const step = card.clientWidth + gap;
                container.scrollLeft = step * sourceVideos.length;
                initialScrollSet = true;
            }
        }
        return () => {
            cancelAnimationFrame(rafId);
        };
    });

    /** @param {HTMLIFrameElement} iframe */
    function getVideoIdFromIframe(iframe) {
        if (!iframe?.src) return "";
        const m = iframe.src.match(/\/embed\/v2\/(\d+)/);
        return m ? m[1] : "";
    }

    /** @param {HTMLIFrameElement} activeIframe */
    function pauseOtherVideos(activeIframe) {
        const activeId = getVideoIdFromIframe(activeIframe);
        activeVideoId = activeId;

        const iframes = container?.querySelectorAll(".tt-card iframe") ?? [];
        for (const iframe of iframes) {
            if (iframe !== activeIframe && iframe.contentWindow) {
                try {
                    // TikTok embed menerima pause tanpa videoId untuk semua instance.
                    iframe.contentWindow.postMessage(
                        JSON.stringify({
                            event: "pause",
                        }),
                        "*",
                    );
                    // Fallback: beberapa player membutuhkan event/command spesifik.
                    iframe.contentWindow.postMessage(
                        JSON.stringify({
                            type: "player:command",
                            command: "pause",
                        }),
                        "*",
                    );
                } catch {
                    // ignore cross-origin errors
                }
            }
        }
    }

    /** @param {HTMLIFrameElement} iframe */
    function playVideo(iframe) {
        if (!iframe?.contentWindow) return;
        try {
            iframe.contentWindow.postMessage(
                JSON.stringify({
                    event: "play",
                    data: { loop: true },
                }),
                "*",
            );
            iframe.contentWindow.postMessage(
                JSON.stringify({
                    type: "player:command",
                    command: "play",
                    loop: true,
                }),
                "*",
            );
            pauseOtherVideos(iframe);
        } catch {
            // ignore cross-origin errors
        }
    }

    /** @param {HTMLIFrameElement} iframe */
    function stopVideo(iframe) {
        if (!iframe?.contentWindow) return;
        try {
            iframe.contentWindow.postMessage(
                JSON.stringify({
                    event: "pause",
                }),
                "*",
            );
            iframe.contentWindow.postMessage(
                JSON.stringify({
                    type: "player:command",
                    command: "pause",
                }),
                "*",
            );
        } catch {
            // ignore cross-origin errors
        }
    }

    /** @param {HTMLIFrameElement} iframe */
    function setupTiktokIframe(iframe) {
        if (!iframe) return;

        let isDraggingCard = false;
        let dragStartX = 0;

        const card = iframe.closest(".tt-card");

        // Saat iframe selesai dimuat, inject script untuk handle auto-stop lainnya & loop.
        iframe.addEventListener("load", () => {
            try {
                // Coba berbagai format postMessage yang umum dipakai embed TikTok.
                iframe.contentWindow?.postMessage(
                    JSON.stringify({
                        event: "onload",
                        data: { loop: true, hideRecommendations: true },
                    }),
                    "*",
                );
                iframe.contentWindow?.postMessage(
                    JSON.stringify({
                        type: "onload",
                        data: { loop: true, hideRecommendations: true },
                    }),
                    "*",
                );
            } catch {
                // ignore
            }
        });

        if (card) {
            card.addEventListener("pointerdown", (e) => {
                isDraggingCard = false;
                dragStartX = e.clientX;
            });

            card.addEventListener("pointermove", (e) => {
                if (Math.abs(e.clientX - dragStartX) > 5) {
                    isDraggingCard = true;
                }
            });

            card.addEventListener("pointerup", (e) => {
                if (!isDraggingCard) {
                    // Hanya anggap sebagai klik jika tidak drag.
                    playVideo(iframe);
                }
                isDraggingCard = false;
            });

            card.addEventListener("click", () => playVideo(iframe));
        }
    }

    /** @param {PointerEvent} e */
    function onPointerDown(e) {
        if (!container) return;
        isDragging = true;
        startX = e.clientX;
        startScroll = container.scrollLeft;
        lastX = e.clientX;
        velocity = 0;
        cancelAnimationFrame(rafId);
        container.style.scrollSnapType = "none";
        try {
            container.setPointerCapture(e.pointerId);
        } catch {
            // ignore
        }
    }

    /** @param {PointerEvent} e */
    function onPointerMove(e) {
        if (!isDragging || !container) return;
        e.preventDefault();
        const x = e.clientX;
        const walk = (x - startX) * 1.3;
        container.scrollLeft = startScroll - walk;
        velocity = x - lastX;
        lastX = x;
    }

    /** @param {PointerEvent} e */
    function onPointerUp(e) {
        if (!container) return;
        isDragging = false;
        container.style.scrollSnapType = "";
        try {
            container.releasePointerCapture(e.pointerId);
        } catch {
            // ignore
        }
        applyInertia();
    }

    function applyInertia() {
        if (!container) return;
        const decay = () => {
            if (Math.abs(velocity) < 0.6) {
                velocity = 0;
                return;
            }
            container.scrollLeft -= velocity;
            velocity *= 0.92;
            rafId = requestAnimationFrame(decay);
        };
        decay();
    }

    function scrollByCard(direction) {
        if (!container) return;
        const card = container.querySelector(".tt-card");
        if (!card) return;
        const gap = 16;
        const step = card.clientWidth + gap;
        container.scrollTo({
            left: container.scrollLeft + direction * step,
            behavior: "smooth",
        });
    }

    /** @param {ScrollEvent} _e */
    function onScroll(_e) {
        if (!container || sourceVideos.length === 0) return;
        const card = container.querySelector(".tt-card");
        if (!card) return;
        const gap = 16;
        const step = card.clientWidth + gap;
        const setWidth = step * sourceVideos.length;
        const tolerance = step / 2;

        // Saat mendekati ujung kiri set pertama, lompat ke tengah.
        if (container.scrollLeft <= tolerance) {
            container.scrollLeft = setWidth + (container.scrollLeft % setWidth);
        }
        // Saat mendekati ujung kanan set terakhir, lompat ke tengah.
        if (container.scrollLeft >= setWidth * 2 - tolerance) {
            container.scrollLeft =
                setWidth + ((container.scrollLeft - setWidth * 2) % setWidth);
        }
    }

    /** @param {HTMLVideoElement} node */
    function autoPlayOnVisible(node) {
        if (!(node instanceof HTMLVideoElement)) return;
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        node.play().catch(() => {});
                    } else {
                        node.pause();
                    }
                });
            },
            { threshold: 0.6 },
        );
        observer.observe(node);
        return {
            destroy() {
                observer.disconnect();
            },
        };
    }

    function getTiktokEmbedUrl(url) {
        if (!url) return "";
        const m = url.match(/\/video\/(\d+)/);
        if (!m) return "";
        // TikTok embed v2 kadang tidak menampilkan video untuk beberapa akun/region.
        // Coba gunakan canonical embed URL yang lebih kompatibel.
        return `https://www.tiktok.com/embed/${m[1]}`;
    }

    /** @param {HTMLIFrameElement} node */
    function lazyIframe(node) {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && !node.src) {
                        node.src = node.dataset.src ?? "";
                        setupTiktokIframe(node);
                    }
                });
            },
            { rootMargin: "200px", threshold: 0.01 },
        );
        observer.observe(node);
        return {
            destroy() {
                observer.disconnect();
            },
        };
    }
</script>

{#if sourceVideos.length > 0}
    <section class="py-10 md:py-16">
        <div class="max-w-7xl mx-auto">
            <div class="flex items-center justify-between gap-4 mb-6">
                <h2
                    class="text-base md:text-xl font-semibold uppercase shrink-0"
                >
                    Testimoni Layanan Kami
                </h2>
                <div class="flex-1 h-0.5 bg-green hidden sm:block"></div>
                <div class="hidden sm:flex items-center gap-2">
                    <button
                        type="button"
                        aria-label="Video sebelumnya"
                        class="w-9 h-9 rounded-none border border-ink/15 bg-transparent hover:border-green hover:text-green text-ink flex items-center justify-center transition-all"
                        onclick={() => scrollByCard(-1)}
                    >
                        <Icon icon="mdi:chevron-left" width="22" />
                    </button>
                    <button
                        type="button"
                        aria-label="Video berikutnya"
                        class="w-9 h-9 rounded-none border border-ink/15 bg-transparent hover:border-green hover:text-green text-ink flex items-center justify-center transition-all"
                        onclick={() => scrollByCard(1)}
                    >
                        <Icon icon="mdi:chevron-right" width="22" />
                    </button>
                </div>
            </div>

            <div
                bind:this={container}
                class="tt-scroll flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4 cursor-grab active:cursor-grabbing select-none items-stretch"
                onpointerdown={onPointerDown}
                onpointermove={onPointerMove}
                onpointerup={onPointerUp}
                onpointerleave={onPointerUp}
                onscroll={onScroll}
                role="region"
                aria-label="Konten video TikTok"
            >
                {#each loopVideos as video, idx (video._key)}
                    <article
                        class="tt-card snap-start shrink-0 w-50 sm:w-60 md:w-70 flex flex-col"
                    >
                        <div
                            class="relative aspect-9/16 w-full rounded-none overflow-hidden bg-ink/5 border border-ink/10 shadow-sm"
                            style="min-height: 380px; max-height: 70vh;"
                        >
                            {#if getTiktokEmbedUrl(video.url)}
                                <iframe
                                    data-src={getTiktokEmbedUrl(video.url)}
                                    title={video.title ?? "Video TikTok"}
                                    class="w-full h-full"
                                    style="min-width: 100%; min-height: 100%;"
                                    frameborder="0"
                                    allowfullscreen
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                    loading="lazy"
                                    scrolling="no"
                                    use:lazyIframe
                                ></iframe>
                            {:else}
                                <div
                                    class="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-cream"
                                >
                                    <svg
                                        viewBox="0 0 24 24"
                                        width="40"
                                        height="40"
                                        fill="currentColor"
                                        class="text-ink/25"
                                        aria-hidden="true"
                                    >
                                        <path
                                            d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.95a8.28 8.28 0 0 0 4.84 1.55V7.05a4.85 4.85 0 0 1-1.07-.36z"
                                        ></path>
                                    </svg>
                                    <span
                                        class="text-xs text-ink/50 mt-2 font-medium"
                                    >
                                        TikTok
                                    </span>
                                    <span class="text-[10px] text-ink/35 mt-1"
                                        >Link tidak valid</span
                                    >
                                </div>
                            {/if}
                        </div>

                        <div class="mt-2.5 px-0.5">
                            <p
                                class="text-sm font-medium text-ink line-clamp-1"
                            >
                                {video.title ?? "Video TikTok"}
                            </p>
                            {#if video.username}
                                <p class="text-xs text-ink/50 mt-0.5">
                                    @{video.username}
                                </p>
                            {/if}
                        </div>
                    </article>
                {/each}
            </div>

            <p class="text-xs text-ink/40 mt-2 text-center sm:text-left">
                Geser ke kanan/kiri untuk melihat lebih banyak video.
            </p>
        </div>
    </section>
{/if}

<style>
    .tt-scroll {
        scrollbar-width: none; /* Firefox */
        -ms-overflow-style: none; /* IE 10+ */
    }
    .tt-scroll::-webkit-scrollbar {
        display: none; /* Chrome/Safari */
    }
</style>
