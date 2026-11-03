import type{SeedDef}from'../core/types';import{allPlantFamilies}from'./catalogRegistry';
export const allSeeds=():SeedDef[]=>allPlantFamilies().flatMap((family)=>[
  {id:`seed.${family.id}.1`,familyId:family.id,name:`Hạt giống ${family.name} 1★`,starLevel:1,mutationBonus:0,forceMutation:false,price:family.baseSeedPrice,currencyId:'coin',shopId:family.archived?null:'farm_tools'},
  {id:`seed.${family.id}.2`,familyId:family.id,name:`Hạt giống ${family.name} 2★`,starLevel:2,mutationBonus:.2,forceMutation:false,price:Math.round(family.baseSeedPrice*family.seed2StarPriceMult),currencyId:'coin',shopId:family.archived?null:'farm_tools'},
  {id:`seed.${family.id}.3`,familyId:family.id,name:`Hạt giống ${family.name} 3★`,starLevel:3,mutationBonus:0,forceMutation:true,minRarity:'epic',price:null,currencyId:'coin',shopId:null},
]);
export const seedById=(id:string):SeedDef=>allSeeds().find((seed)=>seed.id===id)??{id,familyId:id.split('.')[1]??'unknown',name:id,starLevel:1,mutationBonus:0,forceMutation:false,price:null,currencyId:'coin',shopId:null};
