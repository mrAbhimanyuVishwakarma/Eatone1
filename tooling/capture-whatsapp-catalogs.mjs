import {chromium} from 'file:///D:/Projects/rea/node_modules/playwright-core/index.mjs';
import fs from 'node:fs/promises';
const executablePath=process.env.CHROME_PATH||'C:/Users/abhim/AppData/Local/ms-playwright/chromium-1200/chrome-win64/chrome.exe';
await fs.mkdir('research/whatsapp',{recursive:true});
const browser=await chromium.launch({headless:true,executablePath});
for(const [name,url] of [['us','https://wa.me/c/180178944794696'],['india','https://wa.me/c/918618401072']]){
 const page=await browser.newPage({viewport:{width:1440,height:1000},locale:'en-IN'});
 const responses=[];page.on('response',async r=>{const type=r.headers()['content-type']||'';if(type.includes('json')){try{const body=await r.text();if(body.length<2_000_000)responses.push({url:r.url(),status:r.status(),body});}catch{}}});
 try{await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});await page.waitForTimeout(5000);const links=await page.locator('a').evaluateAll(as=>as.map(a=>({text:a.innerText,href:a.href})).filter(x=>x.text||x.href));console.log(name,'links',links.filter(x=>/WhatsApp Web|catalog|web\.whatsapp/i.test(x.text+' '+x.href)).slice(0,10));const webLink=page.getByRole('link',{name:'Continue to WhatsApp Web'}).first();if(await webLink.count()){await webLink.click();await page.waitForTimeout(10000);}await page.screenshot({path:`research/whatsapp/${name}.png`,fullPage:true});const data=await page.evaluate(()=>({url:location.href,title:document.title,text:document.body.innerText,html:document.documentElement.outerHTML,images:[...document.images].map(i=>({src:i.currentSrc||i.src,alt:i.alt,width:i.naturalWidth,height:i.naturalHeight}))}));await fs.writeFile(`research/whatsapp/${name}.json`,JSON.stringify({...data,links,responses},null,2));console.log(name,data.url,data.title,data.text.slice(0,3000));}catch(e){console.error(name,e.message)}finally{await page.close()}
}
await browser.close();
