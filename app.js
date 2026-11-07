const DB_NAME="little-moments-db", DB_VERSION=4;
const ENTRY_STORE="memories", HABIT_STORE="habits", NOTE_STORE="monthlyNotes", FAVORITE_STORE="favorites", EVENT_STORE="yearEvents";
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`};
let db, activeFilter="Alle", pendingPhoto=null, pendingAudio=null, pendingMonthlyAudio=null, deferredInstall=null;
let diaryCalendarMonth=new Date(new Date().getFullYear(),new Date().getMonth(),1), selectedDiaryDate="";
let favoriteStatusFilter="Alle", favoriteYearFilter="Alle";
let calendarMonth=new Date(new Date().getFullYear(),new Date().getMonth(),1), selectedDay=today();
let monthlyMonth=new Date(new Date().getFullYear(),new Date().getMonth(),1), monthlyPerson="Tiago";
let favoriteFilter="Alle", yearView=new Date().getFullYear(), selectedYearMonth=new Date().getMonth();
let memoryYearFilter="Alle", memoryMonthFilter="Alle";
const $=id=>document.getElementById(id);
const categories=["Tagebuch","Kindersprüche","Zitate","Meilensteine","Fotos"];
function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,DB_VERSION);req.onupgradeneeded=()=>{const d=req.result;if(!d.objectStoreNames.contains(ENTRY_STORE))d.createObjectStore(ENTRY_STORE,{keyPath:"id"});if(!d.objectStoreNames.contains(HABIT_STORE))d.createObjectStore(HABIT_STORE,{keyPath:"id"});if(!d.objectStoreNames.contains(NOTE_STORE))d.createObjectStore(NOTE_STORE,{keyPath:"id"});if(!d.objectStoreNames.contains(FAVORITE_STORE))d.createObjectStore(FAVORITE_STORE,{keyPath:"id"});if(!d.objectStoreNames.contains(EVENT_STORE))d.createObjectStore(EVENT_STORE,{keyPath:"id"})};req.onsuccess=()=>{db=req.result;resolve(db)};req.onerror=()=>reject(req.error)})}
function getAll(store){return new Promise((resolve,reject)=>{const r=db.transaction(store).objectStore(store).getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
function put(store,item){return new Promise((resolve,reject)=>{const r=db.transaction(store,"readwrite").objectStore(store).put(item);r.onsuccess=()=>resolve();r.onerror=()=>reject(r.error)})}
function remove(store,id){return new Promise((resolve,reject)=>{const r=db.transaction(store,"readwrite").objectStore(store).delete(id);r.onsuccess=()=>resolve();r.onerror=()=>reject(r.error)})}
const allEntries=async()=> (await getAll(ENTRY_STORE)).sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt-a.createdAt);
const allHabits=async()=> (await getAll(HABIT_STORE)).sort((a,b)=>a.createdAt-b.createdAt);
function toast(msg){$("toast").textContent=msg;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),2600)}
function esc(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function formatDate(s){if(!s)return "";const [y,m,d]=s.split("-");return `${d}.${m}.${y}`}
function dateLabel(s){return new Date(`${s}T12:00:00`).toLocaleDateString("de-DE",{day:"numeric",month:"long",year:"numeric"})}
const monthNames=Array.from({length:12},(_,i)=>new Date(2020,i,1).toLocaleDateString("de-DE",{month:"long"}));
function setMonthYearSelects(monthId,yearId,date,minYear=2019){const m=$(monthId),y=$(yearId);if(!m||!y)return;m.innerHTML=monthNames.map((n,i)=>`<option value="${i}">${n}</option>`).join("");const current=new Date().getFullYear();y.innerHTML=Array.from({length:current+2-minYear},(_,i)=>current+1-i).map(v=>`<option value="${v}">${v}</option>`).join("");m.value=String(date.getMonth());y.value=String(date.getFullYear())}
function monthYearFromSelects(monthId,yearId){return new Date(Number($(yearId).value),Number($(monthId).value),1)}
function memoryYears(entries){const ys=entries.map(e=>Number((e.date||"").slice(0,4))).filter(y=>y>1900);const min=ys.length?Math.min(...ys):new Date().getFullYear();return Array.from({length:new Date().getFullYear()+1-min+1},(_,i)=>new Date().getFullYear()+1-i)}
async function render(){
  const all=await allEntries(),query=$("search").value.trim().toLowerCase();
  const years=memoryYears(all);$("memoryYearFilter").innerHTML='<option value="Alle">Alle Jahre</option>'+years.map(y=>`<option value="${y}">${y}</option>`).join("");$("memoryYearFilter").value=years.includes(Number(memoryYearFilter))?memoryYearFilter:"Alle";
  const list=all.filter(e=>(query||activeFilter==="Alle"||e.category===activeFilter)&&(!query||[e.title,e.body,e.person,e.category,e.date].join(" ").toLowerCase().includes(query))&&(memoryYearFilter==="Alle"||(e.date||"").slice(0,4)===memoryYearFilter)&&(memoryMonthFilter==="Alle"||(e.date||"").slice(5,7)===String(memoryMonthFilter).padStart(2,"0"))&&(!selectedDiaryDate||activeFilter!=="Tagebuch"||e.category!=="Tagebuch"||e.date===selectedDiaryDate));
  renderDiaryCalendar(all);
  const matchingEvents=query?(await allYearEvents()).filter(x=>[x.title,x.category,x.people,x.description,x.start,x.end].join(" ").toLowerCase().includes(query)):[];
  const matchingNotes=query?(await allMonthlyNotes()).filter(x=>[x.person,x.month,x.date,x.text].join(" ").toLowerCase().includes(query)):[];
  const matchingFavorites=query?(await allFavorites()).filter(x=>[x.title,x.creator,x.note,x.type,x.year,x.status].join(" ").toLowerCase().includes(query)):[];
  const matchingHabits=query?(await allHabits()).filter(x=>[x.name,x.scope,x.person,x.frequency,...Object.keys(x.completed||{})].join(" ").toLowerCase().includes(query)):[];
  const entriesHtml=list.map(e=>`<article class="entry"><div><div class="entry-top"><span class="tag">${esc(e.category)}</span><span>${formatDate(e.date)}</span></div><h3>${esc(e.title)}</h3>${e.body?`<p>${esc(e.body.length>280?e.body.slice(0,280)+" …":e.body)}</p>`:""}${e.category==="Tagebuch"&&e.body?.length>280?`<button class="text-button entry-read-more" data-view-entry="${e.id}">Eintrag in Vollansicht lesen</button>`:""}${e.photo?`<img class="entry-photo" src="${e.photo}" alt="Foto zur Erinnerung" loading="lazy">`:""}${e.audio?`<audio class="entry-audio" controls preload="none" src="${e.audio}"></audio>`:""}${e.person?`<div class="entry-person">${e.category==="Kindersprüche"?"Gesagt von":"Für"}: ${esc(e.person)}</div>`:""}</div><div class="entry-tools"><button title="Bearbeiten" aria-label="Bearbeiten" data-edit="${e.id}">✎</button><button title="Löschen" aria-label="Löschen" data-delete="${e.id}">×</button></div></article>`).join("");
  const eventsHtml=matchingEvents.map(x=>`<article class="entry search-year-event"><div><div class="entry-top"><span class="tag">Jahresereignis · ${esc(x.category)}</span><span>${formatDate(x.start)}${x.end!==x.start?` – ${formatDate(x.end)}`:""}</span></div><h3>${esc(x.title)}</h3>${x.description?`<p>${esc(x.description)}</p>`:""}${x.people?`<div class="entry-person">Mit: ${esc(x.people)}</div>`:""}</div><div class="entry-tools"><button title="Bearbeiten" aria-label="Bearbeiten" data-year-search-edit="${x.id}">✎</button></div></article>`).join("");
  const notesHtml=matchingNotes.map(x=>`<article class="entry search-extra"><div><div class="entry-top"><span class="tag">Monatsnotiz · ${esc(x.person)}</span><span>${esc(x.month||x.date||"")}</span></div><p>${esc(x.text)}</p></div><div class="entry-tools"><button title="Bearbeiten" aria-label="Bearbeiten" data-month-search-edit="${x.id}">✎</button></div></article>`).join("");
  const favoritesHtml=matchingFavorites.map(x=>`<article class="entry search-extra"><div><div class="entry-top"><span class="tag">${esc(x.type)} · Sammlung</span><span>${esc(x.year||"")}</span></div><h3>${esc(x.title)}</h3>${x.creator?`<p>${esc(x.creator)}</p>`:""}${x.note?`<p>${esc(x.note)}</p>`:""}</div><div class="entry-tools"><button title="Bearbeiten" aria-label="Bearbeiten" data-fav-search-edit="${x.id}">✎</button></div></article>`).join("");
  const habitsHtml=matchingHabits.map(x=>`<article class="entry search-extra"><div><div class="entry-top"><span class="tag">Habit Tracker</span><span>${esc(x.scope||"")}</span></div><h3>${esc(x.name)}</h3><p>${esc(x.person||"Alle")} · ${esc(x.frequency||"")}</p></div></article>`).join("");
  const resultCount=list.length+matchingEvents.length+matchingNotes.length+matchingFavorites.length+matchingHabits.length;
  $("entryCount").textContent=query?`${resultCount} Treffer in allen Bereichen`:`${list.length} ${list.length===1?"Eintrag":"Einträge"}`;
  $("listHeading").textContent=activeFilter==="Alle"?"Alle Erinnerungen":activeFilter;
  $("entries").innerHTML=entriesHtml+eventsHtml+notesHtml+favoritesHtml+habitsHtml||`<div class="empty">${query?"Keine passenden Inhalte gefunden.":"Hier ist noch Platz für deine Erinnerungen."}<br>Halte deinen ersten kleinen Moment fest.</div>`;
  document.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle("active",b.dataset.filter===activeFilter));
  document.querySelectorAll(".category").forEach(b=>b.classList.toggle("selected",b.dataset.category===activeFilter));
}
function renderDiaryCalendar(all){
  const wrap=$("diaryCalendarWrap");if(!wrap)return;wrap.hidden=activeFilter!=="Tagebuch";
  if(activeFilter!=="Tagebuch")return;
  const y=diaryCalendarMonth.getFullYear(),m=diaryCalendarMonth.getMonth(),days=new Date(y,m+1,0).getDate(),first=(new Date(y,m,1).getDay()+6)%7;
  $("diaryMonthTitle").textContent=diaryCalendarMonth.toLocaleDateString("de-DE",{month:"long",year:"numeric"});setMonthYearSelects("diaryMonthSelect","diaryYearSelect",diaryCalendarMonth,all.length?2019:2019);
  const marked=new Set(all.filter(x=>x.category==="Tagebuch"&&x.date.startsWith(`${y}-${String(m+1).padStart(2,"0")}-`)).map(x=>x.date));
  let out=["Mo","Di","Mi","Do","Fr","Sa","So"].map(d=>`<div class="calendar-cell weekday">${d}</div>`).join("");for(let i=0;i<first;i++)out+="<div></div>";
  for(let d=1;d<=days;d++){const key=`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;out+=`<button type="button" class="calendar-cell ${marked.has(key)?"has-done":""} ${selectedDiaryDate===key?"selected":""}" data-diary-day="${key}">${d}</button>`}
  $("diaryCalendarGrid").innerHTML=out;$("diaryClearDate").hidden=!selectedDiaryDate;$("diarySelectedLabel").textContent=selectedDiaryDate?`Einträge vom ${dateLabel(selectedDiaryDate)}`:"Alle Tagebucheinträge";
}
$("diaryPrevMonth").onclick=()=>{diaryCalendarMonth=new Date(diaryCalendarMonth.getFullYear(),diaryCalendarMonth.getMonth()-1,1);render()};
$("diaryNextMonth").onclick=()=>{diaryCalendarMonth=new Date(diaryCalendarMonth.getFullYear(),diaryCalendarMonth.getMonth()+1,1);render()};
$("diaryMonthSelect").addEventListener("change",()=>{diaryCalendarMonth=monthYearFromSelects("diaryMonthSelect","diaryYearSelect");selectedDiaryDate="";render()});$("diaryYearSelect").addEventListener("change",()=>{diaryCalendarMonth=monthYearFromSelects("diaryMonthSelect","diaryYearSelect");selectedDiaryDate="";render()});
$("diaryCalendarGrid").addEventListener("click",e=>{const day=e.target.closest("[data-diary-day]");if(!day)return;selectedDiaryDate=day.dataset.diaryDay;render()});
$("diaryClearDate").onclick=()=>{selectedDiaryDate="";render()};
$("memoryYearFilter").addEventListener("change",e=>{memoryYearFilter=e.target.value;render()});$("memoryMonthFilter").addEventListener("change",e=>{memoryMonthFilter=e.target.value;render()});$("clearMemoryDateFilter").onclick=()=>{memoryYearFilter="Alle";memoryMonthFilter="Alle";$("memoryYearFilter").value="Alle";$("memoryMonthFilter").value="Alle";render()};
function updateEntryOptionalFields(){const isQuote=$("category").value==="Kindersprüche";$("audioField").hidden=false;$("audioFieldLabel").textContent=isQuote?"Sprachaufnahme (z. B. Kinderspruch)":"Sprachaufnahme (optional)";$("personLabel").firstChild.textContent=isQuote?"Gesagt von ":"Person ";}
function renderAudioPreview(){const el=$("audioPreview");if(!el)return;el.innerHTML=pendingAudio?`<audio controls preload="metadata" src="${pendingAudio}"></audio><button type="button" class="text-button" id="removeAudio">Aufnahme entfernen</button>`:"";$("removeAudio")?.addEventListener("click",()=>{pendingAudio=null;renderAudioPreview();$("audioFile").value=""})}
$("audioFile").addEventListener("change",async e=>{const f=e.target.files[0];if(!f)return;if(!f.type.startsWith("audio/")){toast("Bitte eine Audiodatei auswählen.");e.target.value="";return}if(f.size>15*1024*1024){toast("Die Audiodatei darf höchstens 15 MB groß sein.");e.target.value="";return}try{pendingAudio=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.readAsDataURL(f)});renderAudioPreview();toast("Sprachaufnahme hinzugefügt.")}catch(err){toast("Audiodatei konnte nicht gelesen werden.")}});
function openEditor(category="Tagebuch",entry=null){$("entryForm").reset();pendingPhoto=null;pendingAudio=null;$("photoPreview").innerHTML="";$("entryId").value=entry?.id||"";$("category").value=entry?.category||category;$("title").value=entry?.title||"";$("date").value=entry?.date||today();$("body").value=entry?.body||"";$("person").value=entry?.person||"";$("personLabel").firstChild.textContent=$("category").value==="Kindersprüche"?"Gesagt von ":"Person ";$("dialogTitle").textContent=entry?"Erinnerung bearbeiten":"Einen Moment festhalten";if(entry?.photo){pendingPhoto=entry.photo;$("photoPreview").innerHTML=`<img src="${entry.photo}" alt="Foto-Vorschau">`}pendingAudio=entry?.audio||null;renderAudioPreview();updateEntryOptionalFields();$("editor").showModal()}
async function compressPhoto(file){if(!file.type.startsWith("image/"))throw new Error("Bitte wähle eine Bilddatei aus.");const bitmap=await createImageBitmap(file);const max=800,scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));const ctx=canvas.getContext("2d",{alpha:false});ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close?.();return canvas.toDataURL("image/jpeg",0.40)}
$("photo").addEventListener("change",async e=>{const f=e.target.files[0];if(!f)return;const preview=$("photoPreview");preview.textContent="Foto wird vorbereitet …";try{pendingPhoto=await compressPhoto(f);preview.innerHTML=`<img src="${pendingPhoto}" alt="Foto-Vorschau">`;toast("Foto verkleinert und bereit.")}catch(err){preview.textContent="";toast(err.message||"Foto konnte nicht verarbeitet werden.");e.target.value=""}});
$("category").addEventListener("change",updateEntryOptionalFields);
$("entryForm").addEventListener("submit",async e=>{e.preventDefault();const id=$("entryId").value||crypto.randomUUID();const old=$("entryId").value?(await allEntries()).find(x=>x.id===id):null;const entry={id,category:$("category").value,title:$("title").value.trim(),date:$("date").value,body:$("body").value.trim(),person:$("person").value.trim(),photo:pendingPhoto,audio:pendingAudio,createdAt:old?.createdAt||Date.now(),updatedAt:Date.now()};if(!entry.title||!entry.date)return;try{await put(ENTRY_STORE,entry);$("editor").close();await render();toast("Erinnerung gespeichert.")}catch(err){toast("Speichern fehlgeschlagen. Möglicherweise ist der Gerätespeicher voll.")}});
$("closeDialog").onclick=$("cancelBtn").onclick=()=>$("editor").close();$("quickAdd").onclick=()=>openEditor();
document.querySelectorAll(".category").forEach(b=>b.addEventListener("click",()=>{if(b.dataset.action==="tracker"){$("trackerSection").scrollIntoView({behavior:"smooth"});return}if(b.dataset.action==="monthly"){$("monthlySection").scrollIntoView({behavior:"smooth"});return}if(b.dataset.action==="favorites"){$("favoritesSection").scrollIntoView({behavior:"smooth"});return}if(b.dataset.action==="year"){$("yearSection").scrollIntoView({behavior:"smooth"});return}if(b.dataset.action==="export"){$("exportSection").scrollIntoView({behavior:"smooth"});return}if(b.dataset.action==="import"){$("importSection").scrollIntoView({behavior:"smooth"});return}if(b.dataset.category==="Alle"){activeFilter="Alle";render()}else openEditor(b.dataset.category)}));
document.querySelectorAll(".filter").forEach(b=>b.addEventListener("click",()=>{activeFilter=b.dataset.filter;render()}));$("search").addEventListener("input",render);
$("entries").addEventListener("click",async e=>{const view=e.target.closest("[data-view-entry]"),edit=e.target.closest("[data-edit]"),del=e.target.closest("[data-delete]"),yearEdit=e.target.closest("[data-year-search-edit]"),monthEdit=e.target.closest("[data-month-search-edit]"),favEdit=e.target.closest("[data-fav-search-edit]");if(view){const entry=(await allEntries()).find(x=>x.id===view.dataset.viewEntry);if(entry)openEntryReadingView(entry)}if(edit){const entry=(await allEntries()).find(x=>x.id===edit.dataset.edit);if(entry)openEditor(entry.category,entry)}if(yearEdit){const item=(await allYearEvents()).find(x=>x.id===yearEdit.dataset.yearSearchEdit);if(item)openEventEditor(item)}if(monthEdit){const item=(await allMonthlyNotes()).find(x=>x.id===monthEdit.dataset.monthSearchEdit);if(item){monthlyPerson=item.person;monthlyMonth=new Date(`${item.month}-01T12:00:00`);await renderMonthly();openMonthlyEditor(item)}}if(favEdit){const item=(await allFavorites()).find(x=>x.id===favEdit.dataset.favSearchEdit);if(item)openFavoriteEditor(item)}if(del&&confirm("Möchtest du diese Erinnerung wirklich löschen?")){await remove(ENTRY_STORE,del.dataset.delete);render();toast("Eintrag gelöscht.")}});
function openEntryReadingView(entry){
  $("readingViewContent").innerHTML=`<div class="reading-view-meta">${esc(entry.category)} · ${dateLabel(entry.date)}${entry.person?` · ${esc(entry.person)}`:""}</div><h2>${esc(entry.title)}</h2><div class="reading-view-body">${esc(entry.body||"")}</div>${entry.photo?`<img class="reading-view-photo" src="${entry.photo}" alt="Foto zur Erinnerung">`:""}${entry.audio?`<div class="reading-view-audio"><div class="eyebrow">SPRACHAUFNAHME</div><audio controls preload="metadata" src="${entry.audio}"></audio></div>`:""}`;
  $("readingViewDialog").showModal();
}
$("closeReadingView").onclick=()=>$("readingViewDialog").close();
async function renderTracker(){const habits=await allHabits(),day=selectedDay||today();const isToday=day===today();$("trackerDayHeading").textContent=isToday?"Heute":"Ausgewählter Tag";$("todayLabel").textContent=dateLabel(day);$("trackerTodayBtn").hidden=isToday;const done=habits.filter(h=>h.completed?.[day]).length;$("habitProgress").textContent=`${done} / ${habits.length} erledigt`;
$("habitList").innerHTML=habits.length?habits.map(h=>`<div class="habit-card"><input class="habit-check" type="checkbox" data-habit-check="${h.id}" ${h.completed?.[day]?"checked":""} aria-label="${esc(h.name)} erledigt"><div class="habit-main"><div class="habit-name">${esc(h.name)}</div><div class="habit-meta">${esc(h.scope)} · ${esc(h.person||"Alle")} · ${esc(h.frequency)}</div></div><button class="habit-delete" data-habit-delete="${h.id}" aria-label="Gewohnheit löschen">×</button></div>`).join(""):`<div class="empty-habits">Noch keine Gewohnheiten angelegt. Füge deine erste persönliche oder familiäre Routine hinzu.</div>`;
renderHabitMonthlySummary(habits);renderCalendar(habits)}
function renderHabitMonthlySummary(habits){
  const y=calendarMonth.getFullYear(),m=calendarMonth.getMonth(),days=new Date(y,m+1,0).getDate(),prefix=`${y}-${String(m+1).padStart(2,"0")}-`;
  $("habitMonthlySummary").innerHTML=habits.length?habits.map(h=>{
    const active=[];for(let d=1;d<=days;d++){const key=`${prefix}${String(d).padStart(2,"0")}`;if(h.completed?.[key])active.push(d)}
    const cells=Array.from({length:days},(_,i)=>{const d=i+1,done=active.includes(d);return `<span class="habit-month-day ${done?"done":""}" title="${d}. ${done?"Erledigt":"Nicht markiert"}">${d}</span>`}).join("");
    return `<article class="habit-month-card"><div class="habit-month-top"><strong>${esc(h.name)}</strong><span><b>${active.length}</b> / ${days} Tage</span></div><div class="habit-month-days">${cells}</div><div class="habit-month-dates">${active.length?`Erledigt am: ${active.join(", ")}.`:"Noch keine Aktivität in diesem Monat."}</div></article>`;
  }).join(""):`<div class="empty-habits">Füge eine Gewohnheit hinzu, um hier die monatliche Häufigkeit zu sehen.</div>`;
}
function renderCalendar(habits){const y=calendarMonth.getFullYear(),m=calendarMonth.getMonth();$("monthTitle").textContent=calendarMonth.toLocaleDateString("de-DE",{month:"long",year:"numeric"});setMonthYearSelects("habitMonthSelect","habitYearSelect",calendarMonth,2019);const first=(new Date(y,m,1).getDay()+6)%7,days=new Date(y,m+1,0).getDate();let html=["Mo","Di","Mi","Do","Fr","Sa","So"].map(d=>`<div class="calendar-cell weekday">${d}</div>`).join("");for(let i=0;i<first;i++)html+='<div></div>';for(let d=1;d<=days;d++){const key=`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`,count=habits.filter(h=>h.completed?.[key]).length;const cls=[count?"has-done":"",habits.length&&count===habits.length?"all-done":"",key===selectedDay?"selected":"",key===today()?"today":""].filter(Boolean).join(" ");html+=`<button class="calendar-cell ${cls}" data-day="${key}" aria-label="${dateLabel(key)}">${d}</button>`}$("calendarGrid").innerHTML=html;const selected=habits.filter(h=>h.completed?.[selectedDay]);$("dayDetails").innerHTML=`<h4>${dateLabel(selectedDay)}</h4>`+(habits.length?habits.map(h=>`<div class="day-status"><span>${esc(h.name)} <span class="muted-small">(${esc(h.person||h.scope)})</span></span><strong>${h.completed?.[selectedDay]?"Erledigt":"Offen"}</strong></div>`).join(""):`<span class="muted-small">Lege zuerst eine Gewohnheit an.</span>`)}
$("addHabitBtn").onclick=()=>{$("habitForm").reset();$("habitEditor").showModal()};$("closeHabit").onclick=$("cancelHabit").onclick=()=>$("habitEditor").close();$("habitForm").addEventListener("submit",async e=>{e.preventDefault();const name=$("habitName").value.trim();if(!name)return;await put(HABIT_STORE,{id:crypto.randomUUID(),name,scope:$("habitScope").value,person:$("habitPerson").value.trim(),frequency:$("habitFrequency").value,completed:{},createdAt:Date.now()});$("habitEditor").close();await renderTracker();toast("Gewohnheit hinzugefügt.")});
$("habitList").addEventListener("change",async e=>{const id=e.target.dataset.habitCheck;if(!id)return;const h=(await allHabits()).find(x=>x.id===id);if(!h)return;h.completed=h.completed||{};if(e.target.checked)h.completed[selectedDay]=true;else delete h.completed[selectedDay];await put(HABIT_STORE,h);await renderTracker()});
$("habitList").addEventListener("click",async e=>{const id=e.target.dataset.habitDelete;if(id&&confirm("Diese Gewohnheit und ihren Fortschritt löschen?")){await remove(HABIT_STORE,id);await renderTracker();toast("Gewohnheit gelöscht.")}});
$("calendarGrid").addEventListener("click",async e=>{const key=e.target.dataset.day;if(!key||key>today())return;selectedDay=key;renderTracker()});$("trackerTodayBtn").onclick=()=>{selectedDay=today();calendarMonth=new Date(new Date().getFullYear(),new Date().getMonth(),1);renderTracker()};$("prevMonth").onclick=()=>{calendarMonth=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()-1,1);renderTracker()};$("nextMonth").onclick=()=>{calendarMonth=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()+1,1);renderTracker()};$("habitMonthSelect").addEventListener("change",()=>{calendarMonth=monthYearFromSelects("habitMonthSelect","habitYearSelect");selectedDay=`${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth()+1).padStart(2,"0")}-01`;renderTracker()});$("habitYearSelect").addEventListener("change",()=>{calendarMonth=monthYearFromSelects("habitMonthSelect","habitYearSelect");selectedDay=`${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth()+1).padStart(2,"0")}-01`;renderTracker()});
async function allMonthlyNotes(){return (await getAll(NOTE_STORE)).sort((a,b)=>b.createdAt-a.createdAt)}
function monthKey(){return `${monthlyMonth.getFullYear()}-${String(monthlyMonth.getMonth()+1).padStart(2,"0")}`}
async function renderMonthly(){const key=monthKey();$("monthlyTitle").textContent=monthlyMonth.toLocaleDateString("de-DE",{month:"long",year:"numeric"});setMonthYearSelects("monthlyMonthSelect","monthlyYearSelect",monthlyMonth,2019);document.querySelectorAll(".person-tab").forEach(b=>b.classList.toggle("active",b.dataset.person===monthlyPerson));const notes=(await allMonthlyNotes()).filter(n=>n.person===monthlyPerson&&n.month===key);$("monthlyHint").textContent=`Notizen für ${monthlyPerson} · ${monthlyMonth.toLocaleDateString("de-DE",{month:"long",year:"numeric"})}`;$("monthlyNotes").innerHTML=notes.length?notes.map(n=>`<article class="monthly-note"><div class="monthly-note-top"><time>${dateLabel(n.date)}</time><div><button data-month-edit="${n.id}" aria-label="Notiz bearbeiten">✎</button><button data-month-delete="${n.id}" aria-label="Notiz löschen">×</button></div></div><p>${esc(n.text).replace(/\n/g,"<br>")}</p>${n.audio?`<audio class="entry-audio" controls preload="none" src="${n.audio}"></audio>`:""}</article>`).join(""):`<div class="empty-monthly">Für ${esc(monthlyPerson)} gibt es in diesem Monat noch keine Notizen.<br>Hier kannst du alles ungeordnet sammeln – auch kleine Stichpunkte.</div>`}
function renderMonthlyAudioPreview(){const el=$("monthlyAudioPreview");if(!el)return;el.innerHTML=pendingMonthlyAudio?`<audio controls preload="metadata" src="${pendingMonthlyAudio}"></audio><button type="button" class="text-button" id="removeMonthlyAudio">Aufnahme entfernen</button>`:"";$("removeMonthlyAudio")?.addEventListener("click",()=>{pendingMonthlyAudio=null;renderMonthlyAudioPreview();$("monthlyAudioFile").value=""})}
$("monthlyAudioFile").addEventListener("change",async e=>{const f=e.target.files[0];if(!f)return;if(!f.type.startsWith("audio/")){toast("Bitte eine Audiodatei auswählen.");e.target.value="";return}if(f.size>15*1024*1024){toast("Die Audiodatei darf höchstens 15 MB groß sein.");e.target.value="";return}try{pendingMonthlyAudio=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.readAsDataURL(f)});renderMonthlyAudioPreview();toast("Sprachaufnahme hinzugefügt.")}catch(err){toast("Audiodatei konnte nicht gelesen werden.")}});
function openMonthlyEditor(note=null){$("monthlyForm").reset();pendingMonthlyAudio=note?.audio||null;$("monthlyNoteId").value=note?.id||"";$("monthlyNotePerson").value=note?.person||monthlyPerson;$("monthlyNoteText").value=note?.text||"";$("monthlyDialogTitle").textContent=note?"Notiz bearbeiten":"Notiz festhalten";renderMonthlyAudioPreview();$("monthlyEditor").showModal()}
$("addMonthlyNote").onclick=()=>openMonthlyEditor();$("closeMonthly").onclick=$("cancelMonthly").onclick=()=>$("monthlyEditor").close();
$("monthlyForm").addEventListener("submit",async e=>{e.preventDefault();const id=$("monthlyNoteId").value||crypto.randomUUID(),old=id!==$("monthlyNoteId").value?null:(await allMonthlyNotes()).find(n=>n.id===id);const person=$("monthlyNotePerson").value;const note={id,person,month:monthKey(),date:old?.date||`${monthKey()}-01`,text:$("monthlyNoteText").value.trim(),audio:pendingMonthlyAudio,createdAt:old?.createdAt||Date.now(),updatedAt:Date.now()};if(!note.text)return;await put(NOTE_STORE,note);monthlyPerson=person;$("monthlyEditor").close();await renderMonthly();toast("Monatsnotiz gespeichert.")});
$("monthlyPeople").addEventListener("click",e=>{const b=e.target.closest("[data-person]");if(!b)return;monthlyPerson=b.dataset.person;renderMonthly()});
$("monthlyPrev").onclick=()=>{monthlyMonth=new Date(monthlyMonth.getFullYear(),monthlyMonth.getMonth()-1,1);renderMonthly()};$("monthlyNext").onclick=()=>{monthlyMonth=new Date(monthlyMonth.getFullYear(),monthlyMonth.getMonth()+1,1);renderMonthly()};$("monthlyMonthSelect").addEventListener("change",()=>{monthlyMonth=monthYearFromSelects("monthlyMonthSelect","monthlyYearSelect");renderMonthly()});$("monthlyYearSelect").addEventListener("change",()=>{monthlyMonth=monthYearFromSelects("monthlyMonthSelect","monthlyYearSelect");renderMonthly()});
$("monthlyNotes").addEventListener("click",async e=>{const edit=e.target.closest("[data-month-edit]"),del=e.target.closest("[data-month-delete]");if(edit){const n=(await allMonthlyNotes()).find(x=>x.id===edit.dataset.monthEdit);if(n)openMonthlyEditor(n)}if(del&&confirm("Diese Monatsnotiz löschen?")){await remove(NOTE_STORE,del.dataset.monthDelete);renderMonthly();toast("Notiz gelöscht.")}});
// Favorites collection
async function allFavorites(){return (await getAll(FAVORITE_STORE)).sort((a,b)=>(b.updatedAt||b.createdAt)-(a.updatedAt||a.createdAt))}
function openFavoriteEditor(item=null){$("favoriteForm").reset();$("favoriteId").value=item?.id||"";$("favoriteType").value=item?.type||"Buch";$("favoriteTitle").value=item?.title||"";$("favoriteCreator").value=item?.creator||"";$("favoriteYear").value=item?.year||"";$("favoriteRating").value=item?.rating||"";$("favoriteStatus").value=item?.status==="Auf meiner Liste"?"Noch lesen/sehen":(item?.status||"Favorit");$("favoriteNote").value=item?.note||"";$("favoriteDialogTitle").textContent=item?"Favorit bearbeiten":"Favorit hinzufügen";$("favoriteEditor").showModal()}
async function renderFavorites(){const q=$("favoriteSearch").value.trim().toLowerCase(),items=(await allFavorites()).filter(x=>(favoriteFilter==="Alle"||x.type===favoriteFilter)&&(favoriteStatusFilter==="Alle"||x.status===favoriteStatusFilter||(favoriteStatusFilter==="Noch lesen/sehen"&&x.status==="Auf meiner Liste"))&&(favoriteYearFilter==="Alle"||String(x.year||"")===favoriteYearFilter)&&(!q||[x.title,x.creator,x.note,x.type,x.status,x.year].join(" ").toLowerCase().includes(q)));
  const years=[...new Set((await allFavorites()).map(x=>String(x.year||"")).filter(Boolean))].sort((a,b)=>b.localeCompare(a));$("favoriteYearFilter").innerHTML=`<option value="Alle">Alle Jahre</option>${years.map(y=>`<option value="${esc(y)}">${esc(y)}</option>`).join("")}`;$("favoriteYearFilter").value=years.includes(favoriteYearFilter)?favoriteYearFilter:"Alle";$("favoritesList").innerHTML=items.length?items.map(x=>`<article class="favorite-card"><div class="favorite-kind">${esc(x.type)}${x.year?` · ${esc(x.year)}`:""}</div><div class="favorite-tools"><button data-fav-edit="${x.id}" aria-label="Bearbeiten">✎</button><button data-fav-delete="${x.id}" aria-label="Löschen">×</button></div><h3>${esc(x.title)}</h3>${x.creator?`<div class="favorite-creator">${esc(x.creator)}</div>`:""}<div class="favorite-meta">${x.rating?"★".repeat(Number(x.rating))+"☆".repeat(5-Number(x.rating))+" · ":""}${esc(x.status||"")}</div>${x.note?`<p>${esc(x.note)}</p>`:""}</article>`).join(""):`<div class="empty-monthly">Noch keine Favoriten gespeichert. Hier kannst du Bücher, Filme, Serien und mehr sammeln.</div>`;document.querySelectorAll("[data-fav-filter]").forEach(b=>b.classList.toggle("active",b.dataset.favFilter===favoriteFilter))}
