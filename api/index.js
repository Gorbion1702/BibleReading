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
        const { local_midnight } = req.query; 
        let query = supabase.from('feelings').select('*').order('created_at', { ascending: false });
        if (local_midnight) query = query.gte('created_at', local_midnight);
        
        const { data, error } = await query;
        if (error) throw error;
        res.status(200).json(data);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/feelings', async (req, res) => {
    try {
        const { feeling, emoji, reason, user_name, user_id, local_midnight, avatar_url } = req.body;
        let checkQuery = supabase.from('feelings').select('*').eq('user_id', user_id);
        if (local_midnight) checkQuery = checkQuery.gte('created_at', local_midnight);

        const { data: existingData } = await checkQuery;
        if (existingData && existingData.length > 0) {
            const { data, error } = await supabase
                .from('feelings')
                .update({ feeling, emoji, reason, avatar_url, created_at: new Date().toISOString() })
                .eq('id', existingData[0].id).select();
            if (error) throw error; return res.status(200).json(data);
        } else {
            const { data, error } = await supabase
                .from('feelings')
                .insert([{ feeling, emoji, reason, user_name, user_id, avatar_url }]).select();
            if (error) throw error; return res.status(200).json(data);
        }
    } catch (error) { res.status(500).json({ error: error.message }); }
});


// --- SHARING ---
app.get('/api/sharing', async (req, res) => {
    try {
        const { today, user_id, local_midnight } = req.query;
        let query = supabase.from('sharings').select('*').order('created_at', { ascending: false });
        if (today === 'true' && local_midnight) query = query.gte('created_at', local_midnight);
        if (user_id) query = query.eq('user_id', user_id);

        const { data, error } = await query;
        if (error) throw error;
        res.status(200).json(data);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/sharing', async (req, res) => {
    try {
        const { text, user_name, user_id, avatar_url } = req.body;
        const { data, error } = await supabase.from('sharings').insert([{ text, user_name, user_id, avatar_url }]).select();
        if (error) throw error;
        res.status(200).json(data);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// EDIT SHARING API
app.put('/api/sharing/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { text, user_id } = req.body;
        // Hanya izinkan update jika id baris dan id user pembuatnya COCOK (keamanan ganda)
        const { data, error } = await supabase.from('sharings').update({ text }).eq('id', id).eq('user_id', user_id).select();
        
        if (error) throw error;
        if (data.length === 0) throw new Error("Akses ditolak atau postingan tidak ditemukan.");
        res.status(200).json(data);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// DELETE SHARING API
app.delete('/api/sharing/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id } = req.query; // Menangkap id pembuat dari query parameter
        // Hanya hapus jika id baris dan id user pembuatnya COCOK
        const { data, error } = await supabase.from('sharings').delete().eq('id', id).eq('user_id', user_id).select();
        
        if (error) throw error;
        if (data.length === 0) throw new Error("Akses ditolak atau postingan tidak ditemukan.");
        res.status(200).json(data);
    } catch (error) { res.status(500).json({ error: error.message }); }
});


// --- PRAYER ---
app.get('/api/prayers', async (req, res) => {
    try {
        const { data, error } = await supabase.from('prayers').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        res.status(200).json(data);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/prayers', async (req, res) => {
    try {
        const { text, user_name, user_id, avatar_url } = req.body;
        const { data, error } = await supabase.from('prayers').insert([{ text, user_name, user_id, avatar_url }]).select();
        if (error) throw error;
        res.status(200).json(data);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/prayers/:id/pray', async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id, user_name } = req.body;
        
        if (!user_id) throw new Error("User ID diperlukan untuk berdoa");

        const { data: prayerData, error: fetchError } = await supabase.from('prayers').select('intercessors').eq('id', id).single();
        if (fetchError) throw fetchError;

        let intercessors = prayerData.intercessors || [];
        
        // Logika Toggle: Cari apakah user sudah ada di dalam array intercessors
        const userIndex = intercessors.findIndex(u => u.user_id === user_id);
        
        if (userIndex > -1) {
            // Jika sudah ada -> Berarti user ingin BATALKAN (Cancel) doa
            intercessors.splice(userIndex, 1);
        } else {
            // Jika belum ada -> Tambahkan user ke daftar pendoa
            intercessors.push({ user_id, user_name });
        }
        
        const { data, error } = await supabase.from('prayers').update({ intercessors }).eq('id', id).select();
        if (error) throw error;
        res.status(200).json(data);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = app;