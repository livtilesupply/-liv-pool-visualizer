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

async function findPlaster(body) {
  const client = requireClient();
  const query = String(body.query || '').trim().slice(0, 180);
  if (!query) throw new Error('Type a plaster or pool finish name first.');

  const response = await client.responses.create({
    model: 'gpt-5.6-luna',
    reasoning: { effort: 'low' },
    tools: [{ type: 'web_search' }],
    input: [{
      role: 'user',
      content: [{
        type: 'input_text',
        text: `Find and verify this swimming-pool interior finish/plaster product: "${query}". Search the web and prefer the official manufacturer page or an authorized manufacturer catalog. Do not invent a product. If you cannot verify the exact or clearly equivalent finish, set found=false. If verified, return the official/most accurate product name, manufacturer/brand, finish category (plaster, quartz, pebble, polished aggregate, or other), a conservative approximate HEX color for how the filled pool water typically reads in neutral daylight, one best source URL, and a short note. The HEX color is only for a digital preview and must not be described as an exact real-world color.`
      }]
    }],
    text: {
      format: {
        type: 'json_schema',
        name: 'pool_finish_lookup',
        strict: true,
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            found: { type: 'boolean' },
            name: { type: 'string' },
            brand: { type: 'string' },
            category: { type: 'string' },
            water_color_hex: { type: 'string' },
            source_url: { type: 'string' },
            note: { type: 'string' },
            message: { type: 'string' }
          },
          required: ['found','name','brand','category','water_color_hex','source_url','note','message']
        }
      }
    }
  });

  const out = JSON.parse(response.output_text || '{}');
  if (out.water_color_hex && !/^#[0-9A-Fa-f]{6}$/.test(out.water_color_hex)) out.water_color_hex = '#4f91a8';
  return out;
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

  const prompt = `Create a photorealistic architectural material edit of INPUT IMAGE 1, the customer's original pool photo.\n\nPreserve the exact camera viewpoint, pool geometry, coping geometry, house, walls, windows, landscaping, furniture, lighting direction, shadows, reflections, people, and every object that is not a selected pool material. Do not redesign or beautify the yard. Do not move, add, or remove objects.\n\nChange ONLY these surfaces:\n- Pool interior / water appearance: ${finishName}${finishColor ? `, approximate finish color ${finishColor}` : ''}. Keep realistic water, depth, caustics and reflections.\n- Waterline tile: ${tileName}. If a tile reference image is provided, reproduce its actual color/pattern/scale as faithfully as possible and tile it naturally around the existing waterline band.\n- Deck: ${deckName}. If a deck reference image is provided, reproduce that material's actual texture/color and realistic scale/perspective on the existing deck only.\n\n${guide ? 'INPUT IMAGE 2 is a visual surface guide drawn over the same photo. Use it only to understand the intended editable regions; do not reproduce guide lines or overlays in the final image.' : ''}\n${body.tile?.image ? `A later input image is the exact product reference for ${tileName}.` : ''}\n${body.deck?.image ? `A later input image is the exact product reference for ${deckName}.` : ''}\n\nThe output must look like the same real photograph after a professional pool remodel, not a new synthetic scene. Keep all unedited pixels/structures visually consistent with the original.`;

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
    if (pathname === '/api/find-plaster') return json(res, 200, await findPlaster(body));
    if (pathname === '/api/analyze-pool') return json(res, 200, await analyzePool(body));
    if (pathname === '/api/render-pool') return json(res, 200, await renderPool(body));
    return json(res, 404, { error: 'Unknown API route.' });
  } catch (err) {
    console.error(pathname, err);
    return json(res, err.statusCode || 500, { error: err.message || 'AI request failed.' });
  }
}

function loadExactProductsHTML() {
  const dir = path.join(__dirname, 'ui-b64');
  const files = fs.readdirSync(dir).filter(name => name.endsWith('.txt')).sort();
  if (!files.length) throw new Error('Finalized visualizer UI chunks are missing.');
  const encoded = files.map(name => fs.readFileSync(path.join(dir, name), 'utf8').trim()).join('');
  return Buffer.from(encoded, 'base64').toString('utf8');
}

