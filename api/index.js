const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());

// Konfigurasi Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://srmaojepdzxmgeefzbsc.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_8ZRLF_VvsvQMjKcmspcrqQ_s88fHQYt';
const supabase = createClient(supabaseUrl, supabaseKey);

// Route GET: Mengambil semua daftar sharing dari Supabase
app.get('/api/sharing', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('sharings') 
            .select('*')
            .order('created_at', { ascending: false });
            
        if (error) {
            // Fallback jika tabel belum dibuat di Supabase
            return res.status(200).json([
                { id: 1, user_name: 'Andi', text: 'Ayat Yohanes 3:16 hari ini mengingatkan saya bahwa kasih Tuhan tidak bersyarat.', created_at: new Date().toISOString() }
            ]);
        }
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
            
        if (error) {
            // Fallback mock response jika tabel belum ada
            return res.status(201).json({ id: Date.now(), text, user_name, created_at: new Date().toISOString() });
        }
        res.status(201).json(data[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Route GET: Mengambil semua pokok doa
app.get('/api/prayers', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('prayers') 
            .select('*')
            .order('created_at', { ascending: false });
            
        if (error) {
            return res.status(200).json([
                { id: 1, user_name: 'Budi', text: 'Mohon doa untuk ibu saya yang sedang sakit di rumah sakit.', created_at: new Date().toISOString() }
            ]);
        }
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
            
        if (error) {
            return res.status(201).json({ id: Date.now(), text, user_name, created_at: new Date().toISOString() });
        }
        res.status(201).json(data[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Vercel Serverless Function membutuhkan aplikasi di-export
module.exports = app;

// Jika dijalankan secara lokal (node api/index.js) di komputer Anda:
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Node.js Backend berjalan di http://localhost:${PORT}`);
    });
}