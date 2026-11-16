const assert0=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
let checks=0;const assert=Object.assign((...a)=>{checks++;return assert0(...a)},{equal:(...a)=>{checks++;return assert0.equal(...a)},throws:(...a)=>{checks++;return assert0.throws(...a)}});
const html=fs.readFileSync(__dirname+"/index.html","utf8");
const code=html.match(/<script>([\s\S]*?)<\/script>/)[1];
new vm.Script(code,{filename:"inline-scanner.js"});
const ctx=vm.createContext({document:{getElementById:()=>({addEventListener(){}})},URL,Blob,console,setTimeout,navigator:{}});
vm.runInContext(code,ctx);
function run(expr){return vm.runInContext(expr,ctx);}
assert.equal(run('csvParse("A,B\\n\\"hello,world\\",ok\\n").length'),2);
assert.equal(run('csvParse("A,B\\n\\"escaped \\"\\"quote\\"\\"\\",ok\\n")[1][0]'),'escaped "quote"');
assert.equal(run('csvParse("A,B\\n\\"line1\\nline2\\",ok\\n")[1][0]'),'line1\nline2');
assert.throws(()=>run('csvParse("A,B\\n\\"broken,ok")'),/Unclosed/);
const sample='Handle,Title,Variant SKU,Variant Price,Variant Compare At Price,Image Src\nblue-shirt,Blue Shirt,SKU001,19.99,29.99,https://example.com/shirt.jpg\nred-shirt,Red Shirt,SKU001,$12,10,broken-image\n,No Handle,,10.00,,\nblue-shirt,Different Title,SKU004,15,10,https://example.com/other.jpg\n';
const result=vm.runInContext('inspect('+JSON.stringify(sample)+')',ctx);
assert.equal(result.count,4);
assert(result.issues.some(x=>x.message.includes("also appears")));
assert(result.issues.some(x=>x.message.includes("plain nonnegative")));
assert(result.issues.some(x=>x.message.includes("Missing handle")));
assert(result.issues.some(x=>x.message.includes("lower than")));
assert(result.issues.some(x=>x.message.includes("not an http")));
assert.equal(vm.runInContext('inspect("Handle,Title\\na,Good\\n").issues.length',ctx),0);
assert(vm.runInContext('inspect("A,B\\n1,2,3\\n").issues.some(x=>x.severity==="Error")',ctx));
// Row numbers must match the record position in the file, including skipped blank lines
assert.equal(vm.runInContext('inspect("Handle,Title\\na,A\\n\\n\\nb,B,extra\\n").issues[0].row',ctx),5);
// Whitespace-only lines are blank, not malformed records
assert.equal(vm.runInContext('inspect("Handle,Title\\na,A\\n   \\n").issues.length',ctx),0);
// Blank and repeated headers are reported on the header record, not thrown
assert.equal(vm.runInContext('inspect("Handle,,Title\\na,b,c\\n").issues.filter(i=>i.message==="Blank header"&&i.row===1).length',ctx),1);
assert.equal(vm.runInContext('inspect("\\n\\nHandle,Title,Title\\na,b,c\\n").issues.filter(i=>i.message==="Repeated header name"&&i.row===3).length',ctx),1);
// Wrong delimiter: a header with no unquoted comma but an unquoted ; or tab gets ONE Error on the header record
const semi=vm.runInContext('inspect("Handle;Title\\na;b\\n")',ctx);
assert.equal(semi.issues.length,1);
assert.equal(semi.issues[0].severity,"Error");
assert.equal(semi.issues[0].row,1);
assert(semi.issues[0].message.includes("semicolon-delimited"));
const tab=vm.runInContext('inspect("Handle\\tTitle\\na\\tb\\n")',ctx);
assert.equal(tab.issues.length,1);
assert(tab.issues[0].message.includes("tab-delimited"));
// Quoted ; and a header with commas are not a delimiter hint
assert.equal(vm.runInContext('inspect("\\"Handle;Title\\"\\na\\n").issues.filter(i=>i.field==="Delimiter").length',ctx),0);
assert.equal(vm.runInContext('inspect("Handle,Title;x\\na,b\\n").issues.filter(i=>i.field==="Delimiter").length',ctx),0);
// Decoded U+FFFD gives ONE file-level Warning; ordinary non-ASCII text does not
const enc=vm.runInContext('inspect('+JSON.stringify("Handle,Title\na,T\uFFFDtulo\nb,U\uFFFDx\uFFFD\n")+')',ctx);
assert.equal(enc.issues.filter(i=>i.severity==="Warning"&&i.message.includes("does not appear to be UTF-8")&&i.message.includes("CSV UTF-8")).length,1);
assert.equal(enc.issues.length,1);
assert.equal(vm.runInContext('inspect("Handle,Title\\na,T\\u00edtulo\\n").issues.length',ctx),0);
// Duplicate SKUs match without case or surrounding spaces; the values are reported as written
const skuDup=vm.runInContext('inspect("Handle,Title,Variant SKU\\na,A,SKU-1\\nb,B, sku-1 \\n").issues',ctx);
assert.equal(skuDup.length,1);
assert(skuDup[0].message.includes('"SKU-1"')&&skuDup[0].message.includes('"sku-1"'));
// Raw CSV export: cells starting with = + - @ or tab get a leading quote; other cells are unchanged
const csv=vm.runInContext('rawCsv([{severity:"Error",row:1,field:"=2+2",message:"-x @y"},{severity:"Warning",row:2,field:"Title",message:"+1, plain"}])',ctx).split("\r\n");
assert.equal(csv[0],"Severity,CSV row,Field,Finding");
assert.equal(csv[1],"Error,1,'=2+2,'-x @y");
assert.equal(csv[2],'Warning,2,Title,"\'+1, plain"');
assert.equal(vm.runInContext('rawCsv([{severity:"Warning",row:1,field:"f",message:"\\tcmd"}])',ctx).split("\r\n")[1],"Warning,1,f,'\tcmd");
console.log("PASS "+checks+" CSV syntax and detection checks; rows="+result.count+" findings="+result.issues.length);