import { describe,expect,it } from 'vitest';
import { EventBus } from '../core/EventBus';
import { UtcClock } from '../core/UtcClock';
import type { Rng } from '../core/Rng';
import type { GameEvent,PlantFamilyDef } from '../core/types';
import { levelFromExp } from '../core/playerLevel';
import { PLAYER_LEVELS } from '../data/levels';
import { ROSE_FAMILY } from '../data/plants/rose';
import { createDefaultSave,migrateSave } from '../model/SaveData';
import { LevelService } from './LevelService';
import { InventoryService } from './InventoryService';
import { PlantService } from './PlantService';

const emit=(bus:EventBus,type:string,payload:Record<string,unknown>)=>bus.emit({type,at:1,payload});
describe('cấp độ người chơi',()=>{
  it('đúng biên cấp, giới hạn và vẫn tích EXP sau cấp 30',()=>{
    expect(levelFromExp(0,PLAYER_LEVELS)).toBe(1);expect(levelFromExp(99,PLAYER_LEVELS)).toBe(1);
    expect(levelFromExp(100,PLAYER_LEVELS)).toBe(2);expect(levelFromExp(300,PLAYER_LEVELS)).toBe(3);
    expect(levelFromExp(999_999,PLAYER_LEVELS)).toBe(30);
  });
  it('nhảy nhiều cấp, phát EXP/LevelUp và áp dụng expGain',()=>{
    const save=createDefaultSave(0),bus=new EventBus(),seen:GameEvent[]=[];bus.on('*',e=>seen.push(e));
    const service=new LevelService(save,bus,()=>[{stat:'expGain',op:'mult',value:2,source:'test'}],()=>[ROSE_FAMILY]);
    emit(bus,'Harvested',{rarity:'legendary',count:10,familyId:'rose'});
    expect(save.player.totalExp).toBe(300);expect(service.level()).toBe(3);
    expect(seen.filter(e=>e.type==='LevelUp').map(e=>e.payload.level)).toEqual([2,3]);
    expect(seen.find(e=>e.type==='ExpGained')?.payload.amount).toBe(300);
  });
  it('tính EXP thu hoạch, bán cành, bán bó đúng một lần; đóng bó không có EXP',()=>{
    const save=createDefaultSave(0),bus=new EventBus();new LevelService(save,bus,()=>[],()=>[ROSE_FAMILY]);
    emit(bus,'Harvested',{rarity:'rare',count:4});
    emit(bus,'SoldItem',{rarity:'epic',count:2,orderId:'order_1'});
    emit(bus,'BouquetWrapped',{bouquetId:'bouquet.burning_love',count:1});
    emit(bus,'BouquetSold',{bouquetId:'bouquet.burning_love',count:1,orderId:'order_1'});
    emit(bus,'OrderCompleted',{orderId:'order_1'});
    expect(save.player.totalExp).toBe(8+10+12);
  });
  it('cành cộng thêm từ chậu kim cương cũng nhận EXP',()=>{
    const save=createDefaultSave(0),bus=new EventBus();new LevelService(save,bus,()=>[],()=>[ROSE_FAMILY]);
    const pot=save.greenhouses[0].pots[0];pot.potId='pot_diamond';pot.plantUid='plant_ready';
    const plant={uid:'plant_ready',variantId:'rose.red_naomi',seedId:'seed.rose.1',potUid:pot.uid,plantedAt:0,lastWateredAt:0,progressSec:3600,growTimeSecAtPlant:3600};save.plants=[plant];
    const service=new PlantService(save,new InventoryService(save.inventory),new UtcClock({nowUtcMs:()=>1000}),{} as Rng,bus,()=>[]);
    expect(service.harvest(plant)).toBe(4);expect(save.player.totalExp).toBe(4);
  });
  it('giữ mở khóa cũ và thêm loài mới khi đủ cấp',()=>{
    const custom={...ROSE_FAMILY,id:'tulip',name:'Tulip',unlockLevel:2,variants:[]} as PlantFamilyDef;
    const save=createDefaultSave(0);save.player.unlockedFamilyIds=['legacy'];save.player.totalExp=100;
    const level=new LevelService(save,new EventBus(),()=>[],()=>[ROSE_FAMILY,custom]);
    expect(save.player.unlockedFamilyIds).toEqual(expect.arrayContaining(['legacy','rose','tulip']));
    custom.unlockLevel=30;level.reconcileUnlocks();expect(level.isFamilyUnlocked('tulip')).toBe(true);
    expect(level.isRewardItemUnlocked('seed.tulip.1')).toBe(true);expect(level.isRewardItemUnlocked('seed.lily.1')).toBe(false);
  });
  it('migrate save cũ thêm EXP 0 và mở hoa cấp 1',()=>{
    const old=createDefaultSave(123);delete (old.player as Partial<typeof old.player>).totalExp;delete (old.player as Partial<typeof old.player>).unlockedFamilyIds;
    const migrated=migrateSave(old,2,123,'x');expect(migrated.player.totalExp).toBe(0);expect(migrated.player.unlockedFamilyIds).toContain('rose');
  });
});
