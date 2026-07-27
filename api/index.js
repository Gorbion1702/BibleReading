const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

const SUPABASE_URL = 'https://srmaojepdzxmgeefzbsc.supabase.co';
// Fallback sistem: Jika di Vercel tidak ada SERVICE_KEY, gunakan Anon Key agar server tidak crash (Error 500).
const FALLBACK_KEY = 'sb_publishable_8ZRLF_VvsvQMjKcmspcrqQ_s88fHQYt';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || FALLBACK_KEY; 
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function getWIBDateString(dateInput) {
    const d = new Date(dateInput);
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const wib = new Date(utc + (3600000 * 7));
    const yyyy = wib.getFullYear();
    const mm = String(wib.getMonth() + 1).padStart(2, '0');
    const dd = String(wib.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

async function calculateUserStreak(userId) {
    const { data, error } = await supabase.from('sharings').select('created_at').eq('user_id', userId).order('created_at', { ascending: false });
    if (error || !data || data.length === 0) return 0;

    const uniqueWibDates = [...new Set(data.map(item => getWIBDateString(item.created_at)))];
    const now = new Date();
    const todayStr = getWIBDateString(now);
    const yesterday = new Date(now.getTime() - (24 * 60 * 60 * 1000));
    const yesterdayStr = getWIBDateString(yesterday);

    if (!uniqueWibDates.includes(todayStr) && !uniqueWibDates.includes(yesterdayStr)) return 0;

    let streak = 0;
    let checkDate = uniqueWibDates.includes(todayStr) ? new Date() : yesterday;

    while (true) {
        if (uniqueWibDates.includes(getWIBDateString(checkDate))) {
            streak++;
            checkDate = new Date(checkDate.getTime() - (24 * 60 * 60 * 1000));
        } else {
            break;
        }
    }
    return streak;
}

// --- LEADERBOARD ---
app.get('/api/leaderboard', async (req, res) => {
    try {
        const { data: users, error } = await supabase.from('sharings').select('user_id, user_name, avatar_url');
        if (error) throw error;

        const uniqueUserIds = [...new Set(users.map(u => u.user_id))];
        let leaderboard = [];

        for (const uid of uniqueUserIds) {
            const streak = await calculateUserStreak(uid);
            if (streak > 0) {
                const userData = users.find(u => u.user_id === uid);
                leaderboard.push({ user_name: userData.user_name, avatar_url: userData.avatar_url, streak });
            }
        }
        leaderboard.sort((a, b) => b.streak - a.streak);
        res.status(200).json(leaderboard.slice(0, 5));
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// --- FEELINGS ---
app.get('/api/feelings', async (req, res) => {
    try {
        const { local_midnight } = req.query; 
        let query = supabase.from('feelings').select('*').order('created_at', { ascending: false });
        if (local_midnight) query = query.gte('created_at', local_midnight);
        const { data, error } = await query;
        if (error) throw error; res.status(200).json(data);
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
        if (error) throw error; res.status(200).json(data);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/sharing', async (req, res) => {
    try {
        const { text, user_name, user_id, avatar_url, media_url, media_type } = req.body;
        const { data, error } = await supabase.from('sharings').insert([{ text, user_name, user_id, avatar_url, media_url, media_type }]).select();
        if (error) throw error; res.status(200).json(data);
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

// --- PRAYERS ---
app.get('/api/prayers', async (req, res) => {
    try {
        const { since } = req.query; 
        let query = supabase.from('prayers').select('*').order('created_at', { ascending: false });
        if (since) query = query.gte('created_at', since);
        const { data, error } = await query;
        if (error) throw error; res.status(200).json(data);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/prayers', async (req, res) => {
    try {
        const { text, user_name, user_id, avatar_url } = req.body;
        const { data, error } = await supabase.from('prayers').insert([{ text, user_name, user_id, avatar_url }]).select();
        if (error) throw error; res.status(200).json(data);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/prayers/:id/pray', async (req, res) => {
    try {
        const { id } = req.params; const { user_id, user_name } = req.body;
        const { data: prayerData, error: fetchError } = await supabase.from('prayers').select('intercessors').eq('id', id).single();
        if (fetchError) throw fetchError;
        let intercessors = prayerData.intercessors || [];
        const userIndex = intercessors.findIndex(u => u.user_id === user_id);
        if (userIndex > -1) { intercessors.splice(userIndex, 1); } 
        else { intercessors.push({ user_id, user_name }); }
        const { data, error } = await supabase.from('prayers').update({ intercessors }).eq('id', id).select();
        if (error) throw error; res.status(200).json(data);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// --- STREAK API ---
app.get('/api/streak/:user_id', async (req, res) => {
    try {
        const streak = await calculateUserStreak(req.params.user_id);
        res.status(200).json({ streak });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// =========================================================================
// CRON JOB: PENGINGAT WHATSAPP OTOMATIS (Jam 18:00 WIB)
// =========================================================================
app.get('/api/cron/reminder', async (req, res) => {
    try {
        const FONNTE_TOKEN = process.env.FONNTE_TOKEN; // Token dari panel Fonnte
        
        if (!FONNTE_TOKEN) {
            return res.status(500).json({ message: "Token Fonnte belum disetting di Vercel." });
        }

        // 1. Ambil semua akun pengguna (Perlu Service Role Key)
        const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
        if (authError) throw authError;

        // 2. Cari tahu siapa yang sudah sharing hari ini
        const todayStr = getWIBDateString(new Date());
        const { data: sharings, error: shareError } = await supabase.from('sharings').select('user_id, created_at');
        if (shareError) throw shareError;
        
        const usersWhoSharedToday = sharings
            .filter(s => getWIBDateString(s.created_at) === todayStr)
            .map(s => s.user_id);

        let messagesSent = 0;

        // 3. Cek satu per satu user
        for (const user of users) {
            const hasShared = usersWhoSharedToday.includes(user.id);
            const phone = user.user_metadata?.phone; // Nomor WA dari form profile
            const name = user.user_metadata?.full_name || 'Teman';

            // Jika dia BELUM sharing dan PUNYA nomor WA, kirim pesan!
            if (!hasShared && phone) {
                const waMessage = `Syalom ${name} 👋,\n\nSudahkah kamu saat teduh hari ini? Yuk, luangkan waktu sejenak bersama Tuhan dan bagikan berkatmu di Bible Community agar streak-mu tidak putus!\n\nKlik link ini: https://bible-reading-ten.vercel.app/ \n\nSelamat merenungkan firman-Nya! 🙏`;
                
                await fetch('https://api.fonnte.com/send', {
                    method: 'POST',
                    headers: { 'Authorization': FONNTE_TOKEN },
                    body: new URLSearchParams({ target: phone, message: waMessage })
                });

                messagesSent++;
            }
        }

        res.status(200).json({ message: `Berhasil mengeksekusi Cron. Mengirim ${messagesSent} pesan WA.` });
    } catch (error) { 
        res.status(500).json({ error: error.message }); 
    }
});

module.exports = app;