require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { GoogleGenAI, Type } = require('@google/genai');
const ai = new GoogleGenAI({});

const app = express();
const PORT = process.env.PORT || 8000;

// 1. MIDDLEWARE
app.use(cors());
app.use(express.json());

// 2. KONEKSI KE DATABASE MYSQL
const db = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

db.getConnection()
    .then(conn => {
        console.log("✅ Berhasil terhubung ke database MySQL (filmlog_db)!");
        conn.release();
    })
    .catch(err => {
        console.error("❌ Gagal terhubung ke database:", err.message);
    });

app.get('/', (req, res) => {
    res.status(200).json({ status: "online", message: "Server FilmLog Backend Aktif!" });
});

// 3. DAFTAR RUTE API (ENDPOINTS)
app.get('/api/test', (req, res) => {
    res.status(200).json({ message: "API FilmLog siap menerima perintah!" });
});

// Endpoint 1: Mengambil semua daftar film
app.get('/api/movies', async(req, res) => {
    try {
        const { genre, search } = req.query;
        let query = 'SELECT * FROM movies WHERE 1=1';
        const params = [];

        if (genre) {
            query += ' AND genres LIKE ?';
            params.push(`%${genre}%`);
        }
        if (search) {
            query += ' AND (title LIKE ? OR director LIKE ? OR synopsis LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        const [rows] = await db.query(query, params);
        res.status(200).json(rows);
    } catch (error) {
        console.error("Gagal mengambil data film:", error);
        res.status(500).json({ status: 'error', message: 'Terjadi kesalahan internal server' });
    }
});

// Endpoint 2: Mengambil detail satu film berdasarkan ID
// Endpoint 2: Mengambil detail satu film berdasarkan ID beserta review semua user
app.get('/api/movies/:id', async(req, res) => {
    try {
        const movieId = req.params.id;
        const [rows] = await db.query('SELECT * FROM movies WHERE id = ?', [movieId]);

        if (rows.length === 0) {
            return res.status(404).json({ status: 'fail', message: 'Film tidak ditemukan' });
        }

        // Ambil semua review dari seluruh user untuk film ini
        const [reviews] = await db.query(`
            SELECT r.id, r.rating, r.review, u.username 
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            WHERE r.movie_id = ?
            ORDER BY r.id DESC
        `, [movieId]);

        const movieData = rows[0];
        movieData.reviews = reviews; // Sisipkan array reviews ke objek film

        res.status(200).json(movieData);
    } catch (error) {
        console.error("Gagal mengambil detail film:", error);
        res.status(500).json({ status: 'error', message: 'Terjadi kesalahan internal server' });
    }
});
// RUTE AUTENTIKASI (REGISTER & LOGIN)
// Endpoint 3: Registrasi Pengguna Baru
app.post('/api/auth/register', async(req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ status: 'fail', message: 'Semua kolom wajib diisi' });
        }

        const [existingUsers] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (existingUsers.length > 0) {
            return res.status(400).json({ status: 'fail', message: 'Email sudah terdaftar' });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const [result] = await db.query(
            'INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username, email, hashedPassword]
        );

        res.status(201).json({
            status: 'success',
            message: 'Registrasi berhasil',
            data: { id: result.insertId, username, email }
        });

    } catch (error) {
        console.error("Error Registrasi:", error);
        res.status(500).json({ status: 'error', message: 'Kesalahan server internal' });
    }
});

// Endpoint 4: Login Pengguna
app.post('/api/auth/login', async(req, res) => {
    try {
        const { email, password } = req.body;

        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(401).json({ status: 'fail', message: 'Email atau kata sandi salah' });
        }

        const user = users[0];

        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) {
            return res.status(401).json({ status: 'fail', message: 'Email atau kata sandi salah' });
        }

        const token = jwt.sign({ id: user.id, username: user.username },
            process.env.JWT_SECRET, { expiresIn: '24h' }
        );

        res.status(200).json({
            status: 'success',
            message: 'Login berhasil',
            token: token,
            user: { id: user.id, username: user.username, email: user.email }
        });

    } catch (error) {
        console.error("Error Login:", error);
        res.status(500).json({ status: 'error', message: 'Kesalahan server internal' });
    }
});
// MIDDLEWARE AUTENTIKASI JWT 
const authenticateJWT = (req, res, next) => {
    // Mengambil token dari header Authorization
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];

        jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
            if (err) {
                return res.status(403).json({ status: 'fail', message: 'Token tidak valid atau kedaluwarsa' });
            }
            req.user = user;
            next();
        });
    } else {
        res.status(401).json({ status: 'fail', message: 'Akses ditolak, token tidak ditemukan' });
    }
};
// RUTE WATCHLIST (MEMBUTUHKAN LOGIN)
// Endpoint 5: Menambahkan film ke Watchlist
// ------------------------------------------
// C. WATCHLIST (Mendukung /api/watchlist & /api/watchlists)
// ------------------------------------------

