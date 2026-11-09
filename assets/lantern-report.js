/* Lantern Row - private, client-side PDF preflight report.
 * Uses locally hosted jsPDF 4.2.1; issues are never sent to a server.
 */
(function(global){
"use strict";
function profile(issue){
 const msg=String(issue.message||"");
 const f=String(issue.field||"");
 if(/Found \d+ fields; expected/.test(msg))return {category:"CSV structure",priority:"CHECK FIRST",why:"This record has a different number of columns than the header row. Values may shift into the wrong fields.",action:"Open the original file at the indicated CSV row. Check delimiters and quoted values, then export a fresh CSV."};
 if(/Unclosed|Blank header|Repeated header/i.test(msg))return {category:"CSV structure",priority:"CHECK FIRST",why:"The file's column structure is inconsistent, which may prevent a reliable import.",action:"Correct the header or quoting issue before importing and rerun the scan."};
 if(/Price is not a plain nonnegative decimal/.test(msg))return {category:"Price formatting",priority:"CHECK FIRST",why:"Currency symbols, negative amounts or unexpected punctuation may not match the expected numeric format.",action:"Review the exact source value. If this is a numeric price, format it as a plain decimal (for example 12.00) without a currency symbol."};
 if(/Missing handle/.test(msg))return {category:"Product identifier",priority:"CHECK FIRST",why:"A missing handle may break how product rows are grouped in Shopify. Some continuation rows need special handling.",action:"Compare the row with the current Shopify product CSV template. Add or correct its handle only when required."};
 if(/Image field is not an http/.test(msg))return {category:"Image link",priority:"VERIFY",why:"An image reference that is not an http(s) URL may not import as an external image.",action:"Check whether this field should contain a publicly reachable image URL. Replace with the intended valid link if necessary."};
 if(/SKU also appears/.test(msg))return {category:"SKU uniqueness",priority:"VERIFY",why:"The same nonblank SKU appears more than once. That can be intentional, but it may also link inventory records incorrectly.",action:"Compare the rows using that SKU and confirm whether they represent the same intended inventory item."};
 if(/Compare-at price is lower/.test(msg))return {category:"Compare-at pricing",priority:"VERIFY",why:"A compare-at value below the selling price is unusual and may display pricing inaccurately.",action:"Confirm the pricing with the source. If you intend to show a discount, verify the compare-at value is appropriate."};
 if(/Same handle has different titles/.test(msg))return {category:"Product variants",priority:"VERIFY",why:"Multiple rows share a handle but show differing titles. Variants often share handles, so this needs context.",action:"Check that the rows belong to the intended parent product and use the correct title structure for Shopify."};
 if(/Blank title/.test(msg))return {category:"Product title",priority:"VERIFY",why:"A blank title can be legitimate on continuation rows, but may also omit a necessary product name.",action:"Check this row against the Shopify CSV template and its related handle rows."};
 if(/No Shopify/.test(msg))return {category:"Template matching",priority:"VERIFY",why:"The selected export may not use Shopify's expected product field names.",action:"Verify the source template and map its columns to your intended import format before uploading."};
 if(/Image/.test(f))return {category:"Images",priority:"VERIFY",why:"This image field needs human verification.",action:"Check the original row against your platform's accepted import format."};
 return {category:"Field review",priority:issue.severity==="Error"?"CHECK FIRST":"VERIFY",why:"This heuristic flagged a field that merits a human check. It is not proof the import will fail.",action:"Open the CSV at the referenced row, confirm the field against your source and platform template, and rerun the scan."};
}
function clean(v,max){return String(v??"").replace(/[\r\n\t]/g," ").replace(/[\u0000-\u001f]/g," ").slice(0,max||260)}
function create(payload){
 if(!global.jspdf?.jsPDF)throw new Error("PDF generator unavailable; please use raw CSV export.");
 const {jsPDF}=global.jspdf;
 const doc=new jsPDF({orientation:"portrait",unit:"mm",format:"a4",compress:true});
 doc.setProperties({title:"Lantern Row - CSV Preflight Report",subject:"Local automated CSV preflight diagnostics",author:"Lantern Row",creator:"Lantern Row Preflight Studio"});
 const W=210,H=297,M=18,C=W-M*2;
 const palette={deep:[9,32,35],deep2:[17,55,53],mint:[210,250,182],leaf:[59,133,99],gray:[104,119,112],dark:[27,43,43],paper:[248,250,247],border:[224,234,226],amber:[151,99,19],rose:[166,65,77]};
 const setFill=v=>doc.setFillColor(...v),setText=v=>doc.setTextColor(...v),setDraw=v=>doc.setDrawColor(...v);
 const t=(text,x,y,size=10,weight="normal",color=palette.dark)=>{doc.setFont("helvetica",weight);doc.setFontSize(size);setText(color);doc.text(clean(text,900),x,y)};
 const para=(text,x,y,width,size=9,leading=4.8,color=palette.gray,weight="normal")=>{doc.setFont("helvetica",weight);doc.setFontSize(size);setText(color);const lines=doc.splitTextToSize(clean(text,500),width);doc.text(lines,x,y,{lineHeightFactor:leading/(size*.3528)});return lines.length*leading};
 const line=(y)=>{setDraw(palette.border);doc.setLineWidth(.35);doc.line(M,y,W-M,y)};
 const rounded=(x,y,w,h,fill,r=3)=>{setFill(fill);doc.roundedRect(x,y,w,h,r,r,"F")};
 const issues=Array.isArray(payload.issues)?payload.issues.map(i=>({severity:clean(i.severity,20),row:Number(i.row)||0,field:clean(i.field,80),message:clean(i.message,280)})):[];
 const dataRows=Math.max(0,Number(payload.count)||0),errors=issues.filter(i=>i.severity==="Error").length,warnings=issues.filter(i=>i.severity!=="Error").length;
 const touched=new Set(issues.filter(i=>i.row>1).map(i=>i.row)).size;
 const file=clean(payload.filename||"Untitled CSV",95),sample=/^sample\.csv$/i.test(file);
 const priority=issues.map(i=>({i,p:profile(i)})).sort((a,b)=>((a.i.severity==="Error"||a.p.priority==="CHECK FIRST")?0:1)-((b.i.severity==="Error"||b.p.priority==="CHECK FIRST")?0:1)||a.i.row-b.i.row);
 const status=errors?"STRUCTURE NEEDS ATTENTION":warnings?"REVIEW RECOMMENDED":"NO FLAGS DETECTED";
 const summary=errors?("The automated scan found "+errors+" structural error"+(errors===1?"":"s")+" and "+warnings+" warning"+(warnings===1?"":"s")+". Fix structural issues before importing, then review remaining findings."):warnings?("The scan found "+warnings+" potential issue"+(warnings===1?"":"s")+" across "+touched+" data row"+(touched===1?"":"s")+". They may affect a product import, but several can be legitimate depending on your template and variants."):"No issues were flagged by these limited checks. This does not certify that the file is compatible with Shopify or any other importer.";
 // Cover/header
 setFill(palette.paper);doc.rect(0,0,W,H,"F");
 setFill(palette.deep);doc.rect(0,0,W,101,"F");
 setFill(palette.deep2);doc.circle(195,30,64,"F");
 setFill(palette.mint);doc.roundedRect(M,17,10,10,2,2,"F");
 t("LR",M+2.1,24.4,11,"bold",palette.deep);
 t("LANTERN ROW",M+15,24.1,12,"bold",[249,255,251]);
 t("PREFLIGHT STUDIO  /  AUTOMATED DIAGNOSTIC",M,39,8.3,"bold",[153,215,180]);
 t("Your file,",M,59,25,"bold",[255,255,255]);
 t("explained.",M,73,25,"bold",palette.mint);
 t("A focused review of common CSV import risks.",M,86,11,"normal",[201,225,215]);
 // File context
 rounded(M,110,C,29,[238,245,239],3);
 t("SOURCE FILE",M+8,120,7.8,"bold",palette.leaf);
 t(file,M+8,130,12,"bold",palette.dark);
 const badge=status;
 const badgeW=Math.min(82,doc.getTextWidth(badge)*.40+20);
 rounded(W-M-badgeW,114,badgeW,10,errors?[253,229,231]:warnings?[251,241,220]:[211,243,222],4);
 t(badge,W-M-badgeW+5.5,120.8,7.7,"bold",errors?palette.rose:warnings?palette.amber:palette.leaf);
 // Metrics
 const metricY=147,metricW=(C-12)/3;
 const metrics=[["ROWS SCANNED",dataRows],["ERRORS",errors],["WARNINGS",warnings]];
 metrics.forEach((m,i)=>{const x=M+i*(metricW+6);rounded(x,metricY,metricW,31,[244,247,243],3);t(String(m[1]),x+6,metricY+17,21,"bold",i===1&&errors?palette.rose:i===2&&warnings?palette.amber:palette.dark);t(m[0],x+6,metricY+25,7.3,"bold",palette.gray)});
 t("AT A GLANCE",M,193,8,"bold",palette.leaf);
 const summaryHeight=para(summary,M,203,C,10.1,5.4,palette.dark);
 line(Math.max(228,207+summaryHeight));
 t("WHAT TO CHECK FIRST",M,242,9,"bold",palette.deep);
 if(priority.length){
  const seen=new Set();let y=252;
  for(const {i,p} of priority){
   const key=p.category;if(seen.has(key))continue;seen.add(key);
   const content="Row "+i.row+"  /  "+p.category+"  -  "+p.action;
   if(y>265)break;
   const lines=doc.splitTextToSize(clean(content,320),C-9);t((seen.size<10?"0"+seen.size:seen.size)+".",M,y,8,"bold",palette.leaf);
   para(content,M+9,y,C-12,8.1,4.4,palette.dark);
   y+=Math.max(7.2,lines.length*4.4+2);
  }
 }else{
  para("Nothing urgent was flagged by these checks. Confirm your file against the intended import template before making changes.",M,254,C,9,4.6,palette.gray);
 }
 // Detail pages
 if(issues.length){
  doc.addPage();let y=0;
  function startPage(){
   setFill(palette.paper);doc.rect(0,0,W,H,"F");
   rounded(M,14,6,6,palette.leaf,1.3);
   t("LANTERN ROW  /  FINDINGS",M+11,19,8,"bold",palette.leaf);
   t("Detailed findings",M,35,21,"bold",palette.deep);
   t("Read each observation, then verify against your source data.",M,44,9,"normal",palette.gray);
   line(51);y=58;
  }
  startPage();
  const maxItems=Math.min(issues.length,150);
  for(let n=0;n<maxItems;n++){
   const item=priority[n].i,p=priority[n].p;
   const whyLines=doc.splitTextToSize(p.why,C-17);
   const actionLines=doc.splitTextToSize(p.action,C-17);
   const obsLines=doc.splitTextToSize(item.message,C-17);
   const height=Math.max(58,44+(obsLines.length+whyLines.length+actionLines.length)*4.05);
   if(y+height>261){doc.addPage();startPage();}
   rounded(M,y,C,height,[255,255,255],3);setDraw(palette.border);doc.setLineWidth(.3);doc.roundedRect(M,y,C,height,3,3,"S");
   rounded(M+6,y+5,p.priority==="CHECK FIRST"?34:20,7,p.priority==="CHECK FIRST"?[252,240,222]:[224,243,232],2);
   t(p.priority,M+9,y+9.7,7,"bold",p.priority==="CHECK FIRST"?palette.amber:palette.leaf);
   t("ROW "+item.row+"  |  "+item.field,M+6,y+18,11,"bold",palette.deep);
   let cy=y+25;
   t("FOUND",M+6,cy,7,"bold",palette.leaf);cy+=4;
   cy+=para(item.message,M+6,cy,C-15,8.4,4.05,palette.dark);
   t("WHY IT MATTERS",M+6,cy+1.5,7,"bold",palette.leaf);cy+=5.5;
   cy+=para(p.why,M+6,cy,C-15,8.15,4.05,palette.gray);
   t("NEXT STEP",M+6,cy+1.5,7,"bold",palette.leaf);cy+=5.5;
   para(p.action,M+6,cy,C-15,8.15,4.05,palette.dark);
   y+=height+7;
  }
  if(issues.length>maxItems){
   if(y+23>264){doc.addPage();startPage();}
   rounded(M,y,C,20,[244,247,243]);para("This PDF contains the first "+maxItems+" findings out of "+issues.length+". Export the raw CSV to access every detected issue.",M+7,y+8,C-14,9,4.5,palette.dark);
  }
 }
 const total=doc.internal.getNumberOfPages();
 for(let k=1;k<=total;k++){
  doc.setPage(k);line(278);
  t("LANTERN ROW  /  LOCAL CSV PREFLIGHT",M,286,7.7,"bold",palette.leaf);
  t("PAGE "+k+" / "+total,W-M-23,286,7.7,"bold",palette.gray);
  t("Automated heuristics only. Not a manual review, import guarantee, or file correction. No affiliation with Shopify.",M,292,6.6,"normal",palette.gray);
 }
 return doc;
}
global.LanternReport={create,profile};
})(window);
