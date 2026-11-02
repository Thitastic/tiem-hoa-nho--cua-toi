export const assetConfig={
  scaleMode:'linear' as const,
  useBloomAsStemIcon:true,
  potSourceBasis:200,
  plantSourceHeightBasis:647,
  wateringCanTint:{can_copper:0xb87333,can_silver:0xc7d0d9,can_gold:0xf2c94c,can_diamond:0x70e7ef}as Record<string,number>,
}as const;
