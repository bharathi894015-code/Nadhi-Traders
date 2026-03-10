require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // Listen on all interfaces

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files - Use process.cwd() for Vercel compatibility
app.use(express.static(path.join(process.cwd(), 'public')));

// API Routes
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/admin', require('./routes/auth').router);
app.use('/api/upload', require('./routes/upload'));

// Fallback for admin routes
app.get('/admin', (req, res) => {
    res.redirect('/admin/login.html');
});

if (!process.env.VERCEL) {
    app.listen(PORT, HOST, () => {
        console.log(`🌿 NADHI TRADERS server running at http://localhost:${PORT}`);
        console.log(`   Internal IP access: http://0.0.0.0:${PORT}`);
        console.log(`   Admin panel: http://localhost:${PORT}/admin/login.html`);
    });
}
module.exports = app;
