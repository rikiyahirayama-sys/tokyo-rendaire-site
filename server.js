// ============================================
// Tokyo Rendaire 管理サーバー
// Express + 静的ファイル + API
// ============================================
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== ミドルウェア =====
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(session({
    secret: process.env.ADMIN_SESSION_SECRET || 'tokyo-rendaire-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24時間
}));

// ===== 静的ファイル配信 =====
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/blog', express.static(path.join(__dirname, 'blog')));

// ===== APIルーティング =====
app.use('/api/auth', require('./routes/auth'));
app.use('/api/settings', require('./routes/auth'));
app.use('/api/cast', require('./routes/cast'));
app.use('/api/sns', require('./routes/sns'));
app.use('/api/blog', require('./routes/blog'));

// ===== サーバー起動 =====
const server = app.listen(PORT);
server.on('listening', () => {
    console.log('✅ Tokyo Rendaire 管理サーバー起動');
    console.log('📄 LP: http://localhost:' + PORT);
    console.log('⚙️  管理画面: http://localhost:' + PORT + '/admin.html');
});
