export const computePlantStage=(progressRatio:number,thresholds:readonly number[]):number=>{
  const ratio=Math.max(0,Math.min(1,progressRatio));
  let stage=0;
  for(let index=1;index<thresholds.length;index++)if(ratio>=thresholds[index])stage=index;
  return stage;
};
