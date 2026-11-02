import{Container,Graphics,Text}from'pixi.js';
import type{Game}from'../Game';
import{STRINGS}from'../data/strings';
import{THEME}from'../data/theme';
import{LAYOUT}from'../data/layout';
import{computeRegions,type ViewportInfo}from'../layout/LayoutManager';
import{Button}from'./Button';
import{ProgressBar}from'./ProgressBar';
import{ROSE_TRACK}from'../data/tracks/roseTrack';

export interface HudActions{onInventory:()=>void;onQuests:()=>void;onSettings:()=>void;onDebugToggle:()=>void}
export class Hud extends Container{
  private bg=new Graphics();private coins:Button;
  private rankText=new Text({style:{fontFamily:THEME.font.family,fontSize:THEME.font.caption,fontWeight:'700',fill:THEME.colors.textOnDark}});
  private rankProgress=new ProgressBar(LAYOUT.hud.rankWidth,LAYOUT.hud.progressHeight);private lastCoins=-1;private lastPoints=-1;private coinTaps:number[]=[];
  constructor(private game:Game,private actions:HudActions){
    super();this.coins=new Button('',LAYOUT.hud.coinWidth,()=>this.coinTap(),LAYOUT.hud.controlSize,THEME.font.caption);
    const inventory=new Button(`¦\n${STRINGS.inventory}`,LAYOUT.hud.controlSize,actions.onInventory,LAYOUT.hud.controlSize,THEME.font.caption);
    const quests=new Button(STRINGS.quests,LAYOUT.hud.controlSize,actions.onQuests,LAYOUT.hud.controlSize,THEME.font.micro);
    const settings=new Button(STRINGS.settings,LAYOUT.hud.controlSize,actions.onSettings,LAYOUT.hud.controlSize,THEME.font.micro);
    this.coins.setIcon('currency:coin',THEME.spacing.xl);quests.setIcon('ui:icon_quest',THEME.spacing.lg);settings.setIcon('ui:icon_settings',THEME.spacing.lg);
    this.rankText.anchor.set(.5,0);this.addChild(this.bg,this.coins,this.rankText,this.rankProgress,inventory,quests,settings);
    const gap=THEME.tap.gap;this.coins.position.set(LAYOUT.hud.padding,(LAYOUT.hudHeight-LAYOUT.hud.controlSize)/2);
    const rankX=LAYOUT.hud.padding+LAYOUT.hud.coinWidth+gap;this.rankText.position.set(rankX+LAYOUT.hud.rankWidth/2,LAYOUT.hud.rankTextY);this.rankProgress.position.set(rankX,LAYOUT.hud.progressY);
    const actionX=rankX+LAYOUT.hud.rankWidth+gap;[inventory,quests,settings].forEach((button,index)=>button.position.set(actionX+index*(LAYOUT.hud.controlSize+gap),(LAYOUT.hudHeight-LAYOUT.hud.controlSize)/2));this.update(true);
  }
  layout(vp:ViewportInfo):void{const region=computeRegions(vp).hud;this.position.set(region.x,region.y);this.bg.clear().rect(0,0,region.width,region.height).fill({color:THEME.colors.page,alpha:.97}).rect(0,region.height-THEME.stroke.normal,region.width,THEME.stroke.normal).fill(THEME.colors.accent);}
  update(force=false):void{
    const coins=Math.floor(this.game.wallet.balance('coin'));const points=this.game.progress.points();
    if(force||coins!==this.lastCoins){this.lastCoins=coins;this.coins.setText(`${coins.toLocaleString('vi-VN')}\n${STRINGS.coins}`);}
    if(force||points!==this.lastPoints){this.lastPoints=points;const rank=this.game.progress.rank();const milestones=ROSE_TRACK.milestones;const previous=rank===0?0:milestones[rank-1].points;const next=milestones[Math.min(rank,milestones.length-1)].points;this.rankText.text=`${STRINGS.rank} ${rank}/${milestones.length} · ${points.toLocaleString('vi-VN')}`;this.rankProgress.set(rank>=milestones.length?1:(points-previous)/Math.max(1,next-previous),THEME.colors.accent);}
  }
  private coinTap():void{const now=Date.now();this.coinTaps=this.coinTaps.filter((time)=>now-time<=LAYOUT.hud.debugTapWindowMs);this.coinTaps.push(now);if(this.coinTaps.length>=5){this.coinTaps=[];this.actions.onDebugToggle();}}
}
