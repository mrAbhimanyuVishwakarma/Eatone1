import fs from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
try{await fs.access('.env');console.log('Existing .env preserved.');}catch{const password='EO-'+randomBytes(15).toString('base64url');await fs.writeFile('.env',`PORT=3000\nHOST=127.0.0.1\nNODE_ENV=development\nPAYMENTS_MODE=test\nSITE_ORIGIN=http://localhost:3000\nADMIN_EMAIL=admin@eatone.local\nADMIN_PASSWORD=${password}\n`,{flag:'wx'});console.log('Local .env created with a unique admin password.');}