$("addFavoriteBtn").onclick=()=>openFavoriteEditor();$("closeFavorite").onclick=$("cancelFavorite").onclick=()=>$("favoriteEditor").close();
$("favoriteForm").addEventListener("submit",async e=>{e.preventDefault();const id=$("favoriteId").value||crypto.randomUUID(),old=(await allFavorites()).find(x=>x.id===id);const item={id,type:$("favoriteType").value,title:$("favoriteTitle").value.trim(),creator:$("favoriteCreator").value.trim(),year:$("favoriteYear").value,rating:$("favoriteRating").value,status:$("favoriteStatus").value,note:$("favoriteNote").value.trim(),createdAt:old?.createdAt||Date.now(),updatedAt:Date.now()};if(!item.title)return;await put(FAVORITE_STORE,item);$("favoriteEditor").close();await renderFavorites();toast("Favorit gespeichert.")});
$("favoriteFilters").addEventListener("click",e=>{const b=e.target.closest("[data-fav-filter]");if(!b)return;favoriteFilter=b.dataset.favFilter;renderFavorites()});$("favoriteStatusFilters").addEventListener("click",e=>{const b=e.target.closest("[data-fav-status]");if(!b)return;favoriteStatusFilter=b.dataset.favStatus;document.querySelectorAll("[data-fav-status]").forEach(x=>x.classList.toggle("active",x===b));renderFavorites()});$("favoriteYearFilter").addEventListener("change",e=>{favoriteYearFilter=e.target.value;renderFavorites()});$("favoriteSearch").addEventListener("input",renderFavorites);$("favoritesList").addEventListener("click",async e=>{const ed=e.target.closest("[data-fav-edit]"),del=e.target.closest("[data-fav-delete]");if(ed){const item=(await allFavorites()).find(x=>x.id===ed.dataset.favEdit);if(item)openFavoriteEditor(item)}if(del&&confirm("Diesen Favoriten löschen?")){await remove(FAVORITE_STORE,del.dataset.favDelete);renderFavorites();toast("Favorit gelöscht.")}});
// Year calendar and date-range events
async function allYearEvents(){return (await getAll(EVENT_STORE)).sort((a,b)=>a.start.localeCompare(b.start))}
function openEventEditor(item=null){const monthDate=`${yearView}-${String(selectedYearMonth+1).padStart(2,"0")}-01`;$("eventForm").reset();$("eventId").value=item?.id||"";$("eventTitle").value=item?.title||"";$("eventCategory").value=item?.category||"Urlaub";$("eventStart").value=item?.start||monthDate;$("eventEnd").value=item?.end||item?.start||monthDate;$("eventPeople").value=item?.people||"";$("eventDescription").value=item?.description||"";$("eventDialogTitle").textContent=item?"Ereignis bearbeiten":"Ereignis hinzufügen";$("eventEditor").showModal()}
function dateInRange(d,a,b){return d>=a&&d<=b}
async function renderYear(){
  const events=await allYearEvents(),year=yearView;
  $("yearTitle").textContent=String(year);$("yearDirectSelect").innerHTML=Array.from({length:new Date().getFullYear()+2-2019},(_,i)=>new Date().getFullYear()+1-i).map(v=>`<option value="${v}">${v}</option>`).join("");$("yearDirectSelect").value=String(year);$("yearMonthDirectSelect").innerHTML=monthNames.map((n,i)=>`<option value="${i}">${n}</option>`).join("");$("yearMonthDirectSelect").value=String(selectedYearMonth);
  let out="";
  for(let m=0;m<12;m++){
    const monthStart=`${year}-${String(m+1).padStart(2,"0")}-01`,monthEnd=`${year}-${String(m+1).padStart(2,"0")}-${String(new Date(year,m+1,0).getDate()).padStart(2,"0")}`;
    const monthEvents=events.filter(x=>x.start<=monthEnd&&x.end>=monthStart);
    out+=`<button type="button" class="year-month ${m===selectedYearMonth?"selected":""}" data-year-month="${m}"><span class="year-month-name">${new Date(year,m,1).toLocaleDateString("de-DE",{month:"long"})}</span><span class="year-month-count">${monthEvents.length} ${monthEvents.length===1?"Ereignis":"Ereignisse"}</span>${monthEvents.length?`<span class="year-month-preview">${monthEvents.slice(0,2).map(x=>esc(x.title)).join(" · ")}${monthEvents.length>2?" …":""}</span>`:`<span class="year-month-preview">Keine Einträge</span>`}</button>`;
  }
  $("yearCalendar").innerHTML=out;
  const monthStart=`${year}-${String(selectedYearMonth+1).padStart(2,"0")}-01`,monthEnd=`${year}-${String(selectedYearMonth+1).padStart(2,"0")}-${String(new Date(year,selectedYearMonth+1,0).getDate()).padStart(2,"0")}`;
  const monthEvents=events.filter(x=>x.start<=monthEnd&&x.end>=monthStart);
  $("yearSelection").innerHTML=`<h4>${new Date(year,selectedYearMonth,1).toLocaleDateString("de-DE",{month:"long",year:"numeric"})}</h4>`+(monthEvents.length?monthEvents.map(x=>`<div class="year-selection-item"><span><strong>${esc(x.title)}</strong><small>${formatDate(x.start)}${x.end!==x.start?` – ${formatDate(x.end)}`:""} · ${esc(x.category)}${x.people?` · ${esc(x.people)}`:""}</small>${x.description?`<small>${esc(x.description)}</small>`:""}</span><button data-event-edit="${x.id}">Bearbeiten</button></div>`).join(""):`<p class="muted-small">Für diesen Monat sind keine Ereignisse eingetragen.</p>`);
  const yearStart=`${year}-01-01`,yearEnd=`${year}-12-31`,yearEvents=events.filter(x=>x.start<=yearEnd&&x.end>=yearStart);
  $("yearEvents").innerHTML=yearEvents.length?yearEvents.map(x=>`<article class="year-event"><div class="favorite-tools"><button data-event-edit="${x.id}" aria-label="Bearbeiten">✎</button><button data-event-delete="${x.id}" aria-label="Löschen">×</button></div><span class="tag">${esc(x.category)}</span><h3>${esc(x.title)}</h3><div class="favorite-meta">${formatDate(x.start)}${x.end!==x.start?` – ${formatDate(x.end)}`:""}${x.people?` · ${esc(x.people)}`:""}</div>${x.description?`<p>${esc(x.description)}</p>`:""}</article>`).join(""):`<div class="empty-monthly">Für ${year} sind noch keine Ereignisse gespeichert.</div>`;
}
$("yearCalendar").addEventListener("click",e=>{const b=e.target.closest("[data-year-month]");if(!b)return;selectedYearMonth=Number(b.dataset.yearMonth);renderYear()});
$("yearPrev").onclick=()=>{yearView--;renderYear()};$("yearNext").onclick=()=>{yearView++;renderYear()};$("yearDirectSelect").addEventListener("change",e=>{yearView=Number(e.target.value);renderYear()});$("yearMonthDirectSelect").addEventListener("change",e=>{selectedYearMonth=Number(e.target.value);renderYear()});$("addEventBtn").onclick=()=>openEventEditor();$("closeEvent").onclick=$("cancelEvent").onclick=()=>$("eventEditor").close();
$("eventForm").addEventListener("submit",async e=>{e.preventDefault();const id=$("eventId").value||crypto.randomUUID(),old=(await allYearEvents()).find(x=>x.id===id),start=$("eventStart").value,end=$("eventEnd").value;if(!start||!end||end<start){toast("Das Enddatum darf nicht vor dem Startdatum liegen.");return}const item={id,title:$("eventTitle").value.trim(),category:$("eventCategory").value,start,end,people:$("eventPeople").value.trim(),description:$("eventDescription").value.trim(),createdAt:old?.createdAt||Date.now(),updatedAt:Date.now()};if(!item.title)return;await put(EVENT_STORE,item);yearView=Number(start.slice(0,4));selectedYearMonth=Number(start.slice(5,7))-1;$("eventEditor").close();await renderYear();await render();toast("Ereignis gespeichert.")});
$("yearSelection").addEventListener("click",async e=>{const b=e.target.closest("[data-event-edit]");if(b){const item=(await allYearEvents()).find(x=>x.id===b.dataset.eventEdit);if(item)openEventEditor(item)}});
$("yearEvents").addEventListener("click",async e=>{const ed=e.target.closest("[data-event-edit]"),del=e.target.closest("[data-event-delete]");if(ed){const item=(await allYearEvents()).find(x=>x.id===ed.dataset.eventEdit);if(item)openEventEditor(item)}if(del&&confirm("Dieses Ereignis löschen?")){await remove(EVENT_STORE,del.dataset.eventDelete);await renderYear();await render();toast("Ereignis gelöscht.")}});

