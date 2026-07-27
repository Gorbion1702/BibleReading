const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

const SUPABASE_URL = 'https://srmaojepdzxmgeefzbsc.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_8ZRLF_VvsvQMjKcmspcrqQ_s88fHQYt';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Fungsi utilitas untuk mengubah waktu UTC server menjadi Tanggal WIB (YYYY-MM-DD)
function getWIBDateString(dateInput) {
    const d = new Date(dateInput);
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const wib = new Date(utc + (3600000 * 7)); // Tambah 7 jam untuk WIB
    const yyyy = wib.getFullYear();
    const mm = String(wib.getMonth() + 1).padStart(2, '0');
    const dd = String(wib.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

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
            const { data, error } = await supabase.from('feelings').update({ feeling, emoji, reason, avatar_url, created_at: new Date().toISOString() }).eq('id', existingData[0].id).select();
            if (error) throw error; return res.status(200).json(data);
        } else {
            const { data, error } = await supabase.from('feelings').insert([{ feeling, emoji, reason, user_name, user_id, avatar_url }]).select();
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
        const { text, user_name, user_id, avatar_url, media_url, media_type } = req.body;
        const { data, error } = await supabase.from('sharings').insert([{ text, user_name, user_id, avatar_url, media_url, media_type }]).select();
        if (error) throw error;
        res.status(200).json(data);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put('/api/sharing/:id', async (req, res) => {
    try {
        const { id } = req.params; const { text, user_id, media_url, media_type } = req.body; 
        const { data, error } = await supabase.from('sharings').update({ text, media_url, media_type }).eq('id', id).eq('user_id', user_id).select();
        if (error) throw error; if (data.length === 0) throw new Error("Akses ditolak.");
        res.status(200).json(data);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/sharing/:id', async (req, res) => {
    try {
        const { id } = req.params; const { user_id } = req.query;
        const { data, error } = await supabase.from('sharings').delete().eq('id', id).eq('user_id', user_id).select();
        if (error) throw error; if (data.length === 0) throw new Error("Akses ditolak.");
        res.status(200).json(data);
    } catch (error) { res.status(500).json({ error: error.message }); }
});


// --- PRAYER ---
app.get('/api/prayers', async (req, res) => {
    try {
        const { since } = req.query; 
        let query = supabase.from('prayers').select('*').order('created_at', { ascending: false });
        if (since) query = query.gte('created_at', since);

        const { data, error } = await query;
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
        const { id } = req.params; const { user_id, user_name } = req.body;
        if (!user_id) throw new Error("Anda harus login untuk berdoa");

        const { data: prayerData, error: fetchError } = await supabase.from('prayers').select('intercessors').eq('id', id).single();
        if (fetchError) throw fetchError;

        let intercessors = prayerData.intercessors || [];
        const userIndex = intercessors.findIndex(u => u.user_id === user_id);
        
        if (userIndex > -1) { intercessors.splice(userIndex, 1); } 
        else { intercessors.push({ user_id, user_name }); }
        
        const { data, error } = await supabase.from('prayers').update({ intercessors }).eq('id', id).select();
        if (error) throw error;
        res.status(200).json(data);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// --- STREAK TRACKING ---
app.get('/api/streak/:user_id', async (req, res) => {
    try {
        const { user_id } = req.params;
        
        // Ambil riwayat tanggal sharing user (diurutkan dari terbaru)
        const { data, error } = await supabase.from('sharings').select('created_at').eq('user_id', user_id).order('created_at', { ascending: false });
        if (error) throw error;
        if (!data || data.length === 0) return res.status(200).json({ streak: 0 });

        // Ubah semua tanggal ke WIB YYYY-MM-DD dan ambil yang unik (agar jika 1 hari post 2x, dihitung 1)
        const uniqueWibDates = [...new Set(data.map(item => getWIBDateString(item.created_at)))];

        // Dapatkan string tanggal Hari Ini & Kemarin (WIB)
        const now = new Date();
        const todayStr = getWIBDateString(now);
        const yesterday = new Date(now.getTime() - (24 * 60 * 60 * 1000));
        const yesterdayStr = getWIBDateString(yesterday);

        let streak = 0;
        let checkDate = new Date();

        // Mulai menghitung: Apakah ada post hari ini atau kemarin?
        if (uniqueWibDates.includes(todayStr)) {
            checkDate = now;
        } else if (uniqueWibDates.includes(yesterdayStr)) {
            checkDate = yesterday;
        } else {
            // Jika hari ini dan kemarin kosong, berarti streak terputus (0)
            return res.status(200).json({ streak: 0 });
        }

        // Hitung mundur hari demi hari
        while (true) {
            const currentCheckStr = getWIBDateString(checkDate);
            if (uniqueWibDates.includes(currentCheckStr)) {
                streak++;
                checkDate = new Date(checkDate.getTime() - (24 * 60 * 60 * 1000)); // Mundur 1 hari
            } else {
                break; // Siklus terputus
            }
        }
        
        res.status(200).json({ streak });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// --- WHATSAPP REMINDER CRON JOB (Jam 18:00 WIB / 11:00 UTC) ---
app.get('/api/cron/reminder', async (req, res) => {
    try {
        // PERSIAPAN UNTUK KEDEPANNYA (Saat Anda punya API WhatsApp pihak ke-3 spt Fonnte)
        
        // 1. Cek siapa saja user di database
        // const { data: users } = await supabase.auth.admin.listUsers();
        
        // 2. Cek siapa yang SUDAH posting hari ini
        // const todayWIB = getWIBDateString(new Date());
        // (Lakukan Query ke tabel sharings untuk tanggal hari ini)
        
        // 3. Filter user yang BELUM posting
        // const usersToRemind = users.filter(u => belum_posting);
        
        // 4. Looping untuk kirim Pesan WA API Fonnte
        /* 
        for(let u of usersToRemind){
             await fetch('https://api.fonnte.com/send', {
                 method: 'POST',
                 headers: { 'Authorization': 'TOKEN_FONNTE_ANDA' },
                 body: JSON.stringify({ target: u.phone, message: "Halo! Jangan lupa tulis renungan/sharing hari ini ya untuk menjaga api rohanimu! 🔥" })
             })
        }
        */

        res.status(200).json({ message: "Sistem Reminder terpanggil sukses. (Integrasi WA belum aktif)" });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = app;