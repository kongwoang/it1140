import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { isIP } from 'node:net';
const bank=JSON.parse(await readFile('data/subjects/it1140.json','utf8'));
const qs=bank.questions.filter(q=>q.source==='chuong-3-bai-giang');
assert.equal(qs.length,215);
assert.equal(new Set(qs.map(q=>q.prompt)).size,215);
assert.deepEqual([0,1,2,3].map(a=>qs.filter(q=>q.responseType==='choice'&&q.answer===a).length),[52,51,51,51]);
assert.deepEqual(bank.topics.filter(t=>t.chapter==='chuong-3').map(t=>qs.filter(q=>q.topic===t.id).length),[15,24,25,15,16,18,17,25,29,9,22]);
const byId=n=>qs.find(q=>q.id.endsWith(`-${String(n).padStart(3,'0')}`));
const numeric=new Map([[18,250*8/100],[19,1000/100],[24,2400/32],[34,32/8],[35,2**8-1],[37,128/16],[38,128-32],[79,3000*8/1000],[129,10**6],[130,10**6/10**4]]);
assert.equal(qs.filter(q=>q.responseType==='number').length,numeric.size);
for(const [n,expected] of numeric) assert.equal(byId(n).answer,expected,`C3 numeric ${n}`);
const ipv4=qs.find(q=>q.prompt.startsWith('Địa chỉ nào có dạng IPv4'));
assert.deepEqual(ipv4.choices.flatMap((s,i)=>isIP(s)===4?[i]:[]),[ipv4.answer]);
const phishing=qs.find(q=>q.prompt.startsWith('Giả sử dịch vụ thật là example.com'));
assert.deepEqual(phishing.choices.flatMap((s,i)=>new URL(`https://${s}`).hostname.endsWith('.example.com')?[i]:[]),[phishing.answer]);
assert.equal(new URL('https://example.com.verify.test/login').hostname,'example.com.verify.test');
assert.equal(new URL('https://soict.hust.edu.vn/images/logo.jpg').pathname,'/images/logo.jpg');
for(const q of qs){
  assert.match(q.explanation,/Chương 3, tr\./);
  if(q.responseType==='choice'){
    assert.equal(q.choices.length,4);
    assert.equal(new Set(q.choices).size,4);
    assert.ok(q.choices[q.answer].length<=1.55*Math.max(...q.choices.filter((_,i)=>i!==q.answer).map(s=>s.length)),q.id);
  }
}
console.log('OK: chapter 3 — 215 questions, 10 independent calculations, IPv4/URL checks, near-even keys and no gross correct-answer length cues.');