app.get(['/api/watchlist', '/api/watchlists'], authenticateJWT, async(req, res) => {
    try {
        const userId = req.user.id;
        const [rows] = await db.query(`
            SELECT w.id as watchlist_id, w.movie_id as movieId, w.status, m.* 
            FROM watchlists w 
            JOIN movies m ON w.movie_id = m.id 
            WHERE w.user_id = ?
        `, [userId]);

        // Mengirim array langsung agar kompatibel dengan frontend .map()
        res.status(200).json(rows);
    } catch (error) {
        console.error("Error Ambil Watchlist:", error);
        res.status(500).json({ status: 'error', message: 'Kesalahan internal server' });
    }
});

app.post(['/api/watchlist', '/api/watchlists'], authenticateJWT, async(req, res) => {
    try {
        const userId = req.user.id;
        const movieId = req.body.movieId || req.body.movie_id;
        const status = req.body.status || 'Plan to Watch';

        if (!movieId) {
            return res.status(400).json({ status: 'fail', message: 'movieId wajib diisi' });
        }

        const [existing] = await db.query(
            'SELECT * FROM watchlists WHERE user_id = ? AND movie_id = ?', [userId, movieId]
        );
        if (existing.length > 0) {
            return res.status(400).json({ status: 'fail', message: 'Film ini sudah ada di watchlist Anda' });
        }

        await db.query(
            'INSERT INTO watchlists (user_id, movie_id, status) VALUES (?, ?, ?)', [userId, movieId, status]
        );

        res.status(201).json({ status: 'success', message: 'Film berhasil ditambahkan ke watchlist' });
    } catch (error) {
        console.error("Error Tambah Watchlist:", error);
        res.status(500).json({ status: 'error', message: 'Kesalahan internal server' });
    }
});
app.delete(['/api/watchlist/:movieId', '/api/watchlists/:movieId'], authenticateJWT, async(req, res) => {
    try {
        const userId = req.user.id;
        const movieId = req.params.movieId;

        const [result] = await db.query(
            'DELETE FROM watchlists WHERE user_id = ? AND movie_id = ?', [userId, movieId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ status: 'fail', message: 'Film tidak ditemukan di watchlist Anda' });
        }

        res.status(200).json({ status: 'success', message: 'Film berhasil dihapus dari watchlist' });
    } catch (error) {
        console.error("Error Hapus Watchlist:", error);
        res.status(500).json({ status: 'error', message: 'Kesalahan internal server' });
    }
});
// ------------------------------------------
// D. WATCHED & REVIEW (Mendukung /api/watched)
// ------------------------------------------

