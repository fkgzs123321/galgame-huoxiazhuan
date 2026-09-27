import fs from 'fs';
import path from 'path';

const ROOT = 'E:/Games/写卡/tavern_helper_template/src/欲妈群';
const WB = path.join(ROOT, '世界书');
const OPEN = path.join(ROOT, '开场白');
const OUT = 'E:/Games/写卡/tavern_helper_template/tmp-audit';

function readTxt(p){ return fs.readFileSync(p, 'utf8').replace(/^\uFEFF/,''); }

// collect files
const wbFiles = fs.readdirSync(WB).filter(f=>f.endsWith('.txt')).map(f=>path.join(WB,f));
const openFiles = fs.readdirSync(OPEN).filter(f=>f.endsWith('.txt')).sort().map(f=>path.join(OPEN,f));
const allFiles = [...wbFiles, ...openFiles];

const report = {};
report.files = allFiles.map(f=>({file:f, name:path.basename(f), dir:path.dirname(f)}));

// ---------- 1. dashes ----------
report.dashes = [];
for(const f of allFiles){
  const lines = readTxt(f).split(/\r?\n/);
  let em=0, dd=0; const emLines=[], ddLines=[];
  lines.forEach((ln,i)=>{
    const a=(ln.match(/——/g)||[]).length;
    const b=(ln.match(/--/g)||[]).length;
    if(a){em+=a; emLines.push({n:i+1,t:ln});}
    if(b){dd+=b; ddLines.push({n:i+1,t:ln});}
  });
  report.dashes.push({file:f,name:path.basename(f),em,dd,emLines,ddLines});
}

// ---------- 2/3. meta + cross ref ----------
const META = ['本条目','本文','写作指引','用途','说明：','注意：','注：','必须遵守','以下是','该条目','本文档','本文件','写作说明','条目说明'];
const CROSS = ['详见','见 [','参见','同 [','如上','见上文','见下','参见上文'];
function scanTerms(terms){
  const out=[];
  for(const f of allFiles){
    const lines = readTxt(f).split(/\r?\n/);
    lines.forEach((ln,i)=>{
      for(const t of terms){
        let idx = ln.indexOf(t);
        while(idx!==-1){
          out.push({file:f,name:path.basename(f),term:t,n:i+1,t:ln.trim(),col:idx});
          idx = ln.indexOf(t, idx+1);
        }
      }
    });
  }
  return out;
}
report.meta = scanTerms(META);
report.cross = scanTerms(CROSS);

