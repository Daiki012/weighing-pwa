import {atomicWeight, periodicElements} from './elements.js';
import {calculate, number, removeComponent, formatMass} from './calculator.js';
const $ = id => document.getElementById(id);
const key = 'weighting-pwa-state-v1';
let state = {components: [{id:'gd',element:'Gd',ratioText:'1'},{id:'ru',element:'Ru',ratioText:'2'},{id:'si',element:'Si',ratioText:'2'}],fixedId:'gd',fixedMassText:'1.00000'};
try {
  const stored = JSON.parse(localStorage.getItem(key));
  if (stored && Array.isArray(stored.components) && stored.components.every(c => typeof c.id === 'string' && Object.hasOwn(atomicWeight,c.element) && typeof c.ratioText === 'string') && new Set(stored.components.map(c => c.id)).size === stored.components.length && typeof stored.fixedMassText === 'string' && (stored.components.length === 0 || stored.components.some(c => c.id === stored.fixedId))) state = stored;
} catch { $('storage-status').textContent = '前回の入力を読み込めませんでした。'; }
function save() { try { localStorage.setItem(key,JSON.stringify(state)); } catch { $('storage-status').textContent = '入力を保存できません。この画面では計算できます。'; } }
function updateResults() {
  const result = calculate(state);
  $('error').hidden = !result.error;
  $('error').textContent = result.error;
  $('total').textContent = formatMass(result.total);
  $('fixed-mass').setAttribute('aria-invalid', String(!Number.isFinite(number(state.fixedMassText)) || number(state.fixedMassText)<=0));
  [...$('rows').children].forEach((row,i) => {
    row.querySelector('output').textContent = formatMass(result.masses[i]);
    const c = state.components[i], r = number(c.ratioText);
    row.querySelector('input').setAttribute('aria-invalid',String(!Number.isFinite(r) || r<0 || (c.id===state.fixedId && r===0)));
  });
  save();
}
function render() {
  $('reference').replaceChildren(); $('rows').replaceChildren();
  $('fixed-mass').value = state.fixedMassText;
  state.components.forEach((c,i) => {
    const option = new Option(`${i+1}. ${c.element}`,c.id); $('reference').add(option);
    const row = document.createElement('div'); row.className='component';
    const elementLabel=document.createElement('label'); elementLabel.textContent='元素';
    const button=document.createElement('button'); button.className='element-button'; button.textContent=`${c.element} ▾`; button.setAttribute('aria-label',`${i+1}行目の元素 ${c.element} を変更`);
    button.onclick=()=>openPicker(c.id); elementLabel.append(button);
    const ratioLabel=document.createElement('label'); ratioLabel.textContent='モル比';
    const input=document.createElement('input'); input.type='text';input.inputMode='decimal';input.autocomplete='off';input.spellcheck=false;input.value=c.ratioText;input.setAttribute('aria-label',`${i+1}行目 ${c.element} のモル比`);
    input.oninput=()=>{c.ratioText=input.value;updateResults();};ratioLabel.append(input);
    const massLabel=document.createElement('div');massLabel.className='mass-label';
    const label=document.createElement('span');label.textContent='質量 (g)';label.style.fontSize='14px';
    const output=document.createElement('output');output.className='mass';output.setAttribute('aria-label',`${c.element} の質量`);massLabel.append(label,output);
    const remove=document.createElement('button');remove.className='remove';remove.textContent='×';remove.setAttribute('aria-label',`${i+1}行目 ${c.element} を削除`);
    remove.onclick=()=>{state=removeComponent(state,c.id);render();$('add').focus();};
    row.append(elementLabel,ratioLabel,massLabel,remove);$('rows').append(row);
  });
  $('reference').value=state.fixedId;$('reference').disabled=!state.components.length;updateResults();
}
$('fixed-mass').oninput=()=>{state.fixedMassText=$('fixed-mass').value;updateResults();};
$('reference').onchange=()=>{state.fixedId=$('reference').value;updateResults();};
$('add').onclick=()=>{const id=crypto.randomUUID();state.components.push({id,element:'Ac',ratioText:'2'});if(!state.fixedId)state.fixedId=id;render();$('rows').lastChild.querySelector('button').focus();};
let selectingId;
function openPicker(id){
  selectingId=id;
  const selected=state.components.find(c=>c.id===id).element;
  for(const tile of $('periodic-table').children)tile.setAttribute('aria-pressed',String(tile.dataset.symbol===selected));
  $('picker').showModal();
  const tile=[...$('periodic-table').children].find(t=>t.dataset.symbol===selected);
  tile.focus();tile.scrollIntoView({block:'nearest',inline:'center'});
}
for(const e of periodicElements){
  const tile=document.createElement('button');tile.className='tile';tile.textContent=e.symbol;tile.dataset.symbol=e.symbol;tile.style.gridRow=e.row;tile.style.gridColumn=e.column;tile.title=`${e.symbol} · ${atomicWeight[e.symbol]}`;
  tile.onclick=()=>{const c=state.components.find(c=>c.id===selectingId);if(c)c.element=e.symbol;$('picker').close();render();const i=state.components.findIndex(c=>c.id===selectingId);$('rows').children[i]?.querySelector('button').focus();};
  $('periodic-table').append(tile);
}
$('close-picker').onclick=()=>$('picker').close();
render();
async function setupOffline(){
  if(!('serviceWorker' in navigator) || !window.isSecureContext){$('offline-status').textContent='オフライン利用にはHTTPSで公開してください。';return;}
  try{
    const reg=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});
    let reloading=false;
    navigator.serviceWorker.addEventListener('controllerchange',()=>{if(reloading)location.reload();});
    function offerUpdate(){if(reg.waiting&&navigator.serviceWorker.controller){$('update').hidden=false;$('update').onclick=()=>{save();reloading=true;reg.waiting.postMessage({type:'SKIP_WAITING'});};}}
    offerUpdate();reg.addEventListener('updatefound',()=>{const worker=reg.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed')offerUpdate();});});
    await navigator.serviceWorker.ready;
    $('offline-status').textContent='オフラインで利用できます';
  }catch{$('offline-status').textContent='オフライン保存に失敗しました。オンラインで開き直してください。';}
}
setupOffline();
