import{Container,Graphics,Rectangle,Sprite,Text}from'pixi.js';
import type{TextureProvider}from'../render/TextureProvider';
import type{PlantStatus}from'../systems/PlantService';
import{THEME}from'../data/theme';
import{LAYOUT}from'../data/layout';
import{assetConfig}from'../data/assetConfig';
import{potById}from'../data/pots';
import{familyById,variantById}from'../data/catalogRegistry';
import{ProgressBar}from'../ui/ProgressBar';
import{PlantSprite}from'./PlantSprite';
import{PointerGesture}from'../layout/PointerGesture';

export interface PotViewModel{slotIndex:number;potId?:string;potName?:string;plant?:{variantId:string;name:string;stage:number;status:PlantStatus;revealed:boolean}}
export class PotView extends Container{
  private frame=new Graphics();private selection=new Graphics();private pot=new Sprite();private plant:PlantSprite;
  private bar=new ProgressBar(THEME.tap.min,THEME.spacing.xs);private waterIcon:Sprite;
  private badge=new Text({style:{fontFamily:THEME.font.family,fontSize:THEME.font.heading,fontWeight:'700',fill:THEME.colors.textOnDark,stroke:{color:THEME.colors.shadow,width:THEME.stroke.strong}}});
  private gesture=new PointerGesture(THEME.tap.dragCancelCss);private slotIndex=0;private widthValue:number=THEME.tap.min;private heightValue:number=THEME.tap.min;private selected=false;private potId='';private familyOffset={x:0,y:0};
  constructor(private textures:TextureProvider,onTap:(slotIndex:number)=>void){
    super();this.plant=new PlantSprite(textures);this.waterIcon=new Sprite(textures.getTexture('ui:icon_need_water'));
    this.pot.anchor.set(.5,1);this.waterIcon.anchor.set(.5);this.badge.anchor.set(.5);
    this.addChild(this.frame,this.pot,this.plant,this.bar,this.waterIcon,this.badge,this.selection);
    this.onRender=()=>{if(this.waterIcon.visible)this.waterIcon.y=LAYOUT.potView.statusIconY+Math.sin(performance.now()*LAYOUT.potView.bobSpeed)*LAYOUT.potView.bobDistance;};
    this.eventMode='static';this.cursor='pointer';
    this.on('pointerdown',(event)=>this.gesture.begin(event.pointerId,event.client.x,event.client.y));
    this.on('globalpointermove',(event)=>this.gesture.move(event.pointerId,event.client.x,event.client.y));
    this.on('pointerup',(event)=>{const local=this.toLocal(event.global);const inside=this.hitArea?.contains(local.x,local.y)??false;if(this.gesture.end(event.pointerId)&&inside)onTap(this.slotIndex);});
    this.on('pointerupoutside',(event)=>this.gesture.cancel(event.pointerId));this.on('pointercancel',(event)=>this.gesture.cancel(event.pointerId));
  }
  layout(width:number,height:number):void{
    this.widthValue=width;this.heightValue=height;this.hitArea=new Rectangle(0,0,width,height);
    this.bar.position.set(THEME.spacing.sm,height-THEME.spacing.md);this.bar.resize(width-THEME.spacing.lg,THEME.spacing.xs);
    this.waterIcon.position.set(THEME.spacing.lg,LAYOUT.potView.statusIconY);this.waterIcon.width=this.waterIcon.height=LAYOUT.potView.statusIconSize;
    this.badge.position.set(width-THEME.spacing.md,THEME.spacing.md);this.applyArtLayout();this.redrawFrame();
  }
  setSelected(selected:boolean):void{if(this.selected===selected)return;this.selected=selected;this.redrawFrame();}
  update(model:PotViewModel):void{
    this.slotIndex=model.slotIndex;
    if(!model.potId){this.pot.visible=this.plant.visible=this.bar.visible=this.waterIcon.visible=false;this.badge.visible=true;this.badge.text='+';this.badge.position.set(this.widthValue/2,this.heightValue/2);this.redrawFrame(true);return;}
    this.potId=model.potId;this.pot.visible=true;this.pot.texture=this.textures.getPotTexture(model.potId);this.badge.position.set(this.widthValue-THEME.spacing.md,THEME.spacing.md);this.applyArtLayout();
    if(!model.plant){this.plant.visible=this.bar.visible=this.waterIcon.visible=this.badge.visible=false;this.redrawFrame();return;}
    this.plant.visible=this.bar.visible=true;const variant=variantById(model.plant.variantId);this.familyOffset=familyById(variant.familyId).images.plantOffset;this.plant.update(model.plant.variantId,model.plant.stage);this.applyArtLayout();
    this.bar.set(model.plant.status.ratio,model.plant.status.ready?THEME.colors.accent:model.plant.status.needsWater?THEME.colors.danger:THEME.colors.success);
    this.waterIcon.visible=model.plant.status.needsWater;this.badge.visible=model.plant.status.ready;this.badge.text='✓';this.redrawFrame();
  }
  private applyArtLayout():void{
    if(!this.potId||!this.widthValue||!this.heightValue)return;const def=potById(this.potId);
    const target=Math.min(this.widthValue*LAYOUT.potView.potWidth,this.heightValue*LAYOUT.potView.potHeight);
    const scale=target/assetConfig.potSourceBasis*def.displayScale;this.pot.scale.set(scale);
    const bottom=this.heightValue*LAYOUT.potView.potY;this.pot.position.set(this.widthValue/2,bottom);
    const displayedHeight=(this.pot.texture.height||assetConfig.potSourceBasis)*scale;
    const rimY=bottom-displayedHeight*(1-LAYOUT.potView.rimY);
    this.plant.position.set(this.widthValue/2+this.familyOffset.x+def.plantOffset.x,rimY+this.familyOffset.y+def.plantOffset.y);
    this.plant.layout(this.widthValue*LAYOUT.potView.plantWidth,this.heightValue*LAYOUT.potView.plantHeight);
  }
  private redrawFrame(locked=false):void{
    const color=locked?THEME.colors.muted:THEME.colors.primaryDark;
    this.frame.clear().roundRect(0,0,this.widthValue,this.heightValue,THEME.radius.md).fill({color,alpha:locked?LAYOUT.potView.lockedAlpha:LAYOUT.potView.normalAlpha}).stroke({color:THEME.colors.outline,width:THEME.stroke.thin,alpha:THEME.opacity.potOutline});
    this.selection.clear();if(this.selected)this.selection.roundRect(0,0,this.widthValue,this.heightValue,THEME.radius.md).stroke({color:THEME.colors.accent,width:THEME.stroke.strong});
  }
}
