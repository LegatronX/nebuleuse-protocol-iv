// Serveur de vérification : prend en charge les requêtes audio partielles iOS.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(process.argv[2] || '.');
const port = Number(process.argv[3] || 8179);
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8','.json':'application/json','.mp3':'audio/mpeg',
  '.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
http.createServer((req,res) => {
  if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405).end(); return; }
  let name;
  try { name = decodeURIComponent(new URL(req.url,'http://localhost').pathname); }
  catch { res.writeHead(400).end(); return; }
  const file = path.resolve(root, '.' + (name.endsWith('/') ? name+'index.html' : name));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.stat(file,(err,stat) => {
    if (err || !stat.isFile()) { res.writeHead(404).end(); return; }
    let start = 0, end = stat.size-1, status = 200;
    const headers = {'Content-Type':types[path.extname(file)]||'application/octet-stream',
      'Accept-Ranges':'bytes','Cache-Control':'no-cache'};
    if (req.headers.range) {
      const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      if (!m || (!m[1]&&!m[2])) { res.writeHead(416,{'Content-Range':`bytes */${stat.size}`}).end(); return; }
      start = m[1] ? Number(m[1]) : Math.max(0,stat.size-Number(m[2]));
      end = m[1]&&m[2] ? Math.min(Number(m[2]),end) : end;
      if (start > end || start >= stat.size) { res.writeHead(416,{'Content-Range':`bytes */${stat.size}`}).end(); return; }
      status = 206; headers['Content-Range'] = `bytes ${start}-${end}/${stat.size}`;
    }
    headers['Content-Length'] = stat.size ? end-start+1 : 0;
    res.writeHead(status,headers);
    if (req.method==='HEAD' || !stat.size) res.end();
    else fs.createReadStream(file,{start,end}).on('error',()=>res.destroy()).pipe(res);
  });
}).listen(port,'127.0.0.1',()=>console.log(`Nébuleuse : http://127.0.0.1:${port}/`));
