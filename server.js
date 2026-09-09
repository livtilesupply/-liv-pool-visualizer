const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.PORT || 3000;

function loadUI() {
  const dir = path.join(__dirname, 'ui-live');
  const files = fs.readdirSync(dir).filter(n => n.endsWith('.txt')).sort();
  if (!files.length) throw new Error('ui-live is empty');
  const html = files.map(n => fs.readFileSync(path.join(dir, n), 'utf8')).join('');
  if (!html.includes('Design Your Pool') || !html.includes('Waterline Tile') || !html.includes('SHOP LIV TILE')) {
    throw new Error('LIV UI validation failed');
  }
  return html;
}

let UI;
try {
  UI = loadUI();
  console.log('Loaded stable LIV product visualizer:', UI.length, 'chars');
} catch (err) {
  console.error(err);
  UI = '<!doctype html><html><body><h1>LIV Visualizer</h1><p>Visualizer is temporarily unavailable.</p></body></html>';
}

http.createServer((req, res) => {
  const pathname = decodeURIComponent((req.url || '/').split('?')[0]);
  if (pathname === '/' || pathname === '' || pathname === '/index.html') {
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    return res.end(UI);
  }
  res.writeHead(404, {'Content-Type':'text/plain; charset=utf-8'});
  res.end('Not found');
}).listen(port, '0.0.0.0', () => console.log('LIV Pool Visualizer running on ' + port));
