const http = require('http');
const fs = require('fs');
const path = require('path');

// IIS/iisnode uses a named pipe via process.env.PORT
// For local dev it falls back to port 3000
const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

const server = http.createServer((req, res) => {
  // Only allow GET and HEAD
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.statusCode = 405;
    res.end('Method Not Allowed');
    return;
  }

  // Decode and sanitize URL
  let urlPath;
  try {
    urlPath = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
  } catch (e) {
    res.statusCode = 400;
    res.end('Bad Request');
    return;
  }

  // Serve index
  if (urlPath === '/' || urlPath === '/index.html') {
    urlPath = '/wedding-invitation.html';
  }

  // Resolve to absolute path
  const filePath = path.join(__dirname, urlPath);

  // Security: prevent directory traversal
  if (!filePath.startsWith(__dirname + path.sep) && filePath !== __dirname) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback: serve the main HTML for any unknown route
      const indexPath = path.join(__dirname, 'wedding-invitation.html');
      fs.readFile(indexPath, (readErr, data) => {
        if (readErr) {
          res.statusCode = 404;
          res.end('Not Found');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(data);
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': 'public, max-age=86400',
    });

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    const stream = fs.createReadStream(filePath);
    stream.on('error', () => {
      if (!res.headersSent) {
        res.statusCode = 500;
        res.end('Internal Server Error');
      }
    });
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`Wedding invitation server running on port/pipe ${PORT}`);
});
