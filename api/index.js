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
        // Mendukung parameter since atau local_midnight agar tidak error
        const timeFilter = req.query.since || req.query.local_midnight; 
        let query = supabase.from('feelings').select('*').order('created_at', { ascending: false });
        
        if (timeFilter) {
            query = query.gte('created_at', timeFilter);
        }

        const { data, error } = await query;
        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/feelings', async (req, res) => {
    try {
        const { feeling, emoji, reason, user_name, user_id, local_midnight, avatar_url } = req.body;
        
        let checkQuery = supabase.from('feelings').select('*').eq('user_id', user_id);

        if (local_midnight) {
            checkQuery = checkQuery.gte('created_at', local_midnight);
        }

        const { data: existingData } = await checkQuery;

        if (existingData && existingData.length > 0) {
            // Update jika hari ini sudah pernah isi
            const { data, error } = await supabase
                .from('feelings')
                .update({ feeling, emoji, reason, avatar_url, created_at: new Date().toISOString() })
                .eq('id', existingData[0].id)
                .select();
            if (error) throw error;
            return res.status(200).json(data);
        } else {
            // Insert baru jika belum ada
            const { data, error } = await supabase
                .from('feelings')
                .insert([{ feeling, emoji, reason, user_name, user_id, avatar_url }])
                .select();
            if (error) throw error;
            return res.status(200).json(data);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// --- SHARING ---

app.get('/api/sharing', async (req, res) => {
    try {
        const { today, user_id, since, local_midnight } = req.query;
        const timeFilter = since || local_midnight;

        let query = supabase.from('sharings').select('*').order('created_at', { ascending: false });

        if (today === 'true' && timeFilter) {
            query = query.gte('created_at', timeFilter);
        }

        if (user_id) {
            query = query.eq('user_id', user_id);
        }

        const { data, error } = await query;
        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/sharing', async (req, res) => {
    try {
        const { text, user_name, user_id, avatar_url } = req.body;
        const { data, error } = await supabase.from('sharings')
            .insert([{ text, user_name, user_id, avatar_url }])
            .select();
        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// --- PRAYER ---

app.get('/api/prayers', async (req, res) => {
    try {
        let query = supabase.from('prayers').select('*').order('created_at', { ascending: false });
        const { data, error } = await query;
        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/prayers', async (req, res) => {
    try {
        const { text, user_name, user_id, avatar_url } = req.body;
        const { data, error } = await supabase.from('prayers')
            .insert([{ text, user_name, user_id, avatar_url }])
            .select();
        if (error) throw error;
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
        
        const userExists = intercessors.some(u => u.user_id === user_id);
        if (!userExists) intercessors.push({ user_id, user_name });
        
        const { data, error } = await supabase.from('prayers').update({ intercessors }).eq('id', id).select();
        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = app;