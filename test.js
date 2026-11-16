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
console.log("PASS "+checks+" CSV syntax and detection checks; rows="+result.count+" findings="+result.issues.length);