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
        let insertData = { text, user_name };
        if (user_id) insertData.user_id = user_id;

        let { data, error } = await supabase
            .from('sharings')
            .insert([insertData])
            .select();
            
        if (error && error.message.includes('user_id')) {
            // Fallback jika kolom user_id belum ada di tabel Supabase
            const fallbackRes = await supabase
                .from('sharings')
                .insert([{ text, user_name }])
                .select();
            data = fallbackRes.data;
            error = fallbackRes.error;
        }

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

        // Validasi kepenulisan (writer check) fleksibel
        if (existing.user_id && user_id && existing.user_id !== user_id) {
            return res.status(403).json({ error: "Anda tidak memiliki izin untuk mengedit sharing ini." });
        }
        if (!existing.user_id && existing.user_name && existing.user_name !== user_name) {
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

        // Validasi kepenulisan (writer check) fleksibel
        if (existing.user_id && user_id && existing.user_id !== user_id) {
            return res.status(403).json({ error: "Anda tidak memiliki izin untuk menghapus sharing ini." });
        }
        if (!existing.user_id && existing.user_name && existing.user_name !== user_name) {
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
        const { data: prayers, error } = await supabase
            .from('prayers') 
            .select('*')
            .order('created_at', { ascending: false });
            
        if (error) {
            return res.status(500).json({ error: error.message + " (Pastikan tabel 'prayers' sudah dibuat di Supabase SQL Editor)" });
        }

        // Ambil data intercessors untuk semua doa
        const { data: intercessors, error: intErr } = await supabase
            .from('prayer_intercessors')
            .select('*');

        const prayersWithIntercessors = (prayers || []).map(prayer => {
            const pIntercessors = (intercessors || []).filter(i => String(i.prayer_id) === String(prayer.id));
            return {
                ...prayer,
                intercessors: pIntercessors
            };
        });

        res.status(200).json(prayersWithIntercessors);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Route POST: Menyimpan pokok doa baru
app.post('/api/prayers', async (req, res) => {
    try {
        const { text, user_name, user_id } = req.body;
        let insertData = { text, user_name };
        if (user_id) insertData.user_id = user_id;

        let { data, error } = await supabase
            .from('prayers')
            .insert([insertData])
            .select();
            
        if (error && error.message.includes('user_id')) {
            const fallbackRes = await supabase
                .from('prayers')
                .insert([{ text, user_name }])
                .select();
            data = fallbackRes.data;
            error = fallbackRes.error;
        }

        if (error) {
            if (error.message.includes('row-level security policy')) {
                return res.status(403).json({ 
                    error: "Error RLS Supabase: Tabel 'prayers' memblokir insert. Buka Supabase Dashboard > SQL Editor, lalu jalankan: 'alter table prayers disable row level security;'" 
                });
            }
            return res.status(500).json({ error: error.message });
        }
        res.status(201).json({ ...data[0], intercessors: [] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Route PUT: Memperbarui pokok doa (hanya oleh penulisnya)
app.put('/api/prayers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { text, user_name, user_id } = req.body;
        
        const { data: existing, error: fetchErr } = await supabase
            .from('prayers')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchErr || !existing) {
            return res.status(404).json({ error: "Pokok doa tidak ditemukan." });
        }

        if (existing.user_id && user_id && existing.user_id !== user_id) {
            return res.status(403).json({ error: "Anda tidak memiliki izin untuk mengedit pokok doa ini." });
        }
        if (!existing.user_id && existing.user_name && existing.user_name !== user_name) {
            return res.status(403).json({ error: "Anda tidak memiliki izin untuk mengedit pokok doa ini." });
        }

        const { data, error } = await supabase
            .from('prayers')
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

// Route DELETE: Menghapus pokok doa (hanya oleh penulisnya)
app.delete('/api/prayers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { user_name, user_id } = req.body;
        
        const { data: existing, error: fetchErr } = await supabase
            .from('prayers')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchErr || !existing) {
            return res.status(404).json({ error: "Pokok doa tidak ditemukan." });
        }

        if (existing.user_id && user_id && existing.user_id !== user_id) {
            return res.status(403).json({ error: "Anda tidak memiliki izin untuk menghapus pokok doa ini." });
        }
        if (!existing.user_id && existing.user_name && existing.user_name !== user_name) {
            return res.status(403).json({ error: "Anda tidak memiliki izin untuk menghapus pokok doa ini." });
        }

        const { error } = await supabase
            .from('prayers')
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

// Route POST: Toggle klik Berdoa pada suatu pokok doa (1 akun hanya 1 kali)
app.post('/api/prayers/:id/pray', async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id, user_name } = req.body;

        if (!user_id && !user_name) {
            return res.status(400).json({ error: "Identitas user diperlukan untuk berdoa." });
        }

        let query = supabase
            .from('prayer_intercessors')
            .select('*')
            .eq('prayer_id', id);

        if (user_id) {
            query = query.eq('user_id', user_id);
        } else {
            query = query.eq('user_name', user_name);
        }

        const { data: existing, error: checkErr } = await query;

        if (checkErr) {
            if (checkErr.message.includes('does not exist')) {
                return res.status(500).json({ error: "Tabel 'prayer_intercessors' belum dibuat di Supabase. Silakan jalankan SQL Setup di menu Profile." });
            }
            return res.status(500).json({ error: checkErr.message });
        }

        if (existing && existing.length > 0) {
            const { error: delErr } = await supabase
                .from('prayer_intercessors')
                .delete()
                .eq('id', existing[0].id);

            if (delErr) return res.status(500).json({ error: delErr.message });
            return res.status(200).json({ prayed: false, message: "Dukungan doa dibatalkan." });
        } else {
            const insertObj = { prayer_id: id, user_name: user_name || 'User' };
            if (user_id) insertObj.user_id = user_id;

            const { error: insErr } = await supabase
                .from('prayer_intercessors')
                .insert([insertObj]);

            if (insErr) {
                if (insErr.message.includes('row-level security policy')) {
                    return res.status(403).json({ error: "Error RLS Supabase pada tabel 'prayer_intercessors'." });
                }
                return res.status(500).json({ error: insErr.message });
            }
            return res.status(200).json({ prayed: true, message: "Terima kasih telah mendoakan." });
        }
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