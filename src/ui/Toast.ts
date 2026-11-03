import{Container,Graphics,Sprite,Text}from'pixi.js';
import{LAYOUT}from'../data/layout';
import{THEME}from'../data/theme';
import{computeRegions,type ViewportInfo}from'../layout/LayoutManager';
import type{TextureProvider}from'../render/TextureProvider';

export class Toast extends Container{
  private queue:{text:string;until:number;currency:boolean}[]=[];private bg=new Graphics();private coin:Sprite;
  private messageText=new Text({text:'',style:{fontFamily:THEME.font.family,fontSize:THEME.font.body,fontWeight:'700',fill:THEME.colors.textOnDark,align:'center',wordWrap:true,wordWrapWidth:LAYOUT.designWidth-LAYOUT.sidePadding*4}});
  constructor(textures:TextureProvider){super();this.coin=new Sprite(textures.getTexture('currency:coin'));this.coin.anchor.set(.5);this.coin.width=this.coin.height=THEME.spacing.xl;this.messageText.anchor.set(.5);this.addChild(this.bg,this.coin,this.messageText);this.visible=false;}
  layout(vp:ViewportInfo):void{const content=computeRegions(vp).content;this.position.set(vp.width/2,content.y+THEME.spacing.xl);}
  show(text:string,now=performance.now()):void{this.enqueue(text,now,false);}
  showCurrency(text:string,now=performance.now()):void{this.enqueue(text,now,true);}
  update(now=performance.now()):void{const current=this.queue[0];if(current&&now>=current.until){this.queue.shift();this.next();}}
  private enqueue(text:string,now:number,currency:boolean):void{this.queue.push({text,until:now+LAYOUT.animation.toastDurationMs,currency});if(!this.visible)this.next();}
  private next():void{
    const current=this.queue[0];if(!current){this.visible=false;return;}this.visible=true;this.coin.visible=current.currency;
    if(this.messageText.text!==current.text)this.messageText.text=current.text;
    const iconSpace=current.currency?THEME.spacing.xl+THEME.spacing.sm:0;const width=Math.min(LAYOUT.designWidth-LAYOUT.sidePadding*2,Math.max(LAYOUT.toastMinWidth,this.messageText.width+THEME.spacing.xl*2+iconSpace));
    this.coin.position.set(-width/2+THEME.spacing.lg+THEME.spacing.md,0);this.messageText.position.x=current.currency?iconSpace/2:0;
    this.bg.clear().roundRect(-width/2,-LAYOUT.toastHeight/2,width,LAYOUT.toastHeight,THEME.radius.md).fill({color:THEME.colors.page,alpha:.96}).stroke({color:THEME.colors.outline,width:THEME.stroke.thin,alpha:.7});
  }
}
