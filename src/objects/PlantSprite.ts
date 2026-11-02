import{Container,Sprite}from'pixi.js';
import{assetConfig}from'../data/assetConfig';
import type{TextureProvider}from'../render/TextureProvider';

export class PlantSprite extends Container{
  private sprite=new Sprite();private variantId='';private stage=-1;private maxWidth=0;private maxHeight=0;private displayScale=1;private hasAsset=false;
  constructor(private textures:TextureProvider){super();this.sprite.anchor.set(.5,1);this.addChild(this.sprite);}
  layout(width:number,height:number):void{this.maxWidth=width;this.maxHeight=height;this.applyScale();}
  update(variantId:string,stage:number):void{
    if(this.variantId===variantId&&this.stage===stage)return;this.variantId=variantId;this.stage=stage;
    const info=this.textures.getPlantTextureInfo(variantId,stage);this.sprite.texture=info.texture;this.displayScale=info.asset?.displayScale??1;this.hasAsset=Boolean(info.asset);this.applyScale();
  }
  private applyScale():void{
    if(!this.sprite.texture||!this.maxWidth||!this.maxHeight)return;
    const sourceWidth=this.sprite.texture.width||1;const sourceHeight=this.sprite.texture.height||1;
    const commonScale=this.maxHeight/assetConfig.plantSourceHeightBasis*this.displayScale;
    const scale=this.hasAsset?Math.min(commonScale,this.maxWidth/sourceWidth):Math.min(this.maxWidth/sourceWidth,this.maxHeight/sourceHeight);
    this.sprite.scale.set(scale);
  }
}
