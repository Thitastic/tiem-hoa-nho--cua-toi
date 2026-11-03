import type { CatalogFamily } from '../src/core/types.js';
import { PLAYER_LEVEL_CAP } from '../src/data/levels.js';

const slug=/^[a-z][a-z0-9_]{2,31}$/;
const reserved=new Set(['admin','api','default','rose','uploads','assets']);
const rarities=new Set(['common','rare','epic','legendary']);
export class InputError extends Error { statusCode=400; }
const fail=(message:string):never=>{throw new InputError(message);};

export function validateFamily(input:unknown,editing=false,builtin=false):CatalogFamily {
  if(!input||typeof input!=='object') fail('Dữ liệu loài hoa không hợp lệ.');
  const x=input as Record<string,unknown>; const id=String(x.id??'');
  if(!slug.test(id)||(!editing&&reserved.has(id))) fail('ID loài hoa không hợp lệ hoặc đã được dành riêng.');
  const positive=(key:string,min=0)=>{const n=Number(x[key]);if(!Number.isFinite(n)||n<min)fail(`${key} không hợp lệ.`);return n;};
  const name=String(x.name??'').trim();if(!name)fail('Tên tiếng Việt là bắt buộc.');
  const unlockLevel=positive('unlockLevel',1); if(!Number.isInteger(unlockLevel)||unlockLevel>PLAYER_LEVEL_CAP) fail('Cấp mở khóa vượt quá giới hạn.');
  const chance=positive('baseMutationChance'); if(chance>1) fail('Tỷ lệ đột biến phải từ 0 đến 1.');
  const stages=(x.stageThresholds as unknown[])?.map(Number); if(!Array.isArray(stages)||stages.length!==5||stages.some((v,i)=>!Number.isFinite(v)||v<0||v>1||(i>0&&v<stages[i-1]))) fail('Ngưỡng giai đoạn không hợp lệ.');
  const variants=Array.isArray(x.variants)?x.variants:fail('Cần ít nhất một biến thể.');
  if(!variants.length) fail('Cần ít nhất một biến thể.');
  const keys=new Set<string>(); let bases=0; let nonBase=0; let positiveWeight=0;
  const normalized=variants.map((raw,i)=>{
    const v=raw as Record<string,unknown>; const key=String(v.key??'');
    if(!slug.test(key)||keys.has(key)) fail('Key biến thể không hợp lệ hoặc bị trùng.'); keys.add(key);
    const variantName=String(v.name??'').trim();if(!variantName)fail('Tên biến thể là bắt buộc.');
    const isBase=Boolean(v.isBase); if(isBase)bases++;else nonBase++;
    const weight=Number(v.mutationWeight); if(!Number.isFinite(weight)||weight<0)fail('Trọng số đột biến không hợp lệ.'); if(!isBase&&weight>0)positiveWeight++;
    const rarityId=String(v.rarityId??''); if(!rarities.has(rarityId))fail('Độ hiếm không hợp lệ.');
    const y=(v.yield??{}) as Record<string,unknown>; const count=Number(y.count), unitPrice=Number(y.unitPrice);
    if(!Number.isInteger(count)||count<1||!Number.isFinite(unitPrice)||unitPrice<1)fail('Sản lượng hoặc giá bán không hợp lệ.');
    return {key,id:`${id}.${key}`,name:variantName,nameEn:String(v.nameEn??'').trim()||undefined,rarityId,isBase,mutationWeight:weight,yield:{count,unitPrice},images:{stages:{},...(v.images as object||{})},sortOrder:i};
  });
  if(bases!==1) fail('Mỗi loài phải có đúng một biến thể gốc.');
  if(nonBase>0&&positiveWeight===0) fail('Cần ít nhất một trọng số đột biến dương.');
  const tags=Array.isArray(x.tags)?x.tags.map(String):[];
  const reveal=positive('revealVariantFromStage');if(!Number.isInteger(reveal)||reveal>4)fail('Giai đoạn hiện biến thể không hợp lệ.');
  const baseSeedPrice=positive('baseSeedPrice',1);if(!Number.isInteger(baseSeedPrice))fail('Giá hạt phải là số nguyên.');
  return {id,name,nameEn:String(x.nameEn??'').trim()||undefined,unlockLevel,baseSeedPrice,seed2StarPriceMult:positive('seed2StarPriceMult',0.01),growTimeSec:positive('growTimeSec',1),wateringIntervalSec:positive('wateringIntervalSec',1),baseMutationChance:chance,stageThresholds:stages as [number,number,number,number,number],revealVariantFromStage:reveal,growthPausesWhenDry:x.growthPausesWhenDry!==false,tags,archived:Boolean(x.archived),builtin,images:{shared:{}},variants:normalized};
}

export const familySlots=new Set(['stage0','stage1','seed1','seed2','seed3']);
export const variantSlots=new Set(['stage2','stage3','stage4','stem']);
