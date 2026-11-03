import { describe,expect,it } from 'vitest';
import { EventBus } from '../core/EventBus';
import { Rng } from '../core/Rng';
import { UtcClock } from '../core/UtcClock';
import { createDefaultSave } from '../model/SaveData';
import { InventoryService } from './InventoryService';
import { PlantService } from './PlantService';
import { ShopService } from './ShopService';
import { WalletService } from './WalletService';
import type { UpgradeService } from './UpgradeService';

describe('khóa loài hoa',()=>{
  it('không mua được khi khóa nhưng hạt đã sở hữu vẫn trồng được',()=>{
    const save=createDefaultSave(1000),inventory=new InventoryService(save.inventory),clock=new UtcClock({nowUtcMs:()=>1000}),events=new EventBus(),rng=new Rng(1);
    const shop=new ShopService(save,inventory,new WalletService(save.wallet),{} as UpgradeService,events,clock,rng,()=>false);
    expect(shop.buy({id:'shop.seed.rose.1',shopId:'farm_tools',type:'seed',targetId:'seed.rose.1',order:0})).toBe('locked');
    const before=inventory.count('seeds','seed.rose.1');
    const plantService=new PlantService(save,inventory,clock,rng,events,()=>[]);
    expect(plantService.plant(save.greenhouses[0].pots[0],'seed.rose.1')).not.toBeNull();
    expect(inventory.count('seeds','seed.rose.1')).toBe(before-1);
  });
});
