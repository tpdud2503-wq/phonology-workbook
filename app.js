(function(){
"use strict";
/* ---------- Hangul helpers ---------- */
var CHO=['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
var JUNG=['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
var JONG=['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
function phon(word){
  var out=[];
  for(var i=0;i<word.length;i++){
    var c=word.charCodeAt(i)-0xAC00;
    if(c<0||c>11171) return null;
    var cho=CHO[Math.floor(c/588)], jung=JUNG[Math.floor((c%588)/28)], jong=JONG[c%28];
    out.push(cho==='ㅇ'?'':cho, jung, jong);
  }
  return out;
}
function diff(a,b){
  a=(a||'').replace(/\s/g,''); b=(b||'').replace(/\s/g,'');
  if(!a||!b) return {state:'empty'};
  var pa=phon(a), pb=phon(b);
  if(!pa||!pb) return {state:'bad', msg:'한글 낱말만 써요'};
  if(pa.length!==pb.length) return {state:'bad', msg:'글자 수가 달라요'};
  var ch=[];
  for(var i=0;i<pa.length;i++){ if(pa[i]!==pb[i]) ch.push({i:i,from:pa[i],to:pb[i]}); }
  if(ch.length===0) return {state:'bad', msg:'바뀐 음운이 없어요'};
  if(ch.length>1) return {state:'bad', msg:'음운이 '+ch.length+'개 바뀌었어요'};
  var c=ch[0];
  if(!c.from||!c.to) return {state:'bad', msg:'음운을 넣거나 뺐어요'};
  return {state:'ok', from:c.from, to:c.to, kind:(c.i%3===1?'모음':'자음')};
}
function norm(s){return (s||'').replace(/\s/g,'');}

/* ---------- state ---------- */
var KEY='umun-activity-v1';
var S={t:{},b:{},c:{},rounds:[],sent:{}};
try{var raw=localStorage.getItem(KEY); if(raw){var p=JSON.parse(raw); if(p&&typeof p==='object'){S.t=p.t||{};S.b=p.b||{};S.c=p.c||{};S.rounds=p.rounds||[];S.sent=p.sent||{};}}}catch(e){}
var saveTimer=null;
function save(){clearTimeout(saveTimer); saveTimer=setTimeout(function(){try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}},250);}
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m];});}

