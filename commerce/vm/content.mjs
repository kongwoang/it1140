import { readFileSync } from 'node:fs';
import { resolve,isAbsolute } from 'node:path';

export function contentRoot(env=process.env){
  if(env.NODE_ENV==='production'&&!env.COURSE_DATA_DIR)throw Error('Production requires private COURSE_DATA_DIR outside Git/image');
  if(env.COURSE_DATA_DIR&&!isAbsolute(env.COURSE_DATA_DIR))throw Error('COURSE_DATA_DIR must be absolute');
  return env.COURSE_DATA_DIR||resolve(import.meta.dirname,'../../data');
}
export function readContent(name){return readFileSync(resolve(contentRoot(),name));}
