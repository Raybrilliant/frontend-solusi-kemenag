export interface SopLangkah {
    judul: string;
    desc: string;
}

export interface SopItem {
    id: string;
    nomor: string;
    label: string;
    judul: string;
    desc: string;
    icon: string;
    penjelasan: string;
    waktu: string;
    output: string;
    dasar: string[];
    langkah: SopLangkah[];
}

export interface SopGrup {
    id: string;
    label: string;
    desc: string;
    items: SopItem[];
}

export const sopGroups: SopGrup[] = [
    {
        id: "sop-informasi-publik",
        label: "SOP Informasi Publik",
        desc: "Tujuh Standar Operasional Prosedur pengelolaan informasi publik yang wajib diselenggarakan oleh badan publik sesuai Undang-Undang Keterbukaan Informasi Publik.",
        items: [
            {
                id: "sop-permohonan-informasi",
                nomor: "01",
                label: "Permohonan Informasi",
                judul: "Standar Operasional Prosedur Pengelolaan Permohonan Informasi",
                desc: "Prosedur menerima, meregistrasi, memproses, dan menjawab permohonan informasi publik.",
                icon: "mdi:email-arrow-right-outline",
                penjelasan:
                    "SOP ini mengatur alur permohonan informasi publik dari saat permohonan diterima hingga informasi disampaikan kepada pemohon, sehingga setiap permohonan tercatat, terlacak, dan terjawab dalam jangka waktu yang ditentukan.",
                waktu: "Maksimal 10 hari kerja sejak permohonan diterima, dapat diperpanjang 7 hari kerja",
                output: "Jawaban tertulis disertai penyampaian informasi atau alasan penolakan",
                dasar: [
                    "UU No. 14 Tahun 2008 tentang Keterbukaan Informasi Publik",
                    "Permen PANRB No. 81 Tahun 2012",
                ],
                langkah: [
                    {
                        judul: "Penerimaan Permohonan",
                        desc: "Petugas PPID menerima permohonan melalui formulir daring, email, atau datang langsung ke kantor, kemudian mencatatnya dalam buku register permohonan informasi.",
                    },
                    {
                        judul: "Verifikasi Kelengkapan",
                        desc: "PPID memeriksa identitas pemohon, uraian informasi yang diminta, alamat/kontak, serta cara memperoleh salinan informasi.",
                    },
                    {
                        judul: "Penelaahan Ketersediaan",
                        desc: "PPID menelaah apakah informasi tersedia, sebagian tersedia, dikecualikan, atau bukan kewenangan badan publik yang bersangkutan.",
                    },
                    {
                        judul: "Penyusunan Jawaban",
                        desc: "PPID menyusun jawaban tertulis berupa pemberian informasi, pemberian alasan penolakan, atau pengalihan permohonan ke badan publik yang tepat.",
                    },
                    {
                        judul: "Pemberitahuan kepada Pemohon",
                        desc: "Jawaban disampaikan kepada pemohon paling lambat 10 hari kerja sejak permohonan diterima, atau pemberitahuan perpanjangan maksimal 7 hari kerja.",
                    },
                    {
                        judul: "Penyampaian Informasi",
                        desc: "Informasi disampaikan sesuai bentuk yang diminta (softcopy/hardcopy) melalui perpustakaan, ruang baca, sarana daring, atau dikirim langsung kepada pemohon.",
                    },
                ],
            },
            {
                id: "sop-keberatan-informasi",
                nomor: "02",
                label: "Keberatan Informasi",
                judul: "Standar Operasional Prosedur Pengelolaan Keberatan Atas Informasi",
                desc: "Prosedur penanganan keberatan pemohon atas jawaban permohonan informasi yang ditolak atau tidak dijawab.",
                icon: "mdi:comment-alert-outline",
                penjelasan:
                    "Pemohon berhak mengajukan keberatan tertulis apabila permohonan informasinya ditolak, dijawab tidak sebagaimana diminta, ditunda melebihi jangka waktu, atau tidak dijawab sama sekali. SOP ini mengatur alur penyelesaian keberatan tersebut.",
                waktu: "Diselesaikan paling lambat 3 x 24 jam sejak keberatan diterima",
                output: "Jawaban atas keberatan secara tertulis kepada pemohon",
                dasar: [
                    "UU No. 14 Tahun 2008 Pasal 30",
                    "Permen PANRB No. 81 Tahun 2012",
                ],
                langkah: [
                    {
                        judul: "Penerimaan Keberatan",
                        desc: "Petugas PPID menerima surat keberatan tertulis dari pemohon yang tidak puas atas jawaban permohonan informasi, lalu meregistrasinya.",
                    },
                    {
                        judul: "Penerusan ke PPID Atasan",
                        desc: "PPID meneruskan keberatan beserta berkas permohonan sebelumnya kepada pejabat yang berwenang menyelesaikan keberatan.",
                    },
                    {
                        judul: "Penelaahan Keberatan",
                        desc: "Pejabat penyelesai memeriksa alasan keberatan, dasar penolakan, dan kewajiban badan publik atas informasi yang dipersoalkan.",
                    },
                    {
                        judul: "Penyusunan Keputusan",
                        desc: "Dalam waktu paling lambat 3 x 24 jam, pejabat penyelesai menetapkan keputusan: mengabulkan sebagian/seluruh keberatan, atau menolak keberatan.",
                    },
                    {
                        judul: "Penyampaian Jawaban",
                        desc: "Keputusan atas keberatan disampaikan tertulis kepada pemohon beserta penjelasannya.",
                    },
                    {
                        judul: "Informasi Hak Lanjut",
                        desc: "Apabila pemohon masih tidak puas, ia dapat melanjutkan ke proses sengketa informasi melalui Komisi Informasi atau pengadilan.",
                    },
                ],
            },
            {
                id: "sop-sengketa-informasi",
                nomor: "03",
                label: "Sengketa Informasi",
                judul: "Standar Operasional Prosedur Penanganan Sengketa Informasi",
                desc: "Prosedur penyelesaian sengketa keterbukaan informasi melalui jalur non-litigasi dan litigasi.",
                icon: "mdi:gavel",
                penjelasan:
                    "Sengketa informasi timbul ketika terjadi perselisihan antara pemohon dan badan publik yang tidak terselesaikan melalui keberatan. SOP ini mengatur penanganannya melalui Komisi Informasi (non-litigasi) atau pengadilan (litigasi).",
                waktu: "Sesuai jadwal pemeriksaan Komisi Informasi / pengadilan",
                output: "Putusan Komisi Informasi atau putusan pengadilan yang dilaksanakan para pihak",
                dasar: [
                    "UU No. 14 Tahun 2008 Pasal 34-35",
                    "UU No. 37 Tahun 2008 tentang Komisi Informasi",
                ],
                langkah: [
                    {
                        judul: "Penerimaan Saluran Sengketa",
                        desc: "PPID menerima/mencatat pemberitahuan sengketa dari pemohon yang mengajukan keberatan ke Komisi Informasi atau pengadilan.",
                    },
                    {
                        judul: "Upaya Non-Litigasi",
                        desc: "Para pihak wajib terlebih dahulu menempuh upaya non-litigasi melalui mediasi dan konsiliasi yang difasilitasi Komisi Informasi.",
                    },
                    {
                        judul: "Pemeriksaan oleh Komisi Informasi",
                        desc: "Badan publik menghadap Komisi Informasi, menyampaikan bukti dan alasan penolakan informasi, serta mengikuti persidangan sesuai jadwal.",
                    },
                    {
                        judul: "Putusan Komisi Informasi",
                        desc: "Komisi Informasi mengeluarkan putusan yang mengikat kedua belah pihak mengenai pembukaan atau penolakan informasi yang disengketakan.",
                    },
                    {
                        judul: "Pelaksanaan Putusan",
                        desc: "PPID melaksanakan putusan: membuka dan menyampaikan informasi, atau meneguhkan penolakan sesuai amanat putusan.",
                    },
                    {
                        judul: "Jalur Litigasi",
                        desc: "Apabila putusan non-litigasi tidak diterima salah satu pihak, sengketa dilanjutkan ke pengadilan sesuai ketentuan perundang-undangan.",
                    },
                ],
            },
            {
                id: "sop-penetapan-dip",
                nomor: "04",
                label: "Penetapan & Pemutakhiran DIP",
                judul: "Standar Operasional Prosedur Penetapan dan Pemutakhiran DIP",
                desc: "Prosedur penyusunan, penetapan, publikasi, dan pemutakhiran Daftar Informasi Publik (DIP).",
                icon: "mdi:clipboard-list-outline",
                penjelasan:
                    "Daftar Informasi Publik (DIP) adalah panduan bagi pemohon untuk mengetahui informasi apa saja yang tersedia di badan publik. SOP ini memastikan DIP tersusun lengkap, ditetapkan resmi, dipublikasikan, dan selalu mutakhir.",
                waktu: "Dimutakhirkan minimal setiap 6 bulan sekali atau setiap ada perubahan",
                output: "DIP yang ditetapkan dan dipublikasikan melalui kanal resmi",
                dasar: [
                    "UU No. 14 Tahun 2008 Pasal 9",
                    "Permen PANRB No. 81 Tahun 2012",
                ],
                langkah: [
                    {
                        judul: "Inventarisasi Informasi",
                        desc: "Setiap unit kerja mengumpulkan daftar informasi yang dimiliki, dibentuk, atau dihasilkan dalam menjalankan fungsi dan kewenangannya.",
                    },
                    {
                        judul: "Klasifikasi Informasi",
                        desc: "Informasi diklasifikasikan menjadi informasi wajib diumumkan (berkala, serta merta, setiap saat) dan informasi yang dikecualikan.",
                    },
                    {
                        judul: "Penyusunan Draf DIP",
                        desc: "PPID menyusun draf Daftar Informasi Publik yang memuat ringkasan informasi, bentuk, dan ketersediaannya.",
                    },
                    {
                        judul: "Penetapan DIP",
                        desc: "Pimpinan Kantor Kementerian Agama Kota Probolinggo menetapkan DIP dengan tanda tangan electronic/tertulis beserta tanggal penetapan.",
                    },
                    {
                        judul: "Publikasi DIP",
                        desc: "DIP yang telah ditetapkan dipublikasikan melalui website, perpustakaan, ruang baca, atau media lain yang mudah diakses publik.",
                    },
                    {
                        judul: "Pemutakhiran Berkala",
                        desc: "PPID meninjau dan memutakhirkan DIP minimal setiap 6 bulan sekali atau setiap ada perubahan informasi, lalu memublikasikan ulang.",
                    },
                ],
            },
            {
                id: "sop-dokumentasi-informasi-dikecualikan",
                nomor: "05",
                label: "Dokumentasi Informasi Dikecualikan",
                judul: "Standar Operasional Prosedur Pendokumentasian Informasi Publik yang Dikecualikan",
                desc: "Prosedur pencatatan informasi publik yang dikecualikan beserta alasan dan dasar hukumnya.",
                icon: "mdi:lock-outline",
                penjelasan:
                    "Informasi yang dikecualikan tetap wajib didokumentasikan oleh badan publik. Dokumentasi ini menjadi dasar pengujian keterbukaan dan jaminan akuntabilitas bahwa pengecualian dilakukan atas dasar peraturan perundang-undangan.",
                waktu: "Dilakukan setiap ada informasi yang ditetapkan dikecualikan",
                output: "Daftar dokumen informasi terkecualian yang tercatat lengkap",
                dasar: [
                    "UU No. 14 Tahun 2008 Pasal 18",
                    "Permen PANRB No. 81 Tahun 2012",
                ],
                langkah: [
                    {
                        judul: "Identifikasi Informasi Dikecualikan",
                        desc: "Unit kerja mengidentifikasi informasi yang berstatus dikecualikan berdasarkan pengujian dan peraturan perundang-undangan.",
                    },
                    {
                        judul: "Pencatatan Metadata",
                        desc: "PPID mencatat identitas informasi: nomor registrasi, jenis informasi, periode, singkatan isi, alasan pengujian, dan dasar hukum pengecualian.",
                    },
                    {
                        judul: "Penetapan Batas Akses",
                        desc: "Dokumentasi memuat keterbatasan akses informasi serta pengecualian yang berlaku dan jangka waktunya.",
                    },
                    {
                        judul: "Penyimpanan Terpusat",
                        desc: "Daftar informasi dikecualikan disimpan secara terpusat dan aman oleh PPID serta dapat diajukan saat pengujian oleh Komisi Informasi.",
                    },
                    {
                        judul: "Pemutakhiran Status",
                        desc: "Bila dasar pengecualian telah berakhir atau diubah, status informasi dimutakhirkan dan dipindahkan ke kategori informasi publik.",
                    },
                ],
            },
            {
                id: "sop-pengujian-konsekuensi",
                nomor: "06",
                label: "Pengujian Konsekuensi",
                judul: "Standar Operasional Prosedur Pengujian Konsekuensi Informasi Publik yang Dikecualikan",
                desc: "Prosedur pengujian manfaat dan kerugian atas pembukaan informasi yang dikecualikan.",
                icon: "mdi:scale-balance",
                penjelasan:
                    "Pengujian konsekuensi dilakukan untuk menilai apakah pembukaan suatu informasi yang dikecualikan akan menimbulkan kerugian yang lebih besar dibandingkan manfaat keterbukaannya, sehingga keputusan pengecualian dapat dipertanggungjawabkan.",
                waktu: "Maksimal 10 hari kerja sejak pengujian diajukan",
                output: "Rekomendasi tim pengujian dan keputusan PPID atas status informasi",
                dasar: [
                    "UU No. 14 Tahun 2008 Pasal 17",
                    "Permen PANRB No. 81 Tahun 2012",
                ],
                langkah: [
                    {
                        judul: "Pengajuan Pengujian",
                        desc: "Pengujian dilakukan ketika ada permohonan atas informasi yang berstatus dikecualikan atau atas permintaan pemohon yang keberatannya ditolak.",
                    },
                    {
                        judul: "Pembentukan Tim Pengujian",
                        desc: "PPID membentuk tim pengujian konsekuensi yang beranggotakan unsur yang memahami substansi informasi dan hukum.",
                    },
                    {
                        judul: "Kajian Uji Konsekuensi",
                        desc: "Tim mengkaji konsekuensi pembukaan informasi: potensi kerugian (hak pribadi, rahasia jabatan, kepentingan strategis) dibandingkan manfaat keterbukaannya bagi publik.",
                    },
                    {
                        judul: "Rekomendasi Tim",
                        desc: "Tim menyusun rekomendasi: informasi tetap dikecualikan, dibuka sebagian, atau dibuka seluruhnya.",
                    },
                    {
                        judul: "Keputusan PPID",
                        desc: "PPID menetapkan keputusan akhir atas status informasi berdasarkan rekomendasi tim pengujian.",
                    },
                    {
                        judul: "Pemberitahuan kepada Pemohon",
                        desc: "Hasil pengujian dan keputusannya diberitahukan secara tertulis kepada pemohon informasi.",
                    },
                ],
            },
            {
                id: "sop-pengarsipan-dikecualikan",
                nomor: "07",
                label: "Pengarsipan Informasi Dikecualikan",
                judul: "Standar Operasional Prosedur Pendokumentasian Informasi yang Dikecualikan",
                desc: "Prosedur pengarsipan, penjagaan keamanan, dan pemutakhiran arsip informasi yang dikecualikan.",
                icon: "mdi:archive-outline",
                penjelasan:
                    "Berbeda dengan pencatatan metadata, SOP ini mengatur tata cara penyimpanan fisik dan digital dokumen informasi dikecualikan, penjaminan keamanannya, serta pengelolaannya sampai masa pengecualian berakhir.",
                waktu: "Berlangsung selama masa pengecualian informasi berlaku",
                output: "Arsip informasi dikecualikan yang aman, terkelola, dan mutakhir",
                dasar: [
                    "UU No. 14 Tahun 2008 Pasal 18",
                    "UU No. 43 Tahun 2009 tentang Kearsipan",
                ],
                langkah: [
                    {
                        judul: "Penerimaan Berkas ke Arsip",
                        desc: "Dokumen informasi yang telah ditetapkan dikecualikan diserahkan unit kerja kepada pengelola arsip untuk diproses.",
                    },
                    {
                        judul: "Penyusunan Arsip",
                        desc: "Dokumen disusun sesuai klasifikasi arsip, diberi kode dan label keterangan terkecualian (fisik maupun digital).",
                    },
                    {
                        judul: "Penjaminan Keamanan",
                        desc: "Arsip disimpan di ruang/basis data khusus dengan pembatasan akses hanya bagi pejabat yang berwenang.",
                    },
                    {
                        judul: "Layanan Akses Terbatas",
                        desc: "Pemanfaatan arsip hanya dapat dilakukan melalui izin tertulis pimpinan berdasarkan pengujian keterbukaan informasi.",
                    },
                    {
                        judul: "Pemutakhiran dan Alih Status",
                        desc: "Setiap akhir tahun pengecualian ditinjau; arsip yang telah tidak dikecualikan dialihkan statusnya menjadi informasi publik dan dapat diakses.",
                    },
                ],
            },
        ],
    },
    {
        id: "sop-layanan",
        label: "SOP Layanan",
        desc: "Standar Operasional Prosedur layanan informasi dan pengaduan yang diselenggarakan PPID Kantor Kementerian Agama Kota Probolinggo.",
        items: [
            {
                id: "sop-layanan-langsung",
                nomor: "L1",
                label: "Layanan Langsung (Loket PPID)",
                judul: "SOP Layanan Permohonan Informasi secara Langsung",
                desc: "Prosedur layanan permohonan informasi tatap muka di loket/kantor PPID.",
                icon: "mdi:desk",
                penjelasan:
                    "Masyarakat yang datang langsung ke kantor dilayani melalui loket PPID mulai dari sambut, pencatatan permohonan, hingga penyerahan jawaban atau informasi yang diminta.",
                waktu: "Layanan selesai pada hari yang sama untuk permohonan yang lengkap",
                output: "Tanda terima permohonan dan jawaban/penyampaian informasi",
                dasar: [
                    "UU No. 14 Tahun 2008 tentang Keterbukaan Informasi Publik",
                    "Jam layanan: Senin–Kamis 07.30–16.00 WIB, Jumat 07.00–16.30 WIB",
                ],
                langkah: [
                    {
                        judul: "Sambut Pemohon",
                        desc: "Petugas loket menyambut pemohon, menanyakan keperluan, dan menyiapkan formulir permohonan informasi bila diperlukan.",
                    },
                    {
                        judul: "Pengisian Formulir",
                        desc: "Pemohon mengisi formulir permohonan: identitas, uraian informasi, alasan, dan bentuk informasi yang diinginkan.",
                    },
                    {
                        judul: "Registrasi Permohonan",
                        desc: "Petugas memeriksa kelengkapan, mencatat dalam register, dan memberikan tanda terima kepada pemohon.",
                    },
                    {
                        judul: "Pemrosesan",
                        desc: "PPID memproses permohonan sesuai SOP Pengelolaan Permohonan Informasi.",
                    },
                    {
                        judul: "Penyerahan Jawaban",
                        desc: "Jawaban/informasi diambil di loket atau dikirim sesuai pilihan pemohon dengan menunjukkan tanda terima.",
                    },
                ],
            },
            {
                id: "sop-layanan-daring",
                nomor: "L2",
                label: "Layanan Daring (Website/Email/WA)",
                judul: "SOP Layanan Permohonan Informasi secara Daring",
                desc: "Prosedur layanan permohonan informasi melalui website, email, dan WhatsApp resmi.",
                icon: "mdi:web",
                penjelasan:
                    "Permohonan informasi dapat diajukan tanpa datang ke kantor melalui formulir daring di website, email resmi PPID, maupun WhatsApp resmi kantor, dan diproses dengan standar waktu yang sama dengan layanan langsung.",
                waktu: "Tanda terima maksimal 1 hari kerja, jawaban maksimal 10 hari kerja",
                output: "Surat/e-mail pemberitahuan dan penyampaian informasi secara elektronik",
                dasar: [
                    "UU No. 14 Tahun 2008 tentang Keterbukaan Informasi Publik",
                    "Kanal resmi: website, kotaprobolinggo@kemenag.go.id, WhatsApp +62 878-3810-0425",
                ],
                langkah: [
                    {
                        judul: "Penerimaan Permohonan",
                        desc: "Permohonan yang masuk melalui formulir daring, email, atau WhatsApp diperiksa keabsahan kanalnya oleh petugas.",
                    },
                    {
                        judul: "Verifikasi & Konfirmasi",
                        desc: "Petugas memverifikasi identitas dan kelengkapan permohonan; bila perlu menghubungi pemohon untuk klarifikasi.",
                    },
                    {
                        judul: "Registrasi & Tanda Terima",
                        desc: "Permohonan dicatat dalam register daring dan pemohon menerima tanda terima/konfirmasi penerimaan.",
                    },
                    {
                        judul: "Pemrosesan",
                        desc: "PPID memproses permohonan sesuai SOP Pengelolaan Permohonan Informasi.",
                    },
                    {
                        judul: "Penyampaian Jawaban",
                        desc: "Jawaban dan informasi disampaikan melalui email/WhatsApp/unduhan daring sesuai permintaan pemohon.",
                    },
                ],
            },
            {
                id: "sop-layanan-pengaduan",
                nomor: "L3",
                label: "Layanan Pengaduan (SPAN Lapor!)",
                judul: "SOP Layanan Pengaduan Masyarakat (SPAN Lapor!)",
                desc: "Prosedur penerimaan dan penindaklanjutan pengaduan masyarakat melalui kanal SPAN Lapor!.",
                icon: "mdi:bullhorn-outline",
                penjelasan:
                    "Pengaduan masyarakat atas pelayanan di lingkungan Kemenag Kota Probolinggo diterima melalui sistem SPAN Lapor! (Sistem Pengelolaan Aduan dan Layanan Non-Daring) dan ditindaklanjuti sesuai jenjang kewenangan.",
                waktu: "Tindak lanjut awal maksimal 3 hari kerja sejak pengaduan diterima",
                output: "Balasan/klarifikasi pengaduan melalui kanal yang sama dengan pengaduannya",
                dasar: [
                    "Permen PANRB No. 17 Tahun 2020 tentang Perubahan Kedua atas Permen PANRB No. 1 Tahun 2018",
                    "Kanal: https://www.lapor.go.id",
                ],
                langkah: [
                    {
                        judul: "Penerimaan Pengaduan",
                        desc: "Pengaduan yang masuk melalui SPAN Lapor! diteruskan sistem ke petugas pengelola aduan di unit yang dituju.",
                    },
                    {
                        judul: "Registrasi & Verifikasi",
                        desc: "Petugas memeriksa kelengkapan identitas pengadu dan substansi pengaduan; aduan yang tidak lengkap dikembalikan dengan permintaan perbaikan.",
                    },
                    {
                        judul: "Penindaklanjutan",
                        desc: "Aduan diteruskan ke unit kerja terkait untuk diperiksa dan ditindaklanjuti sesuai kewenangan.",
                    },
                    {
                        judul: "Penyusunan Balasan",
                        desc: "Unit kerja menyusun jawaban/klarifikasi atas hasil penindaklanjutan aduan.",
                    },
                    {
                        judul: "Pengiriman Balasan",
                        desc: "Balasan dikirim melalui SPAN Lapor! dan dapat dipantau statusnya oleh pengadu.",
                    },
                ],
            },
        ],
    },
];