function exportDateMatch(date,from,to){return (!from||date>=from)&&(!to||date<=to)}
function printExportDocument(title,items,w){
  if(!w){toast("Bitte Pop-ups für diese App erlauben, um den Export zu öffnen.");return}
  const content=items.map(item=>`<article><div class="meta">${esc(item.type)} · ${esc(item.date||"")}${item.person?` · ${esc(item.person)}`:""}</div>${item.title?`<h2>${esc(item.title)}</h2>`:""}<div class="body">${esc(item.body||"").replace(/\n/g,"<br>")}</div>${item.photo?`<img src="${item.photo}" alt="Foto">`:""}</article>`).join("");
  w.document.write(`<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>body{font:14px/1.6 Arial,sans-serif;color:#222;max-width:850px;margin:35px auto;padding:0 24px}h1{font-size:26px;margin:0 0 8px}h2{font-size:18px;margin:8px 0}article{padding:16px 0;border-bottom:1px solid #ddd;break-inside:avoid}.meta{font-size:11px;color:#666}.body{white-space:normal;overflow-wrap:anywhere}img{display:block;max-width:100%;max-height:420px;object-fit:contain;margin-top:12px}header{margin-bottom:24px}.empty{color:#666}@media print{body{margin:0 auto;padding:0 12mm}article{break-inside:avoid}}</style></head><body><header><h1>${esc(title)}</h1><div class="meta">Erstellt am ${new Date().toLocaleDateString("de-DE")} · Little Moments</div></header>${content||'<p class="empty">Keine Einträge für diese Auswahl gefunden.</p>'}<script>window.onload=()=>window.print()<\/script></body></html>`);
  w.document.close();
}
$("createPrintExport").addEventListener("click",async()=>{
  const printWindow=window.open("about:blank","_blank");
  if(!printWindow){toast("Bitte Pop-ups für diese App erlauben, um den Export zu öffnen.");return}
  const types=[...document.querySelectorAll('input[name="exportType"]:checked')].map(x=>x.value),from=$("exportFrom").value,to=$("exportTo").value,person=$("exportPerson").value,photos=$("exportPhotos").checked;
  if(from&&to&&from>to){printWindow.close();toast("Das Startdatum darf nicht nach dem Enddatum liegen.");return}
  if(!types.length){printWindow.close();toast("Bitte mindestens einen Inhalt auswählen.");return}
  const items=[];
  if(types.some(x=>["Zitate","Kindersprüche","Meilensteine","Tagebuch"].includes(x))){
    const selected=await allEntries();
    selected.filter(x=>types.includes(x.category)&&exportDateMatch(x.date,from,to)&&(person==="Alle"||!x.person||x.person===person)).forEach(x=>items.push({type:x.category,date:x.date,title:x.title,body:x.body,person:x.person,photo:photos?x.photo:null}));
  }
  if(types.includes("Monatsnotizen")){
    (await allMonthlyNotes()).filter(x=>exportDateMatch(x.date||`${x.month}-01`,from,to)&&(person==="Alle"||x.person===person)).forEach(x=>items.push({type:"Monatsnotiz",date:x.date||`${x.month}-01`,title:x.person,body:x.text}));
  }
  if(types.includes("Jahresmomente")){
    (await allYearEvents()).filter(x=>exportDateMatch(x.start,from,to)).forEach(x=>items.push({type:`Jahresmoment · ${x.category}`,date:x.start,title:x.title,body:[x.description,x.end!==x.start?`Bis: ${formatDate(x.end)}`:"",x.people?`Mit: ${x.people}`:""].filter(Boolean).join("\n")}));
  }
  items.sort((a,b)=>(a.date||"").localeCompare(b.date||""));
  printExportDocument("Little Moments – Export",items,printWindow);
});