app.get('/api/watched', authenticateJWT, async(req, res) => {
    try {
        // Mengambil review dari seluruh user beserta username-nya
        const [rows] = await db.query(`
            SELECT r.id as review_id, r.user_id, u.username, r.movie_id as movieId, r.rating, r.review, m.*
            FROM reviews r
            JOIN movies m ON r.movie_id = m.id
            JOIN users u ON r.user_id = u.id
            ORDER BY r.id DESC
        `);

        res.status(200).json(rows);
    } catch (error) {
        console.error("Error Ambil Watched:", error);
        res.status(500).json({ status: 'error', message: 'Kesalahan internal server' });
    }
});
app.post('/api/watched', authenticateJWT, async(req, res) => {
    try {
        const userId = req.user.id;
        const movieId = req.body.movieId || req.body.movie_id;
        const { rating, review } = req.body;

        if (!movieId || rating === undefined) {
            return res.status(400).json({ status: 'fail', message: 'movieId dan rating wajib diisi' });
        }

        await db.query(
            `INSERT INTO reviews (user_id, movie_id, rating, review) 
             VALUES (?, ?, ?, ?) 
             ON DUPLICATE KEY UPDATE rating = VALUES(rating), review = VALUES(review)`, [userId, movieId, Number(rating), review || '']
        );

        res.status(201).json({ status: 'success', message: 'Ulasan berhasil disimpan' });
    } catch (error) {
        console.error("Error Tambah Watched:", error);
        res.status(500).json({ status: 'error', message: 'Kesalahan internal server' });
    }
});
// Endpoint 7: Tanya Gemini AI untuk rekomendasi film (Dilengkapi Retry & Fallback Anti-503)
app.post(['/api/movies/recommend', '/api/movies/recommendations'], authenticateJWT, async(req, res) => {
    let movies = [];
    const { prompt } = req.body;

    try {
        if (!prompt) {
            return res.status(400).json({ status: 'fail', message: 'Pertanyaan (prompt) tidak boleh kosong' });
        }

        const [rows] = await db.query('SELECT id, title, year, director, genres, synopsis, rating FROM movies');
        movies = rows;

        const { GoogleGenAI, Type } = require('@google/genai');
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        const promptText = `Kamu adalah sistem pemberi rekomendasi film untuk platform FilmLog.
Berikut adalah daftar 20 film yang tersedia di database kami:
${JSON.stringify(movies)}

Preferensi pengguna: "${prompt}"

Tugasmu: Pilih SATU film yang paling cocok HANYA dari daftar di atas. Kembalikan respons dalam format JSON dengan atribut "movie_id" (integer) dan "reasoning" (penjelasan bahasa Indonesia).`;

        const candidateModels = ['gemini-3.8-flash', 'gemini-3.5-flash'];
        let response = null;
        let lastError = null;

        for (const modelName of candidateModels) {
            try {
                response = await ai.models.generateContent({
                    model: modelName,
                    contents: promptText,
                    config: {
                        responseMimeType: 'application/json',
                        responseSchema: {
                            type: Type.OBJECT,
                            properties: {
                                movie_id: { type: Type.INTEGER },
                                reasoning: { type: Type.STRING }
                            },
                            required: ['movie_id', 'reasoning']
                        }
                    }
                });
                if (response && response.text) break;
            } catch (err) {
                lastError = err;
                // Jika error karena 503 (High Demand), tunggu 1.5 detik sebelum mencoba model berikutnya
                if (err.status === 503) {
                    await new Promise(resolve => setTimeout(resolve, 1500));
                }
            }
        }

        if (!response || !response.text) {
            throw lastError || new Error('Semua model AI gagal merespons');
        }

        const resultJson = JSON.parse(response.text);

        return res.status(200).json({
            movie_id: resultJson.movie_id,
            reasoning: resultJson.reasoning
        });

    } catch (error) {
        console.warn("⚠️ Server Gemini sedang sibuk (503), menjalankan Local Smart Fallback:", error.message);

        // FALLBACK OTOMATIS: Jika server Google 503/Down, cari film yang paling cocok dari database lokal
        if (movies.length > 0 && prompt) {
            const keywords = prompt.toLowerCase().split(/\s+/);
            let bestMovie = movies[0];
            let maxScore = -1;

            for (const m of movies) {
                const textToMatch = `${m.title} ${m.genres} ${m.synopsis} ${m.director}`.toLowerCase();
                let score = 0;
                for (const word of keywords) {
                    if (word.length > 2 && textToMatch.includes(word)) score++;
                }
                if (score > maxScore) {
                    maxScore = score;
                    bestMovie = m;
                }
            }

            return res.status(200).json({
                movie_id: bestMovie.id,
                reasoning: `Berdasarkan preferensi Anda ("${prompt}"), film ${bestMovie.title} (${bestMovie.year}) karya ${bestMovie.director} sangat direkomendasikan karena memiliki keselarasan tema dan genre (${bestMovie.genres}) dengan cerita yang mendalam.`
            });
        }

        res.status(500).json({ status: 'error', message: 'Gagal memproses AI' });
    }
});
// 4. MENYALAKAN SERVER
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server backend menyala di port ${PORT}`);
});