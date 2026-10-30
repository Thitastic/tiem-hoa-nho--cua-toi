import type{LootTableDef}from'../core/types';
export const LOOT_TABLES:LootTableDef[]=[{id:'rank4_pot_chest',entries:[{itemId:'pot_marble',weight:80},{itemId:'pot_gold',weight:15},{itemId:'pot_diamond',weight:5}]},{id:'gift_seed_2',entries:[{itemId:'seed.rose.2',weight:1}]},{id:'gift_seed_3',entries:[{itemId:'seed.rose.3',weight:1}]}];
export const lootTableById=(id:string)=>LOOT_TABLES.find((table)=>table.id===id)!;
