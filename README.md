# MGI KPIs Management System - Frontend

Tampilan web PT Macme Global Indonesia KPIs Management System. Halaman statis (HTML, CSS, JS)
yang di-host di GitHub Pages dan memanggil backend Google Apps Script lewat REST (JSON).

Live: `https://iqbalawork.github.io/kms-mgi/`

## Berkas

| Berkas | Isi |
| :--- | :--- |
| `index.html` | Kerangka SPA: layar login, sidebar, top bar, semua halaman |
| `css/app.css` | Token desain dan komponen kustom |
| `tailwind.config.js` | Tema Tailwind (warna, spasi, bayangan). Sumber build, tidak dimuat browser |
| `css/tailwind.css` | Utilitas Tailwind hasil kompilasi (sekitar 9 KB gzip), menggantikan Tailwind Play CDN. Bangun ulang dengan `node tools/build-css.js` setiap menambah kelas Tailwind baru |
| `js/config.js` | Hanya `GAS_URL`, URL `/exec` web app Apps Script |
| `js/core.js` | `gasRpc()`: fetch POST ke backend, batas waktu, pemetaan error |
| `js/logo.js` | Logo MGI (Base64) |
| `js/state.js` ... `js/main.js` | Aplikasi klien, satu berkas per fitur (lihat di bawah) |
| `assets/favicon.png`, `assets/apple-touch-icon.png` | Favicon resmi dari grup aset Favicon di design system MGI: lambang berwarna di tile putih yang tidak transparan, agar tetap terbaca di tab browser gelap |
| `.nojekyll` | Supaya GitHub Pages menyajikan berkas apa adanya |

Tidak ada token, sandi, atau ID Sheet di folder ini. Sesi login disimpan di `localStorage`
browser sebagai token yang ditandatangani server.

## Berkas aplikasi per fitur

Dimuat berurutan oleh `index.html` setelah `config.js`, `core.js`, dan `logo.js`. Setiap berkas diawali
`'use strict';` dan berbagi ruang global, jadi nama fungsi harus unik. `main.js` selalu terakhir:
berisi `MGI` (fungsi yang dipanggil tombol di `index.html`) dan memulai aplikasi.

| Berkas | Fitur |
| :--- | :--- |
| `state.js` | State `S` dan konstanta |
| `util.js` | `api` (retry, prefetch), `esc`, `$`, format angka, toast |
| `auth.js` | Boot, login, ganti password, sign out |
| `access-year.js` | Peran, Report Access, tahun fiskal, Yearly Theme |
| `account-help.js` | Menu akun dan chat WhatsApp |
| `shell.js` | Scoring Guide, navigasi, sidebar |
| `dashboard.js` | Dashboard |
| `my-kpis.js`, `my-kpis-submit.js` | My KPIs dan submit |
| `mapping.js`, `mapping-workspace.js` | Mapping KPI |
| `kpi-health.js` | KPI Health |
| `master-kpis.js`, `master-kpis-edit.js` | Master KPIs |
| `summary.js`, `summary-periods.js`, `summary-table.js` | Summary Report dan Submission Periods |
| `annual.js` | Annual Recap |
| `perf-report.js`, `report-pdf.js` | Laporan per karyawan dan PDF-nya |
| `org-report.js`, `org-report-ui.js`, `org-report-annual.js` | Report perusahaan (bulanan dan tahunan) |
| `evaluation.js`, `evaluation-edit.js` | Performance Evaluation |
| `settings-performance.js`, `settings.js` | System Settings |
| `compare.js`, `compare-ui.js` | Tab Compare di Summary Report: perbandingan dua karyawan (analisis dan tampilan) |
| `main.js` | Objek `MGI` dan start aplikasi |

## Performa

