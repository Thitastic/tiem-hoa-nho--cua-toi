import type{PlantFamilyDef}from'../../core/types';
export const ROSE_FAMILY:PlantFamilyDef={id:'rose',name:'Hoa hồng',baseVariantId:'rose.red_naomi',growTimeSec:3600,wateringIntervalSec:[1500],mutationChance:.2,revealVariantFromStage:1,stageThresholds:[0,.25,.6,1],witherAfterSec:null,tempRange:[],variants:[
{id:'rose.red_naomi',familyId:'rose',variantKey:'red_naomi',name:'Hồng đỏ',englishName:'Red Naomi',rarity:'common',tags:['rose','red'],yield:3,unitPrice:20,mutationWeight:0},
{id:'rose.black_baccara',familyId:'rose',variantKey:'black_baccara',name:'Hồng nhung',englishName:'Black Baccara',rarity:'rare',tags:['rose','velvet'],yield:3,unitPrice:25,mutationWeight:50},
{id:'rose.monica',familyId:'rose',variantKey:'monica',name:'Hồng phấn Monica',englishName:'Monica baby pink',rarity:'rare',tags:['rose','pink'],yield:3,unitPrice:25,mutationWeight:22},
{id:'rose.bajou',familyId:'rose',variantKey:'bajou',name:'Hồng Bajou',englishName:'Blue Bajou',rarity:'rare',tags:['rose','blue'],yield:3,unitPrice:30,mutationWeight:22},
{id:'rose.masora',familyId:'rose',variantKey:'masora',name:'Hồng Masora',englishName:'Masora',rarity:'epic',tags:['rose','yellow'],yield:2,unitPrice:40,mutationWeight:3},
{id:'rose.eckart',familyId:'rose',variantKey:'eckart',name:'Hồng Eckart',englishName:'Eckart Witzigmann',rarity:'epic',tags:['rose','orange'],yield:2,unitPrice:40,mutationWeight:3}]};
export const PLANT_FAMILIES=[ROSE_FAMILY];export const PLANT_VARIANTS=PLANT_FAMILIES.flatMap((family)=>family.variants);
export const variantById=(id:string)=>PLANT_VARIANTS.find((variant)=>variant.id===id)!;export const familyById=(id:string)=>PLANT_FAMILIES.find((family)=>family.id===id)!;