// Datei-Import: lokale Textextraktion und OCR (keine Übertragung der Dateien an einen Server)
function loadExternalScript(src){
  return new Promise((resolve,reject)=>{
    const existing=[...document.scripts].find(s=>s.src===src);
    if(existing){if(existing.dataset.loaded==="true")return resolve();existing.addEventListener("load",resolve,{once:true});existing.addEventListener("error",reject,{once:true});return}
    const script=document.createElement("script");script.src=src;script.async=true;
    script.onload=()=>{script.dataset.loaded="true";resolve()};script.onerror=()=>reject(new Error("Eine benötigte Bibliothek konnte nicht geladen werden."));
    document.head.appendChild(script);
  });
}
async function recognizeImage(file){
  await loadExternalScript("https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js");
  if(!window.Tesseract)throw new Error("OCR konnte nicht gestartet werden.");
  const worker=await Tesseract.createWorker("deu+por",1,{logger:m=>{if(m.status==="recognizing text")$("importStatus").textContent=`Texterkennung: ${Math.round((m.progress||0)*100)} %`;}});
  try{const result=await worker.recognize(file);return result.data.text||""}finally{await worker.terminate()}
}
async function extractPdf(file){
  await loadExternalScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js");
  if(!window.pdfjsLib)throw new Error("PDF-Verarbeitung konnte nicht geladen werden.");
  pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  const data=new Uint8Array(await file.arrayBuffer()),pdf=await pdfjsLib.getDocument({data}).promise;
  const chunks=[];
  for(let n=1;n<=pdf.numPages;n++){
    $("importStatus").textContent=`PDF wird gelesen: Seite ${n} von ${pdf.numPages}`;
    const page=await pdf.getPage(n),content=await page.getTextContent();
    let text=content.items.map(x=>x.str).join(" ").trim();
    if(!text){
      const viewport=page.getViewport({scale:1.7}),canvas=document.createElement("canvas");
      canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
      await page.render({canvasContext:canvas.getContext("2d"),viewport}).promise;
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/png"));
      text=await recognizeImage(blob);canvas.width=canvas.height=1;
    }
    if(text)chunks.push(`Seite ${n}\n${text}`);
  }
  return chunks.join("\n\n");
}
async function extractImportText(file){
  const name=file.name.toLowerCase();
  if(file.type.startsWith("image/"))return await recognizeImage(file);
  if(name.endsWith(".pdf")||file.type==="application/pdf")return await extractPdf(file);
  if(name.endsWith(".docx")){
    await loadExternalScript("https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.8.0/mammoth.browser.min.js");
    if(!window.mammoth)throw new Error("Word-Dokument konnte nicht gelesen werden.");
    const result=await mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()});return result.value||"";
  }
  if(name.endsWith(".txt")||name.endsWith(".md")||file.type.startsWith("text/"))return await file.text();
  throw new Error("Dieses Dateiformat wird nicht unterstützt. Verwende Foto, PDF, DOCX, TXT oder MD.");
}
$("memoryImportFile").addEventListener("change",async e=>{
  const file=e.target.files?.[0];if(!file)return;
  $("importPreview").hidden=true;$("importStatus").textContent=`„${file.name}“ wird verarbeitet …`;
  try{
    const text=await extractImportText(file),clean=text.replace(/\u0000/g,"").trim();
    if(!clean)throw new Error("Es wurde kein Text erkannt. Bei Fotos bitte auf gute Beleuchtung und lesbare Schrift achten.");
    $("importText").value=clean;$("importTitle").value=file.name.replace(/\.[^.]+$/,"").slice(0,100);
    $("importDate").value=today();
    const lower=clean.toLowerCase();
    let suggestedPerson="";
    if(/\btiago\b/i.test(clean))suggestedPerson="Tiago";
    else if(/\bluan\b/i.test(clean))suggestedPerson="Luan";
    else if(/\blira\b/i.test(clean))suggestedPerson="Lira";
    let suggestedCategory="Tagebuch";
    if(/\b(sagte|sagt|hat gesagt|wörtlich|wortlaut)\b/i.test(clean))suggestedCategory="Kindersprüche";
    $("importCategory").value=suggestedCategory;$("importPerson").value=suggestedPerson;
    $("keepImportOriginal").checked=file.type.startsWith("image/");
    $("keepImportOriginal").disabled=!file.type.startsWith("image/");
    $("importPreview").hidden=false;$("importStatus").textContent=`Text erkannt (${clean.length.toLocaleString("de-DE")} Zeichen). Bitte prüfen und zuordnen.`;
    window.pendingImportedPhoto=file.type.startsWith("image/")?await compressPhoto(file):null;
  }catch(err){$("importStatus").textContent=err.message||"Datei konnte nicht verarbeitet werden."}
});
$("clearImport").addEventListener("click",()=>{
  $("memoryImportFile").value="";$("importText").value="";$("importTitle").value="";$("importPreview").hidden=true;
  $("importStatus").textContent="Import verworfen.";window.pendingImportedPhoto=null;
});
$("saveImportedMemory").addEventListener("click",async()=>{
  const body=$("importText").value.trim(),title=$("importTitle").value.trim()||"Importierte Erinnerung",date=$("importDate").value||today();
  if(!body){toast("Bitte zuerst Text einfügen oder erkennen lassen.");return}
  const category=$("importCategory").value,person=$("importPerson").value;
  const entry={id:crypto.randomUUID(),category,title,date,body,person,photo:$("keepImportOriginal").checked?window.pendingImportedPhoto:null,createdAt:Date.now(),updatedAt:Date.now()};
  try{await put(ENTRY_STORE,entry);await render();$("search").value="";activeFilter="Alle";await render();$("clearImport").click();toast("Erinnerung wurde gespeichert.");}
  catch(err){toast("Speichern fehlgeschlagen. Bitte Speicherplatz prüfen.")}
});