- **Layar pertama instan:** hasil `bootstrap` terakhir disimpan di `localStorage` (`mgi_kpi_boot`, maksimal 12 jam, hanya untuk sesi yang sama). Saat aplikasi dibuka, data itu tampil seketika, lalu diperbarui dari server. Bila data berubah dan pengguna belum menyentuh apa pun, tampilan dirender ulang. Bila sudah, muncul toast untuk reload. Peran yang berubah membuat halaman di-reload. Cache dihapus saat sign out atau sesi berganti.
- **Font ikon dipangkas:** Material Symbols hanya memuat ikon dan sumbu yang dipakai (sekitar 50 KB, sebelumnya 4 MB), dengan `display=block` supaya nama ikon tidak sempat tampil sebagai teks. Setelah memakai ikon baru, jalankan `node tools/icons.js .` lalu tempel URL font barunya ke `index.html`.
- **Chart.js `defer`:** tidak lagi menahan tampilan pertama.
- **Ilustrasi tanpa unduhan:** empty state, error muat, layar tanpa akses, dan panel login memakai SVG inline (sprite `<symbol id="art-...">` di awal `<body>`) dan pola CSS. Tidak ada gambar yang diunduh.
- **Tailwind statis:** `css/tailwind.css` dimuat setelah `css/app.css` (urutan cascade sama seperti CDN dulu). `node tools/build-css.js --check` memastikan berkasnya mutakhir, dan `verify.js` menolak kelas tema yang belum ikut dikompilasi.

## KPI Health

Tab di Master KPIs (admin). Empat flag tetap: **Unrealistic**, **Easy**, **Healthy**, dan **Not enough data**. Definisinya diatur per tahun di **System Settings > KPI Health**:

- minimal submission dalam setahun sebelum KPI mendapat flag lain;
- Unrealistic: persen submission di tier 0.2 (atau 0.4 ke bawah);
- Easy: persen submission di tier 1.0 (atau 0.8 ke atas);
- Healthy: sisanya. Unrealistic diperiksa sebelum Easy.

Tombol **Edit definitions** di KPI Health membuka pengaturan untuk tahun yang sedang dilihat. Legend, keterangan kartu, dan judul kolom mengikuti definisi tahun itu.

## Compare (bandingkan dua karyawan)

Tab ke-3 di Summary Report, hanya untuk Admin dan Report Viewer.

**Cara memulai:**
- pilih A dan B dari daftar Annual Recap (role yang sama tampil paling atas);
- atau klik ikon compare pada baris Annual Recap;
- atau klik **Compare with...** di laporan karyawan.

**Periode:** Full year, Q1 sampai Q4, atau Custom. Bulan trial tidak dihitung.

**Mode:**
- **Same role:** semua analisis tersedia, termasuk KPI Deep Dive per KPI.
- **Different roles:** hanya ringkasan dan perbandingan per jenis KPI, karena target tiap role berbeda.

**Dasar perbandingan (head-to-head):** semua angka pembanding memakai bulan yang disubmit keduanya: selisih skor, Months Ahead, Trend, Tier mix, Points lost, dan Gap per KPI. Bulan yang hanya dimiliki salah satu orang disebut sebagai "Left out" dan tidak dihitung, agar satu bulan tambahan tidak memutarbalikkan hasil. Rata-rata dari bulan masing-masing tetap ditampilkan sebagai keterangan ("Own months"). Karena itu, jumlah Points lost sama dengan 100 dikurangi rata-rata head-to-head.

**Trend:** kemiringan garis lurus (regresi linear) melalui minimal 3 bulan, dalam poin per bulan. Satu bulan ekstrem tidak lagi membalik arah tren. Untuk KPI, tren dianggap stabil bila perubahan sepanjang periode kurang dari setengah `Multiplier`.

**Isi:**
- **Overview:** skor rata-rata, bulan unggul, tren, bulan yang belum disubmit, grafik dan tabel bulanan, tier mix, dan poin yang hilang per KPI.
- **KPI Deep Dive:** KPI disejajarkan per `KPI_ID` dan diurutkan dari selisih poin terbesar. Ada label "Same tier, different realization", yaitu dua orang di tier yang sama (di bawah 1.0) tetapi posisinya di dalam tier berbeda minimal setengah langkah `Multiplier`, beserta jarak ke tier berikutnya dalam unit KPI. Di tier 0.2 labelnya "Lowest tier" dan bar menunjukkan seberapa dekat realisasi ke batas tier 0.4.
- **Performance Evaluation:** skor, grade, dan selisih poin per komponen. Hanya muncul bila Evaluation sudah boleh dilihat oleh peran tersebut.

**Data:** semuanya dari `getAnnualRecap` dan `getPerformanceReport` yang sudah ada. Tidak ada endpoint baru, jadi scope dan aturan release tetap dijaga server.

## Tampilan HP

