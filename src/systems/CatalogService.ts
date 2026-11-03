import type{CatalogPayload}from'../core/types';import type{StorageLike}from'../core/SaveManager';import{CATALOG_DEFAULTS}from'../data/catalogDefaults';
export interface CatalogFetchResult{status:number;etag?:string;payload?:CatalogPayload}
export type CatalogFetcher=(etag:string|undefined,signal:AbortSignal)=>Promise<CatalogFetchResult>;
interface CatalogCache{etag?:string;fetchedAt:number;payload:CatalogPayload}
export interface CatalogLoadResult{payload:CatalogPayload;source:'server'|'cache'|'builtin';changed:boolean}
export class CatalogService{
  private cache?:CatalogCache;private lastSuccessfulAt=0;
  constructor(private storage:StorageLike,private fetcher:CatalogFetcher,private nowUtc:()=>number,private cacheKey=CATALOG_DEFAULTS.cacheKey){this.cache=this.readCache();this.lastSuccessfulAt=this.cache?.fetchedAt??0;}
  async load(force=false):Promise<CatalogLoadResult>{if(!force&&this.cache&&this.nowUtc()-this.lastSuccessfulAt<CATALOG_DEFAULTS.refreshAfterMs)return{payload:this.cache.payload,source:'cache',changed:false};const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),CATALOG_DEFAULTS.fetchTimeoutMs);try{const result=await this.fetcher(this.cache?.etag,controller.signal);if(result.status===304&&this.cache){this.lastSuccessfulAt=this.nowUtc();this.cache.fetchedAt=this.lastSuccessfulAt;this.writeCache();return{payload:this.cache.payload,source:'cache',changed:false};}if(result.status>=200&&result.status<300&&result.payload){const changed=result.payload.version!==(this.cache?.payload.version??-1);this.cache={etag:result.etag,fetchedAt:this.nowUtc(),payload:result.payload};this.lastSuccessfulAt=this.cache.fetchedAt;this.writeCache();return{payload:result.payload,source:'server',changed};}}catch{/* Fallback im lặng. */}finally{clearTimeout(timeout);}if(this.cache)return{payload:this.cache.payload,source:'cache',changed:false};return{payload:{version:0,families:[]},source:'builtin',changed:false};}
  shouldRefresh():boolean{return this.nowUtc()-this.lastSuccessfulAt>=CATALOG_DEFAULTS.refreshAfterMs;}
  private readCache():CatalogCache|undefined{try{const raw=this.storage.getItem(this.cacheKey);if(!raw)return;const parsed=JSON.parse(raw)as CatalogCache;if(!parsed.payload||!Array.isArray(parsed.payload.families))return;return parsed;}catch{return;}}
  private writeCache():void{if(this.cache)this.storage.setItem(this.cacheKey,JSON.stringify(this.cache));}
}
