// Pure editor operations; browser integration applies these edits explicitly.
(function (root) {
  const pairs = { '(': ')', '[': ']', '{': '}' }, closers = new Set(Object.values(pairs));
  function normalizeState(value) {
    const state={code:{},input:{},testCase:{},completed:{},currentId:''};
    if(!value||typeof value!=='object'||Array.isArray(value))return state;
    const id=key=>/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(key);
    for(const field of ['code','input','testCase','completed']) {
      const map=value[field];if(!map||typeof map!=='object'||Array.isArray(map))continue;
      for(const [key,item]of Object.entries(map))if(id(key)&&(field==='completed'?item===true:field==='testCase'?Number.isInteger(item)&&item>=0&&item<100:typeof item==='string'))state[field][key]=item;
    }
    if(typeof value.currentId==='string'&&id(value.currentId))state.currentId=value.currentId;
    return state;
  }
  function analyse(code, stop = code.length) {
    const stack = [], issues = [];let quote = '', triple = false, comment = false, line = 1, column = 0, opened;
    for (let i = 0; i < Math.min(code.length, stop); i++) {
      const c = code[i];column++;
      if (c === '\n') { if (quote && !triple) { issues.push({line:opened.line,column:opened.column,message:'Chuỗi chưa đóng dấu nháy trước khi xuống dòng.'});quote=''; } line++;column=0;comment=false;continue; }
      if (comment) continue;
      if (quote) {
        if (c === '\\') { if(code[i+1] === '\n'){line++;column=0;}else column++; i++; continue; }
        if (c === quote && (!triple || code.slice(i,i+3) === quote.repeat(3))) { if(triple){i+=2;column+=2;}quote='';triple=false; }
        continue;
      }
      if (c === '#') {comment=true;continue;}
      if (c === '"' || c === "'") {quote=c;triple=code.slice(i,i+3)===c.repeat(3);opened={line,column};if(triple){i+=2;column+=2;}continue;}
      if (pairs[c]) stack.push({char:c,line,column});
      else if (closers.has(c)) { const before=stack.at(-1);if(!before||pairs[before.char]!==c)issues.push({line,column,message:`Dấu ${c} không khớp với dấu mở.`});else stack.pop(); }
    }
    if (stop >= code.length) {
      if(quote)issues.push({line:opened.line,column:opened.column,message:triple?'Chuỗi nhiều dòng chưa đóng đủ ba dấu nháy.':'Chuỗi chưa đóng dấu nháy.'});
      for(const p of stack)issues.push({line:p.line,column:p.column,message:`Dấu ${p.char} đang thiếu dấu đóng ${pairs[p.char]}.`});
      code.split('\n').forEach((text,i)=>{const prefix=text.match(/^[ \t]*/)[0];if(prefix.includes('\t'))issues.push({line:i+1,column:1,message:'Đầu dòng có Tab thực. Nên đổi về dấu cách để tránh trộn hai kiểu thụt lề.'});});
    }
    return {issues:issues.slice(0,20),quote,triple,comment,stack};
  }
  const replace = (value,start,end,text,caret=start+text.length) => ({value:value.slice(0,start)+text+value.slice(end),start:caret,end:caret});
  function indent(value,start,end,remove=false) {
    if(start===end&&!remove){const lineStart=value.lastIndexOf('\n',start-1)+1;return replace(value,start,end,' '.repeat(4-(start-lineStart)%4));}
    const from=value.lastIndexOf('\n',start-1)+1;
    const last=end>start&&value[end-1]==='\n'?end-1:end;
    const next=value.indexOf('\n',last),to=next<0?value.length:next;
    const lines=value.slice(from,to).split('\n'),edits=[];let offset=from;
    const changed=lines.map(text=>{const count=remove?(text.startsWith('\t')?1:Math.min(4,text.match(/^ */)[0].length)):4;edits.push({at:offset,count});offset+=text.length+1;return remove?text.slice(count):'    '+text;}).join('\n');
    function mapPosition(position){let delta=0;for(const edit of edits){if(position<edit.at)break;if(!remove)delta+=edit.count;else if(position>=edit.at+edit.count)delta-=edit.count;else return edit.at+delta;}return position+delta;}
    return {value:value.slice(0,from)+changed+value.slice(to),start:mapPosition(start),end:mapPosition(end)};
  }
  function enter(value,start,end) {
    const from=value.lastIndexOf('\n',start-1)+1,text=value.slice(from,start),base=text.match(/^[ \t]*/)[0].replace(/\t/g,'    '),ctx=analyse(value,start);
    const extra=!ctx.quote&&!ctx.comment&&/[:([{]\s*$/.test(text)?'    ':'';
    const middle=extra&&closers.has(value[end]);const insertion='\n'+base+extra+(middle?'\n'+base:'');
    return replace(value,start,end,insertion,start+1+base.length+extra.length);
  }
  function pair(value,start,end,key) {
    const ctx=analyse(value,start),isQuote=key==='"'||key==="'";
    if(closers.has(key)&&start===end&&value[start]===key&&!ctx.quote&&!ctx.comment)return {value,start:start+1,end:start+1};
    if(isQuote&&start===end&&value[start]===key&&ctx.quote===key)return {value,start:start+1,end:start+1};
    if(ctx.quote||ctx.comment)return null;
    if(isQuote&&start===end&&value.slice(start-2,start)===key.repeat(2)&&value[start-3]!==key)return replace(value,start,end,key.repeat(4),start+1);
    const close=pairs[key]||(isQuote?key:null);if(!close)return null;
    const selected=value.slice(start,end),edit=replace(value,start,end,key+selected+close,start+1);
    edit.end=edit.start+selected.length;return edit;
  }
  function backspace(value,start,end) {
    if(start!==end||start===0)return null;
    const left=value[start-1],right=value[start];
    if(pairs[left]===right||((left==='"'||left==="'")&&left===right))return replace(value,start-1,start+1,'');
    const from=value.lastIndexOf('\n',start-1)+1;
    if(/^[ ]+$/.test(value.slice(from,start))){const size=(start-from)%4||4;return replace(value,start-size,start,'');}
    return null;
  }
  function comment(value,start,end) {
    const from=value.lastIndexOf('\n',start-1)+1,last=end>start&&value[end-1]==='\n'?end-1:end,next=value.indexOf('\n',last),to=next<0?value.length:next;
    const lines=value.slice(from,to).split('\n'),remove=lines.filter(l=>l.trim()).every(l=>/^\s*#/.test(l));let delta=0;
    const text=lines.map(l=>{if(!l.trim())return l;const out=remove?l.replace(/^(\s*)# ?/,'$1'):l.replace(/^(\s*)/,'$1# ');delta+=out.length-l.length;return out;}).join('\n');
    return {value:value.slice(0,from)+text+value.slice(to),start:from,end:Math.max(from,end+delta)};
  }
  root.IT1140PythonEditor={analyse,indent,enter,pair,backspace,comment,normalizeState};
})(globalThis);
