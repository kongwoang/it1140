// Editorial changes are explicit, reviewable data, not bulk text substitutions.
// Plans/audits for commercial content belong outside the public repository.
import { createHash,randomUUID } from 'node:crypto';
import { readFile,writeFile,rename,unlink } from 'node:fs/promises';
import { resolve,dirname,join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { validateCourse } from '../commerce/vm/content-validation.mjs';
export const fingerprint=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');

export function prepareReview(bank,plan){
  if(!Array.isArray(plan)||!plan.length||plan.length>100)throw Error('Review 1–100 explicitly selected questions per batch');
  const result=structuredClone(bank),known=new Map(result.questions.map(q=>[q.id,q])),seen=new Set(),changes=[];
  for(const row of plan){
    if(!row||typeof row.id!=='string'||seen.has(row.id)||!known.has(row.id))throw Error('Unknown or duplicate review ID');
    seen.add(row.id);
    if(typeof row.reason!=='string'||!row.reason.trim()||!row.fields||typeof row.fields!=='object'||Array.isArray(row.fields))throw Error('Missing editorial decision');
    const allowed=['prompt','choices','explanation','difficulty'];
    if(!Object.keys(row.fields).length||Object.keys(row.fields).some(k=>!allowed.includes(k)))throw Error('Review cannot change IDs, keys, topics or response types');
    const q=known.get(row.id),current=fingerprint(q);
    if(current===row.afterSHA)continue;
    if(current!==row.beforeSHA)throw Error('Question changed since review: '+row.id);
    const before=structuredClone(q),after={...q,...structuredClone(row.fields)};
    if(typeof after.prompt!=='string'||!after.prompt.trim()||typeof after.explanation!=='string'||!after.explanation.trim())throw Error('Empty question text');
    if(!Array.isArray(after.choices)||after.choices.length!==before.choices.length||after.choices.some(c=>typeof c!=='string'||!c.trim())||new Set(after.choices).size!==after.choices.length)throw Error('Invalid revised choices');
    if(![1,2,3].includes(after.difficulty))throw Error('Invalid revised difficulty');
    if(fingerprint(after)!==row.afterSHA||row.afterSHA===row.beforeSHA)throw Error('Review checksum mismatch');
    Object.assign(q,after);changes.push({id:q.id,reason:row.reason,before,after});
  }
  if(new Set(result.questions.map(q=>q.prompt)).size!==result.questions.length)throw Error('Duplicate revised prompt');
  return {bank:result,changes};
}

export async function applyReview({bankPath,pythonPath,planPath,auditPath}){
  const paths=[bankPath,pythonPath,planPath,auditPath].map(p=>resolve(p));
  if(new Set(paths).size!==4)throw Error('Bank, Python, plan and audit must be distinct files');
  const [raw,pyRaw,planRaw]=await Promise.all(paths.slice(0,3).map(p=>readFile(p,'utf8')));
  const reviewed=prepareReview(JSON.parse(raw),JSON.parse(planRaw));
  validateCourse(reviewed.bank,JSON.parse(pyRaw));
  if(!reviewed.changes.length)return {changed:0};
  const formatted=JSON.stringify(reviewed.bank,null,2)+'\n',hash=text=>createHash('sha256').update(text).digest('hex');
  // Immutable audit has both versions, before overwriting anything. Existing
  // audit files are never replaced. Its hashes also identify interrupted runs.
  const audit={version:1,createdAt:new Date().toISOString(),bankBeforeSHA:hash(raw),bankAfterSHA:hash(formatted),changes:reviewed.changes};
  const temporary=join(dirname(paths[0]),'.review-'+randomUUID()+'.tmp');
  await writeFile(paths[3],JSON.stringify(audit,null,2)+'\n',{flag:'wx',mode:0o600});
  try{
    await writeFile(temporary,formatted,{flag:'wx',mode:0o600});
    if(hash(await readFile(paths[0],'utf8'))!==audit.bankBeforeSHA)throw Error('Bank changed during review; refusing to overwrite');
    await rename(temporary,paths[0]);
  }finally{await unlink(temporary).catch(e=>{if(e.code!=='ENOENT')throw e;});}
  return {changed:reviewed.changes.length,before:audit.bankBeforeSHA,after:audit.bankAfterSHA};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const option=name=>{const i=process.argv.indexOf('--'+name);if(i<0||!process.argv[i+1])throw Error('--'+name+' required');return process.argv[i+1];};
  console.log(JSON.stringify(await applyReview({bankPath:option('bank'),pythonPath:option('python'),planPath:option('plan'),auditPath:option('audit')})));
}