/* ---------- data ---------- */
var MONO={'ㅣ':['고','앞','평'],'ㅟ':['고','앞','둥'],'ㅡ':['고','뒤','평'],'ㅜ':['고','뒤','둥'],'ㅔ':['중','앞','평'],'ㅚ':['중','앞','둥'],'ㅓ':['중','뒤','평'],'ㅗ':['중','뒤','둥'],'ㅐ':['저','앞','평'],'ㅏ':['저','뒤','평']};
var POS={'ㅂ':0,'ㅃ':0,'ㅍ':0,'ㅁ':0,'ㄷ':1,'ㄸ':1,'ㅌ':1,'ㅅ':1,'ㅆ':1,'ㄴ':1,'ㄹ':1,'ㅈ':2,'ㅉ':2,'ㅊ':2,'ㄱ':3,'ㄲ':3,'ㅋ':3,'ㅇ':3,'ㅎ':4};
var MAN={'ㅂ':0,'ㅃ':0,'ㅍ':0,'ㄷ':0,'ㄸ':0,'ㅌ':0,'ㄱ':0,'ㄲ':0,'ㅋ':0,'ㅈ':1,'ㅉ':1,'ㅊ':1,'ㅅ':2,'ㅆ':2,'ㅎ':2,'ㅁ':3,'ㄴ':3,'ㅇ':3,'ㄹ':4};
var FLOOR_DESC=['공기를 막았다가 터뜨리는 소리','공기를 막았다가 비비며 터뜨리는 소리','좁은 틈으로 공기를 비벼 내는 소리','공기를 코로 내보내는 소리','공기를 혀 양옆으로 흘려보내는 소리'];
var POSN=['두 입술','잇몸 (혀끝)','센입천장 (혓바닥)','여린입천장 (혀 뒤)','목청'];
var POS_T=['입술소리','잇몸소리','센입천장소리','여린입천장소리','목청소리'];
var POS_D=['두 입술이 닿았다가 떨어지며','혀끝이 윗잇몸에 닿거나 가까이 가서','혓바닥이 센입천장에 닿아서','혀의 뒷부분이 여린입천장에 닿아서','목청 사이에서'];
var MAN_T=['파열음','파찰음','마찰음','비음','유음'];
var STR_T=['예사소리','된소리','거센소리','울림소리'];
var STR_D=['약하고 부드럽게 나는 소리','목에 힘을 주어 단단하게 나는 소리','숨이 거세게 터져 나오는 소리','목청이 떨려 울리는 소리 · 세기로 나누지 않아요'];
var POS_N=['입술','잇몸','센입천장','여린입천장','목청'], MAN_N=['파열','파찰','마찰','비','유'], STR_N=['예사','된','거센','울림'], STR_NO=['①','②','③','④'];
function nmGet(id){ return norm(S.t[id]).replace(/(소리|음)$/,''); }
function nmShow(id,suf,fb){ var n=nmGet(id); return n?esc(n)+suf:'<span class="nmfb">'+fb+'</span>'; }
function nmCount(pre,ans){ var k=0; ans.forEach(function(a,i){ if(nmGet(pre+i)===a) k++; }); return k; }
var STRK={'ㄲ':1,'ㄸ':1,'ㅃ':1,'ㅆ':1,'ㅉ':1,'ㅋ':2,'ㅌ':2,'ㅍ':2,'ㅊ':2,'ㅁ':3,'ㄴ':3,'ㅇ':3,'ㄹ':3};
var CONS=['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
var leafIds=[]; ['평','둥'].forEach(function(l){['앞','뒤'].forEach(function(s){['고','중','저'].forEach(function(h){leafIds.push(l+s+h);});});});

var BOARDS={
  l2sort:{chips:JUNG.slice(), multi:true, slots:[{id:'A',label:'A 묶음 · 소리 내는 동안 입 모양이 그대로'},{id:'B',label:'B 묶음 · 소리 내는 동안 입 모양이 바뀜'}],
    ans:function(ch){return MONO[ch]?'A':'B';}},
  l3pos:{chips:CONS.slice(), multi:true, slots:[0,1,2,3,4].map(function(k){return {id:'p'+k,label:POS_T[k]};}), ans:function(ch){return 'p'+POS[ch];}},
  l3man:{chips:CONS.slice(), multi:true, slots:[0,1,2,3,4].map(function(k){return {id:'m'+k,label:MAN_T[k]};}), ans:function(ch){return 'm'+MAN[ch];}},
  l3str:{chips:CONS.slice(), multi:true, slots:[0,1,2,3].map(function(k){return {id:'s'+k,label:STR_T[k]};}), ans:function(ch){return 's'+(STRK[ch]||0);}},
  l3tbl:{chips:CONS.slice(), multi:false, slots:[], ans:function(ch){ for(var r=0;r<DC.length;r++){ var c=DC[r][3].indexOf(ch); if(c>=0) return 'r'+r+'c'+c; } return ''; }},
  l4spirit:{chips:['애민 정신','실용 정신','창조 정신','자주 정신'], multi:false, word:true, slots:[
    {id:'p1',label:'“우리나라 말이 중국과 달라 한자와는 서로 잘 통하지 않는다.”'},
    {id:'p2',label:'“어리석은 백성이 하고 싶은 말이 있어도 끝내 제 뜻을 펴지 못하는 사람이 많다. 내가 이를 불쌍히 여겨”'},
    {id:'p3',label:'“새로 스물여덟 글자를 만드니,”'},
    {id:'p4',label:'“사람마다 쉽게 익혀 날마다 쓰는 데 편하게 하고자 할 따름이다.”'}],
    ans:function(ch){return {'자주 정신':'p1','애민 정신':'p2','창조 정신':'p3','실용 정신':'p4'}[ch];}},
  l4base:{chips:['ㅅ','ㅇ','ㄴ','ㄱ','ㅁ'], multi:false, slots:[
    {id:'아',label:'어금닛소리 · 혀뿌리가 목구멍을 막는 모양'},{id:'설',label:'혓소리 · 혀끝이 윗잇몸에 닿는 모양'},{id:'순',label:'입술소리 · 입의 모양'},{id:'치',label:'잇소리 · 이의 모양'},{id:'후',label:'목구멍소리 · 목구멍의 모양'}],
    ans:function(ch){return {'ㄱ':'아','ㄴ':'설','ㅁ':'순','ㅅ':'치','ㅇ':'후'}[ch];}},
  l4fam:{chips:['ㅌ','ㆁ','ㅂ','ㅎ','ㅋ','ㅈ','ㄹ','ㅍ','ㆆ','ㄷ','ㅿ','ㅊ'], multi:false, slots:(function(){var a=[];['아','설','순','치','후'].forEach(function(f){['s1','s2','x'].forEach(function(k){a.push({id:f+k,label:''});});});return a;})(),
    ans:function(ch){return {'ㅋ':'아s1','ㆁ':'아x','ㄷ':'설s1','ㅌ':'설s2','ㄹ':'설x','ㅂ':'순s1','ㅍ':'순s2','ㅈ':'치s1','ㅊ':'치s2','ㅿ':'치x','ㆆ':'후s1','ㅎ':'후s2'}[ch];}}
};
Object.keys(BOARDS).forEach(function(k){ if(!S.b[k]) S.b[k]={}; });

/* ---------- board engine ---------- */
var sel=null; // {board, chip}
var marks={}; // board -> {chipIndex: 'ok'|'bad'}
function chipHtml(bk,i){
  var B=BOARDS[bk], m=(marks[bk]||{})[i]||'', s=(sel&&sel.board===bk&&sel.chip===i)?' sel':'';
  return '<button type="button" class="chip '+(B.word?'word ':'')+m+s+'" data-board="'+bk+'" data-chip="'+i+'" aria-pressed="'+(s?'true':'false')+'">'+esc(B.chips[i])+'</button>';
}
function slotInner(bk,slotId){
  var B=BOARDS[bk], st=S.b[bk], h='';
  B.chips.forEach(function(c,i){ if(st[i]===slotId) h+=chipHtml(bk,i); });
  return h;
}
function slotHtml(bk,slot,extraLabel){
  var target=sel&&sel.board===bk?' target':'';
  return '<div class="slot'+target+'" role="button" tabindex="0" data-board="'+bk+'" data-slot="'+slot.id+'" aria-label="'+esc(slot.label||extraLabel||'칸')+'">'+
    ((slot.label||extraLabel)?'<span class="slot-label">'+esc(extraLabel||slot.label)+'</span>':'')+
    '<div class="slot-chips">'+slotInner(bk,slot.id)+'</div></div>';
}
function trayHtml(bk){
  var B=BOARDS[bk], st=S.b[bk], h='';
  B.chips.forEach(function(c,i){ if(!st[i]) h+=chipHtml(bk,i); });
  return '<div class="tray-label">글자 상자 (칸에 넣은 글자를 다시 누르고 이곳을 누르면 돌아와요)</div><div class="tray" role="button" tabindex="0" data-board="'+bk+'" data-slot="">'+(h||'<span class="note">모두 옮겼어요</span>')+'</div>';
}
function renderBoard(bk){
  var el=document.getElementById('board-'+bk); if(!el) return;
  var B=BOARDS[bk], h='';
  if(bk==='l2sort'){
    h=trayHtml(bk)+'<div class="grid2">'+B.slots.map(function(s){return slotHtml(bk,s);}).join('')+'</div>';
  } else if(bk==='l2tree'){
    h=trayHtml(bk)+'<div class="tree">';
    [['평','아니요 · 평평한 입술','t-l2-lip1'],['둥','예 · 둥근 입술','t-l2-lip2']].forEach(function(L){
      h+='<div class="branch"><div class="term"><b>'+L[1]+'</b> → (<input id="'+L[2]+'" type="text" data-save aria-label="'+L[1]+' 이름">)모음</div><div class="sub">';
      [['앞','t-l2-'+L[0]+'f'],['뒤','t-l2-'+L[0]+'b']].forEach(function(Sd){
        h+='<div style="display:flex;flex-direction:column;gap:6px;min-width:0"><div class="term">'+Sd[0]+' (<input id="'+Sd[1]+'" type="text" data-save aria-label="혀 '+Sd[0]+' 이름" style="width:56px">)모음</div><div class="leaves">';
        ['고','중','저'].forEach(function(hh){ h+=slotHtml(bk,{id:L[0]+Sd[0]+hh,label:hh}); });
        h+='</div></div>';
      });
      h+='</div></div>';
    });
    h+='</div>';
  } else if(bk==='l3pos'){
    h=trayHtml(bk)+'<div class="houses pos">';
    B.slots.forEach(function(sl,k){
      h+='<div class="house"><svg class="roof" viewBox="0 0 160 58" preserveAspectRatio="none" aria-hidden="true"><rect class="chim" x="112" y="6" width="16" height="30" rx="2"></rect><path class="rf" d="M2 56 L80 6 L158 56 Z"></path><path class="rf-edge" d="M2 56 L80 6 L158 56"></path></svg><span class="hno">'+(k+1)+'번 집</span>'+slotHtml(bk,{id:sl.id,label:(k+1)+'번 집'},POS_D[k])+'<div class="nmrow">(<input id="t-l3-pn-'+k+'" type="text" data-save aria-label="'+(k+1)+'번 집 이름">)소리</div></div>';
    });
    h+='</div>';
  } else if(bk==='l3man'){
    h=trayHtml(bk)+'<div class="floors">';
    B.slots.forEach(function(sl,k){ h+='<div class="floor"><div class="fh"><b>'+(k+1)+'층</b><span>'+FLOOR_DESC[k]+'</span><div class="nmrow">(<input id="t-l3-mn-'+k+'" type="text" data-save aria-label="'+(k+1)+'층 이름">)음</div></div>'+slotHtml(bk,{id:sl.id,label:(k+1)+'층'},'')+'</div>'; });
    h+='</div>';
  } else if(bk==='l3str'){
    h=trayHtml(bk)+'<div class="strs">';
    B.slots.forEach(function(sl,k){
      var target=sel&&sel.board===bk?' target':'';
      h+='<div class="slot'+target+(k===3?' muted-s':'')+'" role="button" tabindex="0" data-board="'+bk+'" data-slot="'+sl.id+'" aria-label="'+STR_NO[k]+' 칸"><span class="slot-label"><b>'+STR_NO[k]+' 칸</b>'+STR_D[k]+'</span><div class="slot-chips">'+slotInner(bk,sl.id)+'</div><div class="nmrow" data-noslot>(<input id="t-l3-sn-'+k+'" type="text" data-save aria-label="'+STR_NO[k]+' 칸 이름">)소리</div></div>';
    });
    h+='</div>';
  } else if(bk==='l3tbl'){
    var span={'안울림소리':8,'울림소리':2,'파열음':3,'파찰음':3,'마찰음':2};
    var ul=nmGet('t-l3-sn-3');
    h=trayHtml(bk)+'<div class="scroll"><table class="drawt tblt"><thead><tr><th colspan="3">방법 \\ 위치</th>'+POS_T.map(function(t,k){return '<th>'+nmShow('t-l3-pn-'+k,'소리',(k+1)+'번 집')+'</th>';}).join('')+'</tr></thead><tbody>';
    DC.forEach(function(row,ri){
      h+='<tr>';
      if(row[0]) h+='<th class="grp" rowspan="'+span[row[0]]+'">'+(ul?(row[0]==='울림소리'?esc(ul)+'소리':'안'+esc(ul)+'소리'):(row[0]==='울림소리'?'④':'①②③'))+'</th>';
      if(row[1]){ var mk=MAN_T.indexOf(row[1]); h+='<th rowspan="'+(span[row[1]]||1)+'"'+(row[2]?'':' colspan="2"')+'>'+nmShow('t-l3-mn-'+mk,'음',(mk+1)+'층')+'</th>'; }
      if(row[2]){ var sk=STR_T.indexOf(row[2]); h+='<th>'+nmShow('t-l3-sn-'+sk,'소리',STR_NO[sk]+' 칸')+'</th>'; }
      for(var c=0;c<5;c++) h+='<td>'+slotHtml(bk,{id:'r'+ri+'c'+c,label:''},'')+'</td>';
      h+='</tr>';
    });
    h+='</tbody></table></div>';
  } else if(bk==='l4spirit'){
    h=trayHtml(bk)+'<div class="quotes">'+B.slots.map(function(s){return slotHtml(bk,s);}).join('')+'</div>';
  } else if(bk==='l4base'){
    h=trayHtml(bk)+'<div class="organs">'+B.slots.map(function(s){return slotHtml(bk,s);}).join('')+'</div>';
  } else if(bk==='l4fam'){
    var base={'아':'ㄱ','설':'ㄴ','순':'ㅁ','치':'ㅅ','후':'ㅇ'}, nm={'아':'어금닛소리','설':'혓소리','순':'입술소리','치':'잇소리','후':'목구멍소리'};
    h=trayHtml(bk)+'<div class="scroll"><table class="fam"><thead><tr><th>가족</th><th>기본자</th><th>획 하나 더</th><th>획 하나 더</th><th>모양이 다른 글자</th></tr></thead><tbody>';
    Object.keys(base).forEach(function(f){
      h+='<tr><th>'+nm[f]+'</th><td class="base">'+base[f]+'</td>';
      ['s1','s2','x'].forEach(function(k){ h+='<td>'+slotHtml(bk,{id:f+k,label:''},'')+'</td>'; });
      h+='</tr>';
    });
    h+='</tbody></table></div>';
  }
  el.innerHTML=h;
  restoreInputs(el);
}
function moveChip(bk,i,slotId){
  var B=BOARDS[bk], st=S.b[bk];
  if(slotId && !B.multi){
    for(var k in st){ if(st[k]===slotId && +k!==i) delete st[k]; }
  }
  if(slotId) st[i]=slotId; else delete st[i];
  if(marks[bk]) delete marks[bk][i];
  save();
}
document.addEventListener('click',function(e){
  var chip=e.target.closest('.chip[data-chip]');
  if(chip){
    var bk=chip.dataset.board, i=+chip.dataset.chip, host=chip.closest('[data-slot]');
    if(sel&&sel.board===bk&&sel.chip!==i&&host&&host.dataset.slot){
      moveChip(bk,sel.chip,host.dataset.slot); sel=null; renderBoard(bk); e.stopPropagation(); return;
    }
    if(sel&&sel.board===bk&&sel.chip===i) sel=null; else sel={board:bk,chip:i};
    if(/^l3(pos|man|str|tbl)$/.test(bk)&&window.showCons) window.showCons(BOARDS[bk].chips[i]);
    renderBoard(bk); e.stopPropagation(); return;
  }
  if(e.target.closest('[data-noslot]')) return;
  var slot=e.target.closest('[data-slot]');
  if(slot&&sel&&slot.dataset.board===sel.board){
    var b=sel.board; moveChip(b,sel.chip,slot.dataset.slot||null); sel=null; renderBoard(b); return;
  }
});
document.addEventListener('keydown',function(e){
  if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-slot][role=button]')){ e.preventDefault(); e.target.click(); }
});

