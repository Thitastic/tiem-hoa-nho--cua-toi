import Fastify, { type FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { imageSize } from 'image-size';
import type { CatalogFamily } from '../src/core/types.js';
import { audit, bumpCatalog, openDatabase, seedBuiltinRose, type CatalogDb } from './database.js';
import { catalogFromDatabase } from './catalog.js';
import { familySlots, InputError, validateFamily, variantSlots } from './validation.js';
import { loadConfig, type ServerConfig } from './config.js';

export interface ServerOptions { config?:ServerConfig; db?:CatalogDb; databaseFile?:string; logger?:boolean }
interface Session { csrf:string;expires:number }
const sessions=new Map<string,Session>();
const hash=(value:string)=>createHash('sha256').update(value).digest();
const safeEqual=(a:string,b:string)=>timingSafeEqual(hash(a),hash(b));

export async function buildServer(options:ServerOptions={}):Promise<FastifyInstance> {
  const config=options.config??loadConfig(); mkdirSync(config.dataDir,{recursive:true}); mkdirSync(config.uploadDir,{recursive:true});
  const db=options.db??openDatabase(options.databaseFile??resolve(config.dataDir,'catalog.sqlite')); seedBuiltinRose(db);
  const app=Fastify({logger:options.logger??false,bodyLimit:2_200_000});
  await app.register(cookie); await app.register(rateLimit,{global:false});
  await app.register(multipart,{limits:{fileSize:2*1024*1024,files:1,fields:4}});
  await app.register(fastifyStatic,{root:config.uploadDir,prefix:'/uploads/',decorateReply:false,maxAge:'365d',immutable:true,list:false});

  app.addHook('onRequest',async(req,reply)=>{
    reply.header('X-Content-Type-Options','nosniff').header('X-Frame-Options','DENY');
    if(req.url.startsWith('/admin')) reply.header('Content-Security-Policy',"default-src 'self'; img-src 'self' blob: data:; style-src 'self' 'unsafe-inline'; script-src 'self'");
    const origin=req.headers.origin;
    if(origin&&origin===config.allowedOrigin) reply.header('Access-Control-Allow-Origin',origin).header('Vary','Origin');
  });
  app.options('/api/*',async(_req,reply)=>reply.header('Access-Control-Allow-Methods','GET,POST,PUT,DELETE,OPTIONS').header('Access-Control-Allow-Headers','Content-Type,X-CSRF-Token').code(204).send());
  app.get('/api/health',async()=>({ok:true}));
  app.get('/api/catalog',async(req,reply)=>{
    const payload=catalogFromDatabase(db,config.allowedOrigin.replace(/\/$/,'')); const etag=`W/\"catalog-${payload.version}\"`;
    reply.header('ETag',etag).header('Cache-Control','no-cache'); if(req.headers['if-none-match']===etag)return reply.code(304).send(); return payload;
  });

  const requireAdmin=async(req:any,reply:any)=>{
    if(!config.adminEnabled)return reply.code(404).send({error:'Không tìm thấy.'});
    const id=req.cookies.admin_session; const session=id?sessions.get(id):undefined;
    if(!session||session.expires<Date.now()){if(id)sessions.delete(id);return reply.code(401).send({error:'Chưa đăng nhập.'});}
    if(['POST','PUT','DELETE','PATCH'].includes(req.method)){
      const origin=req.headers.origin; if(origin&&origin!==config.allowedOrigin)return reply.code(403).send({error:'Nguồn yêu cầu không hợp lệ.'});
      if(req.headers['x-csrf-token']!==session.csrf)return reply.code(403).send({error:'Mã CSRF không hợp lệ.'});
    }
  };
  const adminRoute=(method:'GET'|'POST'|'PUT'|'DELETE',url:string,handler:any,rate=60)=>app.route({method,url,preHandler:requireAdmin,config:{rateLimit:{max:rate,timeWindow:'1 minute'}},handler});

  app.post('/api/admin/login',{config:{rateLimit:{max:5,timeWindow:'1 minute'}}},async(req,reply)=>{
    if(!config.adminEnabled)return reply.code(404).send({error:'Không tìm thấy.'});
    const token=String((req.body as {token?:unknown})?.token??'');
    if(!safeEqual(token,config.adminToken))return reply.code(401).send({error:'Mã quản trị không đúng.'});
    const id=randomBytes(24).toString('base64url'),csrf=randomBytes(18).toString('base64url'); sessions.set(id,{csrf,expires:Date.now()+8*60*60*1000});
    reply.setCookie('admin_session',id,{httpOnly:true,sameSite:'strict',secure:config.production,path:'/',maxAge:8*60*60}); return {ok:true,csrf};
  });
  adminRoute('POST','/api/admin/logout',async(req:any,reply:any)=>{const id=req.cookies.admin_session;if(id)sessions.delete(id);reply.clearCookie('admin_session',{path:'/'});return{ok:true};});
  adminRoute('GET','/api/admin/families',async()=>catalogFromDatabase(db,config.allowedOrigin.replace(/\/$/,'')).families);
  adminRoute('GET','/api/admin/families/:id',async(req:any,reply:any)=>{
    const family=catalogFromDatabase(db,config.allowedOrigin.replace(/\/$/,'')).families.find((f)=>f.id===req.params.id);
    return family??reply.code(404).send({error:'Không tìm thấy loài hoa.'});
  });

  const writeFamily=(input:unknown,editingId?:string)=>{
    const current=editingId?db.prepare('SELECT * FROM families WHERE id=?').get(editingId) as Record<string,unknown>|undefined:undefined;
    if(editingId&&!current)throw new InputError('Không tìm thấy loài hoa.');
    const family=validateFamily(input,Boolean(editingId),Boolean(current?.builtin));
    if(editingId&&family.id!==editingId)throw new InputError('Không thể đổi ID loài hoa.');
    if(current?.builtin){
      const protectedPairs:[string,number][]=[['baseSeedPrice',Number(current.base_seed_price)],['seed2StarPriceMult',Number(current.seed2_price_mult)],['growTimeSec',Number(current.grow_time_sec)],['wateringIntervalSec',Number(current.watering_interval_sec)],['baseMutationChance',Number(current.base_mutation_chance)],['revealVariantFromStage',Number(current.reveal_variant_from_stage)]];
      const oldVariants=db.prepare('SELECT id,rarity_id,mutation_weight,yield_count,yield_unit_price,is_base FROM variants WHERE family_id=? AND archived=0 ORDER BY sort_order,id').all(family.id) as Record<string,unknown>[];
      const variantsChanged=oldVariants.length!==family.variants.length||family.variants.some((v,i)=>{const old=oldVariants[i];return!old||old.id!==v.id||old.rarity_id!==v.rarityId||Number(old.mutation_weight)!==v.mutationWeight||Number(old.yield_count)!==v.yield.count||Number(old.yield_unit_price)!==v.yield.unitPrice||Boolean(old.is_base)!==v.isBase;});
      if(protectedPairs.some(([key,value])=>Number((family as any)[key])!==value)||JSON.stringify(family.stageThresholds)!==String(current.stage_thresholds)||family.growthPausesWhenDry!==Boolean(current.growth_pauses_when_dry)||variantsChanged)throw new InputError('Không thể sửa cân bằng của loài hoa có sẵn.');
    }
    const now=Date.now();
    db.transaction(()=>{
      if(current) db.prepare(`UPDATE families SET name=?,name_en=?,unlock_level=?,base_seed_price=?,seed2_price_mult=?,grow_time_sec=?,watering_interval_sec=?,base_mutation_chance=?,stage_thresholds=?,reveal_variant_from_stage=?,growth_pauses_when_dry=?,tags=?,updated_at=? WHERE id=?`).run(family.name,family.nameEn??null,family.unlockLevel,family.baseSeedPrice,family.seed2StarPriceMult,family.growTimeSec,family.wateringIntervalSec,family.baseMutationChance,JSON.stringify(family.stageThresholds),family.revealVariantFromStage,family.growthPausesWhenDry?1:0,JSON.stringify(family.tags),now,family.id);
      else db.prepare(`INSERT INTO families(id,name,name_en,unlock_level,base_seed_price,seed2_price_mult,grow_time_sec,watering_interval_sec,base_mutation_chance,stage_thresholds,reveal_variant_from_stage,growth_pauses_when_dry,tags,archived,builtin,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,0,0,?,?)`).run(family.id,family.name,family.nameEn??null,family.unlockLevel,family.baseSeedPrice,family.seed2StarPriceMult,family.growTimeSec,family.wateringIntervalSec,family.baseMutationChance,JSON.stringify(family.stageThresholds),family.revealVariantFromStage,family.growthPausesWhenDry?1:0,JSON.stringify(family.tags),now,now);
      const keep=new Set(family.variants.map((v)=>v.id));
      if(current) for(const row of db.prepare('SELECT id FROM variants WHERE family_id=?').all(family.id) as {id:string}[]) if(!keep.has(row.id))db.prepare('UPDATE variants SET archived=1 WHERE id=?').run(row.id);
      family.variants.forEach((v,i)=>db.prepare(`INSERT INTO variants(id,family_id,key,name,name_en,rarity_id,is_base,mutation_weight,yield_count,yield_unit_price,sort_order,archived) VALUES(?,?,?,?,?,?,?,?,?,?,?,0) ON CONFLICT(id) DO UPDATE SET name=excluded.name,name_en=excluded.name_en,rarity_id=excluded.rarity_id,is_base=excluded.is_base,mutation_weight=excluded.mutation_weight,yield_count=excluded.yield_count,yield_unit_price=excluded.yield_unit_price,sort_order=excluded.sort_order,archived=0`).run(v.id,family.id,v.key,v.name,v.nameEn??null,v.rarityId,v.isBase?1:0,v.mutationWeight,v.yield.count,v.yield.unitPrice,i));
      bumpCatalog(db); audit(db,current?'family.update':'family.create',family.id);
    })(); return family;
  };
  adminRoute('POST','/api/admin/families',async(req:any,reply:any)=>{try{return reply.code(201).send(writeFamily(req.body));}catch(error){if(error instanceof InputError)return reply.code(400).send({error:error.message});throw error;}});
  adminRoute('PUT','/api/admin/families/:id',async(req:any,reply:any)=>{try{return writeFamily(req.body,req.params.id);}catch(error){if(error instanceof InputError)return reply.code(400).send({error:error.message});throw error;}});
  for(const action of ['archive','restore'] as const)adminRoute('POST',`/api/admin/families/:id/${action}`,async(req:any,reply:any)=>{
    const row=db.prepare('SELECT builtin FROM families WHERE id=?').get(req.params.id) as {builtin:number}|undefined;if(!row)return reply.code(404).send({error:'Không tìm thấy loài hoa.'});
    if(row.builtin&&action==='archive')return reply.code(400).send({error:'Không thể lưu trữ loài hoa có sẵn.'});
    db.prepare('UPDATE families SET archived=?,updated_at=? WHERE id=?').run(action==='archive'?1:0,Date.now(),req.params.id);bumpCatalog(db);audit(db,`family.${action}`,req.params.id);return{ok:true};
  });

  adminRoute('POST','/api/admin/families/:id/images',async(req:any,reply:any)=>{
    const familyId=String(req.params.id);if(!db.prepare('SELECT 1 FROM families WHERE id=?').get(familyId))return reply.code(404).send({error:'Không tìm thấy loài hoa.'});
    let slot='',variantKey='',buffer:Buffer|undefined;
    try{for await(const part of req.parts()){if(part.type==='file')buffer=await part.toBuffer();else if(part.fieldname==='slot')slot=String(part.value);else if(part.fieldname==='variantKey')variantKey=String(part.value);}}catch{return reply.code(400).send({error:'Tệp tải lên không hợp lệ hoặc vượt quá 2 MB.'});}
    if(!buffer?.length)return reply.code(400).send({error:'Thiếu tệp ảnh.'});
    const isPng=buffer.length>8&&buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
    const isWebp=buffer.length>12&&buffer.toString('ascii',0,4)==='RIFF'&&buffer.toString('ascii',8,12)==='WEBP';
    if(!isPng&&!isWebp)return reply.code(400).send({error:'Chỉ nhận PNG hoặc WebP hợp lệ.'});
    let dimensions:{width?:number;height?:number};try{dimensions=imageSize(buffer);}catch{return reply.code(400).send({error:'Ảnh bị hỏng.'});}
    const width=dimensions.width??0,height=dimensions.height??0;if(!width||!height||width>2048||height>2048)return reply.code(400).send({error:'Kích thước ảnh phải từ 1 đến 2048 px.'});
    const variantId=variantKey?`${familyId}.${variantKey}`:''; const ownerType=variantKey?'variant':'family'; const ownerId=variantKey?variantId:familyId;
    if(variantKey&&!db.prepare('SELECT 1 FROM variants WHERE id=? AND family_id=?').get(variantId,familyId))return reply.code(400).send({error:'Biến thể không hợp lệ.'});
    if(!(variantKey?variantSlots:familySlots).has(slot))return reply.code(400).send({error:'Vị trí ảnh không hợp lệ.'});
    const sha=createHash('sha256').update(buffer).digest('hex'),ext=isPng?'png':'webp';const relative=`flowers/${familyId}/${variantKey?`${variantKey}.`:''}${slot}.${sha.slice(0,8)}.${ext}`;
    const target=resolve(config.uploadDir,relative);if(!target.startsWith(resolve(config.uploadDir)+sep))return reply.code(400).send({error:'Đường dẫn không hợp lệ.'});mkdirSync(dirname(target),{recursive:true});
    if(!existsSync(target)){const temp=`${target}.tmp`;writeFileSync(temp,buffer);renameSync(temp,target);}
    const old=db.prepare('SELECT file_path FROM images WHERE owner_type=? AND owner_id=? AND slot=?').get(ownerType,ownerId,slot) as {file_path:string}|undefined;
    db.transaction(()=>{db.prepare(`INSERT INTO images(owner_type,owner_id,slot,file_path,width,height,bytes,sha256,updated_at) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(owner_type,owner_id,slot) DO UPDATE SET file_path=excluded.file_path,width=excluded.width,height=excluded.height,bytes=excluded.bytes,sha256=excluded.sha256,updated_at=excluded.updated_at`).run(ownerType,ownerId,slot,relative,width,height,buffer.length,sha,Date.now());bumpCatalog(db);audit(db,'image.upload',familyId,{variantKey,slot});})();
    if(old?.file_path&&old.file_path!==relative){const oldPath=resolve(config.uploadDir,old.file_path);if(oldPath.startsWith(resolve(config.uploadDir)+sep))rmSync(oldPath,{force:true});}
    return{ok:true,url:`/uploads/${relative.replaceAll('\\','/')}`,width,height,bytes:buffer.length,warning:width!==height?'Ảnh không vuông; nên dùng tỷ lệ 1:1.':undefined};
  });
  adminRoute('DELETE','/api/admin/families/:id/images/:slot',async(req:any,reply:any)=>{
    const variantKey=String(req.query?.variantKey??''),ownerType=variantKey?'variant':'family',ownerId=variantKey?`${req.params.id}.${variantKey}`:req.params.id;
    const row=db.prepare('SELECT file_path FROM images WHERE owner_type=? AND owner_id=? AND slot=?').get(ownerType,ownerId,req.params.slot) as {file_path:string}|undefined;if(!row)return reply.code(404).send({error:'Không tìm thấy ảnh.'});
    db.prepare('DELETE FROM images WHERE owner_type=? AND owner_id=? AND slot=?').run(ownerType,ownerId,req.params.slot);bumpCatalog(db);audit(db,'image.delete',req.params.id,{variantKey,slot:req.params.slot});
    const path=resolve(config.uploadDir,row.file_path);if(path.startsWith(resolve(config.uploadDir)+sep))rmSync(path,{force:true});return{ok:true};
  });

  const dist=resolve(process.cwd(),'dist');
  if(existsSync(dist))await app.register(fastifyStatic,{root:dist,prefix:'/',decorateReply:true,wildcard:false});
  app.get('/admin',async(_req,reply)=>config.adminEnabled&&existsSync(resolve(dist,'admin.html'))?reply.sendFile('admin.html'):reply.code(404).send('Không tìm thấy.'));
  app.setErrorHandler((error,req,reply)=>{const err=error as any;req.log.error(error);reply.code(err.statusCode??500).send({error:err.statusCode&&err.message?err.message:'Lỗi máy chủ.'});});
  app.addHook('onClose',async()=>{if(!options.db)db.close();});
  return app;
}
