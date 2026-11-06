const request = require('supertest');

// Targetkan URL server lokal Anda yang sedang berjalan
const baseURL = 'http://localhost:8000';

describe('Pengujian Otomatis API FilmLog', () => {

    // Tes 1: Memastikan server merespons rute dasar
    test('Endpoint GET /api/test harus mengembalikan status HTTP 200 OK', async() => {
        const response = await request(baseURL).get('/api/test');
        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty('message');
    });

    // Tes 2: Memastikan rute film mengembalikan format data Array
    test('Endpoint GET /api/movies harus mengembalikan Array JSON', async() => {
        const response = await request(baseURL).get('/api/movies');
        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body)).toBeTruthy();
    });

});