export interface Scope { family?: string; rarity?: string; variantId?: string; tag?: string }
export interface StatContext extends Scope { base: number; tags?: string[] }
export interface Match { variantId?: string; rarity?: string; tag?: string; familyId?: string; itemId?: string }
export interface InventoryData { seeds:Record<string,number>;flowers:Record<string,number>;bouquets:Record<string,number>;pots:Record<string,number>;items:Record<string,number> }
export interface WalletData { [currencyId:string]:number }
export interface RarityDef { id:string;name:string;order:number;color:number;stemPoints:number }
export type PlantStage=0|1|2|3|4;
export interface PlantStageImageDef{file:string;displayScale?:number}
export interface PlantVariantDef { id:string;familyId:string;variantKey:string;name:string;englishName:string;rarity:string;tags:string[];yield:number;unitPrice:number;mutationWeight:number;images:{stages:Partial<Record<PlantStage,PlantStageImageDef>>;displayScale?:number} }
export interface PlantFamilyDef { id:string;name:string;baseVariantId:string;growTimeSec:number;wateringIntervalSec:number[];mutationChance:number;revealVariantFromStage:number;stageThresholds:number[];witherAfterSec:number|null;tempRange:number[];images:{folder:string;shared:Partial<Record<PlantStage,PlantStageImageDef>>;displayScale?:number;plantOffset:{x:number;y:number}};variants:PlantVariantDef[] }
export interface SeedDef { id:string;familyId:string;name:string;starLevel:number;mutationBonus:number;forceMutation:boolean;minRarity?:string;price:number|null;currencyId:string;shopId:string|null }
export interface PotDef { id:string;name:string;rarity:string;price:number|null;currencyId:string;image:string|null;suggestedImage:string;displayScale:number;plantOffset:{x:number;y:number};modifiers:import('./Modifier').Modifier[];priceFormula:{enabled:boolean;growth:number} }
export interface GreenhouseDef { id:string;index:number;name:string;slotsGrid:{w:number;h:number};buildCost:number;currencyId:string;environment:{temperature:number|null};slotLayout:{insetX:number;offsetY:number;gapX:number;gapY:number;cellAspect:number} }
export interface BouquetIngredient { match:Match;count:number }
export interface BouquetDef { id:string;key:string;name:string;ingredients:BouquetIngredient[];price:number;points:number;tags:string[];currencyId:string }
export interface RewardModifier { type:'modifier';modifier:import('./Modifier').Modifier }
export type Reward=RewardModifier|{type:'item';itemId:string;count:number}|{type:'lootTable';id:string}|{type:'unlock';targetId:string}|{type:'currency';id:string;amount:number};
export interface UpgradeDef { id:string;name:string;shopId:string;maxLevel:number;levels:{cost:number;currencyId:string;requires?:string;effects:Reward[]}[] }
export interface ShopEntry { id:string;shopId:string;type:'seed'|'pot'|'upgrade'|'greenhouse';targetId:string;order:number }
export interface LootTableDef { id:string;entries:{itemId:string;weight:number}[] }
export interface QuestDef { id:string;name:string;condition:{event:string;filter?:Record<string,string|number>;count:number};rewardPoints:number }
export interface MilestoneDef { rank:number;points:number;name:string;rewards:Reward[] }
export interface ProgressTrackDef { id:string;familyId:string;name:string;milestones:MilestoneDef[];quests:QuestDef[] }
export interface FavorLevelDef { id:string;name:string;minFavor:number;frequencyMult:number }
export interface OrderTemplateDef { id:string;name:string;kind:'single'|'bouquet';lines:{match:Match;count:number}[];waitTimeSec:number;priceMult:number;favorOnComplete:number;favorOnFail:number;minFavorLevel?:string }
export interface CustomerDef { id:string;name:string;archetype:string;archetypeKey:string;tags:string[];preferences:{match:Match;weight:number}[];orderTemplates:{templateId:string;weight:number;minFavorLevel:string}[];giftTable:{minFavorLevel:string;chance:number;lootTableId:string}[] }
export interface GameEvent { type:string;at:number;payload:Record<string,unknown> }
export type OrderStatus='Open'|'Done'|'Rejected'|'Expired';
