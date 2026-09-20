(function(){
'use strict';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const stage=$('#stage'),scene=$('#scene'),photo=$('#poolPhoto'),finishOverlay=$('#finishOverlay'),tileOverlay=$('#tileOverlay'),deckOverlay=$('#deckOverlay'),marker=$('#markerLayer'),editor=$('#editorBar'),status=$('#status');
if(!stage||!scene||!photo||!finishOverlay||!tileOverlay||!deckOverlay) return;

const data={
 finishes:[
  {name:'PebbleSheen Blue Surf',kind:'PebbleSheen',color:'#3d8690'},
  {name:'PebbleTec Tahoe Blue',kind:'PebbleTec',color:'#245f77'},
  {name:'PebbleTec Midnight Blue',kind:'PebbleTec',color:'#17364c'},
  {name:'PebbleTec Caribbean Blue',kind:'PebbleTec',color:'#2da99f'},
  {name:'PebbleSheen Aqua Blue',kind:'PebbleSheen',color:'#56a9b0'},
  {name:'Diamond Brite Cool Blue',kind:'Quartz',color:'#4b91a4'},
  {name:'Diamond Brite French Gray',kind:'Quartz',color:'#959e9b'},
  {name:'Diamond Brite Oyster Quartz',kind:'Quartz',color:'#c7bea7'},
  {name:'Standard White Plaster',kind:'Plaster',color:'#dfe3df'}
 ],
 tiles:[
  {name:'Aquatica Venezia — Lagoon Collection',kind:'6x6 Porcelain',price:'$191.47',img:'https://cdn.shopify.com/s/files/1/1046/5974/6976/files/Aquatica-Venezia-Porcelain-Pool-Tile-6x6-Lagoon-Collection-ECSLAGOVENEZ66A.webp',url:'https://livtile.com/products/aquatica-venezia-porcelain-pool-tile-6x6-lagoon-collection'},
  {name:'Aquatica Blue — Onyx Collection',kind:'6x6 Porcelain',price:'$141.17',img:'https://cdn.shopify.com/s/files/1/1046/5974/6976/files/CVLONYXBLUE6-Onyx-Blue-6-x-6-Porcelain-Pool-Tille.webp',url:'https://livtile.com/products/aquatica-blue-porcelain-pool-tile-6x6-onyx-collection'},
  {name:'Aquatica Coral Sea — Bowline',kind:'Glass Mosaic',price:'$28.67',img:'https://cdn.shopify.com/s/files/1/1046/5974/6976/files/Aquatica-Coral-Sea-Glass-Mosaic-Tile-12x12-Bowline-Collection-AVEBOWLCORALSEA.webp',url:'https://livtile.com/products/aquatica-coral-sea-glass-mosaic-tile-12x12-bowline-collection'},
  {name:'Aquatica Sunset — Canyon Collection',kind:'6x6 Porcelain',price:'$144.45',img:'https://cdn.shopify.com/s/files/1/1046/5974/6976/files/Aquatica-Sunset-Porcelain-Pool-Tile-6x6-Canyon-Collection-ESTCANYSUNSET6-2.webp',url:'https://livtile.com/products/aquatica-sunset-porcelain-pool-tile-6x6-canyon-collection'},
  {name:'Aquatica Nero — District Collection',kind:'6x6 Porcelain',price:'$158.14',img:'https://cdn.shopify.com/s/files/1/1046/5974/6976/files/Aquatica-Nero-Porcelain-Pool-Tile-6x6-District-Collection-SAIDISTNERO6.webp',url:'https://livtile.com/products/aquatica-nero-porcelain-pool-tile-6x6-district-collection'},
  {name:'Aquatica Geraldine — Fleur Collection',kind:'6x6 Porcelain',price:'$96.26',img:'https://cdn.shopify.com/s/files/1/1046/5974/6976/files/Aquatica-Grealdine-Porcelain-Tile-6_x6_-Fleur-Collection-APEFLEUGERAL6.webp',url:'https://livtile.com/products/aquatica-geraldine-porcelain-pool-tile-6x6-fleur-collection'},
  {name:'Aquatica Cordova — Ancient Collection',kind:'6x6 Porcelain',price:'$152.29',img:'https://cdn.shopify.com/s/files/1/1046/5974/6976/files/aquatica-cordova-ancient-series-6x6-porcelain-pool-tile-OSEANCICORDOV6-4-tiles-top-view.webp',url:'https://livtile.com/products/aquatica-cordova-porcelain-pool-tile-6x6-ancient-collection'},
  {name:'Aquatica Sol Bianco — Sol Collection',kind:'6x6 Porcelain',price:'$156.70',img:'https://cdn.shopify.com/s/files/1/1046/5974/6976/files/Aquatica-Sol-Bianco-Porcelain-Pool-Tile-6_x6_-Sol-Collection-EMCSOLGBIANCO6.webp',url:'https://livtile.com/products/aquatica-sol-bianco-porcelain-pool-tile-6x6-sol-collection'}
 ],
 decks:[
  {name:'Talya Gray Marble',kind:'Leathered Paver',price:'$4.99',img:'https://cdn.shopify.com/s/files/1/1046/5974/6976/files/Talya-grey-marble-paveres-tumbled-french-pattern1.jpg',url:'https://livtile.com/products/talya-gray-marble-leathered-pavers'},
  {name:'Aspendos Travertine',kind:'Tumbled Paver',price:'$4.50',img:'https://cdn.shopify.com/s/files/1/1046/5974/6976/files/Aspendos-tarvertine-pavers-pattern-tumbled2.jpg',url:'https://livtile.com/products/aspendos-tumbled-travertine-pavers'},
  {name:'Nexos White Porcelain',kind:'24x24 Paver',price:'$6.60',img:'https://cdn.shopify.com/s/files/1/1046/5974/6976/files/Nexos-white-porcelain-outdoor-pavers-2cm-installed-outside-pavers-boutique-hotel_b88b3d42-627f-4469-aeb4-89c9dc69f998.webp',url:'https://livtile.com/products/nexos-white-outdoor-porcelain-pavers-24x24-thickness-3-4'},
  {name:'Meandros Walnut Travertine',kind:'Tumbled Paver',price:'$4.49',img:'https://cdn.shopify.com/s/files/1/1046/5974/6976/files/Meandros-Walnut-travertine-pavers-pattern-tumbled1.jpg',url:'https://livtile.com/products/meandros-walnut-travertine-pattern-pavers'},
  {name:'Solto White Marble',kind:'Leathered Paver',price:'$4.99',img:'https://cdn.shopify.com/s/files/1/1046/5974/6976/files/solto-white-marble-pattern-pavers-leather-finish6.jpg',url:'https://livtile.com/products/solto-white-marble-leathered-pavers'},
  {name:'Nexos Gray Porcelain',kind:'24x24 Paver',price:'$6.60',img:'https://cdn.shopify.com/s/files/1/1046/5974/6976/files/nexos-gray-roomscene.jpg',url:'https://livtile.com/products/nexos-gray-outdoor-porcelain-pavers-24x24-thickness-3-4'},
  {name:'Shell Stone Limestone',kind:'Tumbled Paver',price:'$4.99',img:'https://cdn.shopify.com/s/files/1/1046/5974/6976/files/shell-stone-limestone-pavers-tumbled4.jpg',url:'https://livtile.com/products/shell-stone-white-tumbled-limestone-pavers'},
  {name:'Turkish Carrara Marble',kind:'Leathered Paver',price:'$4.99',img:'https://cdn.shopify.com/s/files/1/1046/5974/6976/files/Turkish-Carrara-white-marble-pavers-pattern2.jpg',url:'https://livtile.com/products/turkish-carrara-white-marble-leathered-pavers'}
 ],
 yards:[
  {name:'Modern Desert',kind:'Palms, desert planting and clean walls'},
  {name:'Green Resort',kind:'Lush planting and resort feel'},
  {name:'Contemporary',kind:'Architectural and minimal'}
 ]
};
const selected={finish:0,tile:0,deck:0,yard:0};
const defaultMasks={
 pool:[[7,55],[20,49],[48,48],[77,44],[97,62],[91,92],[58,97],[24,92],[7,76]],
 tile:[[9,51],[24,47],[50,46],[78,42],[98,59],[97,65],[78,49],[50,52],[24,54],[9,57]],
 deck:[[0,58],[12,51],[25,57],[40,70],[100,57],[100,100],[0,100]]
};
const masks={pool:[],tile:[],deck:[]};
let editType=null,points=[],editQueue=[],objectUrl='',scale=1,tx=0,ty=0,drag=false,lastX=0,lastY=0;

function cloneMask(m){return m.map(p=>[p[0],p[1]])}
function resetMasks(){masks.pool=cloneMask(defaultMasks.pool);masks.tile=cloneMask(defaultMasks.tile);masks.deck=cloneMask(defaultMasks.deck);applyMasks()}
function polygon(m){return 'polygon('+m.map(p=>p[0].toFixed(2)+'% '+p[1].toFixed(2)+'%').join(',')+')'}
function applyMasks(){finishOverlay.style.clipPath=polygon(masks.pool);tileOverlay.style.clipPath=polygon(masks.tile);deckOverlay.style.clipPath=polygon(masks.deck)}
function setStatus(msg,type){status.className='status '+(type||'');status.textContent=msg}
function cardMarkup(item,type,index){
 const image=type==='finish'?'<div class="swatch" style="background:linear-gradient(135deg,'+item.color+',#e7ecea)"></div>':'<img src="'+item.img+'" alt="">';
 const price=item.price?'<strong>'+item.price+'</strong>':'';
 return '<button class="card'+(selected[type]===index?' selected':'')+'" data-type="'+type+'" data-index="'+index+'">'+image+'<b>'+item.name+'</b><span>'+item.kind+'</span>'+price+'</button>';
}
function renderCards(){
 $('#finishCards').innerHTML=data.finishes.map((x,i)=>cardMarkup(x,'finish',i)).join('');
 $('#tileCards').innerHTML=data.tiles.map((x,i)=>cardMarkup(x,'tile',i)).join('');
 $('#deckCards').innerHTML=data.decks.map((x,i)=>cardMarkup(x,'deck',i)).join('');
 $('#yardCards').innerHTML=data.yards.map((x,i)=>'<button class="card'+(selected.yard===i?' selected':'')+'" data-type="yard" data-index="'+i+'"><div class="swatch" style="background:linear-gradient(135deg,'+(i===0?'#b6a27c,#6e835e':i===1?'#6ea06c,#bad2b0':'#727e78,#c1b9aa')+')"></div><b>'+x.name+'</b><span>'+x.kind+'</span></button>').join('');
}
function updatePreview(){
 const f=data.finishes[selected.finish],t=data.tiles[selected.tile],d=data.decks[selected.deck],y=data.yards[selected.yard];
 finishOverlay.style.background=f.color;
 tileOverlay.style.backgroundImage='url("'+t.img+'")';
 deckOverlay.style.backgroundImage='url("'+d.img+'")';
 $('#sumFinish').textContent=f.name;$('#sumTile').textContent=t.name;$('#sumDeck').textContent=d.name;$('#sumYard').textContent=y.name;
 $('#tileLink').href=t.url;$('#tileLink').textContent='View selected tile — '+t.price;
 $('#deckLink').href=d.url;$('#deckLink').textContent='View selected deck — '+d.price;
 renderCards();
}
document.addEventListener('click',e=>{
 const card=e.target.closest('.card[data-type]');if(!card)return;
 const type=card.dataset.type,index=Number(card.dataset.index);selected[type]=index;updatePreview();setStatus((type==='finish'?data.finishes[index]:type==='tile'?data.tiles[index]:type==='deck'?data.decks[index]:data.yards[index]).name+' selected. Preview updated instantly.','ok');
});
$$('.tab').forEach(b=>b.addEventListener('click',()=>{$$('.tab').forEach(x=>x.classList.toggle('active',x===b));$$('.panel').forEach(p=>p.classList.toggle('active',p.id===b.dataset.panel))}));

function resetView(){scale=1;tx=0;ty=0;applyView()}
function applyView(){scene.style.transform='translate3d('+tx+'px,'+ty+'px,0) scale('+scale+')'}
function zoomBy(f){scale=Math.max(1,Math.min(4,scale*f));if(scale===1){tx=0;ty=0}applyView()}
$('#zoomIn').onclick=e=>{e.stopPropagation();zoomBy(1.25)};$('#zoomOut').onclick=e=>{e.stopPropagation();zoomBy(.8)};$('#zoomReset').onclick=e=>{e.stopPropagation();resetView()};
stage.addEventListener('wheel',e=>{if(stage.classList.contains('editing'))return;e.preventDefault();zoomBy(e.deltaY<0?1.12:.89)},{passive:false});
stage.addEventListener('pointerdown',e=>{if(stage.classList.contains('editing')||e.target.closest('.zoomTools')||scale<=1)return;drag=true;lastX=e.clientX;lastY=e.clientY;stage.setPointerCapture(e.pointerId)});
stage.addEventListener('pointermove',e=>{if(!drag)return;tx+=e.clientX-lastX;ty+=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;applyView()});
stage.addEventListener('pointerup',()=>drag=false);stage.addEventListener('pointercancel',()=>drag=false);

function resizeFile(file){
 return new Promise((resolve,reject)=>{const fr=new FileReader();fr.onload=()=>{const img=new Image();img.onload=()=>{const max=1800,r=Math.min(1,max/Math.max(img.width,img.height)),w=Math.round(img.width*r),h=Math.round(img.height*r),c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);resolve(c.toDataURL('image/jpeg',.9))};img.onerror=reject;img.src=fr.result};fr.onerror=reject;fr.readAsDataURL(file)});
}
$('#photoInput').addEventListener('change',async e=>{const file=e.target.files&&e.target.files[0];if(!file)return;setStatus('Loading your pool photo...','warn');try{const src=await resizeFile(file);photo.src=src;finishOverlay.style.opacity='0';tileOverlay.style.opacity='0';deckOverlay.style.opacity='0';resetView();setStatus('Photo loaded. Tap Mark photo areas and outline the pool, waterline and deck once.','warn')}catch(err){setStatus('That photo could not be loaded. Try a JPG or PNG.','error')}});
$('#demoPhoto').onclick=()=>{photo.src='/hero.jpg?v=20260920b';resetMasks();finishOverlay.style.opacity=Number($('#finishOpacity').value)/100;tileOverlay.style.opacity=Number($('#tileOpacity').value)/100;deckOverlay.style.opacity=Number($('#deckOpacity').value)/100;resetView();setStatus('Demo photo restored. Tap any material to preview it.','ok')};
$('#markAreas').onclick=()=>{editQueue=['tile','deck'];startEdit('pool')};
$$('.editArea').forEach(b=>b.onclick=()=>startEdit(b.dataset.surface));

function startEdit(type){resetView();editType=type;points=[];stage.classList.add('editing');editor.classList.remove('hidden');$('#editorTitle').textContent='Mark '+(type==='pool'?'pool interior':type==='tile'?'waterline tile band':'deck / coping');drawPoints();setStatus('Tap around the '+(type==='pool'?'pool interior':type==='tile'?'waterline tile':'deck')+', then press Done.','warn')}
function drawPoints(){marker.innerHTML='';points.forEach(p=>{const dot=document.createElement('i');dot.style.left=p[0]+'%';dot.style.top=p[1]+'%';marker.appendChild(dot)})}
marker.addEventListener('pointerdown',e=>{if(!editType)return;const r=marker.getBoundingClientRect();const x=(e.clientX-r.left)/r.width*100,y=(e.clientY-r.top)/r.height*100;if(x>=0&&x<=100&&y>=0&&y<=100){points.push([x,y]);drawPoints()}});
$('#undoPoint').onclick=()=>{points.pop();drawPoints()};$('#clearPoints').onclick=()=>{points=[];drawPoints()};
function stopEdit(){editType=null;points=[];drawPoints();stage.classList.remove('editing');editor.classList.add('hidden')}
$('#cancelPoints').onclick=()=>{editQueue=[];stopEdit();setStatus('Area marking cancelled.','warn')};
$('#donePoints').onclick=()=>{if(points.length<3)return setStatus('Add at least 3 points before pressing Done.','warn');masks[editType]=cloneMask(points);applyMasks();if(editType==='pool')finishOverlay.style.opacity=Number($('#finishOpacity').value)/100;if(editType==='tile')tileOverlay.style.opacity=Number($('#tileOpacity').value)/100;if(editType==='deck')deckOverlay.style.opacity=Number($('#deckOpacity').value)/100;const saved=editType;stopEdit();setStatus((saved==='pool'?'Pool':saved==='tile'?'Waterline':'Deck')+' area saved.','ok');if(editQueue.length)setTimeout(()=>startEdit(editQueue.shift()),150)};

function bindRange(id,overlay,prop,suffix){const input=$('#'+id),out=input.parentElement.querySelector('output');const update=()=>{if(prop==='opacity')overlay.style.opacity=Number(input.value)/100;else overlay.style.backgroundSize=input.value+'px auto';out.textContent=input.value+suffix};input.addEventListener('input',update);update()}
bindRange('finishOpacity',finishOverlay,'opacity','%');bindRange('tileOpacity',tileOverlay,'opacity','%');bindRange('tileScale',tileOverlay,'size','px');bindRange('deckOpacity',deckOverlay,'opacity','%');bindRange('deckScale',deckOverlay,'size','px');

$('#addFinish').onclick=()=>{const name=$('#customFinishName').value.trim();if(!name)return setStatus('Type the custom finish name first.','warn');const color=$('#customFinishColor').value;data.finishes.push({name:name,kind:'Custom pool finish',color:color});selected.finish=data.finishes.length-1;updatePreview();setStatus(name+' added and selected.','ok')};

function estimate(){const l=Number($('#poolLength').value),w=Number($('#poolWidth').value),d=Number($('#deckWidth').value),per=2*(l+w);$('#estTile').textContent='~'+Math.ceil(per*.5*1.1)+' sq ft incl. waste';$('#estDeck').textContent='~'+Math.ceil(((l+2*d)*(w+2*d)-l*w)*1.1)+' sq ft incl. waste';$('#estCoping').textContent='~'+Math.ceil(per)+' ln ft'}
$$('#poolLength,#poolWidth,#deckWidth').forEach(x=>x.addEventListener('change',estimate));

photo.addEventListener('error',()=>setStatus('Demo photo failed to load. Reload the page once; if it repeats, tell us.','error'));
photo.addEventListener('load',()=>{if(photo.naturalWidth>0&&status.classList.contains('error'))setStatus('Photo loaded.','ok')});
resetMasks();renderCards();updatePreview();estimate();
})();