function enhanceProductsHTML(html) {
  const css = `<style id="liv-enhancements">
.customFinishBox{margin-top:14px;border:1px solid #d6ddd9;background:#f7faf8;border-radius:12px;padding:13px}.customFinishBox h3{font-size:13px;margin:0 0 4px}.customFinishBox p{font-size:11px;line-height:1.4;color:#687171;margin:0 0 10px}.customFinishRow{display:flex;gap:7px}.customFinishRow input{position:static!important;opacity:1!important;pointer-events:auto!important;flex:1;min-width:0;border:1px solid #cfd7d2;border-radius:9px;padding:10px 11px;background:#fff;font-size:12px}.customFinishRow button{border:0;background:var(--accent);color:#fff;border-radius:9px;padding:10px 12px;font-size:11px;font-weight:800;white-space:nowrap}.customFinishRow button:disabled{opacity:.55}.customFinishStatus{font-size:10.5px;color:#687171;margin-top:7px;min-height:15px}.customFinishStatus.err{color:#9a3e34}.customResult{margin-top:9px;display:none}.customResult.show{display:block}.customResult .card{max-width:220px}.aiTag{display:inline-block;margin-top:5px;font-size:9px;font-weight:800;letter-spacing:.03em;color:#0b665b;background:#e5f3ef;border-radius:999px;padding:4px 7px}.sourceLink{display:inline-block;margin-top:6px;font-size:10px;color:#315e58}.legalFooter{border-top:1px solid #e3e6e2;background:#fafbf9;padding:18px 22px;font-size:10px;line-height:1.5;color:#6b7471}.legalFooter strong{color:#394340}.custom-selected{border-color:#102628!important;box-shadow:0 0 0 2px #102628 inset}@media(max-width:620px){.customFinishRow{flex-direction:column}.customFinishRow button{width:100%}}
</style>`;

  const box = `<div class="customFinishBox" id="customFinishBox"><h3>Don’t see your plaster option?</h3><p>Type the manufacturer and finish name. AI will look it up and add the closest verified finish to this visualizer.</p><div class="customFinishRow"><input id="customFinishInput" type="text" autocomplete="off" placeholder="e.g. Wet Edge Primera Stone Azure"><button id="customFinishBtn" type="button">Find with AI</button></div><div class="customFinishStatus" id="customFinishStatus"></div><div class="customResult" id="customFinishResult"></div></div>`;

  const footer = `<footer class="legalFooter"><strong>Visualizer disclaimer:</strong> Images and material previews are for design inspiration and approximate visualization only and are not a guarantee of final appearance. Actual plaster, tile, decking and water colors may vary from this preview due to lighting, pool depth and shape, water chemistry, installation methods, surface texture, product lots, weather, camera exposure and screen/display settings. Always review current manufacturer samples and specifications before purchasing or installation. LIV Tile &amp; Decking is not responsible for differences between a digital visualization and the finished project.</footer>`;

  const script = `<script id="liv-plaster-ai">
(function(){
  const input=document.getElementById('customFinishInput');
  const btn=document.getElementById('customFinishBtn');
  const status=document.getElementById('customFinishStatus');
  const result=document.getElementById('customFinishResult');
  const water=document.querySelector('.waterTint');
  const summary=document.getElementById('customFinishSummary');
  if(!input||!btn) return;
  function clearCustom(){
    const r=document.getElementById('customFinishRadio');
    if(r && !r.checked){ if(water){water.style.removeProperty('background');water.style.removeProperty('opacity');} if(summary)summary.style.display='none'; result.querySelector('.card')?.classList.remove('custom-selected'); }
  }
  document.querySelectorAll('input[name="finish"]').forEach(r=>r.addEventListener('change',clearCustom));
  async function search(){
    const q=input.value.trim(); if(!q){status.textContent='Type a plaster brand and finish name first.';status.className='customFinishStatus err';return;}
    btn.disabled=true; status.className='customFinishStatus'; status.textContent='AI is searching for that finish…'; result.classList.remove('show');
    try{
      const res=await fetch('/api/find-plaster',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:q})});
      const data=await res.json(); if(!res.ok) throw new Error(data.error||'Could not search for that finish.');
      if(!data.found) throw new Error(data.message||'I could not verify that exact finish. Try including the manufacturer name.');
      let radio=document.getElementById('customFinishRadio'); if(radio)radio.remove();
      radio=document.createElement('input'); radio.type='radio'; radio.name='finish'; radio.id='customFinishRadio'; radio.checked=true; document.querySelector('.app').prepend(radio);
      const safeName=String(data.name||q); const safeBrand=String(data.brand||'Verified finish'); const color=/^#[0-9A-Fa-f]{6}$/.test(data.water_color_hex||'')?data.water_color_hex:'#4f91a8';
      result.innerHTML=''; const card=document.createElement('label'); card.className='card custom-selected'; card.htmlFor='customFinishRadio';
      const sw=document.createElement('div'); sw.className='sw'; sw.style.background='linear-gradient(135deg,'+color+',#d8e9e7)';
      const b=document.createElement('b'); b.textContent=safeName; const span=document.createElement('span'); span.textContent=safeBrand; const tag=document.createElement('span'); tag.className='aiTag'; tag.textContent='AI FOUND';
      card.append(sw,b,span,tag);
      if(data.source_url){const a=document.createElement('a');a.className='sourceLink';a.href=data.source_url;a.target='_blank';a.rel='noopener';a.textContent='View source ↗';a.addEventListener('click',e=>e.stopPropagation());card.appendChild(a);}
      result.appendChild(card); result.classList.add('show');
      if(water){water.style.setProperty('background',color,'important');water.style.setProperty('opacity','.29','important');}
      if(summary){summary.textContent=safeName;summary.style.display='inline';}
      radio.addEventListener('change',()=>{if(radio.checked){if(water)water.style.setProperty('background',color,'important');if(summary){summary.textContent=safeName;summary.style.display='inline';}card.classList.add('custom-selected');}});
      status.textContent='Added '+safeName+' to your finish choices.';
    }catch(e){status.className='customFinishStatus err';status.textContent=e.message||'Could not find that finish.';}finally{btn.disabled=false;}
  }
  btn.addEventListener('click',search); input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();search();}});
})();
</script>`;

  html = html.replace('</head>', css + '</head>');
  const finishButton = '<label class="continue" for="phase2">Use this finish → Waterline Tile</label>';
  if (html.includes(finishButton)) html = html.replace(finishButton, box + finishButton);
  else html = html.replace('</body>', box + '</body>');
  html = html.replace('<i class="only s-f11">Plaster Aqua Blue Tint</i></span>', '<i class="only s-f11">Plaster Aqua Blue Tint</i><i class="only" id="customFinishSummary"></i></span>');
  html = html.replace('</body>', footer + script + '</body>');
  return html;
}

http.createServer(async (req, res) => {
  const pathname = decodeURIComponent((req.url || '/').split('?')[0]);
  if (pathname.startsWith('/api/')) return handleAPI(req, res, pathname);

  if (pathname === '/' || pathname === '' || pathname === '/index.html') {
    try {
      const html = enhanceProductsHTML(loadExactProductsHTML());
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
      return res.end(html);
    } catch (err) {
      console.error('UI load failed', err);
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Visualizer UI could not be loaded.');
    }
  }

  if (pathname === '/hero.jpg') {
    try {
      const encoded = fs.readFileSync(path.join(__dirname, 'hero.b64'), 'utf8').trim();
      res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=86400' });
      return res.end(Buffer.from(encoded, 'base64'));
    } catch (err) {
      res.writeHead(404); return res.end('Not found');
    }
  }

  const normalized = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '');
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
