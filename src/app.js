const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const env = require('./config/env');
const path = require('path');
const fs = require('fs');

const app = express();

// CORS configuration
app.use(cors({
    origin: '*', // Allow all origins, or specify your frontend URL: 'http://localhost:5173'
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(
    helmet({
        crossOriginResourcePolicy: { policy: "cross-origin" },
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                imgSrc: ["'self'", "data:", "blob:", "https:"],
                mediaSrc: ["'self'", "data:", "blob:", "https:"],
                connectSrc: ["'self'", "https:"],
                scriptSrc: ["'self'", "'unsafe-inline'", "https:"],
                styleSrc: ["'self'", "'unsafe-inline'", "https:"],
            },
        },
    })
);


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

// Ensure uploads directory exists and serve it statically
const uploadsDir = env.uploadsRoot;
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure static file serving with proper headers for downloads
app.use('/uploads', (req, res, next) => {
    // Set headers for proper file serving
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    // Allow browsers to display files inline or download them
    const filename = path.basename(req.path);

    // Set Content-Disposition based on file type
    const ext = path.extname(filename).toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(ext)) {
        // For images, allow inline viewing but support download
        res.setHeader('Content-Type', `image/${ext.substring(1)}`);
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    } else if (ext === '.pdf') {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    } else {
        // For other files, suggest download
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    }

    next();
}, express.static(uploadsDir, {
    setHeaders: (res, filepath) => {
        // Additional headers for caching
        res.setHeader('Cache-Control', 'public, max-age=31536000');
    }
}));

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
