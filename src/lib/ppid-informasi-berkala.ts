export interface DokumenBerkala {
    id: string;
    judul: string;
    tahun?: number;
    periode?: string;
    format?: string;
    ukuran?: string;
    fileUrl?: string;
}

export interface TautanEksternal {
    label: string;
    href: string;
    desc: string;
}

export interface InformasiBerkalaItem {
    id: string;
    label: string;
    desc: string;
    icon: string;
    penjelasan: string;
    /** Tautan ke bagian terkait pada halaman PPID lain, mis. profil kantor */
    profilLink?: string;
    profilLinkLabel?: string;
    tautanEksternal?: TautanEksternal[];
    infoPublikasi?: string;
    dokumen: DokumenBerkala[];
}

export interface InformasiBerkalaGrup {
    id: string;
    label: string;
    desc: string;
    items: InformasiBerkalaItem[];
}

export const alamatKantor = {
    nama: "Kantor Kementerian Agama Kota Probolinggo",
    alamat: "Jl. Mastrip No 323, Kel. Kanigaran, Kec. Kanigaran, Kota Probolinggo, Jawa Timur 67213",
    whatsapp: "+62 878-3810-0425",
    whatsappUrl: "https://wa.me/6287838100425",
    email: "kotaprobolinggo@kemenag.go.id",
    jamLayanan: "Senin – Kamis 07.30 – 16.00 WIB, Jumat 07.00 – 16.30 WIB",
    mapsUrl:
        "https://www.google.com/maps/search/?api=1&query=Kantor+Kementerian+Agama+Kota+Probolinggo",
};

