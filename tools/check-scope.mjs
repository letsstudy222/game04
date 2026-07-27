// Catch the exact class of bug that shipped: a bare identifier inside a class
// method that only exists as a constructor parameter. check-undefined.py sees
// the name declared somewhere in the file and calls it resolved.
import fs from 'fs';
import path from 'path';
const files = [];
(function walk(d){ for (const e of fs.readdirSync(d,{withFileTypes:true})) {
  const p = path.join(d,e.name);
  if (e.isDirectory()) walk(p); else if (e.name.endsWith('.js')) files.push(p);
}})('src');
let bad = 0;
for (const f of files) {
  const lines = fs.readFileSync(f,'utf8').split('\n');
  let inClass = false, depth = 0, ctorParams = new Set(), methodDepth = -1;
  lines.forEach((ln, i) => {
    if (/^\s*export\s+class\s|^\s*class\s/.test(ln)) { inClass = true; depth = 0; }
    const m = ln.match(/constructor\s*\(([^)]*)\)/);
    if (m) ctorParams = new Set(m[1].split(',').map(s=>s.trim().split('=')[0].trim()).filter(Boolean));
    if (!inClass || ctorParams.size === 0) return;
    // a method header that is not the constructor
    if (/^\s{2}[A-Za-z_$][\w$]*\s*\([^)]*\)\s*\{/.test(ln) && !/constructor/.test(ln)) methodDepth = i;
    if (methodDepth >= 0 && i > methodDepth) {
      for (const p of ctorParams) {
        const re = new RegExp('(^|[^.\\w$])' + p + '\\s*\\.');
        if (re.test(ln) && !new RegExp('this\\.' + p).test(ln)) {
          console.log(`  ${f}:${i+1}  dung '${p}.' trong method — co le phai la 'this.${p}.'`);
          console.log(`      ${ln.trim()}`);
          bad++;
        }
      }
    }
  });
}
console.log(bad ? `\n  ${bad} cho nghi van` : '\n  Khong co tham so constructor nao bi dung nham trong method.');
