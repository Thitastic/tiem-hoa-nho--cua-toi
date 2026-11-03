import type { PlantStage } from './types';

/** Trả ảnh đúng giai đoạn, rồi lùi về ảnh gần nhất thấp hơn. */
export function resolveStageImage<T>(requested:PlantStage,shared:Partial<Record<PlantStage,T>>,variant:Partial<Record<PlantStage,T>>):{stage:PlantStage;value:T}|undefined {
  for(let stage=requested;stage>=0;stage--){
    const value=variant[stage as PlantStage]??shared[stage as PlantStage];
    if(value!==undefined)return{stage:stage as PlantStage,value};
  }
  return undefined;
}
