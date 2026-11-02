import fs from 'node:fs/promises';
await fs.mkdir('eat-one/public/fonts',{recursive:true});
let css=await fs.readFile('research/fonts.css','utf8');let i=0;
for(const match of [...css.matchAll(/https:\/\/fonts\.gstatic\.com\/[^)]+/g)]){const name=`font-${++i}.ttf`;const response=await fetch(match[0]);if(!response.ok)throw new Error('Font download failed');await fs.writeFile('eat-one/public/fonts/'+name,Buffer.from(await response.arrayBuffer()));css=css.replace(match[0],'/fonts/'+name);}
await fs.writeFile('eat-one/src/fonts.css',css);console.log('Self-hosted',i,'font files');
