import type{UpgradeDef}from'../core/types';
const can=(id:string,name:string,cost:number,reduction:number,level:number):UpgradeDef=>({id,name,shopId:'farm_tools',maxLevel:1,levels:[{cost,currencyId:'coin',effects:[{type:'modifier',modifier:{stat:'waterReduction',op:'add',value:reduction,stackGroup:'watering_can',priority:level,source:`upgrade.${id}`}}]}]});
export const WATERING_CANS:UpgradeDef[]=[can('can_copper','Bình tưới đồng',0,.05,1),can('can_silver','Bình tưới bạc',500,.07,2),can('can_gold','Bình tưới vàng',1000,.1,3),can('can_diamond','Bình tưới kim cương',5000,.15,4)];
