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
| `assets/favicon.png`, `assets/apple-touch-icon.png` | Lambang MGI resmi dari design system MGI untuk ikon tab browser dan ikon layar utama ponsel (latar putih) |
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
| `main.js` | Objek `MGI` dan start aplikasi |

## Performa

- **Layar pertama instan:** hasil `bootstrap` terakhir disimpan di `localStorage` (`mgi_kpi_boot`, maksimal 12 jam, hanya untuk sesi yang sama). Saat aplikasi dibuka, data itu tampil seketika, lalu diperbarui dari server. Bila data berubah dan pengguna belum menyentuh apa pun, tampilan dirender ulang. Bila sudah, muncul toast untuk reload. Peran yang berubah membuat halaman di-reload. Cache dihapus saat sign out atau sesi berganti.
- **Font ikon dipangkas:** Material Symbols hanya memuat ikon dan sumbu yang dipakai (sekitar 50 KB, sebelumnya 4 MB), dengan `display=block` supaya nama ikon tidak sempat tampil sebagai teks. Setelah memakai ikon baru, jalankan `node tools/icons.js .` lalu tempel URL font barunya ke `index.html`.
- **Chart.js `defer`:** tidak lagi menahan tampilan pertama.
- **Ilustrasi tanpa unduhan:** empty state, error muat, layar tanpa akses, dan panel login memakai SVG inline (sprite `<symbol id="art-...">` di awal `<body>`) dan pola CSS. Tidak ada gambar yang diunduh.
- **Tailwind statis:** `css/tailwind.css` dimuat setelah `css/app.css` (urutan cascade sama seperti CDN dulu). `node tools/build-css.js --check` memastikan berkasnya mutakhir, dan `verify.js` menolak kelas tema yang belum ikut dikompilasi.

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

Update berikutnya:

```bash
git add .
git commit -m "Deskripsi perubahan"
git push
```

Setelah push, buka situs dengan `Ctrl + Shift + R` supaya cache browser lama tidak terpakai.
