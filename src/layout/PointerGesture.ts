export class PointerGesture{
  private pointerId:number|null=null;private startX=0;private startY=0;private moved=false;
  constructor(private thresholdCss:number){}
  begin(pointerId:number,x:number,y:number):void{this.pointerId=pointerId;this.startX=x;this.startY=y;this.moved=false;}
  move(pointerId:number,x:number,y:number):boolean{if(pointerId!==this.pointerId)return false;if(Math.hypot(x-this.startX,y-this.startY)>this.thresholdCss)this.moved=true;return this.moved;}
  end(pointerId:number):boolean{if(pointerId!==this.pointerId)return false;const tapped=!this.moved;this.pointerId=null;return tapped;}
  cancel(pointerId?:number):void{if(pointerId===undefined||pointerId===this.pointerId)this.pointerId=null;}
  get active():boolean{return this.pointerId!==null;}
  get wasMoved():boolean{return this.moved;}
}

