// @ts-expect-error Vitest chạy trong Node; app production không kéo node types.
import{existsSync}from'node:fs';
// @ts-expect-error Vitest chạy trong Node; app production không kéo node types.
import{resolve}from'node:path';
import{describe,expect,it}from'vitest';
import{ASSET_MANIFEST,resolvePlantAsset,resolveStemAsset}from'./assetPaths';
declare const process:{cwd:()=>string};

describe('asset manifest',()=>{
  it('mọi mục đánh dấu present đều có trên đĩa',()=>{
    for(const entry of ASSET_MANIFEST.filter((item)=>item.present))expect(existsSync(resolve(process.cwd(),'public',entry.path.replace(/^\//,''))),entry.path).toBe(true);
  });
  it.each(['rose.bajou','rose.eckart','rose.masora'])('%s dùng ảnh giai đoạn 3 khi sẵn sàng',(variantId)=>{
    const asset=resolvePlantAsset(variantId,4);expect(asset?.sourceStage).toBe(3);expect(asset?.key).toBe(`plant:${variantId}:3`);
  });
  it('mọi variant có texture key cho đủ năm giai đoạn',()=>{
    for(const variantId of['rose.red_naomi','rose.black_baccara','rose.monica','rose.bajou','rose.eckart','rose.masora'])for(const stage of[0,1,2,3,4]as const)expect(resolvePlantAsset(variantId,stage)?.key,`${variantId} stage ${stage}`).toBeTruthy();
  });
  it('stem dùng ảnh nở cao nhất mà không cần file riêng',()=>expect(resolveStemAsset('rose.bajou')?.sourceStage).toBe(3));
});
