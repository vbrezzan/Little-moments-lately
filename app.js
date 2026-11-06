const DB_NAME="little-moments-db", DB_VERSION=3;
const ENTRY_STORE="memories", HABIT_STORE="habits", NOTE_STORE="monthlyNotes";
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`};
let db, activeFilter="Alle", pendingPhoto=null, deferredInstall=null;
let calendarMonth=new Date(new Date().getFullYear(),new Date().getMonth(),1), selectedDay=today();
let monthlyMonth=new Date(new Date().getFullYear(),new Date().getMonth(),1), monthlyPerson="Tiago";
const $=id=>document.getElementById(id);
const categories=["Tagebuch","Kindersprüche","Zitate","Meilensteine","Fotos"];
function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,DB_VERSION);req.onupgradeneeded=()=>{const d=req.result;if(!d.objectStoreNames.contains(ENTRY_STORE))d.createObjectStore(ENTRY_STORE,{keyPath:"id"});if(!d.objectStoreNames.contains(HABIT_STORE))d.createObjectStore(HABIT_STORE,{keyPath:"id"});if(!d.objectStoreNames.contains(NOTE_STORE))d.createObjectStore(NOTE_STORE,{keyPath:"id"})};req.onsuccess=()=>{db=req.result;resolve(db)};req.onerror=()=>reject(req.error)})}
function getAll(store){return new Promise((resolve,reject)=>{const r=db.transaction(store).objectStore(store).getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
function put(store,item){return new Promise((resolve,reject)=>{const r=db.transaction(store,"readwrite").objectStore(store).put(item);r.onsuccess=()=>resolve();r.onerror=()=>reject(r.error)})}
function remove(store,id){return new Promise((resolve,reject)=>{const r=db.transaction(store,"readwrite").objectStore(store).delete(id);r.onsuccess=()=>resolve();r.onerror=()=>reject(r.error)})}
const allEntries=async()=> (await getAll(ENTRY_STORE)).sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt-a.createdAt);
const allHabits=async()=> (await getAll(HABIT_STORE)).sort((a,b)=>a.createdAt-b.createdAt);
function toast(msg){$("toast").textContent=msg;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),2600)}
function esc(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function formatDate(s){if(!s)return "";const [y,m,d]=s.split("-");return `${d}.${m}.${y}`}
function dateLabel(s){return new Date(`${s}T12:00:00`).toLocaleDateString("de-DE",{day:"numeric",month:"long",year:"numeric"})}
async function render(){const all=await allEntries(),query=$("search").value.trim().toLowerCase();const list=all.filter(e=>(activeFilter==="Alle"||e.category===activeFilter)&&(!query||[e.title,e.body,e.person,e.category].join(" ").toLowerCase().includes(query)));$("entryCount").textContent=`${list.length} ${list.length===1?"Eintrag":"Einträge"}`;$("listHeading").textContent=activeFilter==="Alle"?"Alle Erinnerungen":activeFilter;$("entries").innerHTML=list.length?list.map(e=>`<article class="entry"><div><div class="entry-top"><span class="tag">${esc(e.category)}</span><span>${formatDate(e.date)}</span></div><h3>${esc(e.title)}</h3>${e.body?`<p>${esc(e.body)}</p>`:""}${e.photo?`<img class="entry-photo" src="${e.photo}" alt="Foto zur Erinnerung" loading="lazy">`:""}${e.person?`<div class="entry-person">${e.category==="Kindersprüche"?"Gesagt von":"Für"}: ${esc(e.person)}</div>`:""}</div><div class="entry-tools"><button title="Bearbeiten" aria-label="Bearbeiten" data-edit="${e.id}">✎</button><button title="Löschen" aria-label="Löschen" data-delete="${e.id}">×</button></div></article>`).join(""):`<div class="empty">${query?"Keine passenden Erinnerungen gefunden.":"Hier ist noch Platz für deine Erinnerungen."}<br>Halte deinen ersten kleinen Moment fest.</div>`;document.querySelectorAll(".filter").forEach(b=>b.classList.toggle("active",b.dataset.filter===activeFilter));document.querySelectorAll(".category").forEach(b=>b.classList.toggle("selected",b.dataset.category===activeFilter))}
function openEditor(category="Tagebuch",entry=null){$("entryForm").reset();pendingPhoto=null;$("photoPreview").innerHTML="";$("entryId").value=entry?.id||"";$("category").value=entry?.category||category;$("title").value=entry?.title||"";$("date").value=entry?.date||today();$("body").value=entry?.body||"";$("person").value=entry?.person||"";$("personLabel").firstChild.textContent=$("category").value==="Kindersprüche"?"Gesagt von ":"Person ";$("dialogTitle").textContent=entry?"Erinnerung bearbeiten":"Einen Moment festhalten";if(entry?.photo){pendingPhoto=entry.photo;$("photoPreview").innerHTML=`<img src="${entry.photo}" alt="Foto-Vorschau">`}$("editor").showModal()}
async function compressPhoto(file){if(!file.type.startsWith("image/"))throw new Error("Bitte wähle eine Bilddatei aus.");const bitmap=await createImageBitmap(file);const max=1200,scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));const ctx=canvas.getContext("2d",{alpha:false});ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close?.();return canvas.toDataURL("image/jpeg",0.58)}
$("photo").addEventListener("change",async e=>{const f=e.target.files[0];if(!f)return;const preview=$("photoPreview");preview.textContent="Foto wird vorbereitet …";try{pendingPhoto=await compressPhoto(f);preview.innerHTML=`<img src="${pendingPhoto}" alt="Foto-Vorschau">`;toast("Foto verkleinert und bereit.")}catch(err){preview.textContent="";toast(err.message||"Foto konnte nicht verarbeitet werden.");e.target.value=""}});
$("category").addEventListener("change",()=>{$("personLabel").firstChild.textContent=$("category").value==="Kindersprüche"?"Gesagt von ":"Person ";});
$("entryForm").addEventListener("submit",async e=>{e.preventDefault();const id=$("entryId").value||crypto.randomUUID();const old=$("entryId").value?(await allEntries()).find(x=>x.id===id):null;const entry={id,category:$("category").value,title:$("title").value.trim(),date:$("date").value,body:$("body").value.trim(),person:$("person").value.trim(),photo:pendingPhoto,createdAt:old?.createdAt||Date.now(),updatedAt:Date.now()};if(!entry.title||!entry.date)return;try{await put(ENTRY_STORE,entry);$("editor").close();await render();toast("Erinnerung gespeichert.")}catch(err){toast("Speichern fehlgeschlagen. Möglicherweise ist der Gerätespeicher voll.")}});
$("closeDialog").onclick=$("cancelBtn").onclick=()=>$("editor").close();$("quickAdd").onclick=()=>openEditor();
document.querySelectorAll(".category").forEach(b=>b.addEventListener("click",()=>{if(b.dataset.action==="tracker"){$("trackerSection").scrollIntoView({behavior:"smooth"});return}if(b.dataset.action==="monthly"){$("monthlySection").scrollIntoView({behavior:"smooth"});return}if(b.dataset.category==="Alle"){activeFilter="Alle";render()}else openEditor(b.dataset.category)}));
document.querySelectorAll(".filter").forEach(b=>b.addEventListener("click",()=>{activeFilter=b.dataset.filter;render()}));$("search").addEventListener("input",render);
$("entries").addEventListener("click",async e=>{const edit=e.target.closest("[data-edit]"),del=e.target.closest("[data-delete]");if(edit){const entry=(await allEntries()).find(x=>x.id===edit.dataset.edit);if(entry)openEditor(entry.category,entry)}if(del&&confirm("Möchtest du diese Erinnerung wirklich löschen?")){await remove(ENTRY_STORE,del.dataset.delete);render();toast("Eintrag gelöscht.")}});
async function renderTracker(){const habits=await allHabits(),day=today();$("todayLabel").textContent=dateLabel(day);const done=habits.filter(h=>h.completed?.[day]).length;$("habitProgress").textContent=`${done} / ${habits.length} erledigt`;
$("habitList").innerHTML=habits.length?habits.map(h=>`<div class="habit-card"><input class="habit-check" type="checkbox" data-habit-check="${h.id}" ${h.completed?.[day]?"checked":""} aria-label="${esc(h.name)} erledigt"><div class="habit-main"><div class="habit-name">${esc(h.name)}</div><div class="habit-meta">${esc(h.scope)} · ${esc(h.person||"Alle")} · ${esc(h.frequency)}</div></div><button class="habit-delete" data-habit-delete="${h.id}" aria-label="Gewohnheit löschen">×</button></div>`).join(""):`<div class="empty-habits">Noch keine Gewohnheiten angelegt. Füge deine erste persönliche oder familiäre Routine hinzu.</div>`;
renderCalendar(habits)}
function renderCalendar(habits){const y=calendarMonth.getFullYear(),m=calendarMonth.getMonth();$("monthTitle").textContent=calendarMonth.toLocaleDateString("de-DE",{month:"long",year:"numeric"});const first=(new Date(y,m,1).getDay()+6)%7,days=new Date(y,m+1,0).getDate();let html=["Mo","Di","Mi","Do","Fr","Sa","So"].map(d=>`<div class="calendar-cell weekday">${d}</div>`).join("");for(let i=0;i<first;i++)html+='<div></div>';for(let d=1;d<=days;d++){const key=`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`,count=habits.filter(h=>h.completed?.[key]).length;const cls=[count?"has-done":"",habits.length&&count===habits.length?"all-done":"",key===selectedDay?"selected":"",key===today()?"today":""].filter(Boolean).join(" ");html+=`<button class="calendar-cell ${cls}" data-day="${key}" aria-label="${dateLabel(key)}">${d}</button>`}$("calendarGrid").innerHTML=html;const selected=habits.filter(h=>h.completed?.[selectedDay]);$("dayDetails").innerHTML=`<h4>${dateLabel(selectedDay)}</h4>`+(habits.length?habits.map(h=>`<div class="day-status"><span>${esc(h.name)} <span class="muted-small">(${esc(h.person||h.scope)})</span></span><strong>${h.completed?.[selectedDay]?"Erledigt":"Offen"}</strong></div>`).join(""):"<span class=\"muted-small\">Lege zuerst eine Gewohnheit an.</span>")}
$("addHabitBtn").onclick=()=>{$("habitForm").reset();$("habitEditor").showModal()};$("closeHabit").onclick=$("cancelHabit").onclick=()=>$("habitEditor").close();$("habitForm").addEventListener("submit",async e=>{e.preventDefault();const name=$("habitName").value.trim();if(!name)return;await put(HABIT_STORE,{id:crypto.randomUUID(),name,scope:$("habitScope").value,person:$("habitPerson").value.trim(),frequency:$("habitFrequency").value,completed:{},createdAt:Date.now()});$("habitEditor").close();await renderTracker();toast("Gewohnheit hinzugefügt.")});
$("habitList").addEventListener("change",async e=>{const id=e.target.dataset.habitCheck;if(!id)return;const h=(await allHabits()).find(x=>x.id===id);if(!h)return;h.completed=h.completed||{};if(e.target.checked)h.completed[today()]=true;else delete h.completed[today()];await put(HABIT_STORE,h);await renderTracker()});
$("habitList").addEventListener("click",async e=>{const id=e.target.dataset.habitDelete;if(id&&confirm("Diese Gewohnheit und ihren Fortschritt löschen?")){await remove(HABIT_STORE,id);await renderTracker();toast("Gewohnheit gelöscht.")}});
$("calendarGrid").addEventListener("click",async e=>{const key=e.target.dataset.day;if(!key)return;selectedDay=key;renderTracker()});$("prevMonth").onclick=()=>{calendarMonth=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()-1,1);renderTracker()};$("nextMonth").onclick=()=>{calendarMonth=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()+1,1);renderTracker()};
async function allMonthlyNotes(){return (await getAll(NOTE_STORE)).sort((a,b)=>b.createdAt-a.createdAt)}
function monthKey(){return `${monthlyMonth.getFullYear()}-${String(monthlyMonth.getMonth()+1).padStart(2,"0")}`}
async function renderMonthly(){const key=monthKey();$("monthlyTitle").textContent=monthlyMonth.toLocaleDateString("de-DE",{month:"long",year:"numeric"});document.querySelectorAll(".person-tab").forEach(b=>b.classList.toggle("active",b.dataset.person===monthlyPerson));const notes=(await allMonthlyNotes()).filter(n=>n.person===monthlyPerson&&n.month===key);$("monthlyHint").textContent=`Notizen für ${monthlyPerson} · ${monthlyMonth.toLocaleDateString("de-DE",{month:"long",year:"numeric"})}`;$("monthlyNotes").innerHTML=notes.length?notes.map(n=>`<article class="monthly-note"><div class="monthly-note-top"><time>${dateLabel(n.date)}</time><div><button data-month-edit="${n.id}" aria-label="Notiz bearbeiten">✎</button><button data-month-delete="${n.id}" aria-label="Notiz löschen">×</button></div></div><p>${esc(n.text).replace(/\n/g,"<br>")}</p></article>`).join(""):`<div class="empty-monthly">Für ${esc(monthlyPerson)} gibt es in diesem Monat noch keine Notizen.<br>Hier kannst du alles ungeordnet sammeln – auch kleine Stichpunkte.</div>`}
function openMonthlyEditor(note=null){$("monthlyForm").reset();$("monthlyNoteId").value=note?.id||"";$("monthlyNotePerson").value=note?.person||monthlyPerson;$("monthlyNoteText").value=note?.text||"";$("monthlyDialogTitle").textContent=note?"Notiz bearbeiten":"Notiz festhalten";$("monthlyEditor").showModal()}
$("addMonthlyNote").onclick=()=>openMonthlyEditor();$("closeMonthly").onclick=$("cancelMonthly").onclick=()=>$("monthlyEditor").close();
$("monthlyForm").addEventListener("submit",async e=>{e.preventDefault();const id=$("monthlyNoteId").value||crypto.randomUUID(),old=id!==$("monthlyNoteId").value?null:(await allMonthlyNotes()).find(n=>n.id===id);const person=$("monthlyNotePerson").value;const note={id,person,month:monthKey(),date:old?.date||today(),text:$("monthlyNoteText").value.trim(),createdAt:old?.createdAt||Date.now(),updatedAt:Date.now()};if(!note.text)return;await put(NOTE_STORE,note);monthlyPerson=person;$("monthlyEditor").close();await renderMonthly();toast("Monatsnotiz gespeichert.")});
$("monthlyPeople").addEventListener("click",e=>{const b=e.target.closest("[data-person]");if(!b)return;monthlyPerson=b.dataset.person;renderMonthly()});
$("monthlyPrev").onclick=()=>{monthlyMonth=new Date(monthlyMonth.getFullYear(),monthlyMonth.getMonth()-1,1);renderMonthly()};$("monthlyNext").onclick=()=>{monthlyMonth=new Date(monthlyMonth.getFullYear(),monthlyMonth.getMonth()+1,1);renderMonthly()};
$("monthlyNotes").addEventListener("click",async e=>{const edit=e.target.closest("[data-month-edit]"),del=e.target.closest("[data-month-delete]");if(edit){const n=(await allMonthlyNotes()).find(x=>x.id===edit.dataset.monthEdit);if(n)openMonthlyEditor(n)}if(del&&confirm("Diese Monatsnotiz löschen?")){await remove(NOTE_STORE,del.dataset.monthDelete);renderMonthly();toast("Notiz gelöscht.")}});
async function updateStorageInfo(){
  const label=$("lastBackupLabel");
  const last=localStorage.getItem("little-moments-last-backup");
  label.textContent=last?`Letztes Backup erstellt: ${new Date(last).toLocaleString("de-DE")}`:"Noch kein Backup auf diesem Gerät vermerkt.";
  if(navigator.storage?.estimate){
    try{
      const estimate=await navigator.storage.estimate();
      const used=estimate.usage||0, quota=estimate.quota||0;
      const mb=n=>`${(n/1024/1024).toFixed(1).replace(".",",")} MB`;
      $("storageUsage").textContent=quota?`${mb(used)} verwendet · ungefähr ${mb(quota)} verfügbarer Browser-Speicher als Richtwert`:`${mb(used)} verwendet`;
      $("storageMeterFill").style.width=quota?`${Math.min(100,used/quota*100)}%`:"0%";
    }catch(e){$("storageUsage").textContent="Speicherbelegung kann auf diesem Gerät nicht angezeigt werden."}
  }else{$("storageUsage").textContent="Dein Browser stellt keine Speicherübersicht bereit."}
}
$("exportBtn").onclick=async()=>{
  try{
    const payload={app:"Little Moments",formatVersion:4,exportedAt:new Date().toISOString(),entries:await allEntries(),habits:await allHabits(),monthlyNotes:await allMonthlyNotes()};
    const blob=new Blob([JSON.stringify(payload)],{type:"application/json"});
    const url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download=`little-moments-backup-${today()}.json`;document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
    localStorage.setItem("little-moments-last-backup",new Date().toISOString());
    await updateStorageInfo();toast("Backup-Datei erstellt.");
  }catch(err){toast("Backup konnte nicht erstellt werden. Bitte prüfe den freien Speicherplatz.")}
};
$("importInput").addEventListener("change",async e=>{
  const file=e.target.files[0];if(!file)return;
  try{
    const data=JSON.parse(await file.text());
    if(data.app!=="Little Moments"||!Array.isArray(data.entries))throw new Error("Das ist keine gültige Little Moments-Backup-Datei.");
    const incomingEntries=data.entries.filter(x=>x?.id&&x.title&&x.date&&categories.includes(x.category));
    const incomingHabits=(data.habits||[]).filter(x=>x?.id&&x.name);
    const incomingNotes=(data.monthlyNotes||[]).filter(x=>x?.id&&x.person&&x.month&&x.text);
    const [existingEntries,existingHabits,existingNotes]=await Promise.all([getAll(ENTRY_STORE),getAll(HABIT_STORE),getAll(NOTE_STORE)]);
    const entryIds=new Set(existingEntries.map(x=>x.id)),habitIds=new Set(existingHabits.map(x=>x.id)),noteIds=new Set(existingNotes.map(x=>x.id));
    const freshEntries=incomingEntries.filter(x=>!entryIds.has(x.id));
    const freshHabits=incomingHabits.filter(x=>!habitIds.has(x.id));
    const freshNotes=incomingNotes.filter(x=>!noteIds.has(x.id));
    const total=freshEntries.length+freshHabits.length+freshNotes.length;
    if(!confirm(`Neue Inhalte aus dem Backup hinzufügen?\n\n${freshEntries.length} Erinnerungen\n${freshHabits.length} Gewohnheiten\n${freshNotes.length} Monatsnotizen\n\nBereits vorhandene IDs werden übersprungen. Es wird nichts überschrieben.`))return;
    for(const x of freshEntries)await put(ENTRY_STORE,x);
    for(const x of freshHabits)await put(HABIT_STORE,x);
    for(const x of freshNotes)await put(NOTE_STORE,x);
    await render();await renderTracker();await renderMonthly();await updateStorageInfo();
    toast(total?`${total} neue Einträge hinzugefügt.`:"Keine neuen Einträge gefunden.");
  }catch(err){alert(err.message||"Datei konnte nicht gelesen werden.")}
  finally{e.target.value=""}
});
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstall=e;$("installBtn").hidden=false});$("installBtn").onclick=async()=>{if(!deferredInstall)return;deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;$("installBtn").hidden=true};
if("serviceWorker" in navigator&&location.protocol.startsWith("http"))window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
(async()=>{try{await openDB();await render();await renderTracker();await renderMonthly();await updateStorageInfo()}catch(e){$("entries").innerHTML='<div class="empty">Der lokale Speicher konnte nicht geöffnet werden. Bitte verwende einen aktuellen Browser.</div>'}})();
