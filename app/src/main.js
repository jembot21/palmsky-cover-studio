import { paintCover, dimensions, locatePanel } from './cover.js';
import { configureShot } from './shots.js';

const $=selector=>document.querySelector(selector);
const canvas=$('#preview');
const library=[];
const design={title:'AFTER\nHOURS',caption:'NO RULES. JUST HORIZONS.',subtitle:'Paradise has a price',layout:'vice',grade:'sunset',size:'1080x1350',panels:[{photo:0,zoom:1,x:0,y:.6},{photo:0,zoom:2.5,x:.65,y:.65},{photo:0,zoom:2,x:.65,y:-.9},{photo:1,zoom:2.4,x:-.8,y:-.6}]};
let selected=0,drag=null,latestUrl='',latestName='';
// Keep a keyboard path to crop positioning alongside direct manipulation.
canvas.tabIndex=0;
canvas.addEventListener('keydown',event=>{
  const direction={ArrowLeft:[-.035,0],ArrowRight:[.035,0],ArrowUp:[0,-.035],ArrowDown:[0,.035]}[event.key];
  if(!direction)return;
  event.preventDefault();const frame=design.panels[selected];frame.x+=direction[0];frame.y+=direction[1];repaint();
  notice(`Panel ${selected+1} repositioned. Arrow keys move the crop.`);
});
function notice(message){$('#status').textContent=message;}
function repaint(){const [w,h]=dimensions[design.size];if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}paintCover(canvas,design,library);$('#canvas-meta').textContent=`${w===h?'SQUARE':w>h?'WIDE':'PORTRAIT'} / ${w} × ${h}`;}
function syncPanel(){ $('#panel-select').value=selected;$('#zoom').value=design.panels[selected].zoom;document.querySelectorAll('.photo-thumb').forEach((button,i)=>button.classList.toggle('active',i===design.panels[selected].photo)); }
function redrawTray(){const tray=$('#photo-tray');tray.replaceChildren();library.forEach((entry,index)=>{const button=document.createElement('button');button.className='photo-thumb';button.title=`Use ${entry.name} in panel ${selected+1}`;button.setAttribute('aria-label',`Assign ${entry.name} to selected panel`);const picture=document.createElement('img');picture.src=entry.image.src;picture.alt=entry.name;const number=document.createElement('span');number.textContent=String(index+1).padStart(2,'0');button.append(picture,number);button.onclick=()=>{design.panels[selected]={photo:index,zoom:1,x:0,y:0};syncPanel();repaint();notice(`Photo assigned to panel ${selected+1}.`);};tray.append(button);});$('#photo-count').textContent=`${library.length} LOADED`;syncPanel();}
async function loadPicture(source,name){const image=new Image();image.src=source;await image.decode();library.push({image,name});return library.length-1;}
async function sample(name){
  const index=name==='pier'?1:0;
  const framing=index===0?[[1,0,.6],[2.5,.65,.65],[2,.65,-.9],[2.4,-.8,-.6]]:[[1,0,.6],[2.5,-.8,.65],[2,-.8,-.3],[2.4,.7,-.8]];
  design.panels.forEach((p,i)=>Object.assign(p,{photo:i===3?1-index:index,zoom:framing[i][0],x:framing[i][1],y:framing[i][2]}));
  design.title=index===1?'SUNSET\nHEIST':'AFTER\nHOURS';design.subtitle=index===1?'Catch of a lifetime':'Paradise has a price';$('#title').value=design.title;$('#subtitle').value=design.subtitle;syncPanel();repaint();notice(`${index===1?'Pier':'Boulevard'} demo loaded. Make it yours.`);
}
$('#photo-files').addEventListener('change',async event=>{const files=[...event.target.files];let count=0;for(const file of files){const url=URL.createObjectURL(file);try{const index=await loadPicture(url,file.name);design.panels[(selected+count)%4]={photo:index,zoom:1,x:0,y:0};count++;}catch{URL.revokeObjectURL(url);notice(`Could not open ${file.name}. Try a JPG, PNG or WebP.`);}}if(count){if(count===1)design.panels.forEach(p=>Object.assign(p,{photo:library.length-1,zoom:1,x:0,y:0}));redrawTray();repaint();notice(`${count} photo${count>1?'s':''} added. Drag to find your angle.`);}event.target.value='';});
$('#demo-boulevard').onclick=()=>sample('boulevard');$('#demo-pier').onclick=()=>sample('pier');
for(const key of ['title','caption','subtitle'])$('#'+key).addEventListener('input',event=>{design[key]=event.target.value;repaint();});
$('#panel-select').onchange=event=>{selected=Number(event.target.value);syncPanel();notice(`Panel ${selected+1} selected. Choose a photo or drag to reframe.`);};
$('#zoom').oninput=event=>{design.panels[selected].zoom=Number(event.target.value);repaint();};
$('#reset-crop').onclick=()=>{Object.assign(design.panels[selected],{zoom:1,x:0,y:0});syncPanel();repaint();};
for(const type of ['layout','grade'])document.querySelectorAll(`[data-${type}]`).forEach(button=>button.onclick=()=>{design[type]=button.dataset[type];document.querySelectorAll(`[data-${type}]`).forEach(item=>{item.classList.toggle('active',item===button);item.setAttribute('aria-pressed',item===button?'true':'false');});repaint();});
$('#size').onchange=event=>{design.size=event.target.value;repaint();};
canvas.addEventListener('pointerdown',event=>{const box=canvas.getBoundingClientRect(),x=(event.clientX-box.left)/box.width,y=(event.clientY-box.top)/box.height;const hit=locatePanel(design.layout,x,y);if(hit>=0){selected=hit;syncPanel();drag={x:event.clientX,y:event.clientY,px:design.panels[hit].x,py:design.panels[hit].y,width:box.width,height:box.height};canvas.setPointerCapture(event.pointerId);notice(`Reframing panel ${hit+1} · use Zoom for a closer crop.`);}});
canvas.addEventListener('pointermove',event=>{if(!drag)return;const p=design.panels[selected];p.x=drag.px+(event.clientX-drag.x)/drag.width*1.8;p.y=drag.py+(event.clientY-drag.y)/drag.height*1.8;repaint();});
for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>drag=null);
function saveLatest(){const link=document.createElement('a');link.href=latestUrl;link.download=latestName;link.click();}
async function makePng(download=true,show=true){await document.fonts.ready;const output=document.createElement('canvas');[output.width,output.height]=dimensions[design.size];paintCover(output,design,library);const blob=await new Promise(resolve=>output.toBlob(resolve,'image/png'));if(!blob)throw new Error('The browser could not encode this cover.');if(latestUrl)URL.revokeObjectURL(latestUrl);latestUrl=URL.createObjectURL(blob);latestName=`palmsky-${design.title.toLowerCase().replace(/[^a-z0-9]+/g,'-')}-${design.size}.png`;$('#finished-cover').src=latestUrl;$('#export-description').textContent=`${output.width} × ${output.height} PNG · Full resolution · Made with PalmSky`;if(download)saveLatest();if(show&&!$('#artwork-dialog').open)$('#artwork-dialog').showModal();notice(`Exported ${output.width} × ${output.height}. Your city, ready to share.`);return {blob,url:latestUrl,width:output.width,height:output.height};}
$('#export').onclick=async()=>{const button=$('#export');button.disabled=true;try{await makePng();}catch(error){notice(error.message);}finally{button.disabled=false;}};
$('#inspect').onclick=()=>makePng(false,true);$('#close-artwork').onclick=()=>$('#artwork-dialog').close();$('#save-again').onclick=saveLatest;
await Promise.all([document.fonts.load('20px Anton'),document.fonts.load('20px Bebas'),document.fonts.load('20px Pacifico')]);
await loadPicture('./samples/boulevard.jpg','Boulevard');await loadPicture('./samples/pier.jpg','Pier');redrawTray();repaint();
const studio={design,library,repaint,sample,makePng,setSize(value){if(!dimensions[value])return;design.size=value;$('#size').value=value;repaint();},setCaption(value){design.caption=value;$('#caption').value=value;repaint();}};
window.palmSky=studio;
await configureShot(studio);
document.documentElement.dataset.ready='true';
