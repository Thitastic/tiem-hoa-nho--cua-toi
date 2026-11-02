import type{Sprite}from'pixi.js';
export const fitSprite=(sprite:Sprite,maxWidth:number,maxHeight:number):void=>{
  const width=sprite.texture.width||1;const height=sprite.texture.height||1;const scale=Math.min(maxWidth/width,maxHeight/height);sprite.scale.set(scale);
};
