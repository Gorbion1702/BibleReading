const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');

// Inisialisasi Aplikasi Express
const app = express();
app.use(cors()); // Mengizinkan request dari frontend
app.use(express.json()); // Agar bisa membaca body request berupa JSON

// Inisialisasi Supabase menggunakan Environment Variables (Vercel)
// PENTING: Anda harus mengatur SUPABASE_URL dan SUPABASE_ANON_KEY di Dashboard Vercel Anda nanti
const supabaseUrl = process.env.SUPABASE_URL || 'GANTI_DENGAN_URL_ANDA';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'GANTI_DENGAN_KEY_ANDA';
const supabase = createClient(supabaseUrl, supabaseKey);

// Route GET: Mengambil semua daftar sharing dari Supabase
app.get('/api/sharing', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('sharings') // Pastikan Anda sudah membuat tabel 'sharings' di Supabase
            .select('*')
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Route POST: Menyimpan sharing baru ke Supabase
app.post('/api/sharing', async (req, res) => {
    try {
        const { text, user_name } = req.body;
        const { data, error } = await supabase
            .from('sharings')
            .insert([{ text, user_name }])
            .select();
            
        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Route GET: Mengambil semua pokok doa
app.get('/api/prayers', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('prayers') // Pastikan Anda sudah membuat tabel 'prayers' di Supabase
            .select('*')
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Route POST: Menyimpan pokok doa baru
app.post('/api/prayers', async (req, res) => {
    try {
        const { text, user_name } = req.body;
        const { data, error } = await supabase
            .from('prayers')
            .insert([{ text, user_name }])
            .select();
            
        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Vercel Serverless Function membutuhkan aplikasi di-export, bukan menggunakan app.listen
module.exports = app;

// Jika dijalankan secara lokal (node api/index.js) di komputer Anda:
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Node.js Backend berjalan di http://localhost:${PORT}`);
    });
}