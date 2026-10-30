import type{RarityDef}from'../core/types';
export const RARITIES:RarityDef[]=[{id:'common',name:'Thường',order:1,color:0x79a66b,stemPoints:3},{id:'rare',name:'Hiếm',order:2,color:0x5b8fd9,stemPoints:5},{id:'epic',name:'Cực hiếm',order:3,color:0xae74d4,stemPoints:20},{id:'legendary',name:'Huyền thoại',order:4,color:0xe7ac42,stemPoints:50}];
export const rarityById=(id:string)=>RARITIES.find((rarity)=>rarity.id===id)!;