function setupCollapsibleSections(){
  const specs=[
    ["#memorySection","Erinnerungen",true],["#trackerSection","Habit Tracker",false],["#monthlySection","Monatsnotizen",false],
    ["#favoritesSection","Lieblingssammlung",false],["#yearSection","Jahresmomente",false],["#exportSection","Exporte",false],["#importSection","Importieren",false],["#storagePanel","Speicher",false],["#backupPanel","Backup",false]
  ];
  for(const [selector,label,defaultOpen] of specs){
    const section=document.querySelector(selector);if(!section)continue;
    let header=section.querySelector(":scope > .section-heading");
    if(!header){
      header=document.createElement("div");header.className="section-heading collapsible-heading";
      const title=document.createElement("div");
      if(selector==="#storagePanel"){
        const eyebrow=section.querySelector(".eyebrow"),h2=section.querySelector("h2");
        if(eyebrow)title.append(eyebrow);if(h2)title.append(h2);
      }else{
        const copy=section.querySelector(".backup-copy");if(copy){title.append(copy.querySelector(".eyebrow"));title.append(copy.querySelector("h2"));}
      }
      header.append(title);section.prepend(header);
    }
    let body=section.querySelector(":scope > .section-body");
    if(!body){body=document.createElement("div");body.className="section-body";let node=header.nextSibling;while(node){const next=node.nextSibling;body.append(node);node=next;}section.append(body);}
    const key=`little-moments-section-${selector.replace(/[^a-z]/gi,"")}`;
    const saved=localStorage.getItem(key),isOpen=saved===null?defaultOpen:saved==="open";
    const toggle=document.createElement("button");toggle.type="button";toggle.className="section-toggle";toggle.setAttribute("aria-label",`${isOpen?"Zuklappen":"Aufklappen"}: ${label}`);toggle.setAttribute("aria-expanded",String(isOpen));toggle.textContent=isOpen?"−":"+";
    header.append(toggle);body.hidden=!isOpen;
    toggle.addEventListener("click",()=>{const open=body.hidden;body.hidden=!open;toggle.textContent=open?"−":"+";toggle.setAttribute("aria-expanded",String(open));toggle.setAttribute("aria-label",`${open?"Zuklappen":"Aufklappen"}: ${label}`);localStorage.setItem(key,open?"open":"closed")});
  }
}
$("homeButton").addEventListener("click",()=>window.scrollTo({top:0,behavior:"smooth"}));
setupCollapsibleSections();

