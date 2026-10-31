import{describe,expect,it}from'vitest';import{computeRegions,computeViewport,gridFit}from'./LayoutManager';

describe('computeViewport',()=>{
  it.each([[360,640,1280],[390,844,844/(390/720)],[430,932,932/(430/720)]])('maps phone %sx%s into portrait design space',(width,height,logicalHeight)=>{const result=computeViewport(width,height).viewport;expect(result.width).toBe(720);expect(result.height).toBeCloseTo(logicalHeight,3);expect(result.height).toBeGreaterThanOrEqual(1080);expect(result.height).toBeLessThanOrEqual(1680);});
  it('centers a capped desktop column',()=>{const result=computeViewport(1440,900);expect(result.cssWidth).toBe(480);expect(result.viewport.height).toBe(1350);expect(result.viewport.isDesktopColumn).toBe(true);});
  it('fits landscape by height without rotating the design',()=>{const result=computeViewport(844,390);expect(result.viewport.height).toBe(1080);expect(result.cssWidth).toBeCloseTo(260);});
  it('clamps very tall screens and converts safe insets',()=>{const result=computeViewport(360,1000,{top:20,bottom:10});expect(result.viewport.height).toBe(1680);expect(result.cssHeight).toBe(840);expect(result.viewport.safe.top).toBeCloseTo(40);expect(result.viewport.safe.bottom).toBeCloseTo(20);});
});

describe('layout regions',()=>{it('keeps HUD and tabs inside the centered safe frame',()=>{const vp=computeViewport(390,844).viewport;const regions=computeRegions(vp);expect(regions.frame.height).toBe(1280);expect(regions.hud.y).toBeGreaterThanOrEqual(regions.frame.y);expect(regions.content.y).toBe(regions.hud.y+regions.hud.height);expect(regions.tabs.y+regions.tabs.height).toBeLessThanOrEqual(regions.frame.y+regions.frame.height);});});

describe('gridFit',()=>{it.each([360,390,430,768])('fits a 5x4 grid inside %s units',(width)=>{const grid=gridFit({x:0,y:0,width,height:900},5,4,8,8,1.08);expect(grid.originX).toBeGreaterThanOrEqual(0);expect(grid.originX+grid.width).toBeLessThanOrEqual(width+.001);expect(grid.originY+grid.height).toBeLessThanOrEqual(900+.001);expect(grid.cellWidth).toBeGreaterThan(0);});});

