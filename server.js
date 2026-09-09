const http = require('http');
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const { toFile } = require('openai/uploads');

const port = process.env.PORT || 3000;
const MAX_BODY = 24 * 1024 * 1024;

function json(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(payload));
}

function readJSON(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY) { reject(new Error('Image is too large.')); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch { reject(new Error('Invalid request body.')); } });
    req.on('error', reject);
  });
}

function requireClient() {
  if (!process.env.OPENAI_API_KEY) { const e = new Error('AI is temporarily unavailable.'); e.statusCode = 503; throw e; }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function dataURLToBuffer(dataURL) {
  const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s.exec(dataURL || '');
  if (!m) throw new Error('Invalid image data.');
  return { mime: m[1], buffer: Buffer.from(m[2], 'base64') };
}
function extForMime(mime) { if (mime.includes('jpeg')) return 'jpg'; if (mime.includes('webp')) return 'webp'; return 'png'; }
async function remoteImage(url, label) {
  if (!url) return null;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Could not load ${label} product image.`);
  const type = (r.headers.get('content-type') || 'image/jpeg').split(';')[0];
  const buf = Buffer.from(await r.arrayBuffer());
  return toFile(buf, `${label}.${extForMime(type)}`, { type });
}

async function analyzePool(body) {
  const client = requireClient();
  if (!body.image) throw new Error('Upload a pool photo first.');
  const response = await client.responses.create({
    model: 'gpt-5.6-luna', reasoning: { effort: 'low' },
    input: [{ role: 'user', content: [
      { type: 'input_text', text: 'Analyze this swimming-pool photo for a material visualizer. Return normalized polygons from 0 to 1 for the visible pool interior/water surface, visible waterline tile band, and visible deck/hardscape. Exclude house walls, landscaping, furniture, sky and people. If a surface is not reliably visible, return an empty array.' },
      { type: 'input_image', image_url: body.image, detail: 'high' }
    ]}],
    text: { format: { type: 'json_schema', name: 'pool_detection', strict: true, schema: {
      type:'object', additionalProperties:false,
      properties:{ surfaces:{ type:'object', additionalProperties:false, properties:{
        interior:{type:'array',items:{type:'array',minItems:2,maxItems:2,items:{type:'number',minimum:0,maximum:1}}},
        waterline:{type:'array',items:{type:'array',minItems:2,maxItems:2,items:{type:'number',minimum:0,maximum:1}}},
        deck:{type:'array',items:{type:'array',minItems:2,maxItems:2,items:{type:'number',minimum:0,maximum:1}}}
      }, required:['interior','waterline','deck']}, note:{type:'string'} }, required:['surfaces','note']
    }}}
  });
  return JSON.parse(response.output_text);
}

async function renderPool(body) {
  const client = requireClient();
  if (!body.original) throw new Error('Upload a pool photo first.');
  const original = dataURLToBuffer(body.original);
  const guide = body.guide ? dataURLToBuffer(body.guide) : null;
  const images = [await toFile(original.buffer, `original.${extForMime(original.mime)}`, { type: original.mime })];
  if (guide) images.push(await toFile(guide.buffer, `surface-guide.${extForMime(guide.mime)}`, { type: guide.mime }));
  if (body.tile?.image) images.push(await remoteImage(body.tile.image, 'waterline-tile-reference'));
  if (body.deck?.image) images.push(await remoteImage(body.deck.image, 'deck-reference'));
  const finishName = body.finish?.name || 'selected pool finish';
  const finishColor = body.finish?.color || '';
  const tileName = body.tile?.name || 'selected waterline tile';
  const deckName = body.deck?.name || 'selected deck material';
  const prompt = `Edit the customer's original pool photo photorealistically. Preserve the exact camera viewpoint, pool geometry, coping, house, walls, landscaping, furniture, lighting, shadows, reflections and all non-selected surfaces. Change only the pool interior/water appearance to ${finishName}${finishColor ? ` (${finishColor})` : ''}, the existing waterline band to ${tileName}, and the existing deck to ${deckName}. Use any supplied product reference images faithfully. Do not redesign the yard.`;
  const result = await client.images.edit({ model:'gpt-image-2', image:images, prompt, size:'auto', quality:'high', input_fidelity:'high' });
  const item = result.data?.[0];
  if (!item) throw new Error('AI did not return an image.');
  if (item.b64_json) return { image:`data:image/png;base64,${item.b64_json}` };
  if (item.url) return { image:item.url };
  throw new Error('AI returned an unsupported image response.');
}

async function handleAPI(req, res, pathname) {
  try {
    if (req.method !== 'POST') return json(res, 405, { error:'POST required.' });
    const body = await readJSON(req);
    if (pathname === '/api/analyze-pool') return json(res, 200, await analyzePool(body));
    if (pathname === '/api/render-pool') return json(res, 200, await renderPool(body));
    return json(res, 404, { error:'Unknown API route.' });
  } catch (err) {
    console.error(pathname, err);
    return json(res, err.statusCode || 500, { error:err.message || 'AI request failed.' });
  }
}

function loadFinalizedProductsUI() {
  const dir = path.join(__dirname, 'ui-b64');
  const files = fs.readdirSync(dir).filter(n => n.endsWith('.txt')).sort();
  if (!files.length) throw new Error('Finalized LIV visualizer UI is missing.');
  const b64 = files.map(n => fs.readFileSync(path.join(dir, n), 'utf8').trim()).join('');
  const html = Buffer.from(b64, 'base64').toString('utf8');
  if (!html.includes('LIV') || !html.includes('Waterline Tile') || !html.includes('Yard')) throw new Error('Finalized LIV visualizer UI failed validation.');
  return html;
}

let FINAL_UI;
try { FINAL_UI = loadFinalizedProductsUI(); console.log('Loaded finalized screenshot-style LIV visualizer'); }
catch (e) { console.error(e); FINAL_UI = null; }

http.createServer(async (req, res) => {
  const pathname = decodeURIComponent((req.url || '/').split('?')[0]);
  if (pathname.startsWith('/api/')) return handleAPI(req, res, pathname);

  if (pathname === '/' || pathname === '' || pathname === '/index.html') {
    if (!FINAL_UI) { res.writeHead(500, { 'Content-Type':'text/plain; charset=utf-8' }); return res.end('LIV visualizer failed to load.'); }
    res.writeHead(200, { 'Content-Type':'text/html; charset=utf-8', 'Cache-Control':'no-store, max-age=0' });
    return res.end(FINAL_UI);
  }

  const normalized = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  const f = path.join(__dirname, normalized);
  if (!f.startsWith(__dirname)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(f, (e,d) => {
    if (e) { res.writeHead(404); return res.end('Not found'); }
    const ext = path.extname(f);
    const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp' };
    res.writeHead(200, { 'Content-Type':types[ext] || 'application/octet-stream', 'Cache-Control':'no-cache' });
    res.end(d);
  });
}).listen(port, () => console.log('LIV Pool Visualizer running on ' + port));
