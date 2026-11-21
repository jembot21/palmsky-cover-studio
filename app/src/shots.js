export async function configureShot(studio) {
  const query=new URLSearchParams(location.search);
  if(!query.has('shot'))return;
  await studio.sample(query.get('photo')==='pier'?'pier':'boulevard');
  const caption=query.get('caption');
  if(caption){studio.design.title=caption.trim().toUpperCase().split(/\s+/).join('\n');document.querySelector('#title').value=studio.design.title;studio.setCaption(caption.toUpperCase()+' / PALMSKY ORIGINALS');}
  studio.setSize('1080x1080');
  if(query.get('shot')==='cover'){
    const exported=await studio.makePng(false,false);
    const image=new Image();image.id='shot-image';image.alt='A full-resolution cover exported by PalmSky';image.src=exported.url;await image.decode();document.body.append(image);document.body.classList.add('art-only');
  }
}
