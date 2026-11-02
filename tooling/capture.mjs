import { chromium } from 'file:///D:/Projects/rea/node_modules/playwright-core/index.mjs';
import fs from 'node:fs/promises';
const browser = await chromium.launch({headless:true,executablePath:'C:/Users/abhim/AppData/Local/ms-playwright/chromium-1200/chrome-win64/chrome.exe'});
for (const [name,url] of [['chaknow','https://chaknow.com/'],['anand','https://www.anandsweets.in/'],['instagram','https://www.instagram.com/eat.one1/']]) {
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 try {
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000}); await page.waitForTimeout(4000);
 await page.screenshot({path:`research/${name}-desktop.png`,fullPage:true});
 const data=await page.evaluate(()=>({title:document.title,text:document.body.innerText,images:[...document.images].map(i=>({src:i.currentSrc||i.src,alt:i.alt})),videos:[...document.querySelectorAll('video')].map(v=>({src:v.currentSrc,poster:v.poster})),fonts:[...document.fonts].map(f=>({family:f.family,weight:f.weight})),colors:[...new Set([...document.querySelectorAll('body,header,section,h1,h2,a,button')].map(e=>getComputedStyle(e).backgroundColor))],meta:[...document.querySelectorAll('meta[property],meta[name="description"]')].map(m=>({name:m.getAttribute('property')||m.name,content:m.content}))}));
 await fs.writeFile(`research/${name}.json`,JSON.stringify(data,null,2));
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:`research/${name}-mobile.png`,fullPage:true});
 console.log(name,data.title,data.text.slice(0,name==='instagram'?5500:700));
 }catch(e){console.log(name,e.message)}finally{await page.close()}
}
await browser.close();
