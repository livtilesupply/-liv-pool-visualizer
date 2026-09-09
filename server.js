const http = require('http');
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const { toFile } = require('openai/uploads');

const port = process.env.PORT || 3000;
const MAX_BODY = 24 * 1024 * 1024;

function json(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(payload));
}

function readJSON(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new Error('Image is too large. Please use a photo under about 15 MB.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); }
      catch { reject(new Error('Invalid request body.')); }
    });
    req.on('error', reject);
  });
}

function dataURLToBuffer(dataURL) {
  const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s.exec(dataURL || '');
  if (!m) throw new Error('Invalid image data.');
  return { mime: m[1], buffer: Buffer.from(m[2], 'base64') };
}

function extForMime(mime) {
  if (mime.includes('jpeg')) return 'jpg';
  if (mime.includes('webp')) return 'webp';
  return 'png';
}

async function remoteImage(url, label) {
  if (!url) return null;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Could not load ${label} product image.`);
  const type = (r.headers.get('content-type') || 'image/jpeg').split(';')[0];
  const buf = Buffer.from(await r.arrayBuffer());
  return toFile(buf, `${label}.${extForMime(type)}`, { type });
}

function requireClient() {
  if (!process.env.OPENAI_API_KEY) {
    const e = new Error('AI is installed but the OPENAI_API_KEY has not been added to Render yet.');
    e.statusCode = 503;
    throw e;
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

async function analyzePool(body) {
  const client = requireClient();
  if (!body.image) throw new Error('Upload a pool photo first.');

  const response = await client.responses.create({
    model: 'gpt-5.6-luna',
    reasoning: { effort: 'low' },
    input: [{
      role: 'user',
      content: [
        {
          type: 'input_text',
          text: `Analyze this swimming-pool photo for a material visualizer. Return polygon points normalized from 0 to 1 for: (1) the visible pool interior/water surface, (2) the visible waterline tile band when identifiable, and (3) the visible deck/hardscape surrounding the pool. Use enough points to follow the actual perspective and curves. Do not include house walls, landscaping, furniture, sky, or people. If a surface is not reliably visible, return an empty array. Also estimate pool length and width in feet only when visually defensible; otherwise return null.`,
        },
        { type: 'input_image', image_url: body.image, detail: 'high' },
      ],
    }],
    text: {
      format: {
        type: 'json_schema',
        name: 'pool_detection',
        strict: true,
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            surfaces: {
              type: 'object',
              additionalProperties: false,
              properties: {
                interior: { type: 'array', items: { type: 'array', minItems: 2, maxItems: 2, items: { type: 'number', minimum: 0, maximum: 1 } } },
                waterline: { type: 'array', items: { type: 'array', minItems: 2, maxItems: 2, items: { type: 'number', minimum: 0, maximum: 1 } } },
                deck: { type: 'array', items: { type: 'array', minItems: 2, maxItems: 2, items: { type: 'number', minimum: 0, maximum: 1 } } },
              },
              required: ['interior', 'waterline', 'deck'],
            },
            measurements: {
              type: 'object',
              additionalProperties: false,
              properties: {
                length_ft: { anyOf: [{ type: 'number' }, { type: 'null' }] },
                width_ft: { anyOf: [{ type: 'number' }, { type: 'null' }] },
              },
              required: ['length_ft', 'width_ft'],
            },
            note: { type: 'string' },
          },
          required: ['surfaces', 'measurements', 'note'],
        },
      },
    },
  });

  return JSON.parse(response.output_text);
}

async function renderPool(body) {
  const client = requireClient();
  if (!body.original) throw new Error('Upload a pool photo first.');

  const original = dataURLToBuffer(body.original);
  const guide = body.guide ? dataURLToBuffer(body.guide) : null;

  const images = [
    await toFile(original.buffer, `original.${extForMime(original.mime)}`, { type: original.mime }),
  ];

  if (guide) images.push(await toFile(guide.buffer, `surface-guide.${extForMime(guide.mime)}`, { type: guide.mime }));
  if (body.tile && body.tile.image) images.push(await remoteImage(body.tile.image, 'waterline-tile-reference'));
  if (body.deck && body.deck.image) images.push(await remoteImage(body.deck.image, 'deck-reference'));

  const finishName = body.finish?.name || 'selected pool finish';
  const finishColor = body.finish?.color || '';
  const tileName = body.tile?.name || 'selected waterline tile';
  const deckName = body.deck?.name || 'selected deck material';

  const prompt = `Create a photorealistic architectural material edit of INPUT IMAGE 1, the customer's original pool photo.

Preserve the exact camera viewpoint, pool geometry, coping geometry, house, walls, windows, landscaping, furniture, lighting direction, shadows, reflections, people, and every object that is not a selected pool material. Do not redesign or beautify the yard. Do not move, add, or remove objects.

Change ONLY these surfaces:
- Pool interior / water appearance: ${finishName}${finishColor ? `, approximate finish color ${finishColor}` : ''}. Keep realistic water, depth, caustics and reflections.
- Waterline tile: ${tileName}. If a tile reference image is provided, reproduce its actual color/pattern/scale as faithfully as possible and tile it naturally around the existing waterline band.
- Deck: ${deckName}. If a deck reference image is provided, reproduce that material's actual texture/color and realistic scale/perspective on the existing deck only.

${guide ? 'INPUT IMAGE 2 is a visual surface guide drawn over the same photo. Use it only to understand the intended editable regions; do not reproduce guide lines or overlays in the final image.' : ''}
${body.tile?.image ? `A later input image is the exact product reference for ${tileName}.` : ''}
${body.deck?.image ? `A later input image is the exact product reference for ${deckName}.` : ''}

The output must look like the same real photograph after a professional pool remodel, not a new synthetic scene. Keep all unedited pixels/structures visually consistent with the original.`;

  const result = await client.images.edit({
    model: 'gpt-image-2.5-sunburst',
    image: images,
    prompt,
    size: 'auto',
    quality: 'high',
    input_fidelity: 'high',
  });

  const item = result.data && result.data[0];
  if (!item) throw new Error('AI did not return an image.');
  if (item.b64_json) return { image: `data:image/png;base64,${item.b64_json}` };
  if (item.url) return { image: item.url };
  throw new Error('AI returned an unsupported image response.');
}

async function handleAPI(req, res, pathname) {
  try {
    if (req.method !== 'POST') return json(res, 405, { error: 'POST required.' });
    const body = await readJSON(req);
    if (pathname === '/api/analyze-pool') return json(res, 200, await analyzePool(body));
    if (pathname === '/api/render-pool') return json(res, 200, await renderPool(body));
    return json(res, 404, { error: 'Unknown API route.' });
  } catch (err) {
    console.error(pathname, err);
    return json(res, err.statusCode || 500, { error: err.message || 'AI request failed.' });
  }
}

http.createServer(async (req, res) => {
  const pathname = decodeURIComponent((req.url || '/').split('?')[0]);
  if (pathname.startsWith('/api/')) return handleAPI(req, res, pathname);

  let p = pathname === '/' || pathname === '' ? '/index.html' : pathname;
  const normalized = path.normalize(p).replace(/^(\.\.[/\\])+/, '');
  const f = path.join(__dirname, normalized);
  if (!f.startsWith(__dirname)) { res.writeHead(403); return res.end('Forbidden'); }

  fs.readFile(f, (e, d) => {
    if (e) { res.writeHead(404); return res.end('Not found'); }
    const ext = path.extname(f);
    const types = {
      '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
      '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
    };
    res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(d);
  });
}).listen(port, () => console.log('LIV Pool Visualizer running on ' + port));
