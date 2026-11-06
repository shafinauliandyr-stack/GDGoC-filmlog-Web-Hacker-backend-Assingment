CREATE DATABASE IF NOT EXISTS filmlog_db;
USE filmlog_db;

-- 1. Tabel Entitas Pengguna (Users)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Indexing untuk mempercepat pencarian data saat verifikasi login
    INDEX idx_users_email (email)
);

-- 2. Tabel Entitas Film (Movies) 
CREATE TABLE movies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    year INT,
    director VARCHAR(255),
    genres VARCHAR(255),
    synopsis TEXT,
    cast_members TEXT,
    rating DECIMAL(3, 1),
    poster_url VARCHAR(255),
    duration VARCHAR(50),
    INDEX idx_movies_title (title)
);

-- 3. Tabel Perantara Daftar Tontonan (Watchlists)
CREATE TABLE watchlists (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    movie_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_movie_watchlist (user_id, movie_id),
    INDEX idx_watchlists_user (user_id)
);

-- 4. Tabel Entitas Riwayat Tontonan & Ulasan (Reviews / Watched)
CREATE TABLE reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    movie_id INT NOT NULL,
    rating DECIMAL(2, 1) NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_movie_review (user_id, movie_id),
    INDEX idx_reviews_user (user_id)
);