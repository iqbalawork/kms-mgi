# MGI KPIs Management System - Frontend

Tampilan web PT Macme Global Indonesia KPIs Management System. Halaman statis (HTML, CSS, JS)
yang di-host di GitHub Pages dan memanggil backend Google Apps Script lewat REST (JSON).

Live: `https://iqbalawork.github.io/kms-mgi/`

## Berkas

| Berkas | Isi |
| :--- | :--- |
| `index.html` | Kerangka SPA: layar login, sidebar, top bar, semua halaman |
| `css/app.css` | Token desain dan komponen kustom |
| `js/tailwind.config.js` | Konfigurasi Tailwind (warna, spasi, bayangan) untuk Tailwind CDN |
| `js/config.js` | Hanya `GAS_URL`, URL `/exec` web app Apps Script |
| `js/core.js` | `gasRpc()`: fetch POST ke backend, batas waktu, pemetaan error |
| `js/logo.js` | Logo MGI (Base64) |
| `js/app.js` | Aplikasi klien (`MGI`) |
| `.nojekyll` | Supaya GitHub Pages menyajikan berkas apa adanya |

Tidak ada token, sandi, atau ID Sheet di folder ini. Sesi login disimpan di `localStorage`
browser sebagai token yang ditandatangani server.

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
