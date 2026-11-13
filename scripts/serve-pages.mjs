import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
const basePath=process.env.NEXT_PUBLIC_BASE_PATH??"/WD_GO_LazyExpenses";
const root=path.resolve("out"),port=Number(process.env.PORT??3200);
const types={".html":"text/html; charset=utf-8",".js":"text/javascript",".css":"text/css",".png":"image/png",".webp":"image/webp",".svg":"image/svg+xml",".ico":"image/x-icon",".webmanifest":"application/manifest+json",".json":"application/json",".txt":"text/plain",".woff2":"font/woff2"};
http.createServer(async(req,res)=>{
 try {
  const pathname=decodeURIComponent(new URL(req.url,"http://localhost").pathname);
  if(pathname===basePath && basePath){res.writeHead(308,{Location:`${basePath}/`});res.end();return;}
  if(!pathname.startsWith(`${basePath}/`))throw new Error("Outside site");
  let file=path.resolve(root,`.${pathname.slice(basePath.length)}`);
  if(file!==root&&!file.startsWith(root+path.sep))throw new Error("Outside output");
  if((await stat(file)).isDirectory())file=path.join(file,"index.html");
  const data=await readFile(file);
  res.writeHead(200,{"Content-Type":types[path.extname(file)]??(data.subarray(1,4).toString()==="PNG"?"image/png":"application/octet-stream"),"Cache-Control":"no-store"});res.end(data);
 }catch {res.writeHead(404);res.end("Not found");}
}).listen(port,"127.0.0.1",()=>console.log(`Static Pages preview: http://127.0.0.1:${port}${basePath}/`));
