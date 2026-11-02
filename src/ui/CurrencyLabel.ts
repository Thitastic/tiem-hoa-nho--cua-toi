import{Container,Sprite,Text}from'pixi.js';
import type{TextureProvider}from'../render/TextureProvider';
import{THEME}from'../data/theme';

export class CurrencyLabel extends Container{
  private icon:Sprite;private textLabel:Text;private iconSize:number;
  constructor(textures:TextureProvider,value:number|string,fontSize:number=THEME.font.caption,color:number=THEME.colors.text,iconSize:number=THEME.spacing.lg){
    super();this.iconSize=iconSize;this.icon=new Sprite(textures.getTexture('currency:coin'));this.icon.anchor.set(0,.5);
    this.textLabel=new Text({style:{fontFamily:THEME.font.family,fontSize,fontWeight:'700',fill:color}});this.textLabel.anchor.set(0,.5);
    this.icon.width=this.icon.height=iconSize;this.icon.position.set(0,fontSize*.58);this.textLabel.position.set(iconSize+THEME.spacing.xs,fontSize*.58);this.addChild(this.icon,this.textLabel);this.setValue(value);
  }
  setValue(value:number|string):void{const text=typeof value==='number'?value.toLocaleString('vi-VN'):value;if(this.textLabel.text!==text)this.textLabel.text=text;}
  get contentWidth():number{return this.iconSize+THEME.spacing.xs+this.textLabel.width;}
}
