const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

// Inisialisasi Supabase
const supabase = createClient(
    'https://srmaojepdzxmgeefzbsc.supabase.co',
    'sb_publishable_8ZRLF_VvsvQMjKcmspcrqQ_s88fHQYt'
);

// =========================================================
// 1. ENDPOINT FEELINGS (Check-in Emosi)
// =========================================================
app.get('/api/feelings', async (req, res) => {
    try {
        // Hanya ambil data hari ini
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const { data, error } = await supabase
            .from('feelings')
            .select('*')
            .gte('created_at', startOfDay.toISOString())
            .order('created_at', { ascending: false });
            
        if (error) return res.status(500).json({ error: error.message });
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/feelings', async (req, res) => {
    try {
        const { user_id, user_name, feeling, emoji, reason } = req.body;
        
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        // Cek apakah user sudah posting hari ini
        let existingQuery = supabase.from('feelings').select('*').gte('created_at', startOfDay.toISOString());
        if (user_id) {
            existingQuery = existingQuery.eq('user_id', user_id);
        } else {
            existingQuery = existingQuery.eq('user_name', user_name);
        }
        
        const { data: existingData } = await existingQuery.limit(1);

        let result;
        // Jika sudah ada postingan hari ini -> UPDATE (Replace)
        if (existingData && existingData.length > 0) {
            result = await supabase.from('feelings')
                .update({ feeling, emoji, reason, created_at: new Date().toISOString() })
                .eq('id', existingData[0].id);
        } 
        // Jika belum ada -> INSERT (Buat Baru)
        else {
            result = await supabase.from('feelings')
                .insert([{ user_id, user_name, feeling, emoji, reason }]);
        }

        if (result.error) return res.status(500).json({ error: result.error.message });
        res.status(201).json({ message: "Feeling saved!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// =========================================================
// 2. ENDPOINT SHARING (Komunitas & Jurnal)
// =========================================================
app.get('/api/sharing', async (req, res) => {
    try {
        const { today, user_id } = req.query;
        let query = supabase.from('sharings').select('*').order('created_at', { ascending: false });

        // Jika diminta data hari ini saja (untuk halaman Devotion)
        if (today === 'true') {
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            query = query.gte('created_at', startOfDay.toISOString());
        }

        // Jika diminta berdasarkan user (untuk riwayat di halaman Profile)
        if (user_id) {
            query = query.eq('user_id', user_id);
        }

        const { data, error } = await query;
            
        if (error) return res.status(500).json({ error: error.message });
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/sharing', async (req, res) => {
    try {
        const { text, user_name, user_id } = req.body;
        const { data, error } = await supabase.from('sharings').insert([
            { text, user_name, user_id }
        ]);
        if (error) return res.status(500).json({ error: error.message });
        res.status(201).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// =========================================================
// 3. ENDPOINT PRAYERS (Ruang Doa)
// =========================================================
app.get('/api/prayers', async (req, res) => {
    try {
        const { data, error } = await supabase.from('prayers').select('*').order('created_at', { ascending: false });
        if (error) return res.status(500).json({ error: error.message });
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/prayers', async (req, res) => {
    try {
        const { text, user_name, user_id } = req.body;
        const { data, error } = await supabase.from('prayers').insert([
            { text, user_name, user_id, intercessors: [] }
        ]);
        if (error) return res.status(500).json({ error: error.message });
        res.status(201).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/prayers/:id/pray', async (req, res) => {
    try {
        const prayerId = req.params.id;
        const { user_id, user_name } = req.body;
        
        const { data: prayer, error: fetchError } = await supabase.from('prayers').select('intercessors').eq('id', prayerId).single();
        if (fetchError) return res.status(500).json({ error: fetchError.message });

        let intercessors = prayer.intercessors || [];
        const hasPrayed = intercessors.some(i => i.user_id === user_id || (user_name && i.user_name === user_name));

        if (!hasPrayed) {
            intercessors.push({
                user_id: user_id || null,
                user_name: user_name || 'Anonymous',
                timestamp: new Date().toISOString()
            });
            const { error: updateError } = await supabase.from('prayers').update({ intercessors }).eq('id', prayerId);
            if (updateError) return res.status(500).json({ error: updateError.message });
        }

        res.status(200).json({ message: 'Berhasil ikut berdoa' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = app;