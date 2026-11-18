const test=require("node:test");
const assert=require("node:assert/strict");
const pages=require("../recruit-user-pages.js");
const user=require("../recruit-user-edit.js");
const official=["welcome","ideal","financial-work","industry"];
const sample=[
{id:"user-page-abc123",after:"welcome",title:"第一頁",text:"這是第一段\n這是第二段"},
{id:"user-page-def456",after:"welcome",title:"第二頁",text:"補充說明"}
];
test("custom text page records survive User Layer normalisation, including line breaks",()=>{
 const normalised=user.normalise({__pages:sample});
 assert.equal(normalised.__pages.length,2);
 assert.equal(normalised.__pages[0].text,sample[0].text);
});
test("invalid IDs, duplicate pages, protected anchors and markup are removed",()=>{
 const malformed=[
 ...sample,
 {...sample[0]},
 {id:"user-page-ghi789",after:"income-input",title:"不可覆寫收入",text:"x"},
 {id:"user-page-jkl012",after:"welcome",title:"<script>",text:"bad"},
 {id:"user-page-mno345",after:"welcome",title:"合格",text:"<img src=x>"}
 ];
 const result=pages.clean(malformed,official);
 assert.deepEqual(result.map(p=>p.id),sample.map(p=>p.id));
});
test("maximum custom text pages is enforced and full page records remain text only",()=>{
 const inputs=Array.from({length:25},(_,i)=>({id:"user-page-p"+String(i).padStart(6,"0"),after:"ideal",title:"標題"+i,text:"內容"}));
 assert.equal(pages.clean(inputs,official).length,12);
 assert.match(require("node:fs").readFileSync(require("node:path").join(__dirname,"../app.js"),"utf8"),/userOverrides:userEditor\?userEditor\.getSaved\(\):\{\}/);
});
