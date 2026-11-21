const INK = '#080b1a';
export const dimensions = { '1080x1080':[1080,1080], '1080x1350':[1080,1350], '1920x1080':[1920,1080] };
const processed = new WeakMap();

export function panelMap(name) {
  if (name === 'strip') return [ [[0,0],[.37,0],[.33,1],[0,1]], [[.37,0],[.7,0],[.66,.54],[.35,.54]], [[.7,0],[1,0],[1,1],[.66,1]], [[.35,.54],[.66,.54],[.66,1],[.33,1]] ];
  if (name === 'cross') return [ [[0,0],[.62,0],[.62,.64],[0,.57]], [[.62,0],[1,0],[1,.4],[.62,.4]], [[.62,.4],[1,.4],[1,1],[.62,1]], [[0,.57],[.62,.64],[.62,1],[0,1]] ];
  return [ [[0,0],[.7,0],[.58,.66],[0,.75]], [[.7,0],[1,0],[1,.31],[.644,.31]], [[.644,.31],[1,.31],[1,.72],[.58,.66]], [[0,.75],[.58,.66],[1,.72],[1,1],[0,1]] ];
}

export function locatePanel(layout, x, y) {
  return panelMap(layout).findIndex(poly => {
    let inside=false;
    for (let a=0,b=poly.length-1;a<poly.length;b=a++) {
      const [ax,ay]=poly[a], [bx,by]=poly[b];
      if ((ay>y)!==(by>y) && x<(bx-ax)*(y-ay)/(by-ay)+ax) inside=!inside;
    }
    return inside;
  });
}

function inkPhoto(photo, treatment) {
  let variants=processed.get(photo);
  if (!variants) { variants={};processed.set(photo,variants); }
  if (variants[treatment]) return variants[treatment];
  const tile=document.createElement('canvas');
  const factor=Math.min(1,1400/Math.max(photo.naturalWidth,photo.naturalHeight));
  tile.width=Math.round(photo.naturalWidth*factor);tile.height=Math.round(photo.naturalHeight*factor);
  const pen=tile.getContext('2d',{willReadFrequently:true});pen.drawImage(photo,0,0,tile.width,tile.height);
  const pixels=pen.getImageData(0,0,tile.width,tile.height), raw=new Uint8ClampedArray(pixels.data);
  for(let y=0;y<tile.height;y++) for(let x=0;x<tile.width;x++) {
    const k=(y*tile.width+x)*4,r=raw[k],g=raw[k+1],b=raw[k+2];
    const l=(r*.27+g*.55+b*.18)/255;
    const edge=x>0&&y>0?Math.abs(l-(raw[k-4]*.27+raw[k-3]*.55+raw[k-2]*.18)/255):0;
    const shade=Math.max(0,Math.min(1,(l-.06)*1.12));
    const steps=Math.round(shade*12)/12;
    const low=treatment==='mono'?[13,17,34]:treatment==='neon'?[30,4,93]:[20,19,78];
    const high=treatment==='mono'?[255,239,208]:treatment==='neon'?[111,255,221]:[255,221,156];
    for(let c=0;c<3;c++) {
      let value=low[c]+(high[c]-low[c])*steps;
      if(treatment!=='mono') {
        const saturated=(raw[k+c]-l*255)*1.6+l*255;
        value=value*.4+saturated*.6;
        if(treatment==='sunset')value+=[25,-8,8][c];
      }
      if(treatment==='neon'&&c===0) value+=28*(1-shade);
      pixels.data[k+c]=Math.max(0,value-(edge>.13?edge*95:0));
    }
  }
  pen.putImageData(pixels,0,0);variants[treatment]=tile;return tile;
}

function polygon(pen, vertices, width, height) {
  pen.beginPath();vertices.forEach(([x,y],index)=>index?pen.lineTo(x*width,y*height):pen.moveTo(x*width,y*height));pen.closePath();
}

