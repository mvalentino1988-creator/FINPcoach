import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, 'dist');
const INDEX_HTML = path.join(DIST_DIR, 'index.html');

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

/** Risolve un path URL dentro a dist/, rifiutando qualunque traversal. */
function resolveInDist(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const candidate = path.resolve(DIST_DIR, '.' + decoded);
  if (candidate !== DIST_DIR && !candidate.startsWith(DIST_DIR + path.sep)) return null;
  return candidate;
}

const server = http.createServer((req, res) => {
  let filePath = null;
  try {
    filePath = resolveInDist(req.url || '/');
  } catch {
    filePath = null;
  }

  const serve = (target) => {
    fs.stat(target, (err, stats) => {
      if (err || stats.isDirectory()) target = INDEX_HTML;
      fs.readFile(target, (err2, data) => {
        if (err2) {
          res.writeHead(404, { 'Content-Type': 'text/plain', ...SECURITY_HEADERS });
          res.end('Not Found');
        } else {
          const ext = path.extname(target);
          const contentType = mimeTypes[ext] || 'application/octet-stream';
          res.writeHead(200, { 'Content-Type': contentType, ...SECURITY_HEADERS });
          res.end(data);
        }
      });
    });
  };

  serve(filePath || INDEX_HTML);
});

server.listen(3000, '0.0.0.0', () => {
  console.log('Custom Node HTTP server running at http://localhost:3000');
});
