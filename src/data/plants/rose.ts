import type{PlantFamilyDef,PlantStage}from'../../core/types';

const stage=(file:string,displayScale?:number)=>({file,...(displayScale?{displayScale}:{})});
export const ROSE_FAMILY:PlantFamilyDef={
  id:'rose',name:'Hoa hồng',baseVariantId:'rose.red_naomi',growTimeSec:3600,wateringIntervalSec:[1500],mutationChance:.2,
  revealVariantFromStage:2,stageThresholds:[0,.20,.45,.75,1.0],witherAfterSec:null,tempRange:[],
  images:{folder:'rose',shared:{0:stage('step-0.png'),1:stage('step-1.png')},plantOffset:{x:0,y:0}},
  variants:[
    {id:'rose.red_naomi',familyId:'rose',variantKey:'red_naomi',name:'Hồng đỏ',englishName:'Red Naomi',rarity:'common',tags:['rose','red'],yield:3,unitPrice:20,mutationWeight:0,images:{stages:{2:stage('rose-common-2.png'),3:stage('rose-common-3.png'),4:stage('rose-common-4.png',3.6)}}},
    {id:'rose.black_baccara',familyId:'rose',variantKey:'black_baccara',name:'Hồng nhung',englishName:'Black Baccara',rarity:'rare',tags:['rose','velvet'],yield:3,unitPrice:25,mutationWeight:50,images:{stages:{2:stage('velvet-rose-2.png'),3:stage('velvet-rose-3.png'),4:stage('velvet-rose-4.png',3.6)}}},
    {id:'rose.monica',familyId:'rose',variantKey:'monica',name:'Hồng phấn Monica',englishName:'Monica baby pink',rarity:'rare',tags:['rose','pink'],yield:3,unitPrice:25,mutationWeight:22,images:{stages:{2:stage('monica.png'),3:stage('monica-3.png'),4:stage('monica-4.png',3.6)}}},
    {id:'rose.bajou',familyId:'rose',variantKey:'bajou',name:'Hồng Bajou',englishName:'Blue Bajou',rarity:'rare',tags:['rose','blue'],yield:3,unitPrice:30,mutationWeight:22,images:{stages:{2:stage('bajou-2.png'),3:stage('bajou-3.png')}}},
    {id:'rose.masora',familyId:'rose',variantKey:'masora',name:'Hồng Masora',englishName:'Masora',rarity:'epic',tags:['rose','yellow'],yield:2,unitPrice:40,mutationWeight:3,images:{stages:{2:stage('masora-2.png'),3:stage('masora-3.png')}}},
    {id:'rose.eckart',familyId:'rose',variantKey:'eckart',name:'Hồng Eckart',englishName:'Eckart Witzigmann',rarity:'epic',tags:['rose','orange'],yield:2,unitPrice:40,mutationWeight:3,images:{stages:{2:stage('eckart-2.png'),3:stage('eckart-3.png')}}},
  ],
};
export const PLANT_FAMILIES=[ROSE_FAMILY];
export const PLANT_VARIANTS=PLANT_FAMILIES.flatMap((family)=>family.variants);
export const variantById=(id:string)=>PLANT_VARIANTS.find((variant)=>variant.id===id)!;
export const familyById=(id:string)=>PLANT_FAMILIES.find((family)=>family.id===id)!;
export const stagesFor=(variantId:string):PlantStage[]=>Object.keys(variantById(variantId).images.stages).map(Number).sort((a,b)=>a-b)as PlantStage[];
