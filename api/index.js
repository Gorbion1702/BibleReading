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
            return res.status(500).json({ error: error.message + " (Pastikan tabel 'sharings' sudah dibuat di Supabase SQL Editor)" });
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
            if (error.message.includes('row-level security policy')) {
                return res.status(403).json({ 
                    error: "Error RLS Supabase: Tabel 'sharings' memblokir insert. Buka Supabase Dashboard > SQL Editor, lalu jalankan: 'alter table sharings disable row level security;'" 
                });
            }
            return res.status(500).json({ error: error.message });
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
            return res.status(500).json({ error: error.message + " (Pastikan tabel 'prayers' sudah dibuat di Supabase SQL Editor)" });
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
            if (error.message.includes('row-level security policy')) {
                return res.status(403).json({ 
                    error: "Error RLS Supabase: Tabel 'prayers' memblokir insert. Buka Supabase Dashboard > SQL Editor, lalu jalankan: 'alter table prayers disable row level security;'" 
                });
            }
            return res.status(500).json({ error: error.message });
        }
        res.status(201).json(data[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Vercel Serverless Function membutuhkan aplikasi di-export
module.exports = app;

if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Node.js Backend berjalan di http://localhost:${PORT}`);
    });
}