Di layar selebar 767px ke bawah (`PHONE_QUERY`), aplikasi hanya membuka **My KPIs**, **Scoring Guide**, dan **System Settings** (`PHONE_VIEWS`, Settings hanya untuk admin), beserta login, ganti password, menu akun, dan bantuan WhatsApp.

- Menu samping hanya berisi halaman-halaman itu. Setiap link diberi `data-phone`, dan satu grup disembunyikan hanya bila tidak ada link-nya yang bisa dibuka di HP. Top bar menampilkan nama halaman, chip FY, dan avatar.
- System Settings di HP:
  - Baris tab diganti tombol pemilih bagian (`#settings-picker`). Tombol ini membuka `#settings-tabs` sebagai daftar berkelompok, dan menutupnya saat bagian dipilih, saat Esc ditekan, atau saat layar diketuk di luar daftar.
  - Tombol pindah tahun fiskal tidak muncul, dan `openYearSwitch` menolak jalan di HP.
  - Report Access dan riwayat Yearly Theme tampil sebagai kartu, dan bar Grant access menempel di bawah top bar.
  - Semua modal menjadi bottom sheet.
  - Semua `.field` 16px agar Safari iOS tidak men-zoom halaman.
- Tablet (768 sampai 1023px) tetap memakai baris tab yang bisa digeser.
- Link ke halaman lain (misalnya `#/summary`) menampilkan kartu "Open on a computer" dengan tombol **Go to My KPIs**. Data halaman itu tidak dimuat. Bila layar melebar (HP diputar atau jendela dibesarkan), halaman aslinya langsung terbuka.
- Admin dan Report Viewer yang membuka aplikasi di HP mulai di My KPIs.
- Saat periode open dan role belum disubmit, bar bawah menampilkan jumlah KPI yang sudah terisi dan tombol **Submit** yang membawa ke formulir submit.
- Hak akses tetap dijaga server. Pembatasan ini hanya tampilan, dan backend tidak membedakan HP atau komputer.

## Aksesibilitas dan alur

- Setiap halaman punya link sendiri (`#/my-kpis`, `#/summary`, dan seterusnya). Back/Forward berpindah halaman dan refresh membuka halaman yang sama. Link ke halaman yang tidak boleh dibuka peran tersebut kembali ke halaman awal.
- Isian My KPIs yang belum dikirim tidak bisa hilang diam-diam. Pindah menu, ganti bulan, atau Back meminta konfirmasi, dan menutup tab memunculkan peringatan browser. Peringatan yang sama berlaku untuk Evaluation, Mapping, dan Categories yang belum disimpan.
- Remove pada Report Access meminta konfirmasi dulu.
- Navigasi keyboard:
  - menu sidebar berupa tombol;
  - tombol "Skip to content" muncul pada Tab pertama;
  - modal menahan Tab di dalamnya, menutup dengan Esc (bila klik di luar juga menutupnya), dan mengembalikan fokus;
  - kotak centang Report Access bisa dicentang dengan keyboard.
- Toast dibacakan pembaca layar, dan panel yang gagal dimuat menampilkan tombol Try again.

## Mengatur URL backend

Isi `js/config.js` dengan URL `/exec` dari **Deploy > Manage deployments** di Apps Script:

```javascript
const GAS_URL = 'https://script.google.com/macros/s/AKfycb.../exec';
```

Web app harus di-deploy dengan *Execute as* **Me** dan *Who has access* **Anyone**.

## Deploy ke GitHub Pages

Push pertama (dari folder ini):

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/iqbalawork/kms-mgi.git
git push -u origin main
```

Lalu di GitHub: **Settings > Pages > Build and deployment**, *Source* **Deploy from a branch**,
*Branch* **main** dan **/ (root)**, **Save**, centang **Enforce HTTPS**.

Update berikutnya (dari folder proyek induk, cap versi dulu, lalu push dari folder ini):

```bash
node tools/stamp-assets.js
git add .
git commit -m "Deskripsi perubahan"
git push
```

`stamp-assets.js` menambahkan `?v=<hash isi file>` ke setiap script dan CSS lokal di `index.html`. File yang berubah langsung diunduh ulang oleh browser, sehingga halaman baru tidak pernah memakai script lama dari cache. File yang tidak berubah tetap memakai cache.
