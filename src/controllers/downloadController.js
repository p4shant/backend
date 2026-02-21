const path = require('path');
const { Readable } = require('stream');

async function download(req, res) {
    try {
        const { url, name } = req.query;
        if (!url) {
            return res.status(400).json({ message: 'url query param is required' });
        }

        let parsedUrl;
        try {
            parsedUrl = new URL(url);
        } catch (error) {
            return res.status(400).json({ message: 'Invalid url' });
        }

        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
            return res.status(400).json({ message: 'Invalid url protocol' });
        }

        const response = await fetch(parsedUrl.toString());
        if (!response.ok) {
            return res.status(502).json({ message: `Failed to fetch file: ${response.status}` });
        }

        const filenameFromUrl = path.basename(parsedUrl.pathname) || 'download';
        const safeName = typeof name === 'string' && name.trim() ? name.trim() : filenameFromUrl;

        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);

        const body = response.body;
        if (!body) {
            return res.status(502).json({ message: 'Empty response body' });
        }

        Readable.fromWeb(body).pipe(res);
    } catch (error) {
        console.error('Download proxy failed:', error);
        return res.status(500).json({ message: 'Failed to download file' });
    }
}

module.exports = {
    download,
};
