const http=require('http'),fs=require('fs'),path=require('path'),OpenAI=require('openai');
const {toFile}=require('openai/uploads');
const port=process.env.PORT||3000,MAX=28*1024*1024;
const HERO_BUF=fs.readFileSync(path.join(__dirname,'hero.jpg'));
const ENHANCE_JS=fs.readFileSync(path.join(__dirname,'enhance.js'));
const ENHANCE_CSS=fs.readFileSync(path.join(__dirname,'enhance.css'));
const BUILD='2026-09-20-stable-1',RENDER_LIMIT=12,RENDER_COOLDOWN=10000;
const renderHistory=new Map(),lastRenderAttempt=new Map(),activeRenders=new Set();
function send(res,s,o){res.writeHead(s,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(o))}
function readBody(req){return new Promise((ok,no)=>{let n=0,a=[];req.on('data',c=>{n+=c.length;if(n>MAX){no(Error('Photo is too large. Please use a smaller photo.'));req.destroy();return}a.push(c)});req.on('end',()=>{try{ok(JSON.parse(Buffer.concat(a).toString()||'{}'))}catch(e){no(e)}});req.on('error',no)})}
function mime(buf){if(buf[0]===0x89&&buf[1]===0x50)return'image/png';if(buf[0]===0xff&&buf[1]===0xd8)return'image/jpeg';if(buf[0]===0x52&&buf[1]===0x49)return'image/webp';return'image/jpeg'}
function dataUrlToBuffer(s){const m=/^data:([^;]+);base64,(.+)$/s.exec(s||'');if(!m)throw Error('Invalid uploaded photo');return {type:m[1],buf:Buffer.from(m[2],'base64')}}
async function fetchBuffer(url){const r=await fetch(url);if(!r.ok)throw Error('Image download failed: '+r.status);return Buffer.from(await r.arrayBuffer())}
async function inputBuffer(src){if(!src)return HERO_BUF;if(src.startsWith('data:'))return dataUrlToBuffer(src).buf;return fetchBuffer(src)}
async function refFromSource(src,name){if(!src)return null;let buf,type;if(src.startsWith('data:')){const d=dataUrlToBuffer(src);buf=d.buf;type=d.type}else{const r=await fetch(src);if(!r.ok)return null;buf=Buffer.from(await r.arrayBuffer());type=(r.headers.get('content-type')||'image/jpeg').split(';')[0]}return toFile(buf,name,{type})}
function asDataUrl(buf){return `data:${mime(buf)};base64,${buf.toString('base64')}`}
async function analyzeScene(client,base){try{const r=await client.responses.create({model:'gpt-5-mini',input:[{role:'user',content:[{type:'input_text',text:'Analyze this swimming pool photo for a renovation visualizer. Identify the visible pool interior beneath the water, the true waterline tile band, the horizontal coping/deck surfaces, and landscaping. Preserve the exact geometry and everything else. Do not redesign the scene. Keep response concise.'},{type:'input_image',image_url:asDataUrl(base)}]}]});return (r.output_text||'').trim()}catch(e){console.error('scene analysis fallback',e.message);return 'Detect the actual pool interior, waterline tile band, horizontal coping/deck, and landscaping from the photo. Preserve all other geometry and objects.'}}
async function render(b){if(!process.env.OPENAI_API_KEY)throw Error('AI renderer is not configured');const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});const base=await inputBuffer(b.sourceImage);const scene=await analyzeScene(client,base);const refs=[await toFile(base,'pool-base.jpg',{type:mime(base)})];let role=2;const roles=[];const finishRef=await refFromSource(b.finishImage,'finish.jpg');const tileRef=await refFromSource(b.tileImage,'tile.jpg');const deckRef=await refFromSource(b.deckImage,'deck.jpg');if(finishRef){refs.push(finishRef);roles.push(`Image ${role++} is the selected pool-finish reference.`)}if(tileRef){refs.push(tileRef);roles.push(`Image ${role++} is the exact selected waterline-tile product.`)}if(deckRef){refs.push(deckRef);roles.push(`Image ${role++} is the exact selected deck/paver product.`)}
const prompt=`Photorealistically edit Image 1 as the SAME private residential pool photo. Image 1 is the composition authority. ${roles.join(' ')}\nScene analysis: ${scene}\nSelected pool finish: ${b.finish||'keep existing'}. Selected waterline tile: ${b.tile||'keep existing'}. Selected deck: ${b.deck||'keep existing'}. Yard direction: ${b.yard||'keep existing'}.\nApply each selected material ONLY to its real physical surface. Pool finish must change only the submerged interior shell and resulting water tone while preserving reflections, ripples, depth and caustics. Waterline tile must be installed only on the narrow existing waterline band and raised-spa/water-feature tile areas where tile is physically present. Deck/paver must change only existing horizontal coping and deck/hardscape. Landscaping changes must stay outside the hardscape. Preserve pool shape, raised spa/water feature, steps, house edge, block wall, furniture, shadows, camera angle and perspective. Never place tile or pavers in the air, sky, water surface, vertical house walls or plants. No floating textures, outlines, masks, labels, or redesign. Produce one believable after-photo where the pool interior, waterline tile and deck are all clearly visible.`;
const out=await client.images.edit({model:'gpt-image-2',image:refs,prompt,size:'1536x1024',quality:'high',input_fidelity:'high'});const x=out.data&&out.data[0];if(!x)throw Error('Renderer returned no image');if(x.b64_json)return {image:'data:image/png;base64,'+x.b64_json};if(x.url)return {image:'data:image/png;base64,'+(await fetchBuffer(x.url)).toString('base64')};throw Error('Renderer returned unusable image')}

