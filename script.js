const KEY="js_maintenance_stock_v1";
let data=JSON.parse(localStorage.getItem(KEY)||'{"items":[],"ins":[],"outs":[]}');
const $=id=>document.getElementById(id);
function save(){localStorage.setItem(KEY,JSON.stringify(data));render();}
function today(){return new Date().toISOString().slice(0,10)}
$("inDate").value=today(); $("outDate").value=today();

document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tab,.page").forEach(x=>x.classList.remove("active"));b.classList.add("active");$(b.dataset.tab).classList.add("active")});

$("itemForm").onsubmit=e=>{e.preventDefault();data.items.push({id:Date.now(),name:$("itemName").value.trim(),code:$("itemCode").value.trim(),cat:$("category").value.trim(),unit:$("unit").value.trim()||"Nos",min:+$("minStock").value||0});e.target.reset();$("unit").value="Nos";save()};
$("inForm").onsubmit=e=>{e.preventDefault();data.ins.push({id:Date.now(),date:$("inDate").value,item:+$("inItem").value,qty:+$("inQty").value,supplier:$("supplier").value,invoice:$("invoice").value});e.target.reset();$("inDate").value=today();save()};
$("outForm").onsubmit=e=>{e.preventDefault();let item=+$("outItem").value, qty=+$("outQty").value, balance=stock(item);if(qty>balance){alert("Not enough stock. Current balance: "+balance);return}data.outs.push({id:Date.now(),date:$("outDate").value,item,qty,issued:$("issuedTo").value,work:$("workOrder").value});e.target.reset();$("outDate").value=today();save()};

function stock(id){return data.ins.filter(x=>x.item===id).reduce((a,x)=>a+x.qty,0)-data.outs.filter(x=>x.item===id).reduce((a,x)=>a+x.qty,0)}
function itemName(id){let x=data.items.find(i=>i.id===id);return x?x.name:"Deleted item"}
function del(type,id){if(confirm("Delete this record?")){data[type]=data[type].filter(x=>x.id!==id);save()}}
function render(){
  $("totalItems").textContent=data.items.length;
  $("totalIn").textContent=data.ins.reduce((a,x)=>a+x.qty,0);
  $("totalOut").textContent=data.outs.reduce((a,x)=>a+x.qty,0);
  $("lowStock").textContent=data.items.filter(i=>stock(i.id)<=i.min).length;
  $("summary").textContent=data.items.length?`There are ${data.items.length} items. ${data.items.filter(i=>stock(i.id)<=i.min).length} item(s) need attention for low stock.`:"Add items and stock transactions to begin.";
  $("inItem").innerHTML=data.items.map(i=>`<option value="${i.id}">${i.name}</option>`).join("");
  $("outItem").innerHTML=$("inItem").innerHTML;
  let q=($("itemSearch").value||"").toLowerCase();
  $("itemTable").innerHTML=data.items.filter(i=>(i.name+" "+i.code+" "+i.cat).toLowerCase().includes(q)).map(i=>`<tr><td>${i.code}</td><td>${i.name}</td><td>${i.cat}</td><td>${i.unit}</td><td>${i.min}</td><td><button class="delete" onclick="del('items',${i.id})">Delete</button></td></tr>`).join("");
  $("inTable").innerHTML=data.ins.map(x=>`<tr><td>${x.date}</td><td>${itemName(x.item)}</td><td>${x.qty}</td><td>${x.supplier}</td><td>${x.invoice}</td><td><button class="delete" onclick="del('ins',${x.id})">Delete</button></td></tr>`).join("");
  $("outTable").innerHTML=data.outs.map(x=>`<tr><td>${x.date}</td><td>${itemName(x.item)}</td><td>${x.qty}</td><td>${x.issued}</td><td>${x.work}</td><td><button class="delete" onclick="del('outs',${x.id})">Delete</button></td></tr>`).join("");
  let sq=($("stockSearch").value||"").toLowerCase();
  $("stockTable").innerHTML=data.items.filter(i=>(i.name+" "+i.code).toLowerCase().includes(sq)).map(i=>{let b=stock(i.id), low=b<=i.min;return `<tr><td>${i.code}</td><td>${i.name}</td><td>${i.unit}</td><td>${data.ins.filter(x=>x.item===i.id).reduce((a,x)=>a+x.qty,0)}</td><td>${data.outs.filter(x=>x.item===i.id).reduce((a,x)=>a+x.qty,0)}</td><td><b>${b}</b></td><td>${low?"⚠️ LOW":"OK"}</td></tr>`}).join("");
}
["itemSearch","stockSearch"].forEach(id=>$(id).oninput=render);
$("clearBtn").onclick=()=>{if(confirm("Delete ALL stock register data?")){data={items:[],ins:[],outs:[]};save()}};
render();