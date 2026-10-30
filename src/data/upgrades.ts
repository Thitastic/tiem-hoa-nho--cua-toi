import{WATERING_CANS}from'./wateringCans';
export const UPGRADES=[...WATERING_CANS];export const upgradeById=(id:string)=>UPGRADES.find((upgrade)=>upgrade.id===id)!;
