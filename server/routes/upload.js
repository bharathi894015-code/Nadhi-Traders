const express = require('express');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = (supabaseUrl && supabaseKey)
    ? createClient(supabaseUrl, supabaseKey)
    : null;

// We always use memory storage for Vercel/Cloud compatibility
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

router.post('/', upload.single('image'), async (req, res) => {
    try {
        if (!supabase) {
            return res.status(500).json({ error: 'Cloud Storage not configured. Please set SUPABASE_URL and SUPABASE_KEY in Vercel settings.' });
        }
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const file = req.file;
        const fileExt = file.originalname.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from('product-images')
            .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                upsert: true
            });

        if (error) throw error;

        // Get Public URL
        const { data: { publicUrl } } = supabase.storage
            .from('product-images')
            .getPublicUrl(fileName);

        res.json({ filename: fileName, url: publicUrl });
    } catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({ error: 'Cloud upload failed: ' + err.message });
    }
});

module.exports = router;
