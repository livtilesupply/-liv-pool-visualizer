const http=require('http'),fs=require('fs'),path=require('path'),OpenAI=require('openai');
const {toFile}=require('openai/uploads');
const port=process.env.PORT||3000,MAX=24*1024*1024;
const HERO_B64=fs.readFileSync(path.join(__dirname,'hero.b64'),'utf8').replace(/\s+/g,'');
const HERO_BUF=Buffer.from(HERO_B64,'base64');
function send(res,s,o){res.writeHead(s,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(o))}
function body(req){return new Promise((ok,no)=>{let n=0,a=[];req.on('data',c=>{n+=c.length;if(n>MAX){no(Error('Request too large'));req.destroy();return}a.push(c)});req.on('end',()=>{try{ok(JSON.parse(Buffer.concat(a).toString()||'{}'))}catch(e){no(e)}});req.on('error',no)})}
async function fileFromUrl(url,name){if(!url)return null;const r=await fetch(url);if(!r.ok)throw Error('Could not load '+name);const type=(r.headers.get('content-type')||'image/jpeg').split(';')[0];return toFile(Buffer.from(await r.arrayBuffer()),name,{type})}
async function render(b){
 if(!process.env.OPENAI_API_KEY)throw Error('AI renderer is not configured');
 const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
 const imgs=[await toFile(HERO_BUF,'liv-pool-base.jpg',{type:'image/jpeg'})];
 if(b.tileImage)imgs.push(await fileFromUrl(b.tileImage,'selected-waterline-tile.jpg'));
 if(b.deckImage)imgs.push(await fileFromUrl(b.deckImage,'selected-deck.jpg'));
 const prompt=`Edit image 1 as the SAME private residential pool photograph. Preserve the exact camera position, pool shape, raised spa/water feature, coping, block wall, house edge, mountains, landscaping, lighting and perspective. DO NOT redesign the scene or generate a different backyard.
Selected pool finish/plaster: ${b.finish||'current finish'}.
Selected waterline tile: ${b.tile||'current tile'}.
Selected deck/paver: ${b.deck||'current deck'}.
Selected yard direction: ${b.yard||'current landscaping'}.
If image 2 is present, it is the exact selected WATERLINE TILE reference. Put it ONLY on the narrow waterline tile band along the inside perimeter of the pool/spa, at realistic tile scale and perspective. Never place tile above the pool, on walls, water, deck, landscaping or sky.
If image 3 is present, it is the exact selected DECK/PAVER reference. Put it ONLY on horizontal deck/hardscape around the pool, at realistic scale and perspective. Never put pavers on water, vertical walls, plants or sky.
The plaster selection changes ONLY the pool interior surface and resulting water tone while retaining realistic reflections, ripples, depth and caustics. Yard changes may affect ONLY planting/landscape beds outside the hardscape and must keep the existing block wall and scene layout.
This is a material visualization, not a redesign. Keep every boundary construction-realistic and keep all unselected areas visually unchanged.`;
 const out=await client.images.edit({model:'gpt-image-2',image:imgs,prompt,size:'1536x1024',quality:'high',input_fidelity:'high'});
 const x=out.data&&out.data[0];if(!x)throw Error('Renderer returned no image');return x.b64_json?'data:image/png;base64,'+x.b64_json:x.url;
}
function loadUI(){
 let h=fs.readdirSync(path.join(__dirname,'ui-live')).filter(x=>x.endsWith('.txt')).sort().map(x=>fs.readFileSync(path.join(__dirname,'ui-live',x),'utf8')).join('');
 h=h.replace(/(<section class="hero"><img src=")[^"]+("[^>]*>)/,'$1/hero.jpg$2');
 h=h.replace('</body>',`<style>
.waterTint,.tileOverlay,.deckOverlay{display:none!important}
.hero{overflow:hidden!important;background:#d8d2c7!important;touch-action:none}
.photoStage{position:absolute;inset:0;transform-origin:center center;will-change:transform}
.photoStage>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center center;user-select:none;-webkit-user-drag:none}
.surfaceSvg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible}
.surfaceSvg .fill{fill:rgba(8,126,135,.17);stroke:#d9ffff;stroke-width:2;vector-effect:non-scaling-stroke}
.surfaceSvg .line{fill:none;stroke:#53e7f0;stroke-width:5;stroke-linecap:round;stroke-linejoin:round;vector-effect:non-scaling-stroke;filter:drop-shadow(0 1px 1px rgba(0,0,0,.6))}
.surfaceSvg .yardFill{fill:rgba(74,142,91,.15);stroke:#d9ffe1;stroke-width:2;vector-effect:non-scaling-stroke}
.surfaceSvg .deckFill{fill:rgba(226,179,83,.16);stroke:#fff0c8;stroke-width:2;vector-effect:non-scaling-stroke}
.surfaceGroup{display:none}.hero[data-surface="finish"] .surfaceFinish,.hero[data-surface="tile"] .surfaceTile,.hero[data-surface="deck"] .surfaceDeck,.hero[data-surface="yard"] .surfaceYard{display:block}
.surfaceLabel{position:absolute;left:50%;bottom:18px;transform:translateX(-50%);z-index:10;background:rgba(7,28,29,.88);color:#fff;padding:9px 14px;border-radius:999px;font:800 12px Arial;white-space:nowrap}
.zoomControls{position:absolute;right:16px;bottom:14px;z-index:11;display:flex;gap:8px}.zoomControls button{width:44px;height:44px;border:0;border-radius:50%;background:rgba(255,255,255,.94);color:#102628;font:800 22px Arial;box-shadow:0 2px 10px rgba(0,0,0,.16)}
.panHint{position:absolute;right:16px;top:17px;z-index:11;background:rgba(7,28,29,.68);color:#fff;padding:8px 11px;border-radius:9px;font:700 11px Arial}
.renderBtn{display:block;width:100%;border:0;border-radius:10px;padding:14px;background:#102628;color:#fff;font-weight:800;margin:14px 0;cursor:pointer}.renderMsg{font-size:12px;color:#687171;margin:8px 0 18px}.hero.rendering:after{content:'Creating realistic pool preview…';position:absolute;inset:0;background:rgba(0,0,0,.52);color:#fff;display:grid;place-items:center;font:800 16px Arial;z-index:30}
</style><script>
(function(){
 const hero=document.querySelector('.hero'),pic=hero.querySelector(':scope > img');
 const stage=document.createElement('div');stage.className='photoStage';hero.insertBefore(stage,pic);stage.appendChild(pic);
 stage.insertAdjacentHTML('beforeend',\`<svg class="surfaceSvg" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
 <g class="surfaceGroup surfaceFinish"><polygon class="fill" points="117,545 853,514 1000,664 926,950 80,919"/></g>
 <g class="surfaceGroup surfaceTile"><polyline class="line" points="98,524 853,516 1000,537 982,550 853,530 108,540"/></g>
 <g class="surfaceGroup surfaceDeck"><polygon class="deckFill" points="0,610 110,540 240,580 380,700 505,657 625,620 750,602 1000,580 1000,1000 930,950 835,900 735,865 620,835 520,825 430,840 355,875 280,925 205,965 110,985 0,1000"/></g>
 <g class="surfaceGroup surfaceYard"><polygon class="yardFill" points="0,350 135,315 280,330 430,320 590,330 760,315 1000,335 1000,555 860,525 715,520 565,525 420,520 275,535 135,545 0,575"/></g>
 </svg>\`);
 const label=document.createElement('div');label.className='surfaceLabel';hero.appendChild(label);
 const hint=document.createElement('div');hint.className='panHint';hint.textContent='Pinch / drag to inspect';hero.appendChild(hint);
 const ctr=document.createElement('div');ctr.className='zoomControls';ctr.innerHTML='<button type="button" data-z="out">−</button><button type="button" data-z="reset">↻</button><button type="button" data-z="in">+</button>';hero.appendChild(ctr);
 const names={phase1:['finish','Plaster / pool interior'],phase2:['tile','Waterline tile band'],phase3:['deck','Decking / hardscape'],phase4:['yard','Yard / landscaping']};
 function phase(){const x=document.querySelector('input[name="phase"]:checked');const v=names[x&&x.id]||names.phase1;hero.dataset.surface=v[0];label.textContent=v[1]}
 document.querySelectorAll('input[name="phase"]').forEach(x=>x.addEventListener('change',phase));phase();
 let scale=1,tx=0,ty=0,start=null,pinch=null;
 function apply(){stage.style.transform='translate('+tx+'px,'+ty+'px) scale('+scale+')'}
 function zoom(delta,cx=hero.clientWidth/2,cy=hero.clientHeight/2){const old=scale;scale=Math.max(1,Math.min(3.5,scale+delta));if(scale===1){tx=0;ty=0}else{tx=(tx-cx)*(scale/old)+cx;ty=(ty-cy)*(scale/old)+cy}apply()}
 ctr.addEventListener('click',e=>{const z=e.target.dataset.z;if(!z)return;if(z==='in')zoom(.35);if(z==='out')zoom(-.35);if(z==='reset'){scale=1;tx=0;ty=0;apply()}});
 hero.addEventListener('wheel',e=>{e.preventDefault();const r=hero.getBoundingClientRect();zoom(e.deltaY<0?.18:-.18,e.clientX-r.left,e.clientY-r.top)},{passive:false});
 hero.addEventListener('touchstart',e=>{if(e.touches.length===2){const a=e.touches[0],b=e.touches[1];pinch={d:Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY),s:scale};e.preventDefault()}else if(e.touches.length===1&&scale>1){start={x:e.touches[0].clientX-tx,y:e.touches[0].clientY-ty};e.preventDefault()}},{passive:false});
 hero.addEventListener('touchmove',e=>{if(e.touches.length===2&&pinch){const a=e.touches[0],b=e.touches[1],d=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);scale=Math.max(1,Math.min(3.5,pinch.s*d/pinch.d));apply();e.preventDefault()}else if(e.touches.length===1&&start&&scale>1){tx=e.touches[0].clientX-start.x;ty=e.touches[0].clientY-start.y;apply();e.preventDefault()}},{passive:false});
 hero.addEventListener('touchend',()=>{start=null;pinch=null;if(scale<=1){scale=1;tx=0;ty=0;apply()}});
 const btn=document.createElement('button');btn.className='renderBtn';btn.textContent='RENDER MY SELECTIONS';const msg=document.createElement('div');msg.className='renderMsg';msg.textContent='Choose finish, tile, deck and yard, then create the realistic pool preview.';document.querySelector('.choiceArea').append(btn,msg);
 function sel(n){return document.querySelector('input[name="'+n+'"]:checked')}function lab(n){const x=sel(n);return x?document.querySelector('label[for="'+x.id+'"]'):null}function text(n){const l=lab(n);return l?l.innerText.replace(/\\n/g,' ').trim():''}function image(n){const l=lab(n),im=l&&l.querySelector('img');return im?im.src:''}
 btn.onclick=async()=>{hero.classList.add('rendering');btn.disabled=true;msg.textContent='Applying your materials to the fixed pool scene…';try{const r=await fetch('/api/render',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({finish:text('finish'),tile:text('tile'),tileImage:image('tile'),deck:text('deck'),deckImage:image('deck'),yard:text('yard')})});const j=await r.json();if(!r.ok)throw Error(j.error||'Render failed');pic.src=j.image;msg.textContent='Rendered. Change a selection and render again to compare.'}catch(e){msg.textContent='Render failed: '+e.message}finally{hero.classList.remove('rendering');btn.disabled=false}}
})();
</script></body>`);
 return h;
}
let UI;try{UI=loadUI();console.log('Loaded fixed-scene LIV visualizer')}catch(e){console.error(e);UI='<!doctype html><h1>LIV Visualizer temporarily unavailable</h1>'}
http.createServer(async(req,res)=>{const p=(req.url||'/').split('?')[0];if(p==='/hero.jpg'){res.writeHead(200,{'Content-Type':'image/jpeg','Cache-Control':'public,max-age=31536000,immutable'});return res.end(HERO_BUF)}if(p==='/api/render'&&req.method==='POST'){try{return send(res,200,{image:await render(await body(req))})}catch(e){console.error(e);return send(res,500,{error:e.message})}}if(p==='/'||p==='/index.html'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store, no-cache, must-revalidate'});return res.end(UI)}res.writeHead(404);res.end('Not found')}).listen(port,'0.0.0.0',()=>console.log('LIV fixed-scene material visualizer on '+port));