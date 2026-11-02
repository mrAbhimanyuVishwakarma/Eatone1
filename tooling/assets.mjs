import fs from 'node:fs/promises';
const d=JSON.parse(await fs.readFile('research/instagram.json','utf8'));
await fs.mkdir('eat-one/public/images',{recursive:true});
const images=[d.images[0],...d.images.filter(x=>x.alt.startsWith('Video'))];
for(let i=0;i<images.length;i++) {const r=await fetch(images[i].src);if(r.ok)await fs.writeFile(`eat-one/public/images/${i===0?'instagram-logo':`instagram-${i}`}.jpg`,Buffer.from(await r.arrayBuffer()));}
console.log('Downloaded',images.length,'Eat One reference images');