async function updateStorageInfo(){
  const label=$("lastBackupLabel");
  const last=localStorage.getItem("little-moments-last-backup");
  label.textContent=last?`Letztes Backup erstellt: ${new Date(last).toLocaleString("de-DE")}`:"Noch kein Backup auf diesem Gerät vermerkt.";
  if(navigator.storage?.estimate){
    try{
      const estimate=await navigator.storage.estimate();
      const used=estimate.usage||0, quota=estimate.quota||0;
      const free=Math.max(0,quota-used);
      const mb=n=>`${(n/1024/1024).toFixed(1).replace(".",",")} MB`;
      $("storageUsage").textContent=quota?`${mb(used)} belegt · ca. ${mb(free)} frei · Richtwert insgesamt: ${mb(quota)}`:`${mb(used)} belegt · Gesamtlimit nicht verfügbar`;
      $("storageMeterFill").style.width=quota?`${Math.min(100,used/quota*100)}%`:"0%";
    }catch(e){$("storageUsage").textContent="Speicherbelegung kann auf diesem Gerät nicht angezeigt werden."}
  }else{$("storageUsage").textContent="Dein Browser stellt keine Speicherübersicht bereit."}
}
$("exportBtn").onclick=async()=>{
  try{
    const payload={app:"Little Moments",formatVersion:5,exportedAt:new Date().toISOString(),entries:await allEntries(),habits:await allHabits(),monthlyNotes:await allMonthlyNotes(),favorites:await allFavorites(),yearEvents:await allYearEvents()};
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
    const incomingFavorites=(data.favorites||[]).filter(x=>x?.id&&x.title&&x.type);
    const incomingEvents=(data.yearEvents||[]).filter(x=>x?.id&&x.title&&x.start&&x.end&&x.end>=x.start);
    const [existingEntries,existingHabits,existingNotes,existingFavorites,existingEvents]=await Promise.all([getAll(ENTRY_STORE),getAll(HABIT_STORE),getAll(NOTE_STORE),getAll(FAVORITE_STORE),getAll(EVENT_STORE)]);
    const entryIds=new Set(existingEntries.map(x=>x.id)),habitIds=new Set(existingHabits.map(x=>x.id)),noteIds=new Set(existingNotes.map(x=>x.id)),favoriteIds=new Set(existingFavorites.map(x=>x.id)),eventIds=new Set(existingEvents.map(x=>x.id));
    const freshEntries=incomingEntries.filter(x=>!entryIds.has(x.id));
    const freshHabits=incomingHabits.filter(x=>!habitIds.has(x.id));
    const freshNotes=incomingNotes.filter(x=>!noteIds.has(x.id));
    const freshFavorites=incomingFavorites.filter(x=>!favoriteIds.has(x.id)),freshEvents=incomingEvents.filter(x=>!eventIds.has(x.id));
    const total=freshEntries.length+freshHabits.length+freshNotes.length+freshFavorites.length+freshEvents.length;
    if(!confirm(`Neue Inhalte aus dem Backup hinzufügen?\n\n${freshEntries.length} Erinnerungen\n${freshHabits.length} Gewohnheiten\n${freshNotes.length} Monatsnotizen\n${freshFavorites.length} Favoriten\n${freshEvents.length} Jahresereignisse\n\nBereits vorhandene IDs werden übersprungen. Es wird nichts überschrieben.`))return;
    for(const x of freshEntries)await put(ENTRY_STORE,x);
    for(const x of freshHabits)await put(HABIT_STORE,x);
    for(const x of freshNotes)await put(NOTE_STORE,x);
    for(const x of freshFavorites)await put(FAVORITE_STORE,x);for(const x of freshEvents)await put(EVENT_STORE,x);
    await render();await renderTracker();await renderMonthly();await renderFavorites();await renderYear();await updateStorageInfo();
    toast(total?`${total} neue Einträge hinzugefügt.`:"Keine neuen Einträge gefunden.");
  }catch(err){alert(err.message||"Datei konnte nicht gelesen werden.")}
  finally{e.target.value=""}
});
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstall=e;$("installBtn").hidden=false});$("installBtn").onclick=async()=>{if(!deferredInstall)return;deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;$("installBtn").hidden=true};
if("serviceWorker" in navigator&&location.protocol.startsWith("http"))window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
(async()=>{try{await openDB();await render();await renderTracker();await renderMonthly();await renderFavorites();await renderYear();await updateStorageInfo()}catch(e){$("entries").innerHTML='<div class="empty">Der lokale Speicher konnte nicht geöffnet werden. Bitte verwende einen aktuellen Browser.</div>'}})();
