import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
const basePath=process.env.NEXT_PUBLIC_BASE_PATH ?? "/WD_GO_LazyExpenses";
if(!/^\/[A-Za-z0-9_-]+$/.test(basePath) && basePath!=="")throw new Error("Use a repository path without a trailing slash.");
const result=spawnSync(process.execPath,["node_modules/next/dist/bin/next","build"],{
  stdio:"inherit",env:{...process.env,GITHUB_PAGES:"true",NEXT_PUBLIC_BASE_PATH:basePath},
});
if(result.status!==0)process.exit(result.status??1);
writeFileSync("out/.nojekyll","");
console.log(`GitHub Pages export ready at out/ (base path: ${basePath||"/"})`);