function refreshTblHeads(){ renderBoard('l3tbl'); }
/* ---------- board checks ---------- */
function scoreBoard(bk){
  var B=BOARDS[bk], st=S.b[bk], m={}, ok=0, total=B.chips.length;
  if(B.ans){
    B.chips.forEach(function(c,i){ if(!st[i]) return; var r=(st[i]===B.ans(c)); m[i]=r?'ok':'bad'; if(r) ok++; });
  } else if(B.partition){
    var count={};
    B.chips.forEach(function(c,i){ var s=st[i]; if(!s||s==='q') return; count[s]=count[s]||{}; var p=POS[c]; count[s][p]=(count[s][p]||0)+1; });
    var home={};
    for(var p=0;p<5;p++){ var best=null,bn=0; for(var s in count){ var n=count[s][p]||0; if(n>bn){bn=n;best=s;} } home[p]=best; }
    // a house can be home for only one position: keep the position with more chips
    var owner={};
    for(p=0;p<5;p++){ var hs=home[p]; if(!hs) continue; if(owner[hs]===undefined || (count[hs][p]||0)>(count[hs][owner[hs]]||0)) owner[hs]=p; }
    B.chips.forEach(function(c,i){ var s=st[i]; if(!s||s==='q') return; var r=(owner[s]===POS[c]); m[i]=r?'ok':'bad'; if(r) ok++; });
  } else if(B.grid){
    var rc={};
    B.chips.forEach(function(c,i){ var s=st[i]; if(!s) return; var r=+s.charAt(1); rc[r]=rc[r]||{}; rc[r][MAN[c]]=(rc[r][MAN[c]]||0)+1; });
    B.chips.forEach(function(c,i){ var s=st[i]; if(!s) return; var r=+s.charAt(1), col=+s.charAt(3); var good=(col===POS[c] && r===MAN[c]); m[i]=good?'ok':'bad'; if(good) ok++; });
  }
  return {ok:ok,total:total,marks:m,placed:Object.keys(st).length};
}

/* ---------- 1차시 ---------- */
var PAIRS=[['물','불','자음'],['달','돌','모음'],['강','공','모음'],['산','삼','자음'],['눈','눈:','소리 길이']];
(function(){
  var tb=document.querySelector('#culprit tbody'), h='';
  PAIRS.forEach(function(p,i){
    h+='<tr id="cul-'+i+'"><td style="font-weight:700;font-size:16px;white-space:nowrap">'+p[0]+' — '+p[1]+'</td><td><input id="t-cul-'+i+'" type="text" data-save aria-label="'+p[0]+'과 '+p[1]+'의 뜻을 가른 소리" placeholder="예: ㅁ / ㅂ"></td><td><span class="choice" role="radiogroup">';
    ['자음','모음','소리 길이'].forEach(function(o){ h+='<label><input type="radio" name="cul-'+i+'" value="'+o+'" data-choice="cul-'+i+'"><span>'+o+'</span></label>'; });
    h+='</span></td></tr>';
  });
  tb.innerHTML=h;
  var cn=document.getElementById('counts'), ch='';
  [['감',3],['아',1],['강',3],['와',1],['빵',3]].forEach(function(c,i){
    ch+='<label class="field" style="flex-direction:row;align-items:center;gap:6px;border:1.5px solid var(--line);border-radius:10px;padding:6px 10px"><b style="font-size:22px">'+c[0]+'</b><input id="t-cnt-'+i+'" type="number" min="0" max="9" data-save style="width:56px" aria-label="'+c[0]+'의 음운 개수"><span>개</span><span class="mark" id="cnt-m-'+i+'"></span></label>';
  });
  cn.innerHTML=ch;
  function ladder(id,rungs,goal){
    var el=document.getElementById(id), h='<div class="rung"><span class="start">물</span><span>출발</span></div>';
    for(var r=0;r<rungs;r++) h+='<div class="rung"><input id="t-'+id+'-'+r+'" type="text" data-save data-ladder="'+id+'" maxlength="4" aria-label="'+(r+1)+'번째 칸" placeholder="'+(goal&&r===rungs-1?'':'')+'"><span id="'+id+'-f-'+r+'" class="note"></span></div>';
    el.innerHTML=h;
  }
  ladder('lad1',8,false); ladder('lad2',6,true);
})();
var COUNTS=[3,1,3,1,3];
function ladderEval(id,rungs){
  var prev='물', steps=[], valid=0, cons=0, vow=0, reached=0, broken=false;
  for(var r=0;r<rungs;r++){
    var w=norm(S.t['t-'+id+'-'+r]); var f=document.getElementById(id+'-f-'+r);
    if(!w){ if(f) f.innerHTML=''; broken=true; continue; }
    if(broken){ if(f) f.innerHTML='<span class="mark bad">빈칸 없이 이어서 써요</span>'; continue; }
    var d=diff(prev,w);
    if(d.state==='ok'){ valid++; if(d.kind==='자음') cons++; else vow++; steps.push(w);
      if(f) f.innerHTML='<span class="mark ok">'+d.from+' → '+d.to+' · '+d.kind+'</span>';
      if(id==='lad2'&&w==='밤'&&!reached) reached=r+1;
      prev=w;
    } else { if(f) f.innerHTML='<span class="mark bad">'+d.msg+'</span>'; broken=true; }
  }
  return {valid:valid,cons:cons,vow:vow,steps:steps,reached:reached};
}
function updateLadders(){
  var a=ladderEval('lad1',8);
  document.getElementById('lad1-sum').textContent=a.valid?('사다리 '+a.valid+'칸 · 자음 '+a.cons+'번, 모음 '+a.vow+'번 바꿈'):'';
  var b=ladderEval('lad2',6);
  var s2=document.getElementById('lad2-sum');
  s2.textContent=b.reached?(b.reached+'단계 만에 도착!'+(b.reached===3?' 가장 짧은 길을 찾았어요.':' 더 짧은 길도 있어요.')):'';
}
function updatePair(){
  var d=diff(S.t['t-l1-pa'],S.t['t-l1-pb']), m=document.getElementById('pair-mark');
  if(d.state==='empty'){m.className='mark';m.textContent='';return;}
  m.className='mark '+(d.state==='ok'?'ok':'bad');
  m.textContent=d.state==='ok'?('최소 대립쌍! 뜻을 가른 음운: '+d.from+' / '+d.to):d.msg;
}