function palm(pen, x, y, scale, lean=1) {
  pen.save();pen.translate(x,y);pen.scale(scale*lean,scale);pen.fillStyle=INK;pen.strokeStyle=INK;
  pen.beginPath();pen.moveTo(-7,0);pen.quadraticCurveTo(12,-70,0,-144);pen.lineTo(6,-144);pen.quadraticCurveTo(30,-60,5,0);pen.fill();
  for(let n=0;n<7;n++) {
    const angle=-Math.PI+n*Math.PI/6;
    const endX=Math.cos(angle)*64,endY=-143+Math.sin(angle)*34+18;
    pen.beginPath();pen.moveTo(3,-143);pen.quadraticCurveTo(endX*.65,-183+(n%2)*20,endX,endY);
    pen.quadraticCurveTo(endX*.55,-150,3,-143);pen.fill();
    pen.lineWidth=1.6;
    for(let j=2;j<8;j++){const t=j/8;pen.beginPath();pen.moveTo(endX*t,-143+(endY+143)*t-20*Math.sin(t*Math.PI));pen.lineTo(endX*t+8,-143+(endY+143)*t-20*Math.sin(t*Math.PI)+13);pen.stroke();}
  }
  pen.restore();
}

function lettering(pen, text, x, y, size, maxWidth, fill='#fff2d9', align='left') {
  pen.save();pen.font=`${size}px Anton`;pen.textAlign=align;pen.lineJoin='round';pen.miterLimit=2;
  const squeeze=Math.min(1,maxWidth/Math.max(1,pen.measureText(text).width));
  pen.translate(x,y);pen.scale(squeeze,1);pen.strokeStyle=INK;pen.lineWidth=size*.12;
  pen.strokeText(text,size*.055,size*.055);pen.fillStyle='#ff2e88';pen.fillText(text,size*.055,size*.055);
  pen.strokeText(text,0,0);pen.fillStyle=fill;pen.fillText(text,0,0);pen.restore();
}

