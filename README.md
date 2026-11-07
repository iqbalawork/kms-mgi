# MGI KPIs Management System - Frontend

Tampilan web PT Macme Global Indonesia KPIs Management System. Halaman statis (HTML, CSS, JS)
yang di-host di GitHub Pages dan memanggil backend Google Apps Script lewat REST (JSON).

Live: `https://iqbalawork.github.io/kms-mgi/`

## Berkas

| Berkas | Isi |
| :--- | :--- |
| `index.html` | Kerangka SPA: layar login, sidebar, top bar, semua halaman |
| `css/app.css` | Token design system MGI di `:root` (`--brand-red`, `--ink`, `--success`, `--focus-ring`, ...) dan komponen kustom yang memakai `var(--token)` |
| `js/tailwind.config.js` | Nilai token Tailwind dari design system MGI, termasuk palet `slate`, `emerald`, `red`, `amber`, `blue` yang dipetakan ke warna MGI |
| `assets/mgi-mark-white.png` | Lambang MGI versi putih untuk panel login gelap (dari aset design system) |
| `js/config.js` | Hanya `GAS_URL`, URL `/exec` web app Apps Script |
| `js/core.js` | `gasRpc()`: fetch POST ke backend, batas waktu, pemetaan error |
| `js/logo.js` | Logo MGI (Base64) |
| `js/state.js` ... `js/main.js` | Aplikasi klien, satu berkas per fitur (lihat di bawah) |
| `.nojekyll` | Supaya GitHub Pages menyajikan berkas apa adanya |

Tidak ada token, sandi, atau ID Sheet di folder ini. Sesi login disimpan di `localStorage`
browser sebagai token yang ditandatangani server.

## Design system MGI

Tampilan mengikuti design system MGI (artifact "MGI"): Fira Sans dan Fira Mono, merah `#8F2925`,
netral hangat, status yang lolos kontras 4,5:1, sudut kecil, garis lebih utama dari bayangan, tanpa
gradien, dan cincin fokus solid. Aturan saat mengubah tampilan:

- Pakai token, jangan hex baru: kelas Tailwind kustom (`text-text-muted`, `bg-status-success-subtle`, ...)
  atau `var(--token)` di `app.css`. Tes `verify.js` menolak hex slate lama dan gradien.
- Teks status memakai `text-status-*-text` atau `text-status-*`; keduanya lolos kontras.
- Warna grafik diambil dari `DASH_COLORS`, `FLAG_COLORS`, `GRADE_COLORS` di `js/state.js` dan `js/dashboard.js`.
- Pengecualian yang disengaja: bahasa Inggris dan format angka Inggris (aturan aplikasi internal di
  design system), ikon Material Symbols, bentuk chip bulat, dan tanda "-" untuk nilai kosong di tabel padat.

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
