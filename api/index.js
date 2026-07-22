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
        const { text, user_name, user_id } = req.body;
        const { data, error } = await supabase
            .from('sharings')
            .insert([{ text, user_name, user_id }])
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

// Route PUT: Memperbarui sharing (hanya oleh penulisnya)
app.put('/api/sharing/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { text, user_name, user_id } = req.body;
        
        const { data: existing, error: fetchErr } = await supabase
            .from('sharings')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchErr || !existing) {
            return res.status(404).json({ error: "Sharing tidak ditemukan." });
        }

        // Validasi kepenulisan (writer check)
        if (user_id && existing.user_id && existing.user_id !== user_id) {
            return res.status(403).json({ error: "Anda tidak memiliki izin untuk mengedit sharing ini." });
        }
        if (!user_id && existing.user_name !== user_name) {
            return res.status(403).json({ error: "Anda tidak memiliki izin untuk mengedit sharing ini." });
        }

        const { data, error } = await supabase
            .from('sharings')
            .update({ text })
            .eq('id', id)
            .select();

        if (error) {
            return res.status(500).json({ error: error.message });
        }
        res.status(200).json(data[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Route DELETE: Menghapus sharing (hanya oleh penulisnya)
app.delete('/api/sharing/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { user_name, user_id } = req.body;
        
        const { data: existing, error: fetchErr } = await supabase
            .from('sharings')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchErr || !existing) {
            return res.status(404).json({ error: "Sharing tidak ditemukan." });
        }

        // Validasi kepenulisan (writer check)
        if (user_id && existing.user_id && existing.user_id !== user_id) {
            return res.status(403).json({ error: "Anda tidak memiliki izin untuk menghapus sharing ini." });
        }
        if (!user_id && existing.user_name !== user_name) {
            return res.status(403).json({ error: "Anda tidak memiliki izin untuk menghapus sharing ini." });
        }

        const { error } = await supabase
            .from('sharings')
            .delete()
            .eq('id', id);

        if (error) {
            return res.status(500).json({ error: error.message });
        }
        res.status(200).json({ success: true });
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