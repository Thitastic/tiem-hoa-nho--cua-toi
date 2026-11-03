import type{BouquetDef}from'../core/types';
const v=(variantId:string,count:number)=>({match:{variantId},count});
export const BOUQUETS:BouquetDef[]=[
{id:'bouquet.burning_love',key:'burning_love',name:'Burning Love',ingredients:[v('rose.red_naomi',8)],price:210,points:30,exp:12,tags:['rose'],currencyId:'coin'},
{id:'bouquet.eternal_vow',key:'eternal_vow',name:'Eternal Vow',ingredients:[v('rose.black_baccara',4),v('rose.red_naomi',4)],price:245,points:40,exp:18,tags:['rose'],currencyId:'coin'},
{id:'bouquet.lavender_dream',key:'lavender_dream',name:'Lavender Dream',ingredients:[v('rose.bajou',8)],price:340,points:50,exp:24,tags:['rose'],currencyId:'coin'},
{id:'bouquet.love_symphony',key:'love_symphony',name:'Love Symphony',ingredients:[v('rose.red_naomi',1),v('rose.black_baccara',1),v('rose.bajou',2),v('rose.monica',2),v('rose.masora',1),v('rose.eckart',1)],price:425,points:100,exp:32,tags:['rose'],currencyId:'coin'},
{id:'bouquet.two_hearts',key:'two_hearts',name:'Two Hearts',ingredients:[v('rose.eckart',8)],price:480,points:200,exp:60,tags:['rose'],currencyId:'coin'},
{id:'bouquet.morning_glow',key:'morning_glow',name:'Morning Glow',ingredients:[v('rose.masora',8)],price:480,points:200,exp:60,tags:['rose'],currencyId:'coin'}];
export const bouquetById=(id:string)=>BOUQUETS.find((bouquet)=>bouquet.id===id)!;
