import type{Reward}from'../core/types';
export interface PlayerLevelDef{level:number;expRequired:number;rewards:Reward[]}
export const PLAYER_LEVEL_CAP=30;
export const PLAYER_LEVELS:PlayerLevelDef[]=Array.from({length:PLAYER_LEVEL_CAP},(_,index)=>{const level=index+1;return{level,expRequired:50*(level-1)*level,rewards:[]};});
export const EXP_SOURCES={harvestPerStem:{common:1,rare:2,epic:5,legendary:15},sellPerStem:{common:1,rare:2,epic:5,legendary:15}}as const;
