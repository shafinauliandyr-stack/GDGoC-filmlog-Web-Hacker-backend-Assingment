# 🎬 FilmLog Backend API

Halo! Selamat datang di repositori backend **FilmLog**. 
Proyek ini merupakan RESTful API untuk platform pelacak film (Movie Watchlist & Review Platform) yang dibangun sebagai pemenuhan tugas *Hacker Backend* pada Open Recruitment Google Developer Groups on Campus (GDGoC) Universitas Gadjah Mada.

API ini melayani fitur autentikasi pengguna, eksplorasi film, manajemen *watchlist*, pencatatan ulasan (*watched history*), serta integrasi AI cerdas menggunakan Google Gemini untuk memberikan rekomendasi film berbasis data lokal.

---

## 🛠️ Teknologi yang Digunakan (Tech Stack)
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MySQL
- **Autentikasi:** JSON Web Token (JWT) & bcrypt
- **AI Integration:** Google Gen AI SDK (Gemini)
- **Pengujian Otomatis:** Jest & Supertest

---

## 📋 Prasyarat (Prerequisites)
Sebelum menjalankan proyek ini di komputer Anda, pastikan Anda telah menginstal:
1. **Node.js** (versi 18.x atau lebih baru).
2. **MySQL Server** (bisa menggunakan aplikasi seperti XAMPP atau Laragon).
3. Akun **Google Gemini API Key** (dapatkan secara gratis di [Google AI Studio](https://aistudio.google.com/)).

---

## 🚀 Panduan Instalasi dan Pengaturan (Setup Instructions)

Silakan ikuti langkah-langkah di bawah ini untuk menjalankan server FilmLog secara lokal:

### 1. Kloning Repositori
Clone repositori ini ke dalam mesin lokal Anda dan masuk ke direktori proyek:
```bash
git clone https://github.com/shafinauliandyr-stack/movie-watchlist-starter.git
cd movie-watchlist-starter
2. Instalasi Dependensi
Karena proyek ini menggunakan Node.js, Anda harus mengunduh semua library pendukung (seperti Express, MySQL2, dan Google Gen AI). Di dalam terminal, ketik:

Bash
npm install
3. Pengaturan Database (Migration & Seeding)
Aplikasi ini membutuhkan database MySQL untuk menyimpan daftar film dan pengguna.

Pastikan layanan MySQL di komputer Anda sudah menyala (contoh: aktifkan modul MySQL di aplikasi XAMPP).

Buka aplikasi manajemen database Anda (seperti phpMyAdmin di http://localhost/phpmyadmin).

Buat sebuah database baru dan beri nama filmlog_db.

Pilih menu Import, lalu unggah file data/seed.sql yang ada di dalam folder proyek ini. Ini akan otomatis membuat seluruh tabel yang dibutuhkan dan mengisi 20 data film awal.

4. Konfigurasi Variabel Lingkungan (.env)
Aplikasi butuh kredensial untuk bisa terhubung ke database dan sistem AI Google.

Buat sebuah file baru bernama .env di folder utama proyek (sejajar dengan file package.json).

Salin teks di bawah ini dan tempelkan ke dalam file .env tersebut:

Cuplikan kode
PORT=8000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=filmlog_db
JWT_SECRET=super_secret_JWT_key
GEMINI_API_KEY=your_API_key
5. Menjalankan Server
Setelah database dan file .env siap, Anda dapat menyalakan server dengan perintah berikut di terminal:

Bash
npm start
Jika berhasil, Anda akan melihat pesan bahwa server menyala.

6. Menjalankan Pengujian Otomatis (Automated Tests) - Opsional
Proyek ini dilengkapi dengan skrip pengujian otomatis (Unit/Integration Tests) menggunakan Jest dan Supertest.
Untuk mencobanya, pastikan server Anda dalam keadaan menyala, lalu buka jendela terminal baru dan jalankan perintah:

Bash
npm test