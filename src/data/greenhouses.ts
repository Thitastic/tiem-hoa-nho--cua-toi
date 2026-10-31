import type{GreenhouseDef}from'../core/types';
const costs=[0,3000,8000,20000];
const slotLayouts=[
  {insetX:24,offsetY:0,gapX:8,gapY:8,cellAspect:1.08},
  {insetX:24,offsetY:0,gapX:8,gapY:8,cellAspect:1.08},
  {insetX:24,offsetY:0,gapX:8,gapY:8,cellAspect:1.08},
  {insetX:24,offsetY:0,gapX:8,gapY:8,cellAspect:1.08},
];
export const GREENHOUSES:GreenhouseDef[]=costs.map((buildCost,index)=>({id:`greenhouse_${index+1}`,index:index+1,name:`Nhà kính ${index+1}`,slotsGrid:{w:5,h:4},buildCost,currencyId:'coin',environment:{temperature:null},slotLayout:slotLayouts[index]}));
export const greenhouseById=(id:string)=>GREENHOUSES.find((greenhouse)=>greenhouse.id===id)!;
