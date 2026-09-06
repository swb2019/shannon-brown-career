import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { gzipSync } from 'node:zlib';
const root=resolve(existsSync('.openai/hosting.json')?'dist':'.');
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.pdf':'application/pdf','.xml':'application/xml'};
createServer(async(req,res)=>{try{let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(pathname.startsWith('/shannon-brown-career/'))pathname=pathname.slice('/shannon-brown-career'.length);let file=resolve(root,'.'+pathname);if(!file.startsWith(root+'/')&&file!==root){res.writeHead(403);res.end();return;}try{if((await stat(file)).isDirectory())file+='/index.html';}catch{file=root+'/404.html';res.statusCode=404;}let data=await readFile(file);const ext=extname(file);res.setHeader('Content-Type',types[ext]||'application/octet-stream');if(/html|css|js|json|svg|xml/.test(ext)&&req.headers['accept-encoding']?.includes('gzip')){data=gzipSync(data);res.setHeader('Content-Encoding','gzip');}res.setHeader('Cache-Control','no-cache');res.end(data);}catch{res.writeHead(404);res.end('Not found');}}).listen(4180,'127.0.0.1',()=>console.log('Quality-check server ready'));
