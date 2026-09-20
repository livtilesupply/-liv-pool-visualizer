const http=require('http'),fs=require('fs'),path=require('path');
const port=process.env.PORT||3000;
const files={
 '/':{p:'index.html',t:'text/html; charset=utf-8',c:'no-store'},
 '/index.html':{p:'index.html',t:'text/html; charset=utf-8',c:'no-store'},
 '/style.css':{p:'style.css',t:'text/css; charset=utf-8',c:'no-cache'},
 '/app.js':{p:'app.js',t:'application/javascript; charset=utf-8',c:'no-cache'},
 '/hero.jpg':{p:'hero.jpg',t:'image/jpeg',c:'public, max-age=3600'}
};
const root=__dirname;
const cache={};
for(const k of Object.keys(files)){const f=files[k];cache[k]=fs.readFileSync(path.join(root,f.p))}
const js=cache['/app.js'].toString('utf8');new Function(js);
const html=cache['/'].toString('utf8');
const checks={hero:cache['/hero.jpg'].length>10000,html:html.includes('id="poolPhoto"')&&html.includes('/app.js'),js:js.includes("resetMasks();renderCards();updatePreview();estimate();")&&js.includes("$('#demoPhoto').onclick"),zeroApi:!js.includes('/api/')};
console.log('LIV standalone selftest '+JSON.stringify({ok:Object.values(checks).every(Boolean),checks,heroBytes:cache['/hero.jpg'].length,htmlBytes:cache['/'].length,jsBytes:cache['/app.js'].length}));
http.createServer((req,res)=>{const p=(req.url||'/').split('?')[0];if(p==='/api/health'){const b=Buffer.from(JSON.stringify({ok:Object.values(checks).every(Boolean),build:'standalone-zero-api-20260920b',apiCreditsRequired:false,checks,heroBytes:cache['/hero.jpg'].length}));res.writeHead(200,{'Content-Type':'application/json','Content-Length':b.length,'Cache-Control':'no-store'});return res.end(b)}const meta=files[p];if(!meta){res.writeHead(404,{'Content-Type':'text/plain'});return res.end('Not found')}const b=cache[p];res.writeHead(200,{'Content-Type':meta.t,'Content-Length':b.length,'Cache-Control':meta.c,'X-Content-Type-Options':'nosniff'});res.end(b)}).listen(port,'0.0.0.0',()=>console.log('LIV standalone zero-API visualizer running on '+port));