export class Keyboard {
  private keys=new Set<string>();
  private down=(e:KeyboardEvent)=>{if(e.code.startsWith('Arrow'))e.preventDefault();this.keys.add(e.code);};
  private up=(e:KeyboardEvent)=>{this.keys.delete(e.code);};
  private clear=()=>this.keys.clear();
  constructor(){window.addEventListener('keydown',this.down);window.addEventListener('keyup',this.up);window.addEventListener('blur',this.clear);}
  pressed(...codes:string[]):boolean{return codes.some(code=>this.keys.has(code));}
  destroy():void{window.removeEventListener('keydown',this.down);window.removeEventListener('keyup',this.up);window.removeEventListener('blur',this.clear);}
}
