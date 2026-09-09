const http=require('http');const fs=require('fs');const path=require('path');const port=process.env.PORT||3000;
function loadUI(){const dir=path.join(__dirname,'ui-live');const files=fs.readdirSync(dir).filter(n=>n.endsWith('.txt')).sort();let html=files.map(n=>fs.readFileSync(path.join(dir,n),'utf8')).join('');if(!html.includes('Design Your Pool'))throw new Error('UI missing');
html=html.replace('https://images.unsplash.com/photo-1572331165267-854da2b10ccc?auto=format&fit=crop&w=1800&q=85','https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1800&q=85');
html=html.replace('</body>',`<style>
.hero>img{filter:saturate(.96)}.waterTint{mix-blend-mode:multiply!important;opacity:.42!important}.tileOverlay{mix-blend-mode:normal!important;opacity:.94!important;background-repeat:repeat!important}.deckOverlay{mix-blend-mode:multiply!important;opacity:.34!important;background-repeat:repeat!important}
.renderStatus{position:absolute;right:16px;bottom:16px;background:rgba(8,17,17,.82);color:#fff;padding:9px 12px;border-radius:999px;font:700 11px Arial;z-index:8;opacity:0;transition:.2s}.renderStatus.show{opacity:1}
</style><script>
(function(){
const hero=document.querySelector('.hero'),water=document.querySelector('.waterTint'),tile=document.querySelector('.tileOverlay'),deck=document.querySelector('.deckOverlay');
const status=document.createElement('div');status.className='renderStatus';status.textContent='Preview updated';hero.appendChild(status);
const finishColors={f1:'#3d8690',f2:'#245f77',f3:'#17364c',f4:'#2da99f',f5:'#56a9b0',f6:'#4b91a4',f7:'#959e9b',f8:'#c7bea7',f9:'#dfe3df',f10:'#8ec7d9',f11:'#4d94ae'};
function flash(){status.classList.add('show');clearTimeout(window.__livT);window.__livT=setTimeout(()=>status.classList.remove('show'),900)}
function selected(name){return document.querySelector('input[name="'+name+'"]:checked')}
function apply(){const f=selected('finish'),t=selected('tile'),d=selected('deck');if(f&&finishColors[f.id])water.style.backgroundColor=finishColors[f.id];
if(t){const lab=document.querySelector('label[for="'+t.id+'"] img');if(lab&&lab.src){tile.style.backgroundImage='url("'+lab.src+'")';tile.style.backgroundSize='54px 54px';}}
if(d){const lab=document.querySelector('label[for="'+d.id+'"] img');if(lab&&lab.src){deck.style.backgroundImage='url("'+lab.src+'")';deck.style.backgroundSize='210px 210px';}else if(d.id==='d9'){deck.style.backgroundImage='none';deck.style.backgroundColor='#c8c8c3';}}
flash();}
document.querySelectorAll('input[name="finish"],input[name="tile"],input[name="deck"]').forEach(x=>x.addEventListener('change',apply));apply();
})();
</script></body>`);return html;}
let UI;try{UI=loadUI();console.log('Loaded residential LIV visualizer',UI.length)}catch(e){console.error(e);UI='<!doctype html><h1>LIV Visualizer temporarily unavailable</h1>'}
http.createServer((req,res)=>{const p=decodeURIComponent((req.url||'/').split('?')[0]);if(p==='/'||p===''||p==='/index.html'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store, no-cache, must-revalidate, max-age=0','Pragma':'no-cache','Expires':'0'});return res.end(UI)}res.writeHead(404);res.end('Not found')}).listen(port,'0.0.0.0',()=>console.log('LIV Pool Visualizer running on '+port));