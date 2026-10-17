// Bootstrap the already-public baseline only. Future commercial edits live here,
// outside tracked data/ and outside the Docker build context.
import { mkdir,readdir,readFile,writeFile,chown } from 'node:fs/promises';
import { resolve } from 'node:path';
const destination=resolve(import.meta.dirname,'deploy/content');
await mkdir(destination,{recursive:true,mode:0o700});
if((await readdir(destination)).length)throw Error('Content directory is not empty; refusing to overwrite course data');
const rootOwned=process.platform==='linux'&&process.getuid?.()===0;
if(rootOwned)await chown(destination,1000,1000);
const subjects=resolve(destination,'subjects');await mkdir(subjects,{mode:0o700});
if(rootOwned)await chown(subjects,1000,1000);
for(const name of ['subjects/it1140.json','python-exercises.json']){
  const data=await readFile(resolve(import.meta.dirname,'../../data',name));
  JSON.parse(data.toString('utf8'));
  const path=resolve(destination,name);await writeFile(path,data,{flag:'wx',mode:0o600});
  if(rootOwned)await chown(path,1000,1000);
}
console.log('Copied the already-public baseline into ignored private runtime content. Future edits belong there, not in tracked data/. Historical copies remain public.');
