import{describe,expect,it}from'vitest';
import{computePlantStage}from'./plantStage';

describe('computePlantStage',()=>{
  const thresholds=[0,.20,.45,.75,1];
  it.each([
    [0,0],[.199999,0],[.20,1],[.449999,1],[.45,2],[.749999,2],[.75,3],[.999999,3],[1,4],
  ])('ánh xạ tiến độ %s thành giai đoạn %s',(ratio,stage)=>expect(computePlantStage(ratio,thresholds)).toBe(stage));
  it('chặn tiến độ ngoài khoảng hợp lệ',()=>{expect(computePlantStage(-1,thresholds)).toBe(0);expect(computePlantStage(2,thresholds)).toBe(4);});
});