export const informasiBerkala: InformasiBerkalaGrup[] = [
    {
        id: "profil-kelembagaan",
        label: "Profil & Kelembagaan",
        desc: "Informasi dasar mengenai identitas, sejarah, dan kelembagaan Kantor Kementerian Agama Kota Probolinggo.",
        items: [
            {
                id: "alamat-kantor",
                label: "Alamat Kantor Lengkap",
                desc: "Alamat lengkap, kontak resmi, dan peta lokasi kantor.",
                icon: "mdi:map-marker-radius",
                penjelasan:
                    "Masyarakat dapat mengunjungi kantor secara langsung, menghubungi kontak resmi, atau menemukan lokasi melalui peta digital berikut.",
                dokumen: [],
            },
            {
                id: "visi-misi",
                label: "Visi dan Misi",
                desc: "Visi dan misi Kementerian Agama sebagai arah penyelenggaraan pelayanan keagamaan.",
                icon: "mdi:eye-outline",
                penjelasan:
                    "Visi Kementerian Agama: \"Terwujudnya Masyarakat yang Rukun, Maslahat, dan Cerdas Bersama Indonesia Maju Menuju Indonesia Emas 2045\". Visi tersebut dijabarkan ke dalam serangkaian misi yang menjadi dasar penyelenggaraan urusan agama di Kota Probolinggo.",
                profilLink: "/ppid/profil#visi-misi",
                profilLinkLabel: "Lihat Visi & Misi lengkap",
                dokumen: [],
            },
            {
                id: "tugas-fungsi",
                label: "Tugas dan Fungsi",
                desc: "Tugas pokok dan fungsi kantor beserta pejabat strukturalnya.",
                icon: "mdi:clipboard-text-outline",
                penjelasan:
                    "Kantor Kementerian Agama Kota Probolinggo melaksanakan urusan pemerintahan di bidang agama di wilayah Kota Probolinggo, meliputi bimbingan masyarakat beragama, pendidikan agama dan keagamaan (madrasah, diniyah, dan pesantren), pelayanan keagamaan (nikah, haji, dan umrah), ketahanan akidah, serta jaminan perlindungan umat beragama.",
                profilLink: "/ppid/profil#struktur-organisasi",
                profilLinkLabel:
                    "Lihat rincian tugas dan fungsi pejabat struktural",
                dokumen: [],
            },
            {
                id: "sejarah",
                label: "Sejarah",
                desc: "Sejarah dan latar belakang berdirinya kantor dari masa ke masa.",
                icon: "mdi:history",
                penjelasan:
                    "Berawal sebagai Departemen Agama Kota Madya Probolinggo yang masih menyatu dengan Departemen Agama Kabupaten Probolinggo, kantor mengalami pemekaran wilayah pada tahun 1981, berubah nama menjadi Kementerian Agama pada tahun 2010, hingga berlokasi di kantor sendiri di Jl. Mastrip No 323 yang diresmikan pada 6 Januari 1986.",
                profilLink: "/ppid/profil#sejarah",
                profilLinkLabel: "Baca sejarah lengkap & daftar Kepala Kantor",
                dokumen: [],
            },
            {
                id: "tujuan",
                label: "Tujuan",
                desc: "Tujuan penyelenggaraan urusan agama di Kota Probolinggo.",
                icon: "mdi:flag-variant-outline",
                penjelasan:
                    "Penyelenggaraan tugas dan fungsi diarahkan untuk mewujudkan masyarakat yang rukun melalui harmonisasi kerukunan umat beragama, maslahat melalui pelayanan keagamaan yang bermanfaat dan mudah diakses, serta cerdas melalui peningkatan mutu pendidikan agama dan keagamaan yang berkualitas.",
                dokumen: [],
            },
            {
                id: "struktur-organisasi",
                label: "Struktur Organisasi",
                desc: "Susunan pejabat struktural dan unit kerja di lingkungan kantor.",
                icon: "mdi:sitemap-outline",
                penjelasan:
                    "Struktur organisasi Kantor Kementerian Agama Kota Probolinggo terdiri atas Kepala Kantor, Kepala Sub Bagian Tata Usaha, Kepala Seksi Pendidikan Madrasah, Kepala Seksi Pendidikan Diniyah dan Pesantren, Kepala Seksi Bimbingan Masyarakat Beragama, serta Kepala Seksi Pelayanan Keagamaan.",
                profilLink: "/ppid/profil#struktur-organisasi",
                profilLinkLabel: "Lihat struktur organisasi & pejabat struktural",
                dokumen: [],
            },
        ],
    },
    {
        id: "perencanaan-anggaran",
        label: "Perencanaan & Penganggaran",
        desc: "Dokumen perencanaan dan penganggaran yang dipublikasikan secara berkala setiap tahun anggaran.",
        items: [
            {
                id: "rkt",
                label: "Rencana Kerja Tahunan",
                desc: "Rencana kegiatan dan anggaran untuk satu tahun anggaran.",
                icon: "mdi:calendar-text-outline",
                penjelasan:
                    "Rencana Kerja Tahunan (RKT) memuat rincian kegiatan dan anggaran satu tahun anggaran yang diturunkan dari Rencana Strategis Kementerian Agama.",
                infoPublikasi: "Dipublikasikan setiap awal tahun anggaran",
                dokumen: [],
            },
            {
                id: "renstra",
                label: "Rencana Strategis",
                desc: "Perencanaan strategis lima tahunan penyelenggaraan urusan agama.",
                icon: "mdi:chart-timeline-variant",
                penjelasan:
                    "Rencana Strategis (Renstra) memuat arah, prioritas, dan sasaran pembangunan di bidang agama untuk satu periode perencanaan lima tahun, sebagai acuan penyusunan Rencana Kerja Tahunan.",
                infoPublikasi:
                    "Dipublikasikan setiap awal periode perencanaan (5 tahunan)",
                dokumen: [],
            },
            {
                id: "perjanjian-kinerja",
                label: "Perjanjian Kinerja",
                desc: "Perjanjian kinerja antara pimpinan dengan unit kerja dan pejabat.",
                icon: "mdi:handshake-outline",
                penjelasan:
                    "Perjanjian Kinerja memuat target kinerja yang disepakati antara pimpinan dengan unit kerja dan pejabat sebagai dasar pelaksanaan, pengukuran, dan pertanggungjawaban kinerja setiap tahun.",
                infoPublikasi: "Dipublikasikan setiap awal tahun",
                dokumen: [],
            },
            {
                id: "dipa",
                label: "Daftar Isian Pelaksanaan Anggaran (DIPA)",
                desc: "Rincian anggaran kegiatan yang ditetapkan untuk satu tahun anggaran.",
                icon: "mdi:cash-multiple",
                penjelasan:
                    "DIPA memuat daftar isian pelaksanaan anggaran berupa rincian program, kegiatan, dan belanja yang ditetapkan sebagai dasar pelaksanaan anggaran dalam satu tahun.",
                infoPublikasi:
                    "Dipublikasikan setelah penetapan APBN oleh Presiden",
                dokumen: [],
            },
            {
                id: "realisasi-anggaran",
                label: "Informasi Realisasi atau Penggunaan/Serapan Anggaran",
                desc: "Informasi berkala capaian realisasi penggunaan anggaran.",
                icon: "mdi:chart-donut-variant",
                penjelasan:
                    "Informasi realisasi atau penggunaan/serapan anggaran disajikan secara berkala sebagai bentuk transparansi pengelolaan keuangan negara.",
                infoPublikasi: "Dipublikasikan setiap akhir triwulan/semester",
                dokumen: [],
            },
        ],
    },
    {
        id: "pelaporan-akuntabilitas",
        label: "Pelaporan & Akuntabilitas",
        desc: "Laporan wajib kinerja, keuangan, dan akuntabilitas penyelenggara negara.",
        items: [
            {
                id: "lhkpn",
                label: "Laporan Harta Kekayaan Penyelenggara Negara (LHKPN) Pejabat",
                desc: "Laporan harta kekayaan pejabat yang wajib dilaporkan kepada KPK.",
                icon: "mdi:shield-check-outline",
                penjelasan:
                    "Pejabat yang wajib melaporkan harta kekayaan menyampaikan LHKPN secara elektronik melalui sistem e-LHKPN KPK, dan laporan tersebut dapat diakses publik melalui portal resmi berikut.",
                tautanEksternal: [
                    {
                        label: "Portal e-LHKPN KPK",
                        href: "https://elhkpn.kpk.go.id",
                        desc: "Periksa LHKPN pejabat secara resmi melalui sistem e-LHKPN Komisi Pemberantasan Korupsi.",
                    },
                ],
                dokumen: [],
            },
            {
                id: "laporan-keuangan",
                label: "Laporan Keuangan",
                desc: "Laporan pertanggungjawaban keuangan setiap tahun anggaran.",
                icon: "mdi:finance",
                penjelasan:
                    "Laporan Keuangan memuat pertanggungjawaban pengelolaan keuangan negara yang disusun berdasarkan standar akuntansi pemerintahan.",
                infoPublikasi: "Dipublikasikan setiap akhir tahun anggaran",
                dokumen: [],
            },
            {
                id: "laporan-kinerja",
                label: "Laporan Kinerja",
                desc: "Laporan capaian kinerja unit kerja setiap tahun.",
                icon: "mdi:chart-box-outline",
                penjelasan:
                    "Laporan Kinerja memuat capaian kinerja program dan kegiatan yang diukur terhadap target pada Perjanjian Kinerja tahun berjalan.",
                infoPublikasi: "Dipublikasikan setiap akhir tahun",
                dokumen: [],
            },
            {
                id: "bmn",
                label: "Laporan Barang Milik Negara (BMN)",
                desc: "Laporan pengelolaan dan pertanggungjawaban barang milik negara.",
                icon: "mdi:package-variant-closed",
                penjelasan:
                    "Laporan Barang Milik Negara memuat data pengadaan, penggunaan, dan pertanggungjawaban aset milik negara yang dikelola kantor.",
                infoPublikasi: "Dipublikasikan setiap akhir tahun anggaran",
                dokumen: [],
            },
            {
                id: "span-lapor",
                label: "Laporan Pengaduan Masyarakat SPAN Lapor!",
                desc: "Kanal resmi pengaduan masyarakat Pemerintah Republik Indonesia.",
                icon: "mdi:bullhorn-variant-outline",
                penjelasan:
                    "Masyarakat dapat menyampaikan pengaduan terkait pelayanan publik melalui SPAN Lapor! (Sistem Pengelolaan dan Administrasi Aduan Masyarakat). Pengaduan yang masuk melalui kanal resmi akan diteruskan kepada unit kerja terkait untuk ditindaklanjuti dan dapat dipantau prosesnya oleh pelapor.",
                tautanEksternal: [
                    {
                        label: "SPAN Lapor! — lapor.go.id",
                        href: "https://www.lapor.go.id",
                        desc: "Kanal pengaduan masyarakat resmi Pemerintah Republik Indonesia.",
                    },
                ],
                dokumen: [],
            },
            {
                id: "spkp",
                label: "Laporan Hasil Survei Persepsi Kualitas Pelayanan Publik (SPKP)",
                desc: "Hasil survei persepsi masyarakat atas kualitas pelayanan publik.",
                icon: "mdi:star-half-full",
                penjelasan:
                    "SPKP mengukur persepsi masyarakat terhadap kualitas pelayanan publik yang diselenggarakan kantor. Hasil survei menjadi bahan evaluasi dan perbaikan berkelanjutan pelayanan.",
                infoPublikasi: "Dipublikasikan setiap akhir periode survei",
                dokumen: [],
            },
            {
                id: "pelanggaran-disiplin",
                label: "Jumlah Pelanggaran Disiplin yang Ditindaklanjuti/Diselesaikan",
                desc: "Rekapitulasi penanganan pelanggaran disiplin pegawai.",
                icon: "mdi:gavel",
                penjelasan:
                    "Rekapitulasi jumlah pelanggaran disiplin Pegawai Negeri Sipil yang ditindaklanjuti dan diselesaikan dipublikasikan secara berkala sebagai bagian dari transparansi pengelolaan sumber daya manusia.",
                infoPublikasi: "Dipublikasikan setiap semester/tahun",
                dokumen: [],
            },
        ],
    },
    {
        id: "layanan-publik",
        label: "Layanan & Keterbukaan Publik",
        desc: "Informasi layanan kepegawaian dan kanal resmi partisipasi masyarakat.",
        items: [
            {
                id: "rekrutmen-asn",
                label: "Informasi tentang Rekrutmen ASN Kementerian Agama",
                desc: "Informasi resmi seleksi CPNS dan PPPK Kementerian Agama.",
                icon: "mdi:account-plus-outline",
                penjelasan:
                    "Informasi seleksi Calon Aparatur Sipil Negara (CPNS) dan Pegawai Pemerintah dengan Perjanjian Kerja (PPPK) diumumkan hanya melalui kanal resmi berikut. Kementerian Agama tidak memungut biaya dalam bentuk apa pun dalam proses seleksi — waspadai penipuan yang mengatasnamakan panitia.",
                tautanEksternal: [
                    {
                        label: "Rekrutmen ASN — BKN",
                        href: "https://rekrutmen.bkn.go.id",
                        desc: "Portal resmi seleksi Calon ASN nasional yang dikelola Badan Kepegawaian Negara.",
                    },
                    {
                        label: "SSCASN — BKN",
                        href: "https://sscasn.bkn.go.id",
                        desc: "Sistem informasi seleksi Calon ASN (CPNS dan PPPK) untuk pendaftaran dan seleksi.",
                    },
                ],
                dokumen: [],
            },
        ],
    },
];
