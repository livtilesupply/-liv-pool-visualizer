
(()=>{
'use strict';
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const hero=$('#hero'), scene=$('#scene'), photo=$('#photo'), finishOv=$('#finishOv'), tileOv=$('#tileOv'), deckOv=$('#deckOv'), status=$('#status');
const original=photo.src;
const F=[
['PebbleSheen Blue Surf','PebbleSheen','#3d8690'],['PebbleTec Tahoe Blue','PebbleTec','#245f77'],['PebbleTec Midnight Blue','PebbleTec','#17364c'],['PebbleTec Caribbean Blue','PebbleTec','#2da99f'],['Diamond Brite Cool Blue','Quartz','#4b91a4'],['Diamond Brite French Gray','Quartz','#959e9b'],['Standard White Plaster','Plaster','#dfe3df']
];
const T=[
['Aquatica Venezia — Lagoon','$191.47','#215b75','https://cdn.shopify.com/s/files/1/1046/5974/6976/files/Aquatica-Venezia-Porcelain-Pool-Tile-6x6-Lagoon-Collection-ECSLAGOVENEZ66A.webp','https://livtile.com/products/aquatica-venezia-porcelain-pool-tile-6x6-lagoon-collection'],
['Aquatica Blue — Onyx','$141.17','#295f80','https://cdn.shopify.com/s/files/1/1046/5974/6976/files/CVLONYXBLUE6-Onyx-Blue-6-x-6-Porcelain-Pool-Tille.webp','https://livtile.com/products/aquatica-blue-porcelain-pool-tile-6x6-onyx-collection'],
['Aquatica Coral Sea — Bowline','$28.67','#66a9b7','https://cdn.shopify.com/s/files/1/1046/5974/6976/files/Aquatica-Coral-Sea-Glass-Mosaic-Tile-12x12-Bowline-Collection-AVEBOWLCORALSEA.webp','https://livtile.com/products/aquatica-coral-sea-glass-mosaic-tile-12x12-bowline-collection'],
['Aquatica Sunset — Canyon','$144.45','#72828b','https://cdn.shopify.com/s/files/1/1046/5974/6976/files/Aquatica-Sunset-Porcelain-Pool-Tile-6x6-Canyon-Collection-ESTCANYSUNSET6-2.webp','https://livtile.com/products/aquatica-sunset-porcelain-pool-tile-6x6-canyon-collection'],
['Aquatica Nero — District','$158.14','#25343b','https://cdn.shopify.com/s/files/1/1046/5974/6976/files/Aquatica-Nero-Porcelain-Pool-Tile-6x6-District-Collection-SAIDISTNERO6.webp','https://livtile.com/products/aquatica-nero-porcelain-pool-tile-6x6-district-collection'],
['Aquatica Sol Bianco — Sol','$156.70','#d9d6c9','https://cdn.shopify.com/s/files/1/1046/5974/6976/files/Aquatica-Sol-Bianco-Porcelain-Pool-Tile-6_x6_-Sol-Collection-EMCSOLGBIANCO6.webp','https://livtile.com/products/aquatica-sol-bianco-porcelain-pool-tile-6x6-sol-collection']
];
const D=[
['Talya Gray Marble','$4.99','#c8c8c3','https://cdn.shopify.com/s/files/1/1046/5974/6976/files/Talya-grey-marble-paveres-tumbled-french-pattern1.jpg','https://livtile.com/products/talya-gray-marble-leathered-pavers'],
['Aspendos Travertine','$4.50','#c9af90','https://cdn.shopify.com/s/files/1/1046/5974/6976/files/Aspendos-tarvertine-pavers-pattern-tumbled2.jpg','https://livtile.com/products/aspendos-tumbled-travertine-pavers'],
['Nexos White Porcelain','$6.60','#dddcd6','https://cdn.shopify.com/s/files/1/1046/5974/6976/files/Nexos-white-porcelain-outdoor-pavers-2cm-installed-outside-pavers-boutique-hotel_b88b3d42-627f-4469-aeb4-89c9dc69f998.webp','https://livtile.com/products/nexos-white-outdoor-porcelain-pavers-24x24-thickness-3-4'],
['Meandros Walnut Travertine','$4.49','#a78d73','https://cdn.shopify.com/s/files/1/1046/5974/6976/files/Meandros-Walnut-travertine-pavers-pattern-tumbled1.jpg','https://livtile.com/products/meandros-walnut-travertine-pattern-pavers'],
['Solto White Marble','$4.99','#e0ddd5','https://cdn.shopify.com/s/files/1/1046/5974/6976/files/solto-white-marble-pattern-pavers-leather-finish6.jpg','https://livtile.com/products/solto-white-marble-leathered-pavers'],
['Nexos Gray Porcelain','$6.60','#aeb3b0','https://cdn.shopify.com/s/files/1/1046/5974/6976/files/nexos-gray-roomscene.jpg','https://livtile.com/products/nexos-gray-outdoor-porcelain-pavers-24x24-thickness-3-4']
];
const Y=[['Modern Desert','#b6a27c','#70825e'],['Green Resort','#6e9f6e','#b8d2b0'],['Contemporary','#727d78','#bbb4aa']];
let sel={f:0,t:0,d:0,y:0};
const demoTileMasks=[
 [[25.0,26.0],[49.3,25.5],[49.3,45.0],[25.0,45.0]],
 [[49.5,22.0],[91.3,17.8],[91.8,21.5],[49.5,25.4]],
 [[91.4,21.7],[100,26.5],[100,29.6],[91.7,24.8]],
 [[0,44.2],[22.8,28.0],[23.3,31.3],[0,48.8]],
 [[19.6,19.7],[49.7,19.8],[49.8,22.8],[20.0,22.7]]
];
const demoDeckMasks=[
 [[0,88.0],[91.0,88.0],[100,84.5],[100,100],[0,100]],
 [[0,37.0],[20.5,23.5],[23.2,25.8],[2.8,42.2],[0,42.8]],
 [[49.2,15.8],[91.8,12.1],[92.2,16.7],[49.8,20.0]],
 [[91.7,12.0],[100,8.5],[100,24.0],[92.4,20.0]]
];
const extraTile=[], extraDeck=[];
function makePiece(kind){
 const el=document.createElement('div');
 el.className='ov materialPiece '+kind+'Piece';
 scene.appendChild(el);
 return el;
}
for(let i=1;i<demoTileMasks.length;i++) extraTile.push(makePiece('tile'));
for(let i=1;i<demoDeckMasks.length;i++) extraDeck.push(makePiece('deck'));
const def={pool:[[0,60],[13,49],[21,39],[48,35],[89,30],[100,44],[100,88],[72,92],[50,86],[24,88],[0,77]],tile:[[49,22],[90,16],[92,20],[50,27]],deck:[[0,88],[30,83],[55,85],[100,86],[100,100],[0,100]]};
let masks={pool:def.pool.map(p=>p.slice()),tile:def.tile.map(p=>p.slice()),deck:def.deck.map(p=>p.slice())};
let edit=null,pts=[],queue=[],scale=1,tx=0,ty=0,drag=false,lx=0,ly=0;
const poly=a=>'polygon('+a.map(p=>p[0]+'% '+p[1]+'%').join(',')+')';
function masksApply(){finishOv.style.clipPath=poly(masks.pool);tileOv.style.clipPath=poly(masks.tile);deckOv.style.clipPath=poly(masks.deck)}
function applyDemoPieces(){
 tileOv.style.display='block';deckOv.style.display='block';
 tileOv.style.clipPath=poly(demoTileMasks[0]);deckOv.style.clipPath=poly(demoDeckMasks[0]);
 extraTile.forEach((el,i)=>{el.style.display='block';el.style.clipPath=poly(demoTileMasks[i+1])});
 extraDeck.forEach((el,i)=>{el.style.display='block';el.style.clipPath=poly(demoDeckMasks[i+1])});
}
function hideExtraPieces(){extraTile.forEach(el=>el.style.display='none');extraDeck.forEach(el=>el.style.display='none')}
function allTilePieces(){return [tileOv].concat(extraTile)}
function allDeckPieces(){return [deckOv].concat(extraDeck)}
function state(msg,type=''){status.className='status '+type;status.textContent=msg}
function card(root,arr,type){
 root.innerHTML=arr.map((x,i)=>'<button class="card '+(sel[type]===i?'selected':'')+'" data-type="'+type+'" data-i="'+i+'"><div class="sw" style="'+(type==='f'?'background:linear-gradient(135deg,'+x[2]+',#e7ecea)':type==='y'?'background:linear-gradient(135deg,'+x[1]+','+x[2]+')':'background-color:'+x[2]+';background-image:url(\''+x[3]+'\')')+'"></div><b>'+x[0]+'</b><span>'+(type==='f'?x[1]:type==='y'?'Landscape direction':'LIV Tile product')+'</span>'+((type==='t'||type==='d')?'<strong>'+x[1]+'</strong>':'')+'</button>').join('');
}
function renderCards(){card($('#finishes'),F,'f');card($('#tiles'),T,'t');card($('#decks'),D,'d');card($('#yards'),Y,'y')}
function update(){
 const f=F[sel.f],t=T[sel.t],d=D[sel.d],y=Y[sel.y];
 finishOv.style.background='linear-gradient(180deg,'+f[2]+', '+f[2]+')';
 allTilePieces().forEach(el=>{
  el.style.backgroundColor=t[2];
  el.style.backgroundImage='url("'+t[3]+'"),linear-gradient(90deg,rgba(255,255,255,.20) 1px,transparent 1px),linear-gradient(rgba(255,255,255,.16) 1px,transparent 1px),linear-gradient(135deg,'+t[2]+',#d9e6e6)';
  el.style.backgroundPosition='center';el.style.backgroundRepeat='repeat';
 });
 allDeckPieces().forEach(el=>{
  el.style.backgroundColor=d[2];
  el.style.backgroundImage='url("'+d[3]+'"),linear-gradient(90deg,rgba(90,90,90,.10) 1px,transparent 1px),linear-gradient(rgba(90,90,90,.08) 1px,transparent 1px),linear-gradient(135deg,'+d[2]+',#ece9e2)';
  el.style.backgroundPosition='center';el.style.backgroundRepeat='repeat';
 });
 $('#sf').textContent=f[0];$('#st').textContent=t[0];$('#sd').textContent=d[0];$('#sy').textContent=y[0];
 $('#tileLink').href=t[4];$('#tileLink').textContent='VIEW SELECTED TILE — '+t[1];$('#deckLink').href=d[4];$('#deckLink').textContent='VIEW SELECTED DECK — '+d[1];
 renderCards();
}
document.addEventListener('click',e=>{const c=e.target.closest('.card[data-type]');if(!c)return;sel[c.dataset.type]=+c.dataset.i;update();state(c.querySelector('b').textContent+' selected. Preview updated.','ok')})
$$('.tab').forEach(b=>b.onclick=()=>{$$('.tab').forEach(x=>x.classList.toggle('active',x===b));$$('.panel').forEach(p=>p.classList.toggle('active',p.id===b.dataset.p))})
function view(){scene.style.transform='translate('+tx+'px,'+ty+'px) scale('+scale+')'}
function resetView(){scale=1;tx=ty=0;view()}
function zoom(f){scale=Math.max(1,Math.min(4,scale*f));if(scale===1)tx=ty=0;view()}
$('#zin').onclick=()=>zoom(1.25);$('#zout').onclick=()=>zoom(.8);$('#zreset').onclick=resetView;
hero.onpointerdown=e=>{if(hero.classList.contains('editing')||scale<=1||e.target.closest('.zoom'))return;drag=true;lx=e.clientX;ly=e.clientY;hero.setPointerCapture(e.pointerId)}
hero.onpointermove=e=>{if(!drag)return;tx+=e.clientX-lx;ty+=e.clientY-ly;lx=e.clientX;ly=e.clientY;view()}
hero.onpointerup=hero.onpointercancel=()=>drag=false;
function resize(file){return new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const m=1800,s=Math.min(1,m/Math.max(im.width,im.height)),w=Math.round(im.width*s),h=Math.round(im.height*s),c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(im,0,0,w,h);ok(c.toDataURL('image/jpeg',.9))};im.onerror=no;im.src=r.result};r.onerror=no;r.readAsDataURL(file)})}
$('#upload').onchange=async e=>{const f=e.target.files&&e.target.files[0];if(!f)return;try{photo.src=await resize(f);hideExtraPieces();finishOv.style.opacity=tileOv.style.opacity=deckOv.style.opacity=0;resetView();$('#mark').classList.remove('hiddenBtn');state('Photo loaded. Tap SET AREAS FOR THIS PHOTO once, then your materials will stay inside those exact areas.','warn')}catch{state('Could not load that image. Try JPG or PNG.','error')}}
$('#demo').onclick=()=>{queue=[];edit=null;pts=[];draw();hero.classList.remove('editing');$('#editBar').classList.remove('active');$('#mark').classList.add('hiddenBtn');photo.src=original;masks={pool:def.pool.map(p=>p.slice()),tile:def.tile.map(p=>p.slice()),deck:def.deck.map(p=>p.slice())};masksApply();applyDemoPieces();applyRanges();resetView();state('Demo photo restored. Tap any material — the product texture will appear on the matching surface.','ok')}
$('#mark').onclick=()=>{queue=['tile','deck'];startEdit('pool')};$$('[data-edit]').forEach(b=>b.onclick=()=>startEdit(b.dataset.edit));
function draw(){const l=$('#editLayer');l.innerHTML='';pts.forEach(p=>{const d=document.createElement('i');d.className='dot';d.style.left=p[0]+'%';d.style.top=p[1]+'%';l.appendChild(d)})}
function startEdit(t){edit=t;pts=[];resetView();hero.classList.add('editing');$('#editBar').classList.add('active');$('#editTitle').textContent='Mark '+(t==='pool'?'pool interior':t==='tile'?'waterline tile band':'deck / coping');draw();state('Tap around the '+t+' area, then press Done.','warn')}
$('#editLayer').onclick=e=>{const r=e.currentTarget.getBoundingClientRect();pts.push([((e.clientX-r.left)/r.width*100),((e.clientY-r.top)/r.height*100)]);draw()}
$('#undo').onclick=()=>{pts.pop();draw()};$('#clear').onclick=()=>{pts=[];draw()};$('#cancel').onclick=()=>{queue=[];edit=null;pts=[];draw();hero.classList.remove('editing');$('#editBar').classList.remove('active');state('Area editing cancelled.','warn')}
$('#done').onclick=()=>{if(pts.length<3)return state('Add at least 3 points.','warn');masks[edit]=pts.map(p=>p.slice());masksApply();const was=edit;edit=null;pts=[];draw();hero.classList.remove('editing');$('#editBar').classList.remove('active');if(was==='pool')finishOv.style.opacity=$('#fo').value/100;if(was==='tile')tileOv.style.opacity=$('#to').value/100;if(was==='deck')deckOv.style.opacity=$('#do').value/100;state('Area saved.','ok');if(queue.length)startEdit(queue.shift())}
function bind(id,el,kind,sfx){const x=$('#'+id),o=x.parentElement.querySelector('output');const go=()=>{
 if(kind==='o'){
   if(el===tileOv) allTilePieces().forEach(p=>p.style.opacity=x.value/100);
   else if(el===deckOv) allDeckPieces().forEach(p=>p.style.opacity=x.value/100);
   else el.style.opacity=x.value/100;
 }else{
   if(el===tileOv){
     const f=[1.0,.72,.62,.76,.68];
     allTilePieces().forEach((p,i)=>p.style.backgroundSize=Math.max(10,Math.round(x.value*(f[i]||.7)))+'px auto');
   } else if(el===deckOv){
     const f=[1.0,.72,.62,.58];
     allDeckPieces().forEach((p,i)=>p.style.backgroundSize=Math.max(42,Math.round(x.value*(f[i]||.65)))+'px auto');
   } else el.style.backgroundSize=x.value+'px auto';
 }
 o.textContent=x.value+sfx
};x.oninput=go;go()}
function applyRanges(){bind('fo',finishOv,'o','%');bind('to',tileOv,'o','%');bind('ts',tileOv,'s','px');bind('do',deckOv,'o','%');bind('ds',deckOv,'s','px')}
$('#addCustom').onclick=()=>{const n=$('#customName').value.trim();if(!n)return state('Type a finish name first.','warn');F.push([n,'Custom',$('#customColor').value]);sel.f=F.length-1;update();state(n+' added.','ok')}
function est(){const l=+$('#len').value,w=+$('#wid').value,d=+$('#dw').value,p=2*(l+w);$('#et').textContent='~'+Math.ceil(p*.5*1.1)+' sq ft';$('#ed').textContent='~'+Math.ceil(((l+2*d)*(w+2*d)-l*w)*1.1)+' sq ft';$('#ec').textContent='~'+Math.ceil(p)+' ln ft'}
$$('#len,#wid,#dw').forEach(s=>s.onchange=est);
masksApply();applyDemoPieces();applyRanges();update();est();$('#mark').classList.add('hiddenBtn');
window.__LIV_READY__=true;
})();