export function paintCover(canvas, design, library) {
  const pen=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  const unit=w/1000,wide=w/h>1.3;
  pen.fillStyle=INK;pen.fillRect(0,0,w,h);
  pen.save();const margin=10*unit;pen.translate(margin,margin);const pw=w-margin*2,ph=h-margin*2;
  const outlines=panelMap(design.layout);
  outlines.forEach((vertices,index)=>{
    const frame=design.panels[index],entry=library[frame.photo%library.length];
    const xs=vertices.map(p=>p[0]*pw),ys=vertices.map(p=>p[1]*ph),left=Math.min(...xs),top=Math.min(...ys),bw=Math.max(...xs)-left,bh=Math.max(...ys)-top;
    pen.save();polygon(pen,vertices,pw,ph);pen.clip();pen.fillStyle='#43335a';pen.fillRect(left,top,bw,bh);
    if(entry?.image){
      const photo=inkPhoto(entry.image,design.grade),ratio=Math.max(bw/photo.width,bh/photo.height)*frame.zoom;
      const dw=photo.width*ratio,dh=photo.height*ratio;
      const ox=Math.max(bw-dw,Math.min(0,(bw-dw)/2+frame.x*bw)),oy=Math.max(bh-dh,Math.min(0,(bh-dh)/2+frame.y*bh));
      pen.drawImage(photo,left+ox,top+oy,dw,dh);
    }
    const wash=pen.createLinearGradient(0,top,0,top+bh);wash.addColorStop(0,design.grade==='neon'?'#5835d42a':design.grade==='mono'?'#ffeed512':'#ff7a1820');wash.addColorStop(.55,'#080b1a00');wash.addColorStop(1,'#0d102635');pen.fillStyle=wash;pen.fillRect(left,top,bw,bh);
    pen.restore();polygon(pen,vertices,pw,ph);pen.strokeStyle=INK;pen.lineWidth=3*unit;pen.stroke();
  });
  pen.restore();
  const fade=pen.createLinearGradient(0,h*.41,0,h);fade.addColorStop(0,'#0d102600');fade.addColorStop(.45,'#16102a18');fade.addColorStop(1,'#130e2dda');pen.fillStyle=fade;pen.fillRect(0,h*.4,w,h*.6);
  const titleX=w*.065,titleY=h*(wide?.64:.70),titleSize=h*(wide?.195:.135);
  pen.save();pen.beginPath();pen.rect(w*.012,h*.46,w*.976,h*.52);pen.clip();pen.globalAlpha=.13;pen.fillStyle=design.grade==='neon'?'#00c2a8':'#ffc53d';
  const cx=w*.28,cy=h*.88;
  for(let ray=0;ray<30;ray++){const a=ray*Math.PI/15;pen.beginPath();pen.moveTo(cx,cy);pen.lineTo(cx+Math.cos(a)*w*1.6,cy+Math.sin(a)*w*1.6);pen.lineTo(cx+Math.cos(a+.035)*w*1.6,cy+Math.sin(a+.035)*w*1.6);pen.closePath();pen.fill();}pen.restore();
  pen.save();pen.globalAlpha=.16;pen.fillStyle=INK;
  for(let y=0;y<h;y+=6*unit)for(let x=(Math.round(y/(6*unit))%2)*3*unit;x<w;x+=6*unit){pen.beginPath();pen.arc(x,y,.65*unit,0,Math.PI*2);pen.fill();}pen.restore();
  let seed=431;pen.save();pen.globalAlpha=.055;
  for(let n=0;n<15000;n++){seed=(seed*16807)%2147483647;const x=seed%w;seed=(seed*16807)%2147483647;const y=seed%h;pen.fillStyle=n%2?'#fff5db':'#000';pen.fillRect(x,y,unit,unit);}pen.restore();
  const vignette=pen.createRadialGradient(w*.5,h*.4,w*.15,w*.5,h*.48,Math.max(w,h)*.73);vignette.addColorStop(0,'#0000');vignette.addColorStop(1,'#03061666');pen.fillStyle=vignette;pen.fillRect(0,0,w,h);
  pen.fillStyle='#ff2e88';pen.fillRect(w*.035+4*unit,h*.032+4*unit,w*(wide?.39:.58),h*.031);pen.fillStyle=INK;pen.fillRect(w*.035,h*.032,w*(wide?.39:.58),h*.031);
  pen.fillStyle='#fff2d9';pen.font=`${h*.017}px Bebas`;pen.textBaseline='middle';pen.fillText((design.caption||'YOUR CITY. YOUR STORY.').toUpperCase(),w*.046,h*.048,w*(wide?.36:.55));
  pen.fillStyle='#fff2d9';pen.font=`${h*.013}px Bebas`;pen.textBaseline='alphabetic';pen.fillText('PALMSKY ORIGINALS   /   A STORY IN FOUR FRAMES',w*.04,h*.091,w*.52);
  pen.save();pen.translate(w*.87,h*.1);pen.rotate(.13);pen.beginPath();
  for(let n=0;n<24;n++){const a=-Math.PI/2+n*Math.PI/12,r=(n%2?.042:.054)*Math.min(w,h);n?pen.lineTo(Math.cos(a)*r,Math.sin(a)*r):pen.moveTo(Math.cos(a)*r,Math.sin(a)*r);}pen.closePath();pen.fillStyle='#ffc53d';pen.strokeStyle=INK;pen.lineWidth=3*unit;pen.fill();pen.stroke();pen.textAlign='center';pen.fillStyle=INK;pen.font=`${Math.min(w,h)*.018}px Bebas`;pen.fillText('VOL. 01',0,0);pen.font=`${Math.min(w,h)*.009}px Bebas`;pen.fillText('AFTER DARK',0,Math.min(w,h)*.014);pen.restore();
  pen.save();pen.translate(w*.95,h*.81);palm(pen,0,h*.15,h*.00155,-1);palm(pen,-w*.08,h*.15,h*.0011,1);pen.restore();
  const lines=design.title.toUpperCase().split('\n').filter(Boolean).slice(0,2);
  if(!lines.length)lines.push('YOUR','STORY');
  const max=wide?w*.68:w*.90;
  lines.forEach((line,i)=>lettering(pen,line,titleX,titleY+i*titleSize*1.06,titleSize,max,i===1&&design.grade==='neon'?'#9cffe0':'#fff1d6'));
  const lastY=titleY+(lines.length-1)*titleSize*1.06;
  pen.save();pen.translate(w*(wide?.41:.38),lastY+titleSize*.31);pen.rotate(-.065);pen.font=`${h*(wide?.043:.034)}px Pacifico`;pen.lineWidth=4*unit;pen.strokeStyle=INK;pen.strokeText(design.subtitle,0,0,w*.54);pen.fillStyle=design.grade==='neon'?'#00e7ca':'#ffbf52';pen.fillText(design.subtitle,0,0,w*.54);pen.restore();
  pen.fillStyle=INK;pen.fillRect(0,h*.956,w,h*.044);pen.fillStyle='#f3ddbf';pen.font=`${h*.014}px Bebas`;pen.fillText('SUNSET DISTRICT  /  25°46′ N 80°11′ W',w*.035,h*.982);pen.textAlign='right';pen.fillText('INDEPENDENT EDITION     ★ ★ ★ ★ ★',w*.964,h*.982);pen.textAlign='left';
  pen.strokeStyle=INK;pen.lineWidth=12*unit;pen.strokeRect(0,0,w,h);
  return canvas;
}
