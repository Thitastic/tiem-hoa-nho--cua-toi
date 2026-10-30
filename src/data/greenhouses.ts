import type{GreenhouseDef}from'../core/types';
const costs=[0,3000,8000,20000];
export const GREENHOUSES:GreenhouseDef[]=costs.map((buildCost,index)=>({id:`greenhouse_${index+1}`,index:index+1,name:`Nhà kính ${index+1}`,slotsGrid:{w:5,h:4},buildCost,currencyId:'coin',environment:{temperature:null},slotLayout:{originX:165,originY:240,cellW:165,cellH:105}}));
export const greenhouseById=(id:string)=>GREENHOUSES.find((greenhouse)=>greenhouse.id===id)!;
