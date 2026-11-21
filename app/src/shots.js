export async function prepareShot(studio){
  const request=new URLSearchParams(location.search);
  if(request.has('photo'))await studio.demo(request.get('photo')==='boulevard'?'boulevard':'pier');
  if(request.has('caption')){studio.model.caption=request.get('caption');document.getElementById('caption').value=studio.model.caption;studio.refresh()}
  if(request.get('shot')==='cover'){
    studio.model.size=[1080,1080];studio.refresh();const source=await studio.exportCover(false);const result=new Image();result.id='shotResult';result.alt='Exported PalmSky cover';result.src=source;await result.decode();document.body.classList.add('cover-shot');document.body.append(result);
  }
  window.__PALMSKY_READY__=true;
}
