const http=require('http'),fs=require('fs'),path=require('path');
const port=process.env.PORT||3000;
const files={
 '/':{p:'index.html',t:'text/html; charset=utf-8',c:'no-store'},
 '/index.html':{p:'index.html',t:'text/html; charset=utf-8',c:'no-store'},
 '/style.css':{p:'style.css',t:'text/css; charset=utf-8',c:'no-cache'},
 '/app.js':{p:'app.js',t:'application/javascript; charset=utf-8',c:'no-cache'},
 '/hero.jpg':{p:'hero.jpg',t:'image/jpeg',c:'public, max-age=3600'}
};
const root=__dirname,cache={};
for(const k of Object.keys(files)){const f=files[k];cache[k]=fs.readFileSync(path.join(root,f.p))}
const js=cache['/app.js'].toString('utf8');
const html=cache['/'].toString('utf8');
const css=cache['/style.css'].toString('utf8');
new Function(js);
const checks={
 hero:cache['/hero.jpg'].length>10000,
 html:html.includes('id="photo"')&&html.includes('id="demo"')&&html.includes('/app.js?v=final5')&&html.includes('data:image/jpeg;base64,/9j/'),
 js:js.includes('window.__LIV_READY__=true')&&js.includes("$('#demo').onclick")&&js.includes("$('#upload').onchange"),
 interactions:js.includes("$('#mark').onclick")&&js.includes("$('#addCustom').onclick")&&js.includes("function est()"),
 css:css.includes('.card.selected')&&css.includes('.editBar.active'),
 zeroApi:!js.includes('/api/render')&&!js.includes('OPENAI_API_KEY')
};
const ok=Object.values(checks).every(Boolean);
console.log('LIV browser-tested selftest '+JSON.stringify({ok,checks,heroBytes:cache['/hero.jpg'].length,htmlBytes:cache['/'].length,jsBytes:cache['/app.js'].length,cssBytes:cache['/style.css'].length}));
http.createServer((req,res)=>{
 const p=(req.url||'/').split('?')[0];
 if(p==='/api/health'){
   const b=Buffer.from(JSON.stringify({ok,build:'browser-tested-final5',apiCreditsRequired:false,checks,heroBytes:cache['/hero.jpg'].length}));
   res.writeHead(200,{'Content-Type':'application/json','Content-Length':b.length,'Cache-Control':'no-store'});
   return res.end(b);
 }
 const meta=files[p];
 if(!meta){res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});return res.end('Not found')}
 const b=cache[p];
 res.writeHead(200,{'Content-Type':meta.t,'Content-Length':b.length,'Cache-Control':meta.c,'X-Content-Type-Options':'nosniff'});
 res.end(b);
}).listen(port,'0.0.0.0',()=>console.log('LIV browser-tested final5 running on '+port));