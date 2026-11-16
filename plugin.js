// ==UserScript==
// @name         DraftTimer Mobile
// @namespace    local.drafttimer
// @version      1.0.1
// @description  Fixed countdown for your own drafts in one Discord web channel.
// @match        https://discord.com/*
// @run-at       document-end
// @grant        none
// @noframes
// ==/UserScript==
(() => {
  'use strict';
  const key = 'drafttimer.mobile.settings.v1';
  const intervalSeconds = 61;
  const channel = path => /^\/channels\/(?:@me|\d+)\/(\d{17,20})(?:\/)?$/.exec(path)?.[1] || null;
  const valid = id => /^\d{17,20}$/.test(String(id || ''));
  const clean = s => String(s || '').replace(/[\u200b\ufeff]/g,'').trim();
  const seconds = n => Math.min(3600, Math.max(10, Math.round(Number(n) || intervalSeconds)));
  class Clock {
    constructor(n=intervalSeconds) { this.period=seconds(n)*1000; this.due=0; this.id=null; this.away=false; }
    start(id,t) { if(!valid(id)) return false; this.id=id; this.due=t+this.period; this.away=false; return true; }
    stop(){ this.id=null; this.due=0; this.away=false; }
    tick(id,t,visible=true){
      if(!this.id) return 'off';
      const away=!visible || id!==this.id;
      const wasAway=this.away; this.away=away;
      if(t<this.due) return away?'away':'waiting';
      const late=t-this.due;
      this.due+=(Math.floor(late/this.period)+1)*this.period;
      return away || wasAway || late>2000 ? 'skip' : 'send';
    }
  }
  if(typeof module!=='undefined' && module.exports){ module.exports={Clock,channel,valid,clean,seconds}; return; }
  if(window.top!==window.self || document.getElementById('drafttimer-mobile')) return;
  let settings={id:'',seconds:intervalSeconds};
  try { const obj=JSON.parse(localStorage.getItem(key)||'{}'); settings={id:valid(obj.id)?obj.id:'',seconds:intervalSeconds}; } catch (_) {}
  const clock=new Clock(settings.seconds);
  let status='Off', composing=false, pending=null;
  const current=()=>channel(location.pathname);
  const visible=e=>!!e && e.isConnected && e.getClientRects().length>0 && getComputedStyle(e).visibility!=='hidden' && !e.closest('[inert],[aria-hidden="true"]');
  const editorSelector='[data-slate-editor="true"][contenteditable="true"], textarea[placeholder], [contenteditable="true"][role="textbox"]';
  const sendNames=new Set(['send','send message','bericht verzenden','verzenden','wyślij wiadomość','wyślij']);
  const label=e=>clean(e.getAttribute('aria-label') || e.getAttribute('title') || e.getAttribute('data-testid')).toLowerCase();
  const draft=e=>clean(e?.tagName==='TEXTAREA'?e.value:e?.innerText ?? e?.textContent);
  function composer(){
    if(document.querySelector('[aria-modal="true"]')) return null;
    const es=[...document.querySelectorAll(editorSelector)].filter(e=>visible(e)&&!e.closest('[role="dialog"]')&&e.closest('form')&&!e.disabled&&!e.readOnly&&e.getAttribute('aria-disabled')!=='true');
    if(es.length!==1)return null;
    const e=es[0], form=e.closest('form');
    const buttons=[...form.querySelectorAll('button,[role="button"]')].filter(b=>visible(b)&&!b.disabled&&b.getAttribute('aria-disabled')!=='true'&&(sendNames.has(label(b))||label(b)==='send-message-button'));
    return {e,b:buttons.length===1?buttons[0]:null};
  }
  const panel=document.createElement('div'); panel.id='drafttimer-mobile';
  const root=panel.attachShadow({mode:'open'});
  root.innerHTML=`<style>:host{all:initial;position:fixed;z-index:2147483646;top:calc(env(safe-area-inset-top,0px) + 54px);right:8px;max-width:calc(100vw - 16px);color:#fff;font:13px system-ui,sans-serif} .bar{display:flex;gap:6px;align-items:center;background:#23252c;border:1px solid #545865;border-radius:12px;padding:6px 7px;box-shadow:0 3px 12px #0006} button{font:600 13px system-ui;border:0;background:#4752c4;color:white;border-radius:8px;min-height:34px;padding:6px 10px;touch-action:manipulation} button:disabled{opacity:.5} .read{font-variant-numeric:tabular-nums;min-width:75px} small{display:block;color:#b9beca;font-size:10px;max-width:150px;overflow-wrap:anywhere} .prefs{display:none;background:#23252c;padding:12px;margin-top:5px;border-radius:12px;border:1px solid #545865;width:240px;max-width:calc(100vw - 42px)} .prefs.open{display:block} label{display:block;margin:8px 0 4px} input{font:16px system-ui;box-sizing:border-box;width:100%;padding:7px;color:white;background:#111217;border:1px solid #696d78;border-radius:6px} .actions{display:flex;gap:6px;margin-top:10px;flex-wrap:wrap} p{font-size:11px;color:#c2c5ce;margin:8px 0}</style><div class="bar"><div class="read"><b id="time">DraftTimer</b><small id="status">Off</small></div><button id="toggle" type="button">Start</button><button id="settings" type="button" aria-label="DraftTimer settings">⚙</button></div><div class="prefs" id="prefs"><b>DraftTimer settings</b><label for="chan">Allowed channel ID</label><input id="chan" type="text" inputmode="numeric" autocomplete="off"><label>Interval: <b>61 seconds</b> (fixed)</label><div class="actions"><button id="use" type="button">Use this chat</button><button id="save" type="button">Save</button></div><p>Only the visible configured chat can auto-send. Missed slots are skipped.</p><p id="error" role="status"></p></div>`;
  const $=id=>root.getElementById(id);
  function render(){
    const on=!!clock.id;
    const t=on?Math.max(0,Math.ceil((clock.due-Date.now())/1000)):0;
    $('time').textContent=on?`DraftTimer ${Math.floor(t/60)}:${String(t%60).padStart(2,'0')}`:'DraftTimer';
    $('status').textContent=on&&current()!==clock.id?'Away · no send':status;
    $('toggle').textContent=on?'Stop':'Start'; $('toggle').style.background=on?'#a83b45':'#4752c4';
    $('toggle').disabled=!on&&(!settings.id||current()!==settings.id);
  }
  function stop(msg='Off'){clock.stop();pending=null;status=msg;render();}
  function openPrefs(){ $('chan').value=settings.id;$('error').textContent='';$('prefs').classList.add('open'); }
  $('settings').onclick=()=>{$('prefs').classList.contains('open')?$('prefs').classList.remove('open'):openPrefs();};
  $('use').onclick=()=>{const id=current();if(id){$('chan').value=id;$('error').textContent='Channel selected. Tap Save.';}else $('error').textContent='Open a Discord chat first.';};
  $('save').onclick=()=>{const id=$('chan').value.trim(),n=intervalSeconds;if(!valid(id)){$('error').textContent='Enter a valid channel ID.';return;} stop();settings={id,seconds:n};clock.period=n*1000;try{localStorage.setItem(key,JSON.stringify(settings));}catch(_){$('error').textContent='Saved for this page only; browser storage unavailable.';render();return;}$('prefs').classList.remove('open');status='Ready';render();};
  $('toggle').onclick=()=>{if(clock.id)return stop();if(!settings.id||current()!==settings.id)return; if(!composer()){status='No unique chat composer';return render();}clock.start(settings.id,Date.now());status='Running';render();};
  document.addEventListener('compositionstart',()=>{composing=true;},true);
  document.addEventListener('compositionend',()=>{composing=false;},true);
  function tick(){
    if(!panel.isConnected&&document.body)document.body.append(panel);
    const now=Date.now(), id=current(), showing=!document.hidden;
    const result=clock.tick(id,now,showing);
    if(pending){
      if(id!==pending.id||!showing){stop('Check last send; restart');return;}
      const c=composer();
      if(c && draft(c.e)!==pending.text){pending=null;status='Draft changed/cleared';}
      else if(now>=pending.until){stop('Send unconfirmed; restart');return;}
    }
    if(result==='skip')status='Skipped slot';
    if(result==='send'){
      if(pending||composing||$('prefs').classList.contains('open')) status='Skipped (busy)';
      else {const c=composer(), text=draft(c?.e);
        if(!c||!text)status=c?'Skipped (empty)':'Skipped (no composer)';
        else if(!c.b)status='Skipped (no Send button)';
        else if(current()===clock.id&&!document.hidden&&visible(c.b)&&c.e.closest('form')===c.b.closest('form')&&draft(c.e)===text){
          pending={id,text,until:now+3000};status='Send requested';
          try{c.b.click();}catch(_){stop('Send failed; restart');return;}
        } else status='Skipped (not ready)';
      }
    }
    render();
  }
  document.addEventListener('visibilitychange',tick);
  window.addEventListener('pagehide',()=>stop());
  document.body.append(panel);render();setInterval(tick,250);
})();