function plain(v,n=240){return String(v||'').replace(/\s+/g,' ').trim().slice(0,n)}
function parseJsonText(t){const s=String(t||'').trim();try{return JSON.parse(s)}catch{}const m=s.match(/\{[\s\S]*\}/);if(!m)return null;try{return JSON.parse(m[0])}catch{return null}}
async function findPlaster(q){
  if(!process.env.OPENAI_API_KEY){const e=Error('AI lookup is not configured');e.status=503;throw e}
  q=plain(q,120);if(q.length<2){const e=Error('Type a plaster or pool-finish name first.');e.status=400;throw e}
  const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
  const r=await client.responses.create({
    model:'gpt-5-mini',
    tools:[{type:'web_search'}],
    input:'Find the swimming-pool interior finish that best matches this customer search: "'+q+'". Prefer an official manufacturer page or reputable pool-finish source. Return ONLY valid JSON with keys name, brand, family, description, sourceUrl. name should be the exact product/finish name when available and description should be one short sentence about visible color/aggregate appearance.'
  });
  const x=parseJsonText(r.output_text);
  if(!x||!x.name)return{name:q,brand:'Custom finish',family:'Pool finish',description:plain(r.output_text,260)||'Custom pool-finish option.',sourceUrl:''};
  return{name:plain(x.name,120),brand:plain(x.brand,80),family:plain(x.family,80),description:plain(x.description,260),sourceUrl:/^https?:\/\//i.test(String(x.sourceUrl||''))?String(x.sourceUrl):''}
}
function ipOf(req){const f=String(req.headers['x-forwarded-for']||'').split(',')[0].trim();return f||req.socket.remoteAddress||'unknown'}
function enterRender(req){
  const ip=ipOf(req),now=Date.now();
  if(activeRenders.has(ip))return{ok:false,status:429,error:'A render is already running. Please wait for it to finish.'};
  const last=lastRenderAttempt.get(ip)||0;
  if(now-last<RENDER_COOLDOWN)return{ok:false,status:429,error:'Please wait '+Math.max(1,Math.ceil((RENDER_COOLDOWN-(now-last))/1000))+' seconds before generating another preview.'};
  const cutoff=now-3600000,recent=(renderHistory.get(ip)||[]).filter(t=>t>cutoff);
  renderHistory.set(ip,recent);
  if(recent.length>=RENDER_LIMIT)return{ok:false,status:429,error:'Render limit reached for this hour. Please try again later.'};
  lastRenderAttempt.set(ip,now);activeRenders.add(ip);return{ok:true,ip}
}
function leaveRender(ip,success){activeRenders.delete(ip);if(success){const a=renderHistory.get(ip)||[];a.push(Date.now());renderHistory.set(ip,a)}}
function apiMessage(e){
  const code=String(e.code||e.error?.code||''),type=String(e.type||e.error?.type||'');
  if(code==='credit_balance_exhausted'||type==='insufficient_quota')return{status:402,error:'AI rendering is temporarily unavailable because the site API credit balance is empty.'};
  if(e.status===429||code.includes('rate_limit'))return{status:429,error:'The AI renderer is busy right now. Please wait a moment and try again.'};
  if(e.status&&e.status>=400&&e.status<500)return{status:e.status,error:plain(e.message,220)||'Request could not be completed.'};
  return{status:500,error:'The render could not be completed. Please try again.'}
}

function loadUI(){
  let h=fs.readdirSync(path.join(__dirname,'ui-live')).filter(x=>x.endsWith('.txt')).sort().map(x=>fs.readFileSync(path.join(__dirname,'ui-live',x),'utf8')).join('');
  h=h.replace(/(<section class="hero"><img src=")[^"]+("[^>]*>)/,'$1/hero.jpg?v='+BUILD+'$2');
  h=h.replace('Tap a real finish, tile or deck product. Your selection is applied to the preview immediately.','Choose your real materials, then generate one photorealistic pool preview.');
  h=h.replace(/<p class="note">[\s\S]*?<\/p><\/aside>/,'<p class="note">Selections are for design planning. Use Generate My Pool for the photorealistic AI result.</p></aside>');
  h=h.replace('</head>','<link rel="stylesheet" href="/enhance.css?v='+BUILD+'"></head>');
  h=h.replace('</body>','<script src="/enhance.js?v='+BUILD+'" defer></script></body>');
  return h
}
let UI;try{UI=loadUI()}catch(e){console.error(e);UI='<!doctype html><h1>LIV Visualizer unavailable</h1>'}
const SELF_CHECKS={hero:HERO_BUF.length>10000,ui:UI.includes('/enhance.js'),js:ENHANCE_JS.includes('generatePool'),plaster:ENHANCE_JS.includes('finishSearch'),zoom:ENHANCE_JS.includes('zoomTools'),disclaimer:ENHANCE_JS.includes('Visualizer disclaimer')};
console.log('LIV selftest '+JSON.stringify({ok:Object.values(SELF_CHECKS).every(Boolean),build:BUILD,heroBytes:HERO_BUF.length,apiKeyConfigured:!!process.env.OPENAI_API_KEY,checks:SELF_CHECKS}));

http.createServer(async(req,res)=>{
  const p=(req.url||'/').split('?')[0];
  if(p==='/hero.jpg'&&req.method==='GET'){res.writeHead(200,{'Content-Type':'image/jpeg','Content-Length':HERO_BUF.length,'Cache-Control':'public, max-age=3600','X-Content-Type-Options':'nosniff'});return res.end(HERO_BUF)}
  if(p==='/enhance.js'&&req.method==='GET'){res.writeHead(200,{'Content-Type':'application/javascript; charset=utf-8','Content-Length':ENHANCE_JS.length,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});return res.end(ENHANCE_JS)}
  if(p==='/enhance.css'&&req.method==='GET'){res.writeHead(200,{'Content-Type':'text/css; charset=utf-8','Content-Length':ENHANCE_CSS.length,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});return res.end(ENHANCE_CSS)}
  if(p==='/api/health'&&req.method==='GET')return send(res,200,{ok:Object.values(SELF_CHECKS).every(Boolean),build:BUILD,heroBytes:HERO_BUF.length,apiKeyConfigured:!!process.env.OPENAI_API_KEY,renderMode:'manual-final-render',imageModel:'gpt-image-2',analysisModel:'gpt-5-mini',renderLimitPerHour:RENDER_LIMIT,checks:SELF_CHECKS});
  if(p==='/api/find-plaster'&&req.method==='POST'){try{return send(res,200,await findPlaster((await readBody(req)).query))}catch(e){console.error('plaster lookup error',e.code||e.message);const m=apiMessage(e);return send(res,m.status,{error:m.error})}}
  if(p==='/api/render'&&req.method==='POST'){
    const gate=enterRender(req);if(!gate.ok)return send(res,gate.status,{error:gate.error});
    let success=false;
    try{const out=await render(await readBody(req));success=true;return send(res,200,out)}
    catch(e){console.error('render error',e.code||e.message);const m=apiMessage(e);return send(res,m.status,{error:m.error})}
    finally{leaveRender(gate.ip,success)}
  }
  if((p==='/'||p==='/index.html')&&req.method==='GET'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store, no-cache, must-revalidate','Pragma':'no-cache','Expires':'0','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'});return res.end(UI)}
  res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('Not found')
}).listen(port,'0.0.0.0',()=>console.log('LIV visualizer '+BUILD+' running on '+port+' hero='+HERO_BUF.length+' bytes'));