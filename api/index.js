const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const app = express();
app.use(express.json());

// Konfigurasi Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://srmaojepdzxmgeefzbsc.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_8ZRLF_VvsvQMjKcmspcrqQ_s88fHQYt';
const supabase = createClient(supabaseUrl, supabaseKey);

// --- PERUBAHAN UNTUK RENDER ---
// Meminta Express untuk melayani file statis (seperti CSS, gambar, JS frontend) dari folder root
app.use(express.static(path.join(__dirname, '../')));

// Route utama: Ketika orang membuka web Anda, tampilkan index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});
// ------------------------------

// Route GET: Mengambil semua daftar sharing dari Supabase
app.get('/api/sharing', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('sharings') 
            .select('*')
            .order('created_at', { ascending: false });
            
        if (error) {
            return res.status(500).json({ error: error.message });
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
            const fallbackRes = await supabase
                .from('sharings')
                .insert([{ text, user_name }])
                .select();
            data = fallbackRes.data;
            error = fallbackRes.error;
        }

        if (error) return res.status(500).json({ error: error.message });
        res.status(201).json(data[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Route PUT: Memperbarui sharing
app.put('/api/sharing/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { text, user_name, user_id } = req.body;
        
        const { data: existing, error: fetchErr } = await supabase
            .from('sharings')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchErr || !existing) return res.status(404).json({ error: "Sharing tidak ditemukan." });

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

        if (error) return res.status(500).json({ error: error.message });
        res.status(200).json(data[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Route DELETE: Menghapus sharing
app.delete('/api/sharing/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { user_name, user_id } = req.body;
        
        const { data: existing, error: fetchErr } = await supabase
            .from('sharings')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchErr || !existing) return res.status(404).json({ error: "Sharing tidak ditemukan." });

        if (existing.user_id && user_id && existing.user_id !== user_id) {
            return res.status(403).json({ error: "Anda tidak memiliki izin." });
        }
        if (!existing.user_id && existing.user_name && existing.user_name !== user_name) {
            return res.status(403).json({ error: "Anda tidak memiliki izin." });
        }

        const { error } = await supabase
            .from('sharings')
            .delete()
            .eq('id', id);

        if (error) return res.status(500).json({ error: error.message });
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
            
        if (error) return res.status(500).json({ error: error.message });

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

        if (error) return res.status(500).json({ error: error.message });
        res.status(201).json({ ...data[0], intercessors: [] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Route PUT: Memperbarui pokok doa
app.put('/api/prayers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { text, user_name, user_id } = req.body;
        
        const { data: existing, error: fetchErr } = await supabase
            .from('prayers')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchErr || !existing) return res.status(404).json({ error: "Pokok doa tidak ditemukan." });

        if (existing.user_id && user_id && existing.user_id !== user_id) {
            return res.status(403).json({ error: "Anda tidak memiliki izin." });
        }
        if (!existing.user_id && existing.user_name && existing.user_name !== user_name) {
            return res.status(403).json({ error: "Anda tidak memiliki izin." });
        }

        const { data, error } = await supabase
            .from('prayers')
            .update({ text })
            .eq('id', id)
            .select();

        if (error) return res.status(500).json({ error: error.message });
        res.status(200).json(data[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Route DELETE: Menghapus pokok doa
app.delete('/api/prayers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { user_name, user_id } = req.body;
        
        const { data: existing, error: fetchErr } = await supabase
            .from('prayers')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchErr || !existing) return res.status(404).json({ error: "Pokok doa tidak ditemukan." });

        if (existing.user_id && user_id && existing.user_id !== user_id) {
            return res.status(403).json({ error: "Anda tidak memiliki izin." });
        }
        if (!existing.user_id && existing.user_name && existing.user_name !== user_name) {
            return res.status(403).json({ error: "Anda tidak memiliki izin." });
        }

        const { error } = await supabase
            .from('prayers')
            .delete()
            .eq('id', id);

        if (error) return res.status(500).json({ error: error.message });
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Route POST: Toggle klik Berdoa
app.post('/api/prayers/:id/pray', async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id, user_name } = req.body;

        if (!user_id && !user_name) return res.status(400).json({ error: "Identitas user diperlukan." });

        let query = supabase.from('prayer_intercessors').select('*').eq('prayer_id', id);
        if (user_id) query = query.eq('user_id', user_id);
        else query = query.eq('user_name', user_name);

        const { data: existing, error: checkErr } = await query;
        if (checkErr) return res.status(500).json({ error: checkErr.message });

        if (existing && existing.length > 0) {
            const { error: delErr } = await supabase.from('prayer_intercessors').delete().eq('id', existing[0].id);
            if (delErr) return res.status(500).json({ error: delErr.message });
            return res.status(200).json({ prayed: false, message: "Dukungan doa dibatalkan." });
        } else {
            const insertObj = { prayer_id: id, user_name: user_name || 'User' };
            if (user_id) insertObj.user_id = user_id;

            const { error: insErr } = await supabase.from('prayer_intercessors').insert([insertObj]);
            if (insErr) return res.status(500).json({ error: insErr.message });
            return res.status(200).json({ prayed: true, message: "Terima kasih telah mendoakan." });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Export untuk Vercel (berjaga-jaga jika Anda pakai Vercel lagi nanti)
module.exports = app;

// Menjalankan Server secara Native (untuk Render / Localhost)
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Node.js Backend berjalan di port ${PORT}`);
    });
}