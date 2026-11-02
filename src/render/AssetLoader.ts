import{Assets,Texture}from'pixi.js';import type{AssetEntry}from'../data/assetPaths';import{assetConfig}from'../data/assetConfig';
export class AssetLoader{
  private textures=new Map<string,Texture>();private warned=new Set<string>();
  async load(manifest:AssetEntry[]):Promise<void>{
    await Promise.all(manifest.map(async(entry)=>{
      if(!entry.present){if(!entry.silentMissing)this.warn(entry.path);return;}
      try{const texture=await Assets.load<Texture>(entry.path);if(texture){texture.source.scaleMode=assetConfig.scaleMode;this.textures.set(entry.key,texture);}}
      catch{this.warn(entry.path);}
    }));
  }
  get(key:string):Texture|undefined{return this.textures.get(key);}
  has(key:string):boolean{return this.textures.has(key);}
  private warn(path:string):void{if(this.warned.has(path))return;this.warned.add(path);console.warn(`[Ảnh chưa có] ${path}`);}
}