/* ---------- 2차시: 스무고개 ---------- */
var MONO_KEYS=Object.keys(MONO), tw=null;
function newRound(){ tw={secret:MONO_KEYS[Math.floor(Math.random()*MONO_KEYS.length)],asked:[],done:false,guesses:0}; renderTwenty(); }
var QS=[['둥','입술이 둥근가요?'],['앞','혀가 앞쪽인가요?'],['고','혀가 높은가요? (고)'],['중','혀 높이가 중간인가요? (중)'],['저','혀가 낮은가요? (저)']];
function renderTwenty(){
  var el=document.getElementById('twenty'), h='';
  h+='<div class="row">'+QS.map(function(q,i){return '<button type="button" class="qbtn" data-q="'+i+'"'+(tw.done?' disabled':'')+'>'+q[1]+'</button>';}).join('')+'</div>';
  h+='<div class="log">'+(tw.asked.length?tw.asked.map(function(a){return '<span>'+esc(a)+'</span>';}).join(''):'<span class="note">질문을 골라 보세요.</span>')+'</div>';
  h+='<div class="tray-label">정답이라고 생각하는 모음을 누르세요</div><div class="row">'+['ㅣ','ㅟ','ㅡ','ㅜ','ㅔ','ㅚ','ㅓ','ㅗ','ㅐ','ㅏ'].map(function(v){return '<button type="button" class="vbtn" data-guess="'+v+'"'+(tw.done?' disabled':'')+'>'+v+'</button>';}).join('')+'</div>';
  h+='<div class="checkbar"><button type="button" class="btn ghost" id="tw-new">'+(tw.done?'한 판 더':'새로 시작')+'</button><span class="result" id="tw-msg"></span></div>';
  if(S.rounds.length) h+='<p class="note">내 기록: '+S.rounds.map(function(r){return r.v+' ('+r.n+'번)';}).join(', ')+'</p>';
  el.innerHTML=h;
}
document.addEventListener('click',function(e){
  var q=e.target.closest('[data-q]');
  if(q&&tw&&!tw.done){ var Q=QS[+q.dataset.q], f=MONO[tw.secret], yes=(Q[0]==='둥'?f[2]==='둥':Q[0]==='앞'?f[1]==='앞':f[0]===Q[0]);
    tw.asked.push((tw.asked.length+1)+'. '+Q[1]+' → '+(yes?'예':'아니요')); renderTwenty(); return; }
  var g=e.target.closest('[data-guess]');
  if(g&&tw&&!tw.done){ tw.guesses++; var v=g.dataset.guess;
    if(v===tw.secret){ tw.done=true; var n=tw.asked.length+tw.guesses-1; S.rounds.push({v:v,n:n}); save(); renderTwenty(); document.getElementById('tw-msg').textContent='정답! 질문 '+n+'번 만에 맞혔어요.'; }
    else { tw.asked.push('추측 '+v+' → 아니에요 (질문 1번으로 셈)'); renderTwenty(); }
    return; }
  if(e.target.id==='tw-new'){ newRound(); }
});

/* ---------- 2차시: 표 ---------- */
var VT=[['ㅣ','ㅟ','ㅡ','ㅜ'],['ㅔ','ㅚ','ㅓ','ㅗ'],['ㅐ','','ㅏ','']];
(function(){
  var X0=165,CW=87.5,Y0=182,RH=38.7,W=700,H=460, mm=document.getElementById('vtable'), heads=document.getElementById('mm-heads');
  var HN=['앞 · 평평','앞 · 둥근','뒤 · 평평','뒤 · 둥근'], RN=['고모음','중모음','저모음'], h='', hh='';
  HN.forEach(function(n,c){ hh+='<span style="left:'+((X0+CW*(c+0.5))/W*100)+'%">'+n+'</span>'; });
  heads.innerHTML=hh;
  RN.forEach(function(r,ri){
    h+='<span class="mm-row" style="left:'+(523/W*100)+'%;top:'+((Y0+RH*ri+RH/2)/H*100)+'%">'+r+'</span>';
    for(var c=0;c<4;c++) h+='<div class="mm-cell" id="vt-'+ri+'-'+c+'" style="left:'+((X0+CW*c+3)/W*100)+'%;top:'+((Y0+RH*ri+2.5)/H*100)+'%;width:'+((CW-6)/W*100)+'%;height:'+((RH-5)/H*100)+'%"><input id="t-vt-'+ri+'-'+c+'" type="text" maxlength="1" data-save aria-label="'+r+' '+HN[c]+' 칸"></div>';
  });
  mm.insertAdjacentHTML('beforeend',h);
})();

/* ---------- 2차시: 관찰 표 ---------- */
var OBS=['ㅣ','ㅔ','ㅐ','ㅡ','ㅓ','ㅏ','ㅟ','ㅚ','ㅜ','ㅗ'];
var OBS_GROUPS={0:['묶음 1','\u2018이 → 에 → 애\u2019를 끊지 말고 길게 이어서 소리 내 보세요. 무엇이 바뀌고 무엇이 그대로인가요?'],
  3:['묶음 2','\u2018으 → 어 → 아\u2019를 끊지 말고 길게 이어서 소리 내 보세요. 묶음 1과 혀의 위치가 어떻게 다른가요?'],
  6:['묶음 3','짝꿍 모음과 번갈아 소리 내 보세요: \u2018이-위\u2019, \u2018에-외\u2019, \u2018으-우\u2019, \u2018어-오\u2019. 거울로 무엇이 바뀌는지 보세요.']};
