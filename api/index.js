const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

const SUPABASE_URL = 'https://srmaojepdzxmgeefzbsc.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_8ZRLF_VvsvQMjKcmspcrqQ_s88fHQYt';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);


// --- FEELINGS (EMOSI) ---

app.get('/api/feelings', async (req, res) => {
    try {
        const { since } = req.query;
        let query = supabase.from('feelings').select('*').order('created_at', { ascending: false });
        
        // Filter menggunakan zona waktu lokal dari frontend
        if (since) {
            query = query.gte('created_at', since);
        }

        const { data, error } = await query;
        if (error) return res.status(500).json({ error: error.message });
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/feelings', async (req, res) => {
    try {
        const { feeling, emoji, reason, user_name, user_id, local_midnight } = req.body;
        
        // 1. Cek apakah user sudah memposting hari ini (berdasarkan waktu lokal user)
        let checkQuery = supabase.from('feelings').select('*');
        if (user_id) checkQuery = checkQuery.eq('user_id', user_id);
        else checkQuery = checkQuery.eq('user_name', user_name);

        if (local_midnight) {
            checkQuery = checkQuery.gte('created_at', local_midnight);
        } else {
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            checkQuery = checkQuery.gte('created_at', startOfDay.toISOString());
        }

        const { data: existingData } = await checkQuery;

        if (existingData && existingData.length > 0) {
            // 2. Jika sudah ada, UPDATE datanya
            const { data, error } = await supabase
                .from('feelings')
                .update({ feeling, emoji, reason, created_at: new Date().toISOString() })
                .eq('id', existingData[0].id)
                .select();
            if (error) return res.status(500).json({ error: error.message });
            return res.status(200).json(data);
        } else {
            // 3. Jika belum ada, INSERT data baru
            const { data, error } = await supabase
                .from('feelings')
                .insert([{ feeling, emoji, reason, user_name, user_id }])
                .select();
            if (error) return res.status(500).json({ error: error.message });
            return res.status(200).json(data);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// --- SHARING ---

app.get('/api/sharing', async (req, res) => {
    try {
        const { since, user_id } = req.query;
        let query = supabase.from('sharings').select('*').order('created_at', { ascending: false });

        // Filter untuk feed komunitas hari ini (menggunakan zona waktu lokal frontend)
        if (since) query = query.gte('created_at', since);

        // Filter untuk riwayat jurnal profile
        if (user_id) query = query.eq('user_id', user_id);

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
        const { data, error } = await supabase.from('sharings').insert([{ text, user_name, user_id }]).select();
        if (error) return res.status(500).json({ error: error.message });
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// --- PRAYER ---

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
        const { data, error } = await supabase.from('prayers').insert([{ text, user_name, user_id }]).select();
        if (error) return res.status(500).json({ error: error.message });
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/prayers/:id/pray', async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id, user_name } = req.body;
        
        const { data: prayerData } = await supabase.from('prayers').select('intercessors').eq('id', id).single();
        let intercessors = prayerData.intercessors || [];
        
        const userExists = intercessors.some(u => u.user_id === user_id || u.user_name === user_name);
        if (!userExists) intercessors.push({ user_id, user_name });
        
        const { data, error } = await supabase.from('prayers').update({ intercessors }).eq('id', id).select();
        if (error) return res.status(500).json({ error: error.message });
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = app;