// ---------- 4. yaml comments ----------
report.comments=[];
for(const f of allFiles){
  const lines = readTxt(f).split(/\r?\n/);
  lines.forEach((ln,i)=>{
    const t=ln.trim();
    if(/^#/.test(t) && !/^#{1,6}\s/.test(t)) report.comments.push({file:f,name:path.basename(f),n:i+1,t:ln});
    else if(/^#/.test(t) && /^#\s/.test(t) ) {} // heading, skip
    if(/<!--/.test(ln)||/-->/.test(ln)) report.comments.push({file:f,name:path.basename(f),n:i+1,t:ln,kind:'html'});
  });
}

// ---------- 5. list-style runs ----------
function lineType(ln){
  const t=ln.trim();
  if(!t) return null;
  if(/^#{1,6}\s/.test(t)) return 'heading';
  if(/^\|/.test(t)) return null;
  if(/^\s*[-*]?\s*(\*\*)?[^\s:：]{1,14}(\*\*)?\s*[:：]/.test(t)) return 'label';
  if(t.length<=16 && !/[。！？…]$/.test(t)) return 'short';
  return null;
}
report.runs=[];
for(const f of allFiles){
  const lines=readTxt(f).split(/\r?\n/);
  let i=0;
  while(i<lines.length){
    const ty=lineType(lines[i]);
    if(ty==='label'||ty==='short'){
      let j=i; const seq=[];
      while(j<lines.length && lineType(lines[j])===ty){ seq.push(j); j++; }
      if(seq.length>=(ty==='label'?3:4)){
        report.runs.push({file:f,name:path.basename(f),type:ty,start:seq[0]+1,end:seq[seq.length-1]+1,count:seq.length,
          sample:seq.slice(0,5).map(k=>({n:k+1,t:lines[k].trim()}))});
      }
      i=j;
    } else i++;
  }
}
report.runs.sort((a,b)=>b.count-a.count);

// ---------- 6. similarity ----------
const CHARS=['小夜','夜见绫','怜奈','林婉清','柚子','桃桃','白露','秦雨','群主','苏媚','苏晴','铃','韩雪','郝佳期'];
function normalize(s){
  let x=s;
  x=x.replace(/\{\{user\}\}/g,'【U】');
  for(const c of CHARS) x=x.split(c).join('【N】');
  x=x.replace(/[*_`#>\-｜|]/g,'');
  x=x.replace(/\s+/g,'');
  return x;
}
function sentences(text, norm){
  const raw = text.split(/[。！？；\n]/);
  const set=new Set();
  for(let s of raw){
    s=s.trim().replace(/^[-*·\d.、）)\s]+/,'').trim();
    if(norm) s=normalize(s);
    if(s.length>=15) set.add(s);
  }
  return set;
}
function jac(a,b){let inter=0; for(const x of a) if(b.has(x)) inter++; return {inter, jac: inter/(a.size+b.size-inter)};}

const pal = wbFiles.filter(f=>f.endsWith('_调色盘.txt'));
const base = wbFiles.filter(f=>f.endsWith('_基础信息.txt'));
const groups = {调色盘:pal, 基础信息:base};
report.sim = {};
for(const [gname, files] of Object.entries(groups)){
  const exact = files.map(f=>sentences(readTxt(f),false));
  const norm  = files.map(f=>sentences(readTxt(f),true));
  const pairs=[];
  for(let i=0;i<files.length;i++) for(let j=i+1;j<files.length;j++){
    const ex=jac(exact[i],exact[j]);
    const no=jac(norm[i],norm[j]);
    pairs.push({a:path.basename(files[i]),b:path.basename(files[j]),
      exactInter:ex.inter, exactJac:+ex.jac.toFixed(3),
      normInter:no.inter, normJac:+no.jac.toFixed(3),
      aSize:exact[i].size,bSize:exact[j].size});
  }
  pairs.sort((x,y)=> (y.normInter-x.normInter) || (y.exactInter-x.exactInter));
  report.sim[gname]=pairs.slice(0,15);
  // top pair overlapping sentences
  const top=pairs[0];
  const ia=files.findIndex(f=>path.basename(f)===top.a), ib=files.findIndex(f=>path.basename(f)===top.b);
  const ov=[...norm[ia]].filter(s=>norm[ib].has(s));
  report.sim[gname+'_topOverlap']=ov.slice(0,12);
}

// ---------- 7. sizes ----------
report.sizes = allFiles.map(f=>({name:path.basename(f),bytes:fs.statSync(f).size,file:f}))
  .sort((a,b)=>b.bytes-a.bytes);

// ---------- 8. structure ----------
report.headings={};
for(const f of allFiles){
  const lines=readTxt(f).split(/\r?\n/);
  const hs=[];
  lines.forEach((ln,i)=>{ if(/^#{1,6}\s/.test(ln.trim())) hs.push({n:i+1,t:ln.trim()}); });
  report.headings[path.basename(f)]=hs;
}
report.groupCheck=[];
for(const c of CHARS.filter(x=>x!=='夜见绫'&&x!=='苏媚')){
  const g=[];
  for(const suffix of ['基础信息','调色盘','NSW档案','独立剧情线']){
    const p=path.join(WB,`${c}_${suffix}.txt`);
    g.push({suffix, exists:fs.existsSync(p)});
  }
  report.groupCheck.push({char:c, files:g});
}

fs.writeFileSync(path.join(OUT,'audit.json'), JSON.stringify(report,null,1),'utf8');
console.log('DONE');
console.log('dash files with em:', report.dashes.filter(d=>d.em>0).length, 'total em:', report.dashes.reduce((a,d)=>a+d.em,0));
console.log('dash files with dd:', report.dashes.filter(d=>d.dd>0).length, 'total dd:', report.dashes.reduce((a,d)=>a+d.dd,0));
console.log('meta hits:', report.meta.length, 'cross hits:', report.cross.length, 'comment hits:', report.comments.length, 'runs:', report.runs.length);
