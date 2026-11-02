import{existsSync,readdirSync}from'node:fs';
import{relative,resolve}from'node:path';
import{ASSET_MANIFEST,ASSET_SIZES}from'../src/data/assetPaths';

const publicRoot=resolve(process.cwd(),'public');const assetsRoot=resolve(publicRoot,'assets');
if(ASSET_MANIFEST.some((entry)=>entry.group.startsWith('Phông nền')&&(entry.size.w!==ASSET_SIZES.background.w||entry.size.h!==ASSET_SIZES.background.h)))throw new Error('Kích thước phông nền trong manifest không đồng nhất.');
const groups=new Map<string,typeof ASSET_MANIFEST>();for(const entry of ASSET_MANIFEST){const list=groups.get(entry.group)??[];list.push(entry);groups.set(entry.group,list);}
const diskPath=(path:string)=>resolve(publicRoot,path.replace(/^\//,''));
let requiredPresent=0,requiredMissing=0,optionalPresent=0,optionalMissing=0,statusMismatch=0;
console.log('KIỂM TRA ẢNH — chỉ đọc, không tạo tệp\n');
for(const[group,entries]of groups){
  const actual=entries.map((entry)=>({entry,exists:existsSync(diskPath(entry.path))}));
  const required=actual.filter(({entry})=>entry.required);const optional=actual.filter(({entry})=>!entry.required);
  const requiredCount=required.filter(({exists})=>exists).length;const optionalCount=optional.filter(({exists})=>exists).length;
  requiredPresent+=requiredCount;requiredMissing+=required.length-requiredCount;optionalPresent+=optionalCount;optionalMissing+=optional.length-optionalCount;
  console.log(`${group}: bắt buộc ${requiredCount}/${required.length} có · tùy chọn ${optionalCount}/${optional.length} có`);
  for(const{entry,exists}of actual){
    if(!exists)console.log(`  ${entry.required?'[THIẾU BẮT BUỘC]':'[thiếu tùy chọn]'} public${entry.path}`);
    if(entry.present!==exists){statusMismatch++;console.log(`  [TRẠNG THÁI DATA LỆCH] ${entry.present?'present':'missing'} nhưng filesystem là ${exists?'present':'missing'}: public${entry.path}`);}
  }
}
const referenced=new Set(ASSET_MANIFEST.map((entry)=>entry.path.replace(/^\/assets\//,'').replaceAll('\\','/')));
const files=existsSync(assetsRoot)?readdirSync(assetsRoot,{recursive:true,withFileTypes:true}).filter((entry)=>entry.isFile()).map((entry)=>relative(assetsRoot,resolve(entry.parentPath,entry.name)).replaceAll('\\','/')).sort():[];
const unused=files.filter((file)=>!referenced.has(file));
console.log('\nKHÔNG ĐƯỢC DATA THAM CHIẾU:');if(unused.length)for(const file of unused)console.log(`  [không dùng] public/assets/${file}`);else console.log('  Không có.');
console.log(`\nTỔNG: bắt buộc ${requiredPresent} có / ${requiredMissing} thiếu · tùy chọn ${optionalPresent} có / ${optionalMissing} thiếu · ${unused.length} không dùng`);
process.exitCode=requiredMissing>0||statusMismatch>0?1:0;
