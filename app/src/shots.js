export async function prepareShots(studio){
  const query=new URLSearchParams(location.search);
  if(!query.has('shot'))return;
  const photo=query.get('photo')==='pier'?1:0;
  studio.model.panels.forEach((panel,i)=>{panel.photo=i%2?1-photo:photo});
  if(query.get('caption')){studio.model.title=query.get('caption');document.getElementById('title').value=studio.model.title}
  if(photo===0){studio.model.grade='neon';studio.model.subtitle='Own the night';studio.model.caption='THE CITY IS YOURS. TAKE THE SCENIC ROUTE.'}
  if(query.get('shot')==='cover'){studio.setSize('1080x1080');document.body.classList.add('shot-cover')}
  await document.fonts.ready;studio.render();
}
