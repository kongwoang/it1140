import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const bank = JSON.parse(await readFile('data/subjects/it1140.json', 'utf8'));
const qs = bank.questions.filter(q => q.source === 'chuong-4-bai-giang');
const byId = n => qs.find(q => q.id.endsWith(`-${String(n).padStart(3, '0')}`));
assert.equal(qs.length, 133);
assert.equal(new Set(qs.map(q => q.prompt)).size, 133);
assert.deepEqual(bank.topics.filter(t => t.chapter === 'chuong-4').map(t => qs.filter(q => q.topic === t.id).length), [17,8,10,21,14,10,18,24,11]);
assert.deepEqual([0,1,2,3].map(a => qs.filter(q => q.responseType === 'choice' && q.answer === a).length), [23,23,23,22]);

// Recompute numerical keys using executable versions of the stated algorithms.
const expected = new Map();
const record = (n, value) => expected.set(n, value);
const e = 10 - 4, p = (5 + 5 + e) / 2;
const h = 2 * Math.sqrt(p * (p-5) * (p-5) * (p-e)) / e;
record(21,e); record(22,p); record(23,h); record(24,h*(4+10)/2);
let x=2,y=5; x=x+y; y=x-y; record(28,y);
record(43,-(-10)/4);
let n=7; n=n+1; n=n+1; record(45,n);
x=3; if(x<5) x+=4; else x-=1; record(47,x);
x=5; let count=0; while(x<3){x++;count++;} record(49,count);
x=5; do{x++;}while(!(x>=3)); record(50,x);
let sum=0; for(let i=2;i<=5;i++) sum+=i; record(51,sum);
count=0; for(let i=5;i>=2;i--) count++; record(52,count);
const F=x=>2*x+1; record(56,F(3)+F(4));
let calls=0; const fact=n=>{calls++;return n===0?1:n*fact(n-1);};
record(59,fact(5)); calls=0; fact(4); record(60,calls);
const hanoi=(n,a,b,c,moves=[])=>{
  if(n===1) moves.push([a,b]);
  else {hanoi(n-1,a,c,b,moves);moves.push([a,b]);hanoi(n-1,c,b,a,moves);}
  return moves;
};
for(let n=1;n<=7;n++){
  const moves=hanoi(n,'A','B','C');
  const pegs={A:Array.from({length:n},(_,i)=>n-i),B:[],C:[]};
  for(const [a,b] of moves){
    const disk=pegs[a].pop(); assert.ok(disk!==undefined);
    assert.ok(pegs[b].length===0 || pegs[b].at(-1)>disk);
    pegs[b].push(disk);
  }
  assert.equal(pegs.B.length,n); assert.equal(moves.length,2**n-1);
}
record(66,hanoi(4,'A','B','C').length); record(67,hanoi(5,'A','B','C').length);
assert.equal(byId(65).choices[byId(65).answer],hanoi(2,'A','B','C').map(([a,b])=>`${a}→${b}`).join(', ')+'.');
x=4;y=9;x=y;y=x;record(82,x+y);
const primeTrials=p=>{let n=0;for(let k=2;k<p;k++){n++;if(p%k===0)break;}return n;};
record(86,primeTrials(21));record(87,primeTrials(11));
let value=84,factors=0;for(let k=2;value>1;k++)while(value%k===0){value/=k;factors++;}record(89,factors);
const gcd=(a,b)=>{while(b!==0)[a,b]=[b,a%b];return a;};
record(90,gcd(48,18));
let a=48,b=18,mods=0;while(true){const r=a%b;mods++;if(r===0)break;a=b;b=r;}record(92,mods);
record(95,gcd(18,48));record(97,126/gcd(84,126));
for(let a=1;a<=50;a++)for(let b=1;b<=50;b++){
  assert.equal(gcd(a,b),gcd(b,a%b));
  assert.equal(a%gcd(a,b),0);assert.equal(b%gcd(a,b),0);
}
sum=0;for(let k=1;k<28;k++)if(28%k===0)sum+=k;record(98,sum);
record(100,Math.max(-8,-3,-11,-5));
let max=4,updates=0;for(const v of [7,2,9,9])if(v>max){max=v;updates++;}record(101,updates);
count=0;for(let i=1;i<8;i++)count++;record(102,count);
const minPosition=(arr,last=false)=>{let p=0;for(let i=1;i<arr.length;i++)if(last?arr[i]<=arr[p]:arr[i]<arr[p])p=i;return p+1;};
record(106,minPosition([5,-2,4,-2]));record(107,minPosition([5,-2,4,-2],true));
record(109,[3,-5,0,8].reduce((s,v)=>s+v,0));
record(112,[2,7,7,9].indexOf(7)+1);
count=0;for(const v of [2,4,7,9]){count++;if(v===6)break;}record(113,count);
const sort=values=>{
  const a=[...values], passes=[];let comparisons=0,swaps=0;
  for(let i=0;i<a.length-1;i++){
    for(let j=i+1;j<a.length;j++){comparisons++;if(a[j]<a[i]){[a[i],a[j]]=[a[j],a[i]];swaps++;}}
    passes.push([...a]);
  }
  return {a,passes,comparisons,swaps};
};
record(117,sort([3,1,2]).passes[0][0]);record(118,sort([3,2,1]).swaps);record(119,sort([5,2,1,4,3]).comparisons);
for(const values of [[],[1],[3,2,1],[0,-3,-3,1],[8,2,5,4,9]]){
  const r=sort(values);assert.deepEqual(r.a,[...values].sort((a,b)=>a-b));
  for(let i=0;i<r.passes.length;i++) assert.deepEqual(r.passes[i].slice(0,i+1),r.a.slice(0,i+1));
}
record(123,[-4,-1,0,3,6,8].filter(v=>v%2===0).length);
const positive=[-2,0,3,5,10].filter(v=>v>0);record(125,positive.reduce((s,v)=>s+v,0)/positive.length);
const values=[4,9,9,-1,9,2];record(128,values.filter(v=>v===Math.max(...values)).length);
const inserted=[3,5,9];inserted.splice(1,0,7);record(131,inserted[2]);
const deleted=[3,7,5,9];deleted.splice(1,1);record(132,deleted[1]);
assert.equal(expected.size,42);
assert.equal(qs.filter(q=>q.responseType==='number').length,expected.size);
for(const [n,value] of expected) assert.equal(byId(n).answer,value,`C4 numeric ${n}`);
for(const q of qs){
  assert.match(q.explanation,/Tài liệu Thuật toán, tr\./);
  if(q.responseType==='choice'){
    assert.equal(q.choices.length,4);assert.equal(new Set(q.choices).size,4);
    assert.ok(q.choices[q.answer].length<=1.55*Math.max(...q.choices.filter((_,i)=>i!==q.answer).map(s=>s.length)),q.id);
  }
}
console.log('OK: chapter 4 — 133 questions, 42 independent calculations, Hanoi/Euclid/sorting invariants, balanced keys.');
