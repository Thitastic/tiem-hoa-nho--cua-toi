import { cpSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const target=resolve('dist-server','server','migrations');
mkdirSync(target,{recursive:true});
cpSync(resolve('server','migrations'),target,{recursive:true});
