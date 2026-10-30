import type { StatContext } from './types';
export interface Modifier { stat:string;op:'add'|'mult';value:number;scope?:{family?:string;rarity?:string;variantId?:string;tag?:string};stackGroup?:string|null;priority?:number;source:string }
export interface StatLimit { min?:number;max?:number;minBaseRatio?:number;maxBaseRatio?:number }
export interface StatExplanation { base:number;active:Modifier[];ignored:Modifier[];result:number }
export class StatResolver {
  constructor(private modifiers:()=>Modifier[],private limits:Record<string,StatLimit>){}
  get(stat:string,context:StatContext):number{return this.explain(stat,context).result;}
  explain(stat:string,context:StatContext):StatExplanation{
    const scoped=this.modifiers().filter((modifier)=>modifier.stat===stat&&this.matches(modifier,context));
    const active:Modifier[]=[];const ignored:Modifier[]=[];const groups=new Map<string,Modifier>();
    for(const modifier of scoped){if(!modifier.stackGroup){active.push(modifier);continue;}const current=groups.get(modifier.stackGroup);if(!current||(modifier.priority??0)>(current.priority??0)){if(current)ignored.push(current);groups.set(modifier.stackGroup,modifier);}else ignored.push(modifier);}
    active.push(...groups.values());
    const added=active.filter((m)=>m.op==='add').reduce((sum,m)=>sum+m.value,0);
    const multiplied=active.filter((m)=>m.op==='mult').reduce((value,m)=>value*m.value,1);
    let result=(context.base+added)*multiplied;const limit=this.limits[stat];
    if(limit?.minBaseRatio!==undefined)result=Math.max(result,context.base*limit.minBaseRatio);
    if(limit?.maxBaseRatio!==undefined)result=Math.min(result,context.base*limit.maxBaseRatio);
    if(limit?.min!==undefined)result=Math.max(result,limit.min);if(limit?.max!==undefined)result=Math.min(result,limit.max);
    return{base:context.base,active,ignored,result};
  }
  private matches(modifier:Modifier,context:StatContext):boolean{const scope=modifier.scope;if(!scope)return true;if(scope.family&&scope.family!==context.family)return false;if(scope.rarity&&scope.rarity!==context.rarity)return false;if(scope.variantId&&scope.variantId!==context.variantId)return false;if(scope.tag&&!context.tags?.includes(scope.tag)&&scope.tag!==context.tag)return false;return true;}
}