var OBS_PAIR={'ㅟ':'ㅣ','ㅚ':'ㅔ','ㅜ':'ㅡ','ㅗ':'ㅓ'};
var OBS_COLS=[['lip',[['평','평평'],['둥','둥근']],2],['side',[['앞','앞'],['뒤','뒤']],1],['ht',[['고','높음'],['중','중간'],['저','낮음']],0]];
(function(){
  var tb=document.querySelector('#vobs tbody'), h='';
  OBS.forEach(function(vw,i){
    if(OBS_GROUPS[i]) h+='<tr class="grp"><td colspan="4"><b>'+OBS_GROUPS[i][0]+'</b> '+OBS_GROUPS[i][1]+'</td></tr>';
    h+='<tr><td><button type="button" class="vshow" data-vshow="'+vw+'" aria-label="'+vw+' 입 모양 보기">'+vw+'</button>'+(OBS_PAIR[vw]?'<span class="pair">'+OBS_PAIR[vw]+'와 비교</span>':'')+'</td>';
    OBS_COLS.forEach(function(col){
      h+='<td id="vo-'+i+'-'+col[0]+'"><span class="choice" role="radiogroup" aria-label="'+vw+' '+col[0]+'">'+col[1].map(function(o){return '<label><input type="radio" name="vo-'+i+'-'+col[0]+'" value="'+o[0]+'" data-choice="vo-'+i+'-'+col[0]+'"><span>'+o[1]+'</span></label>';}).join('')+'</span></td>';
    });
    h+='</tr>';
  });
  tb.innerHTML=h;
})();
/* ---------- 입술 그리기 ---------- */
function lipUp(ax,ay,tx,by,bx){ var m=(ay+by)/2; return 'M'+ax+' '+ay+' C'+(tx+8)+' '+(ay-1)+' '+tx+' '+(ay+6)+' '+tx+' '+m+' C'+tx+' '+(by-1)+' '+(tx+10)+' '+by+' '+bx+' '+by; }
function lipLo(ax,ay,tx,ty,bx){ var m=(ay+ty)/2; return 'M'+bx+' '+ty+' C'+(tx+10)+' '+ty+' '+tx+' '+(ty+1)+' '+tx+' '+m+' C'+tx+' '+(ay-6)+' '+(tx+8)+' '+(ay+1)+' '+ax+' '+ay; }
function setLips(pre,up,lo){
  document.getElementById(pre+'-lip-u').setAttribute('d',up+' Z'); document.getElementById(pre+'-lipo-u').setAttribute('d',up);
  document.getElementById(pre+'-lip-l').setAttribute('d',lo+' Z'); document.getElementById(pre+'-lipo-l').setAttribute('d',lo);
}
function frontLips(w,ht,hb,ow,oh){
  var c=60,y=40,k=1.33;
  var outer='M'+(c-w)+' '+y+' C'+(c-w*0.7)+' '+(y-ht)+' '+(c-w*0.3)+' '+(y-ht-3)+' '+c+' '+(y-ht+5)+' C'+(c+w*0.3)+' '+(y-ht-3)+' '+(c+w*0.7)+' '+(y-ht)+' '+(c+w)+' '+y+' C'+(c+w*0.6)+' '+(y+hb*k)+' '+(c-w*0.6)+' '+(y+hb*k)+' '+(c-w)+' '+y+' Z';
  var hole='M'+(c-ow)+' '+y+' C'+(c-ow*0.6)+' '+(y-oh*k)+' '+(c+ow*0.6)+' '+(y-oh*k)+' '+(c+ow)+' '+y+' C'+(c+ow*0.6)+' '+(y+oh*k)+' '+(c-ow*0.6)+' '+(y+oh*k)+' '+(c-ow)+' '+y+' Z';
  var line='M'+(c-ow-4)+' '+y+' C'+(c-ow*0.5)+' '+(y+1)+' '+(c+ow*0.5)+' '+(y+1)+' '+(c+ow+4)+' '+y;
  document.getElementById('mv-lipf').setAttribute('d',outer); document.getElementById('mv-hole').setAttribute('d',hole); document.getElementById('mv-lipln').setAttribute('d',line);
}
function vowelLips(round,ht){
  var tx=round?64:86;
  setLips('mv', lipUp(114,168,tx,round?208:206,134), lipLo(114,364,tx,round?324:326,136));
  if(round) frontLips(24,20,20,8,8); else frontLips(50,13,14,38,{'고':2.5,'중':5,'저':8}[ht]||5);
}
vowelLips(false,'중');
setLips('cv', lipUp(102,168,80,198,112), lipLo(102,240,80,217,112));
/* ---------- 입 안 들여다보기 ---------- */
(function(){
  var HX={'앞':230,'뒤':440}, HY={'고':218,'중':256,'저':296};
  function tongue(hx,hy){ return 'M140 330 C180 330 '+(hx-90)+' '+hy+' '+hx+' '+hy+' C'+(hx+90)+' '+hy+' 545 330 552 400 L552 460'; }
  document.addEventListener('click',function(e){
    var b=e.target.closest('[data-vshow]'); if(!b) return;
    var v=b.dataset.vshow, f=MONO[v]; if(!f) return;
    var hx=HX[f[1]], hy=HY[f[0]], round=(f[2]==='둥');
    var line=tongue(hx,hy);
    document.getElementById('mv-tline').setAttribute('d',line);
    document.getElementById('mv-tongue').setAttribute('d',line+' L210 460 C160 440 145 390 140 330 Z');
    var dot=document.getElementById('mv-dot'); dot.setAttribute('cx',hx); dot.setAttribute('cy',hy); dot.setAttribute('r',9);
    vowelLips(round,f[0]);
    document.querySelectorAll('.vshow').forEach(function(x){ x.classList.toggle('on',x===b); });
    document.getElementById('mv-cap').innerHTML='<b>'+v+'</b> 혀가 <b>'+(f[1]==='앞'?'앞쪽':'뒤쪽')+'</b>, <b>'+({'고':'높게','중':'중간에','저':'낮게'})[f[0]]+'</b> · 입술은 <b>'+(round?'둥글게':'평평하게')+'</b>';
  });
})();

/* ---------- 자음 입 안 들여다보기 ---------- */
(function(){
  var T={rest:'M125 222 C170 212 300 196 400 206 C460 214 495 262 495 330 L495 420',
    alv:'M136 200 C148 194 162 204 180 212 C260 214 330 198 400 208 C460 216 495 262 495 330 L495 420',
    alvgap:'M138 210 C150 205 164 210 182 216 C260 216 330 200 400 208 C460 216 495 262 495 330 L495 420',
    pal:'M125 224 C170 218 210 150 265 140 C320 134 380 190 420 210 C465 225 495 262 495 330 L495 420',
    vel:'M125 224 C200 216 330 212 400 192 C428 172 450 156 470 166 C495 182 500 250 495 330 L495 420'};
  var HIT=[[90,203],[136,197],[265,136],[460,156],[505,364]];
  var PLACE_TXT=['두 입술이 닿아요','혀끝이 윗잇몸에 닿아요','혓바닥이 센입천장에 닿아요','혀의 뒷부분이 여린입천장에 닿아요','목청 사이에서 소리가 나요'];
  var MAN_TXT=['공기를 막았다가 <b>터뜨려요</b>','공기를 막았다가 <b>비비며 터뜨려요</b>','좁은 틈으로 공기를 <b>비벼 내요</b>','입은 막고 공기를 <b>코로</b> 내보내요','공기를 혀 <b>양옆으로 흘려</b> 보내요'];
  var STR={'ㄲ':'된','ㄸ':'된','ㅃ':'된','ㅆ':'된','ㅉ':'된','ㅋ':'거센','ㅌ':'거센','ㅍ':'거센','ㅊ':'거센'};
  function fill(line){ var m=line.match(/^M(\d+) (\d+)/); return line+' L170 420 C135 380 120 300 '+m[1]+' '+m[2]+' Z'; }
  window.showCons=function(ch){
    var pos=POS[ch], man=MAN[ch]; if(pos===undefined) return;
    var key=pos===1?(man===2?'alvgap':'alv'):pos===2?'pal':pos===3?'vel':'rest';
    document.getElementById('cv-tline').setAttribute('d',T[key]);
    document.getElementById('cv-tongue').setAttribute('d',fill(T[key]));
    var closeLips=(pos===0);
    setLips('cv', lipUp(102,168,80,closeLips?206:198,112), lipLo(102,240,80,closeLips?207:217,112));
    var nasal=(man===3);
    document.getElementById('cv-velum').setAttribute('d',nasal?'M425 140 C442 160 450 190 446 222':'M425 140 C450 145 472 160 480 190');
    var h=HIT[pos], hit=document.getElementById('cv-hit'); hit.setAttribute('cx',h[0]); hit.setAttribute('cy',h[1]); hit.setAttribute('r',man===2?7:10);
    hit.style.opacity=(man===2?.55:.85);
    var air=document.getElementById('cv-air');
    if(nasal) air.setAttribute('d','M505 250 C512 190 470 140 380 132 C280 126 170 132 70 148');
    else if(pos===4) air.setAttribute('d','M512 330 C512 230 470 190 380 192 C260 196 150 200 50 204');
    else if(man===4) air.setAttribute('d','M150 218 C130 226 110 230 50 230');
    else air.setAttribute('d','M'+(h[0]-14)+' '+(h[1]+(pos===0?0:10))+' C'+(h[0]-40)+' '+(h[1]+6)+' 90 204 40 204');
    var str=STR[ch]?(STR[ch]+'소리'):(man>=3?'':'예사소리');
    document.getElementById('cv-cap').innerHTML='<b style="font-size:20px">'+ch+'</b> 소리를 낼 때의 입 안이에요. 직접 소리 내 보며 그림과 비교해 보세요.';
  };
})();

/* ---------- 체계표 그리기 ---------- */
var DV=[['ㅣ','ㅟ','ㅡ','ㅜ'],['ㅔ','ㅚ','ㅓ','ㅗ'],['ㅐ','','ㅏ','']];
var DC=[['안울림소리','파열음','예사소리',['ㅂ','ㄷ','','ㄱ','']],['','','된소리',['ㅃ','ㄸ','','ㄲ','']],['','','거센소리',['ㅍ','ㅌ','','ㅋ','']],
        ['','파찰음','예사소리',['','','ㅈ','','']],['','','된소리',['','','ㅉ','','']],['','','거센소리',['','','ㅊ','','']],
        ['','마찰음','예사소리',['','ㅅ','','','ㅎ']],['','','된소리',['','ㅆ','','','']],
        ['울림소리','비음','',['ㅁ','ㄴ','','ㅇ','']],['','유음','',['','ㄹ','','','']]];
