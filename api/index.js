const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Konfigurasi Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://srmaojepdzxmgeefzbsc.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_8ZRLF_VvsvQMjKcmspcrqQ_s88fHQYt';
const supabase = createClient(supabaseUrl, supabaseKey);

// --- FEELINGS (NEW) ---

// Route GET: Mengambil perasaan komunitas khusus HARI INI
app.get('/api/sharing', async (req, res) => {
    try {
        const { today, user_id } = req.query;
        let query = supabase.from('sharings').select('*').order('created_at', { ascending: false });

        // Jika diminta data hari ini saja (untuk feed komunitas)
        if (today === 'true') {
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            query = query.gte('created_at', startOfDay.toISOString());
        }

        // Jika diminta berdasarkan user (untuk riwayat di profile)
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

// Route POST: Menyimpan perasaan user
app.post('/api/feelings', async (req, res) => {
    try {
        const { feeling, emoji, reason, user_name, user_id } = req.body;
        
        // 1. Tentukan waktu awal hari ini
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startOfDay = today.toISOString();

        // 2. Cek apakah user ini sudah posting feeling hari ini
        let query = supabase.from('feelings').select('*').gte('created_at', startOfDay);
        if (user_id) {
            query = query.eq('user_id', user_id);
        } else {
            query = query.eq('user_name', user_name);
        }

        const { data: existing, error: checkError } = await query;
        if (checkError) throw checkError;

        let resultData, resultError;

        if (existing && existing.length > 0) {
            // 3A. Jika SUDAH ADA -> UPDATE (Replace) data yang lama
            const recordId = existing[0].id;
            const updateRes = await supabase
                .from('feelings')
                .update({ 
                    feeling, 
                    emoji, 
                    reason, 
                    created_at: new Date().toISOString() // Update waktunya menjadi yang terbaru
                })
                .eq('id', recordId)
                .select();
                
            resultData = updateRes.data;
            resultError = updateRes.error;
        } else {
            // 3B. Jika BELUM ADA -> INSERT data baru
            let insertData = { feeling, emoji, reason, user_name };
            if (user_id) insertData.user_id = user_id;

            const insertRes = await supabase
                .from('feelings')
                .insert([insertData])
                .select();
                
            resultData = insertRes.data;
            resultError = insertRes.error;
            
            // Fallback keamanan jika kolom user_id belum terbuat di Supabase
            if (resultError && resultError.message.includes('user_id')) {
                const fallbackRes = await supabase
                    .from('feelings')
                    .insert([{ feeling, emoji, reason, user_name }])
                    .select();
                resultData = fallbackRes.data;
                resultError = fallbackRes.error;
            }
        }

        if (resultError) return res.status(500).json({ error: resultError.message });
        res.status(201).json(resultData[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// --- SHARING ---

app.get('/api/sharing', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('sharings') 
            .select('*')
            .order('created_at', { ascending: false });
            
        if (error) return res.status(500).json({ error: error.message });
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

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

app.put('/api/sharing/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { text, user_name, user_id } = req.body;
        
        const { data: existing, error: fetchErr } = await supabase.from('sharings').select('*').eq('id', id).single();
        if (fetchErr || !existing) return res.status(404).json({ error: "Sharing tidak ditemukan." });

        if (existing.user_id && user_id && existing.user_id !== user_id) return res.status(403).json({ error: "Akses ditolak." });
        if (!existing.user_id && existing.user_name && existing.user_name !== user_name) return res.status(403).json({ error: "Akses ditolak." });

        const { data, error } = await supabase.from('sharings').update({ text }).eq('id', id).select();
        if (error) return res.status(500).json({ error: error.message });
        res.status(200).json(data[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/sharing/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { user_name, user_id } = req.body;
        
        const { data: existing, error: fetchErr } = await supabase.from('sharings').select('*').eq('id', id).single();
        if (fetchErr || !existing) return res.status(404).json({ error: "Sharing tidak ditemukan." });

        if (existing.user_id && user_id && existing.user_id !== user_id) return res.status(403).json({ error: "Akses ditolak." });
        if (!existing.user_id && existing.user_name && existing.user_name !== user_name) return res.status(403).json({ error: "Akses ditolak." });

        const { error } = await supabase.from('sharings').delete().eq('id', id);
        if (error) return res.status(500).json({ error: error.message });
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// --- PRAYERS ---

app.get('/api/prayers', async (req, res) => {
    try {
        const { data: prayers, error } = await supabase.from('prayers').select('*').order('created_at', { ascending: false });
        if (error) return res.status(500).json({ error: error.message });

        const { data: intercessors } = await supabase.from('prayer_intercessors').select('*');
        const prayersWithIntercessors = (prayers || []).map(prayer => {
            const pIntercessors = (intercessors || []).filter(i => String(i.prayer_id) === String(prayer.id));
            return { ...prayer, intercessors: pIntercessors };
        });

        res.status(200).json(prayersWithIntercessors);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/prayers', async (req, res) => {
    try {
        const { text, user_name, user_id } = req.body;
        let insertData = { text, user_name };
        if (user_id) insertData.user_id = user_id;

        let { data, error } = await supabase.from('prayers').insert([insertData]).select();
        if (error && error.message.includes('user_id')) {
            const fallbackRes = await supabase.from('prayers').insert([{ text, user_name }]).select();
            data = fallbackRes.data;
            error = fallbackRes.error;
        }
        if (error) return res.status(500).json({ error: error.message });
        res.status(201).json({ ...data[0], intercessors: [] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/prayers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { text, user_name, user_id } = req.body;
        
        const { data: existing, error: fetchErr } = await supabase.from('prayers').select('*').eq('id', id).single();
        if (fetchErr || !existing) return res.status(404).json({ error: "Pokok doa tidak ditemukan." });

        if (existing.user_id && user_id && existing.user_id !== user_id) return res.status(403).json({ error: "Akses ditolak." });
        if (!existing.user_id && existing.user_name && existing.user_name !== user_name) return res.status(403).json({ error: "Akses ditolak." });

        const { data, error } = await supabase.from('prayers').update({ text }).eq('id', id).select();
        if (error) return res.status(500).json({ error: error.message });
        res.status(200).json(data[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/prayers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { user_name, user_id } = req.body;
        
        const { data: existing, error: fetchErr } = await supabase.from('prayers').select('*').eq('id', id).single();
        if (fetchErr || !existing) return res.status(404).json({ error: "Pokok doa tidak ditemukan." });

        if (existing.user_id && user_id && existing.user_id !== user_id) return res.status(403).json({ error: "Akses ditolak." });
        if (!existing.user_id && existing.user_name && existing.user_name !== user_name) return res.status(403).json({ error: "Akses ditolak." });

        const { error } = await supabase.from('prayers').delete().eq('id', id);
        if (error) return res.status(500).json({ error: error.message });
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

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

module.exports = app;

if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Node.js Backend berjalan di port ${PORT}`);
    });
}