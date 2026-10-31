import{existsSync}from'node:fs';import{resolve}from'node:path';import{ASSET_MANIFEST,ASSET_SIZES}from'../src/data/assetPaths';
const root=resolve(process.cwd(),'public');
if(ASSET_MANIFEST.some((entry)=>entry.group.startsWith('Phông nền')&&(entry.size.w!==ASSET_SIZES.background.w||entry.size.h!==ASSET_SIZES.background.h)))throw new Error('Kích thước phông nền trong manifest không đồng nhất.');
const groups=new Map<string,typeof ASSET_MANIFEST>();
for(const entry of ASSET_MANIFEST){const list=groups.get(entry.group)??[];list.push(entry);groups.set(entry.group,list);}
let requiredPresent=0,requiredMissing=0,optionalPresent=0,optionalMissing=0;
console.log('KIỂM TRA ẢNH — chỉ đọc, không tạo tệp\n');
for(const[group,entries]of groups){const required=entries.filter((entry)=>entry.required);const optional=entries.filter((entry)=>!entry.required);const file=(entry:(typeof entries)[number])=>resolve(root,entry.path.replace(/^\//,''));const presentRequired=required.filter((entry)=>existsSync(file(entry)));const presentOptional=optional.filter((entry)=>existsSync(file(entry)));requiredPresent+=presentRequired.length;requiredMissing+=required.length-presentRequired.length;optionalPresent+=presentOptional.length;optionalMissing+=optional.length-presentOptional.length;console.log(`${group}: bắt buộc ${presentRequired.length}/${required.length} có · tùy chọn ${presentOptional.length}/${optional.length} có`);for(const entry of entries){const exists=existsSync(file(entry));if(!exists)console.log(`  ${entry.required?'[THIẾU BẮT BUỘC]':'[thiếu tùy chọn]'} public${entry.path}`);}}
console.log(`\nTỔNG: bắt buộc ${requiredPresent} có / ${requiredMissing} thiếu · tùy chọn ${optionalPresent} có / ${optionalMissing} thiếu`);
process.exitCode=requiredMissing>0?1:0;
