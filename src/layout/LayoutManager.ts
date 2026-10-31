import{LAYOUT}from'../data/layout';

export interface SafeInsets{top:number;bottom:number;left:number;right:number}
export interface ViewportInfo{width:number;height:number;scale:number;safe:SafeInsets;isTall:boolean;isDesktopColumn:boolean}
export interface Rect{x:number;y:number;width:number;height:number}
export interface LayoutRegions{frame:Rect;hud:Rect;content:Rect;tabs:Rect}
export interface ViewportLayout{viewport:ViewportInfo;cssWidth:number;cssHeight:number}
export interface GridLayout{originX:number;originY:number;cellWidth:number;cellHeight:number;gapX:number;gapY:number;width:number;height:number}

const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));

export function computeViewport(availableWidth:number,availableHeight:number,safeCss:Partial<SafeInsets>={}):ViewportLayout{
  const widthLimit=Math.max(1,Math.min(availableWidth,LAYOUT.desktopMaxCssWidth));
  let scale=widthLimit/LAYOUT.designWidth;
  let height=availableHeight/scale;
  let cssWidth=widthLimit;
  let cssHeight=availableHeight;
  if(height<LAYOUT.minHeight){height=LAYOUT.minHeight;scale=availableHeight/height;cssWidth=LAYOUT.designWidth*scale;cssHeight=availableHeight;}
  else if(height>LAYOUT.maxHeight){height=LAYOUT.maxHeight;cssHeight=height*scale;}
  const safe:{top:number;bottom:number;left:number;right:number}={
    top:(safeCss.top??0)/scale,bottom:(safeCss.bottom??0)/scale,left:(safeCss.left??0)/scale,right:(safeCss.right??0)/scale,
  };
  return{viewport:{width:LAYOUT.designWidth,height,scale,safe,isTall:height/LAYOUT.designWidth>16/9,isDesktopColumn:availableWidth>LAYOUT.desktopMaxCssWidth},cssWidth,cssHeight};
}

export function computeRegions(vp:ViewportInfo):LayoutRegions{
  const frameHeight=Math.min(LAYOUT.safeFrameHeight,vp.height);
  const frameY=(vp.height-frameHeight)/2;
  const frame={x:0,y:frameY,width:vp.width,height:frameHeight};
  const hud={x:0,y:frameY+vp.safe.top,width:vp.width,height:LAYOUT.hudHeight};
  const tabs={x:0,y:frameY+frameHeight-vp.safe.bottom-LAYOUT.tabBarHeight,width:vp.width,height:LAYOUT.tabBarHeight};
  const content={x:0,y:hud.y+hud.height,width:vp.width,height:Math.max(0,tabs.y-hud.y-hud.height)};
  return{frame,hud,content,tabs};
}

export const anchorCenter=(region:Rect,width:number,height:number):Rect=>({x:region.x+(region.width-width)/2,y:region.y+(region.height-height)/2,width,height});
export const anchorBottom=(region:Rect,width:number,height:number,inset=0):Rect=>({x:region.x+(region.width-width)/2,y:region.y+region.height-height-inset,width,height});
export const stackVertical=(region:Rect,count:number,gap:number):Rect[]=>{const height=(region.height-gap*Math.max(0,count-1))/Math.max(1,count);return Array.from({length:count},(_,index)=>({x:region.x,y:region.y+index*(height+gap),width:region.width,height}));};

export function gridFit(region:Rect,columns:number,rows:number,gapX:number,gapY:number,cellAspect=1):GridLayout{
  const byWidth=(region.width-gapX*Math.max(0,columns-1))/columns;
  const byHeight=(region.height-gapY*Math.max(0,rows-1))/rows/cellAspect;
  const cellWidth=Math.max(0,Math.min(byWidth,byHeight));
  const cellHeight=cellWidth*cellAspect;
  const width=cellWidth*columns+gapX*Math.max(0,columns-1);
  const height=cellHeight*rows+gapY*Math.max(0,rows-1);
  return{originX:region.x+(region.width-width)/2,originY:region.y+(region.height-height)/2,cellWidth,cellHeight,gapX,gapY,width,height};
}

export class LayoutManager{
  private resizeObserver:ResizeObserver;private frame=0;private current?:ViewportInfo;
  private readonly schedule=()=>{cancelAnimationFrame(this.frame);this.frame=requestAnimationFrame(()=>this.reflow());};
  constructor(private outer:HTMLElement,private column:HTMLElement,private probe:HTMLElement,private onLayout:(vp:ViewportInfo,css:{width:number;height:number})=>void){
    this.resizeObserver=new ResizeObserver(this.schedule);this.resizeObserver.observe(outer);
    window.addEventListener('orientationchange',this.schedule);window.visualViewport?.addEventListener('resize',this.schedule);this.reflow();
  }
  get viewport():ViewportInfo|undefined{return this.current;}
  refresh():void{this.reflow();}
  destroy():void{cancelAnimationFrame(this.frame);this.resizeObserver.disconnect();window.removeEventListener('orientationchange',this.schedule);window.visualViewport?.removeEventListener('resize',this.schedule);}
  private reflow():void{
    const bounds=this.outer.getBoundingClientRect();const style=getComputedStyle(this.probe);
    const safeCss={top:parseFloat(style.paddingTop)||0,bottom:parseFloat(style.paddingBottom)||0,left:parseFloat(style.paddingLeft)||0,right:parseFloat(style.paddingRight)||0};
    const result=computeViewport(bounds.width,bounds.height,safeCss);this.current=result.viewport;
    this.column.style.width=`${result.cssWidth}px`;this.column.style.height=`${result.cssHeight}px`;
    this.onLayout(result.viewport,{width:result.cssWidth,height:result.cssHeight});
  }
}