(function(){
  var tb=document.querySelector('#dv tbody'), h='';
  ['고모음','중모음','저모음'].forEach(function(r,ri){ h+='<tr><th>'+r+'</th>'; for(var c=0;c<4;c++) h+='<td class="c" id="dvc-'+ri+'-'+c+'"><input id="t-dv-'+ri+'-'+c+'" type="text" maxlength="1" data-save aria-label="'+r+' '+(c+1)+'번째 칸"></td>'; h+='</tr>'; });
  tb.innerHTML=h;
  var tc=document.querySelector('#dc tbody'), k='';
  var span={'안울림소리':8,'울림소리':2,'파열음':3,'파찰음':3,'마찰음':2};
  DC.forEach(function(row,ri){
    k+='<tr>';
    if(row[0]) k+='<th class="grp" rowspan="'+span[row[0]]+'">'+row[0]+'</th>';
    if(row[1]) k+='<th rowspan="'+(span[row[1]]||1)+'"'+(row[2]?'':' colspan="2"')+'>'+row[1]+'</th>';
    if(row[2]) k+='<th>'+row[2]+'</th>';
    for(var c=0;c<5;c++) k+='<td class="c" id="dcc-'+ri+'-'+c+'"><input id="t-dc-'+ri+'-'+c+'" type="text" maxlength="1" data-save aria-label="'+(row[1]||'')+' '+(row[2]||'')+' '+(c+1)+'번째 칸"></td>';
    k+='</tr>';
  });
  tc.innerHTML=k;
})();

/* ---------- 3차시 복습: cipher ---------- */
var C2=[['2-3 된','저·앞·평','1-4','쌤'],['4-1 된','중·앞·평','—','께'],['1-1 예','저·뒤·평','4-1 예','박'],['2-3 예','고·뒤·둥','—','수'],['2-3 예','중·앞·평','—','세'],['1-1 예','중·뒤·평','2-4','번']];
var C3=[['잇몸·파열·예사','낮음·뒤·평평','받침 없음','다'],['목청·마찰','낮음·뒤·평평','두 입술·비음','함'],['여린입천장·파열·된','중간·앞·평평','받침 없음','께'],['두 입술·비음','낮음·뒤·평평','잇몸·비음','만'],['잇몸·마찰·예사','중간·앞·평평','받침 없음','세']];
function cipherHtml(id,data,lv){
  return data.map(function(d,i){ return '<div class="cbox" id="'+id+'-b-'+i+'"><div class="codes">'+(lv===2?('첫 '+d[0]+'<br>가 '+d[1]+'<br>끝 '+d[2]):('['+d[0]+']<br>['+d[1]+']<br>['+d[2]+']'))+'</div><input id="t-'+id+'-'+i+'" type="text" maxlength="1" data-save aria-label="'+(i+1)+'번째 글자"></div>'; }).join('');
}
document.getElementById('cip2').innerHTML=cipherHtml('cip2',C2,2);
document.getElementById('cip3').innerHTML=cipherHtml('cip3',C3,3);

/* ---------- 4차시 ---------- */
var FAMS=[['아','어금닛소리'],['설','혓소리'],['순','입술소리'],['치','잇소리'],['후','목구멍소리']];
(function(){
  var tb=document.querySelector('#same tbody'), h='';
  FAMS.forEach(function(f){ h+='<tr id="same-'+f[0]+'"><th>'+f[1]+'</th><td><span class="choice">'+['○','×'].map(function(o){return '<label><input type="radio" name="same-'+f[0]+'" value="'+o+'" data-choice="same-'+f[0]+'"><span>'+o+'</span></label>';}).join('')+'</span></td><td class="note" id="same-n-'+f[0]+'"></td></tr>'; });
  tb.innerHTML=h;
  var cb=document.querySelector('#combo tbody'), c='';
  [['ㅡ 위에 ·','ㅗ'],['ㅡ 아래에 ·','ㅜ'],['ㅣ 오른쪽에 ·','ㅏ'],['ㅣ 왼쪽에 ·','ㅓ']].forEach(function(r,i){ c+='<tr id="cb-'+i+'"><td>'+r[0]+'</td><td class="c"><input id="t-cb-'+i+'" type="text" maxlength="1" data-save aria-label="'+r[0]+'"></td></tr>'; });
  cb.innerHTML=c;
})();
var COMBO=['ㅗ','ㅜ','ㅏ','ㅓ'];
var SAME_NOTE={'아':'ㄱ·ㅋ과 받침 ㅇ(옛이응 ㆁ)은 모두 여린입천장에서 나요.','설':'ㄴ·ㄷ·ㅌ·ㄹ은 모두 잇몸에서 나요.','순':'ㅁ·ㅂ·ㅍ은 모두 두 입술에서 나요.','치':'ㅅ은 잇몸, ㅈ·ㅊ은 지금 센입천장에서 나요. 소리 나는 자리가 바뀌었어요.','후':'ㆆ은 지금 쓰지 않고, ㅎ은 목청에서 나요. 첫소리 ㅇ은 소리가 없어요.'};

/* ---------- checks ---------- */
function setRes(id,ok,total,extra){ var el=document.getElementById('res-'+id); if(!el) return; el.className='result '+(ok===total?'ok':'bad'); el.textContent=total+'개 중 '+ok+'개 맞음'+(extra?' · '+extra:''); }
function gridScore(pre,exp,show,resId,cellPre){
  var ok=0,tot=0,extra=0; cellPre=cellPre||(pre+'c');
  exp.forEach(function(row,r){ row.forEach(function(want,c){
    var got=norm(S.t['t-'+pre+'-'+r+'-'+c]), cell=document.getElementById(cellPre+'-'+r+'-'+c), cls='c';
    if(want){ tot++; if(got===want){ ok++; cls+=' okc'; } else if(got) cls+=' badc'; }
    else if(got){ extra++; cls+=' badc'; }
    if(show&&cell){ cell.classList.remove('okc','badc'); cls.split(' ').slice(1).forEach(function(k){ cell.classList.add(k); }); }
  }); });
  if(show) setRes(resId||pre,ok,tot,extra?('빈칸이어야 할 곳에 '+extra+'개를 썼어요'):'');
  return [ok,tot];
}
var CHECKS={
  culprit:function(show){ var ok=0; PAIRS.forEach(function(p,i){ var r=S.c['cul-'+i]===p[2]; if(r) ok++; if(show){ var tr=document.getElementById('cul-'+i); tr.lastChild.className=S.c['cul-'+i]?(r?'okc':'badc'):''; } }); if(show) setRes('culprit',ok,PAIRS.length,ok===5?'':'범인의 종류를 다시 살펴봐요'); return [ok,PAIRS.length]; },
  counts:function(show){ var ok=0; COUNTS.forEach(function(n,i){ var v=S.t['t-cnt-'+i]; var r=(v!==undefined&&v!==''&&+v===n); if(r) ok++; if(show){ var m=document.getElementById('cnt-m-'+i); m.className='mark '+(r?'ok':'bad'); m.textContent=r?'맞음':'다시'; } }); if(show) setRes('counts',ok,5,ok<5?'첫소리 ㅇ과 이중 모음을 떠올려 봐요':''); return [ok,5]; },
  vtable:function(show){ return gridScore('vt',VT,show,'vtable','vt'); },
  cip2:function(show){ return cipCheck('cip2',C2,show); },
  cip3:function(show){ return cipCheck('cip3',C3,show); },
  same:function(show){ var ok=0; FAMS.forEach(function(f){ var v=S.c['same-'+f[0]], want=(f[0]==='치'?'×':'○'), good=(f[0]==='후'?!!v:v===want); if(good) ok++; if(show){ document.getElementById('same-n-'+f[0]).textContent=v?SAME_NOTE[f[0]]:''; } }); if(show) setRes('same',ok,5,'오른쪽 설명도 읽어 보세요'); return [ok,5]; },
  vobs:function(show){ var ok=0,tot=0; OBS.forEach(function(vw,i){ var f=MONO[vw]; OBS_COLS.forEach(function(col){ tot++; var val=S.c['vo-'+i+'-'+col[0]], good=(val===f[col[2]]); if(good) ok++; if(show) document.getElementById('vo-'+i+'-'+col[0]).className=val?(good?'okc':'badc'):''; }); });
    if(show){ var nm=[['t-l2-lip1','평순'],['t-l2-lip2','원순'],['t-l2-front','전설'],['t-l2-back','후설']], nk=0; nm.forEach(function(x){ if(norm(S.t[x[0]]).replace(/모음$/,'')===x[1]) nk++; }); setRes('vobs',ok,tot,'이름 칸 '+nk+'/4'); } return [ok,tot]; },
  dv:function(show){ return gridScore('dv',DV,show); },
  dc:function(show){ return gridScore('dc',DC.map(function(r){return r[3];}),show); },
  combo:function(show){ var ok=0; COMBO.forEach(function(a,i){ var good=norm(S.t['t-cb-'+i])===a; if(good) ok++; if(show) document.getElementById('cb-'+i).lastChild.className='c '+(good?'okc':'badc'); }); if(show) setRes('combo',ok,4); return [ok,4]; }
};
function cipCheck(id,data,show){ var ok=0; data.forEach(function(d,i){ var good=norm(S.t['t-'+id+'-'+i])===d[3]; if(good) ok++; if(show) document.getElementById(id+'-b-'+i).className='cbox '+(good?'ok':'bad'); }); if(show) setRes(id,ok,data.length,ok===data.length?'미션을 해독해 적어 보세요':''); return [ok,data.length]; }
Object.keys(BOARDS).forEach(function(bk){
  CHECKS[bk]=function(show){ var s=scoreBoard(bk); if(show){ marks[bk]=s.marks; renderBoard(bk); var left=s.total-s.placed; var extra=left>0?('아직 '+left+'개를 옮기지 않았어요'):''; if(bk==='l2sort'){ var a=norm(S.t['t-l2-na']).replace(/모음$/,''), b=norm(S.t['t-l2-nb']).replace(/모음$/,''); extra+=(extra?' · ':'')+'이름 '+((a==='단'&&b==='이중')?'정확해요':'을 힌트로 다시 생각해 봐요'); } if(bk==='l2tree'){ var t=[['t-l2-lip1','평순'],['t-l2-lip2','원순'],['t-l2-평f','전설'],['t-l2-평b','후설'],['t-l2-둥f','전설'],['t-l2-둥b','후설']], tk=0; t.forEach(function(x){ if(norm(S.t[x[0]]).replace(/모음$/,'')===x[1]) tk++; }); extra+=(extra?' · ':'')+'이름 칸 '+tk+'/6'; } if(bk==='l3pos') extra+=(extra?' · ':'')+'이름 칸 '+nmCount('t-l3-pn-',POS_N)+'/5'; if(bk==='l3man') extra+=(extra?' · ':'')+'이름 칸 '+nmCount('t-l3-mn-',MAN_N)+'/5'; if(bk==='l3str') extra+=(extra?' · ':'')+'이름 칸 '+nmCount('t-l3-sn-',STR_N)+'/4'; setRes(bk,s.ok,s.total,extra); } return [s.ok,s.total]; };
});
document.addEventListener('click',function(e){ var b=e.target.closest('[data-check]'); if(b) CHECKS[b.dataset.check](true); });

