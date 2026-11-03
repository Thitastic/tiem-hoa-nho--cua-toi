import { describe,expect,it,beforeEach,vi } from 'vitest';
import type { CatalogFamily,CatalogPayload } from '../core/types';
import { CATALOG_DEFAULTS } from '../data/catalogDefaults';
import { PlantCatalogRegistry } from '../data/catalogRegistry';
import { ROSE_FAMILY } from '../data/plants/rose';
import { allSeeds } from '../data/seeds';
import { CatalogService } from './CatalogService';

const family=(id='tulip'):CatalogFamily=>({id,name:'Tulip',unlockLevel:2,baseSeedPrice:70,seed2StarPriceMult:3,growTimeSec:4000,wateringIntervalSec:1600,baseMutationChance:.2,stageThresholds:[0,.2,.45,.75,1],revealVariantFromStage:2,growthPausesWhenDry:true,tags:[],archived:false,builtin:false,images:{shared:{}},variants:[{key:'basic',id:`${id}.basic`,name:'Cơ bản',rarityId:'common',isBase:true,mutationWeight:0,yield:{count:2,unitPrice:30},images:{stages:{}}}]});
const payload=(version=1):CatalogPayload=>({version,families:[family()]});
class MemoryStorage {data=new Map<string,string>();getItem(k:string){return this.data.get(k)??null;}setItem(k:string,v:string){this.data.set(k,v);}removeItem(k:string){this.data.delete(k);}}
describe('catalog động',()=>{
  beforeEach(()=>{});
  it('dùng server, ETag 304 và cache',async()=>{const storage=new MemoryStorage();let calls=0,now=1;const service=new CatalogService(storage,async(etag)=>{calls++;return calls===1?{status:200,etag:'v1',payload:payload()}:{status:304,etag};},()=>now);expect((await service.load()).source).toBe('server');now+=CATALOG_DEFAULTS.refreshAfterMs+1;expect((await service.load()).source).toBe('cache');expect(calls).toBe(2);});
  it('fallback cache rồi built-in khi fetch lỗi',async()=>{const storage=new MemoryStorage();storage.setItem(CATALOG_DEFAULTS.cacheKey,JSON.stringify({etag:'x',fetchedAt:0,payload:payload()}));const cached=new CatalogService(storage,async()=>{throw new Error('off');},()=>CATALOG_DEFAULTS.refreshAfterMs+2);expect((await cached.load(true)).source).toBe('cache');const empty=new CatalogService(new MemoryStorage(),async()=>{throw new Error('off');},()=>1);expect((await empty.load()).source).toBe('builtin');});
  it('hết hạn 3 giây thì fallback mà không treo game',async()=>{vi.useFakeTimers();try{const service=new CatalogService(new MemoryStorage(),async(_etag,signal)=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(new Error('timeout')))),()=>1);const pending=service.load(true);await vi.advanceTimersByTimeAsync(CATALOG_DEFAULTS.fetchTimeoutMs);expect((await pending).source).toBe('builtin');}finally{vi.useRealTimers();}});
  it('không cho server đổi cân bằng rose nhưng nhận cấp và ảnh',()=>{const registry=new PlantCatalogRegistry();const rose:CatalogFamily={...family('rose'),builtin:true,unlockLevel:5,baseSeedPrice:999,growTimeSec:999,images:{shared:{0:'https://img/0.png'}},variants:ROSE_FAMILY.variants.map((v,i)=>({key:v.variantKey,id:v.id,name:v.name,rarityId:v.rarity,isBase:i===0,mutationWeight:v.mutationWeight,yield:{count:99,unitPrice:99},images:{stages:{}}}))};registry.setServerCatalog({version:2,families:[rose]});const result=registry.family('rose');expect(result.baseSeedPrice).toBe(ROSE_FAMILY.baseSeedPrice);expect(result.growTimeSec).toBe(ROSE_FAMILY.growTimeSec);expect(result.unlockLevel).toBe(5);expect(result.images.shared[0]?.file).toBe('https://img/0.png');});
  it('rose giữ giá hạt và unknown ID không làm văng game',()=>{expect(allSeeds().find(s=>s.id==='seed.rose.1')?.price).toBe(50);expect(allSeeds().find(s=>s.id==='seed.rose.2')?.price).toBe(150);const registry=new PlantCatalogRegistry();expect(()=>registry.variant('archived.missing')).not.toThrow();expect(registry.variant('archived.missing').rarity).toBe('common');});
});
