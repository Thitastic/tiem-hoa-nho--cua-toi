import type{PotDef}from'../core/types';

interface PotArt{image:string|null;suggestedImage:string;displayScale?:number;plantOffset?:{x:number;y:number}}
const pot=(id:string,name:string,rarity:string,price:number|null,grow:number,mutation:number,art:PotArt,yieldBonus=0):PotDef=>({
  id,name,rarity,price,currencyId:'coin',image:art.image,suggestedImage:art.suggestedImage,displayScale:art.displayScale??1,
  plantOffset:art.plantOffset??{x:0,y:0},priceFormula:{enabled:false,growth:0},
  modifiers:[...(grow?[{stat:'growTime',op:'mult' as const,value:1-grow,scope:{family:'rose'},source:`pot.${id}`}]:[]),...(mutation?[{stat:'mutationChance',op:'add' as const,value:mutation,scope:{family:'rose'},source:`pot.${id}`}]:[]),...(yieldBonus?[{stat:'yield',op:'add' as const,value:yieldBonus,source:`pot.${id}`}]:[])],
});

export const POTS:PotDef[]=[
  pot('pot_common','Chậu thường','common',5,0,0,{image:'pots/chau-thuong.png',suggestedImage:'pots/chau-thuong.png'}),
  pot('pot_terracotta','Chậu đất nung','common',50,.02,.02,{image:'pots/chau-dat-nung.png',suggestedImage:'pots/chau-dat-nung.png',plantOffset:{x:0,y:1}}),
  pot('pot_granite','Chậu đá hoa cương','rare',250,.03,.03,{image:'pots/chau-hoa-cuong.png',suggestedImage:'pots/chau-hoa-cuong.png',plantOffset:{x:0,y:1}}),
  pot('pot_marble','Chậu cẩm thạch','epic',500,.04,.05,{image:'pots/chau-cam-thach.png',suggestedImage:'pots/chau-cam-thach.png',plantOffset:{x:0,y:2}}),
  pot('pot_gold','Chậu vàng','legendary',null,.05,.07,{image:null,suggestedImage:'pots/chau-vang.png'}),
  pot('pot_diamond','Chậu kim cương','legendary',null,.06,.1,{image:'pots/chau-kim-cuong.png',suggestedImage:'pots/chau-kim-cuong.png',plantOffset:{x:0,y:2}},1),
];
export const potById=(id:string)=>POTS.find((item)=>item.id===id)!;