/* ---------- inputs ---------- */
function restoreInputs(root){
  root.querySelectorAll('[data-save]').forEach(function(inp){ if(S.t[inp.id]!==undefined) inp.value=S.t[inp.id]; });
  root.querySelectorAll('[data-choice]').forEach(function(inp){ inp.checked=(S.c[inp.dataset.choice]===inp.value); });
}
document.addEventListener('input',function(e){
  var t=e.target;
  if(t.matches('[data-save]')){ S.t[t.id]=t.value; save(); if(/^t-l3-(pn|mn|sn)-/.test(t.id)) refreshTblHeads(); if(t.dataset.ladder) updateLadders(); if(t.id==='t-l1-pa'||t.id==='t-l1-pb') updatePair(); }
  if(t.matches('.who input')){ S.t[t.id]=t.value; save(); }
});
document.addEventListener('change',function(e){ var t=e.target; if(t.matches('[data-choice]')){ S.c[t.dataset.choice]=t.value; save(); } });


/* ---------- tabs ---------- */
var TABS=['l1','l2','l3','draw','l3r','spirit','l4'];
var LNAME={l1:'음운의 개념',l2:'모음 체계표',l3:'자음 체계표',l3r:'음운 방탈출',draw:'체계표 그리기',spirit:'한글의 창제 정신',l4:'한글의 창제 원리'};
function show(){
  var h=(location.hash||'').replace('#',''); if(TABS.indexOf(h)<0) h='l1';
  TABS.forEach(function(t){ document.getElementById('tab-'+t).hidden=(t!==h); });
  document.querySelectorAll('nav.tabs a').forEach(function(a){ if(a.dataset.tab===h) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current'); });
  markSent();
  try{localStorage.setItem(KEY+'-tab',h);}catch(e){}
}
window.addEventListener('hashchange',function(){ show(); window.scrollTo(0,0); });
function markSent(){ document.querySelectorAll('nav.tabs a').forEach(function(a){ a.classList.toggle('sent',!!S.sent[a.dataset.tab]); }); }

/* ---------- answers per lesson ---------- */
function v(id){ return (S.t[id]||'').trim()||'(빈칸)'; }
function placedList(bk,slotId){ var B=BOARDS[bk], st=S.b[bk], a=[]; B.chips.forEach(function(c,i){ if(st[i]===slotId) a.push(c); }); return a.join(' ')||'-'; }
var SCORE_KEYS={l1:['culprit','counts'],l2:['l2sort','vobs','vtable'],l3:['l3pos','l3man','l3str','l3tbl'],l3r:['cip2','cip3'],draw:['dv','dc'],spirit:['l4spirit'],l4:['l4base','l4fam','same','combo']};
function lessonPack(L){
  var ok=0,tot=0; SCORE_KEYS[L].forEach(function(k){ var r=CHECKS[k](false); ok+=r[0]; tot+=r[1]; });
  var o=[];
  var lad=function(id,n){ var a=['물']; for(var r=0;r<n;r++){ var w=norm(S.t['t-'+id+'-'+r]); if(w) a.push(w); } return a.join(' → '); };
  if(L==='l1'){
    PAIRS.forEach(function(p,i){ o.push('- '+p[0]+'/'+p[1]+': '+v('t-cul-'+i)+' ('+(S.c['cul-'+i]||'선택 안 함')+')'); });
    o.push('- 음운이란: '+v('t-l1-def'));
    o.push('- 사다리 1: '+lad('lad1',8));
    o.push('- 사다리 2: '+lad('lad2',6));
    o.push('- 음운 개수: '+['감','아','강','와','빵'].map(function(w,i){return w+' '+(S.t['t-cnt-'+i]||'?');}).join(', '));
    o.push('- 출구 카드 최소 대립쌍: '+v('t-l1-pa')+' / '+v('t-l1-pb'));
  } else if(L==='l2'){
    o.push('- A 묶음 ('+v('t-l2-na')+'모음): '+placedList('l2sort','A'));
    o.push('- B 묶음 ('+v('t-l2-nb')+'모음): '+placedList('l2sort','B'));
    o.push('- 관찰: '+OBS.map(function(vw,i){return vw+'('+OBS_COLS.map(function(col){return S.c['vo-'+i+'-'+col[0]]||'?';}).join('·')+')';}).join(' '));
    o.push('- 이름: 평평 '+v('t-l2-lip1')+', 둥근 '+v('t-l2-lip2')+', 앞 '+v('t-l2-front')+', 뒤 '+v('t-l2-back'));
    o.push('- 빈칸과 까닭: '+v('t-l2-empty'));
    o.push('- ㅚ, ㅟ: '+v('t-l2-hold'));
    o.push('- 스무고개 기록: '+(S.rounds.length?S.rounds.map(function(r){return r.v+' '+r.n+'번';}).join(', '):'없음')+' / 까닭: '+v('t-l2-why'));
    o.push('- 표: '+[0,1,2].map(function(r){return ['고','중','저'][r]+' '+[0,1,2,3].map(function(c){return S.t['t-vt-'+r+'-'+c]||'_';}).join(' ');}).join(' | '));
    o.push('- 출구 질문(ㅣ와 ㅟ): '+v('t-l2-exit'));
  } else if(L==='l3'){
    o.push('- 실험: 휴지 '+v('t-l3-e1')+' / 코 막기 '+v('t-l3-e2')+' / 늘이기 '+v('t-l3-e3')+' / 르 '+v('t-l3-e4'));
    o.push('- 1단계 위치: '+POS_T.map(function(t,k){return (k+1)+'번 집('+v('t-l3-pn-'+k)+') '+placedList('l3pos','p'+k);}).join(' | '));
    o.push('- 2단계 방법: '+MAN_T.map(function(t,k){return (k+1)+'층('+v('t-l3-mn-'+k)+') '+placedList('l3man','m'+k);}).join(' | '));
    o.push('- 3단계 세기: '+STR_T.map(function(t,k){return STR_NO[k]+'('+v('t-l3-sn-'+k)+') '+placedList('l3str','s'+k);}).join(' | '));
    var lastM=''; DC.forEach(function(row,ri){ if(row[1]) lastM=row[1]; var cells=[]; for(var c=0;c<5;c++) cells.push(S.b.l3tbl&&Object.keys(S.b.l3tbl).filter(function(k){return S.b.l3tbl[k]==='r'+ri+'c'+c;}).map(function(k){return CONS[k];}).join('')||'_'); o.push('- 체계표 '+lastM+(row[2]?' '+row[2]:'')+': '+cells.join(' ')); });
    o.push('- 빈칸의 뜻: '+v('t-l3-q1'));
    o.push('- 세쌍둥이: '+v('t-l3-q2'));
    o.push('- 말소리는 '+v('t-l3-gen'));
  } else if(L==='l3r'){
    o.push('- 레벨 2: '+C2.map(function(d,i){return S.t['t-cip2-'+i]||'_';}).join('')+' / 미션: '+v('t-c2-m'));
    o.push('- 레벨 3: '+C3.map(function(d,i){return S.t['t-cip3-'+i]||'_';}).join('')+' / 미션: '+v('t-c3-m'));
    o.push('- 생각 1: '+v('t-c-r1'));
    o.push('- 생각 2: '+v('t-c-r2'));
    o.push('- 우리 모둠 암호: '+v('t-c-own').replace(/\n/g,' / '));
  } else if(L==='draw'){
    o.push('- 모음표: '+[0,1,2].map(function(r){return ['고','중','저'][r]+' '+[0,1,2,3].map(function(c){return S.t['t-dv-'+r+'-'+c]||'_';}).join(' ');}).join(' | '));
    o.push('- 자음표: '+DC.map(function(row,r){return (row[1]||'')+(row[2]?row[2].charAt(0):'')+' '+[0,1,2,3,4].map(function(c){return S.t['t-dc-'+r+'-'+c]||'_';}).join('');}).join(' | '));
    o.push('- 같은 점과 다른 점: '+v('t-dr-q'));
  } else if(L==='spirit'){
    o.push('- 창제 정신: '+BOARDS.l4spirit.slots.map(function(s,i){return (i+1)+'번 '+placedList('l4spirit',s.id);}).join(', '));
    o.push('- 왜 만들었을까: '+v('t-l4-sp1'));
    o.push('- 오늘날의 예: '+v('t-l4-sp2'));
  } else if(L==='l4'){
    o.push('- 상형: '+v('t-l4-a')+' / 가획: '+v('t-l4-b')+' / 이체: '+v('t-l4-c'));
    o.push('- 기본자: '+BOARDS.l4base.slots.map(function(s){return s.label.split(' ')[0]+' '+placedList('l4base',s.id);}).join(', '));
    FAMS.forEach(function(f){ o.push('- '+f[1]+' 가족: '+['s1','s2','x'].map(function(k){return placedList('l4fam',f[0]+k);}).join(' / ')+' · 같은 집? '+(S.c['same-'+f[0]]||'-')); });
    o.push('- 내 생각: '+v('t-l4-why'));
    o.push('- 천지인: · '+v('t-l4-s1')+', ㅡ '+v('t-l4-s2')+', ㅣ '+v('t-l4-s3')+' / 합성: '+[0,1,2,3].map(function(i){return S.t['t-cb-'+i]||'_';}).join(' '));
    o.push('- 성찰: '+v('t-l4-r1'));
    o.push('- 한글은 '+v('t-l4-r2'));
  }
  return {score:[ok,tot], lines:o};
}

/* ---------- submit ---------- */
var GS=(typeof google!=='undefined'&&google&&google.script&&google.script.run)?google.script.run:null;
[].forEach(function(L){
  var sec=document.getElementById('tab-'+L), d=document.createElement('div');
  d.className='block submitblock';
  d.innerHTML='<h3><span class="stage review">제출</span>'+LNAME[L]+' 답 제출하기</h3>'+
    '<p class="note">맨 위에 반·번호·이름을 쓴 뒤 누르세요. 다시 제출해도 괜찮아요. 선생님은 가장 마지막 제출을 확인해요.</p>'+
    '<div class="checkbar"><button type="button" class="btn" data-submit="'+L+'">'+LNAME[L]+' 제출하기</button><span class="result" id="sub-'+L+'" role="status"></span></div>'+
    '<div id="fb-'+L+'" hidden><textarea id="out-'+L+'" class="out" readonly rows="8" aria-label="제출할 내용"></textarea></div>';
  sec.appendChild(d);
});
document.addEventListener('click',function(e){
  var b=e.target.closest('[data-submit]'); if(!b) return;
  var L=b.dataset.submit, msg=document.getElementById('sub-'+L);
  var ban=(S.t['who-ban']||'').trim(), no=(S.t['who-no']||'').trim(), name=(S.t['who-name']||'').trim();
  if(!ban||!no||!name){ msg.className='result bad'; msg.textContent='맨 위에 반, 번호, 이름을 모두 써 주세요.'; document.getElementById(!ban?'who-ban':!no?'who-no':'who-name').focus(); return; }
  var pk=lessonPack(L);
  var payload={lesson:L, ban:ban, no:no, name:name, score:pk.score[0]+' / '+pk.score[1], text:pk.lines.join('\n')};
  if(GS){
    b.disabled=true; msg.className='result'; msg.textContent='보내는 중…';
    GS.withSuccessHandler(function(t){ b.disabled=false; S.sent[L]=t||'제출함'; save(); msg.className='result ok'; msg.textContent='제출했어요'+(t?' ('+t+')':'')+'. 고칠 게 있으면 고친 뒤 다시 제출해도 돼요.'; markSent(); })
      .withFailureHandler(function(){ b.disabled=false; msg.className='result bad'; msg.textContent='제출이 안 됐어요. 인터넷 연결을 확인하고 다시 눌러 주세요.'; })
      .submit(payload);
    return;
  }
  var box=document.getElementById('fb-'+L), ta=document.getElementById('out-'+L);
  box.hidden=false;
  ta.value='['+LNAME[L]+'] 2학년 '+ban+'반 '+no+'번 '+name+' · 자동 채점 '+payload.score+'\n'+payload.text;
  function fb(){ ta.focus(); ta.select(); msg.className='result bad'; msg.textContent='이 화면에서는 바로 제출이 안 돼요. 아래 글이 선택되었으니 Ctrl+C로 복사해 제출하세요.'; }
  try{ navigator.clipboard.writeText(ta.value).then(function(){ msg.className='result ok'; msg.textContent='이 화면에서는 바로 제출이 안 돼서 답을 복사했어요. 선생님이 알려 준 곳에 붙여 넣으세요.'; },fb); }catch(err){ fb(); }
});
document.getElementById('reset').addEventListener('click',function(){ document.getElementById('reset-confirm').hidden=false; });
document.getElementById('reset-no').addEventListener('click',function(){ document.getElementById('reset-confirm').hidden=true; });
document.getElementById('reset-yes').addEventListener('click',function(){
  S={t:{},b:{},c:{},rounds:[],sent:{}}; Object.keys(BOARDS).forEach(function(k){S.b[k]={};}); marks={}; sel=null;
  try{localStorage.removeItem(KEY);}catch(e){}
  document.querySelectorAll('input[type=text],input[type=number],textarea').forEach(function(i){ i.value=''; });
  document.querySelectorAll('input[type=radio]').forEach(function(i){ i.checked=false; });
  Object.keys(BOARDS).forEach(renderBoard); updateLadders(); updatePair(); newRound();
  document.querySelectorAll('.result,.mark').forEach(function(m){ m.textContent=''; });

  document.getElementById('reset-confirm').hidden=true; markSent();
});

/* ---------- boot ---------- */
Object.keys(BOARDS).forEach(renderBoard);
restoreInputs(document);
updateLadders(); updatePair(); newRound();
if(!location.hash){ try{ var lt=localStorage.getItem(KEY+'-tab'); if(lt&&TABS.indexOf(lt)>=0) history.replaceState(null,'','#'+lt); }catch(e){} }
show();
})();
