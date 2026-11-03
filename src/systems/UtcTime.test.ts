import { afterEach, describe, expect, it } from 'vitest';
import { computePlantStatusAt, PlantService } from './PlantService';
import type { PlantInstance } from '../model/PlantInstance';
import { familyById } from '../data/plants/rose';
import { migrateSave } from '../model/SaveData';
import oldSave from '../model/__fixtures__/save-v1.json';
import { InventoryService } from './InventoryService';
import { UtcClock, type TimeSource } from '../core/UtcClock';
import { EventBus } from '../core/EventBus';
import type { Rng } from '../core/Rng';
import { computePlantStage } from '../core/plantStage';
import { Game } from '../Game';
import type { StorageLike } from '../core/SaveManager';
import type { Modifier } from '../core/Modifier';

class FakeTime implements TimeSource { constructor(public value:number) {} nowUtcMs():number { return this.value; } advance(ms:number):void { this.value += ms; } }
class MemoryStorage implements StorageLike {
  data = new Map<string,string>();
  getItem(key:string):string|null { return this.data.get(key) ?? null; }
  setItem(key:string, value:string):void { this.data.set(key, value); }
  removeItem(key:string):void { this.data.delete(key); }
}
const family = familyById('rose');
const basePlant = (overrides:Partial<PlantInstance> = {}):PlantInstance => ({
  uid:'plant', variantId:'rose.red_naomi', seedId:'seed.rose.1', potUid:'pot_start_1',
  plantedAt:1_000_000, lastWateredAt:1_000_000, progressSec:0, growTimeSecAtPlant:family.growTimeSec, ...overrides,
});
const status = (plant:PlantInstance, nowUtc:number, pauses = true) => computePlantStatusAt({
  plant, nowUtc, wateringIntervalSec:family.wateringIntervalSec[0], growthPausesWhenDry:pauses, stageThresholds:family.stageThresholds,
});

describe('thời gian UTC của cây', () => {
  it.each([
    ['30 phút', 30 * 60 * 1000], ['3 giờ', 3 * 60 * 60 * 1000], ['3 ngày', 3 * 24 * 60 * 60 * 1000],
  ])('khôi phục đúng sau khi đóng game %s', (_label, elapsedMs) => {
    const storage = new MemoryStorage(); const time = new FakeTime(1_700_000_000_000);
    const beforeClose = new Game(storage, { clock:new UtcClock(time), origin:'test://utc', production:true });
    const planted = beforeClose.plants.plant(beforeClose.save.greenhouses[0].pots[0], 'seed.rose.1')!; beforeClose.saveNow();
    time.advance(elapsedMs);
    const afterReopen = new Game(storage, { clock:new UtcClock(time), origin:'test://utc', production:true });
    const restored = afterReopen.plants.findPlant(planted.uid)!; const result = afterReopen.plants.status(restored);
    const expectedProgress = Math.min(family.growTimeSec, family.wateringIntervalSec[0], elapsedMs / 1000);
    expect(result.progressSec).toBe(expectedProgress); expect(result.stage).toBe(computePlantStage(expectedProgress / family.growTimeSec, family.stageThresholds));
    expect(result.needsWater).toBe(elapsedMs / 1000 >= family.wateringIntervalSec[0] && !result.ready);
    expect(result.ready).toBe(expectedProgress >= family.growTimeSec);
  });

  it('cho phép tiếp tục lớn khi khô nếu data tắt growthPausesWhenDry', () => {
    const dryHint = status(basePlant(), 1_000_000 + 1_800_000, false);
    expect(dryHint.progressSec).toBe(1800); expect(dryHint.needsWater).toBe(true); expect(dryHint.ready).toBe(false);
    const result = status(basePlant(), 1_000_000 + 3 * 24 * 60 * 60 * 1000, false);
    expect(result.progressSec).toBe(family.growTimeSec); expect(result.ready).toBe(true); expect(result.needsWater).toBe(false);
  });

  it('không phụ thuộc server và không đổi qua nhiều vòng serialize/restart', () => {
    let plant = basePlant(); const now = plant.lastWateredAt + 3 * 60 * 60 * 1000; const expected = status(plant, now);
    for (let restart = 0; restart < 5; restart++) {
      plant = JSON.parse(JSON.stringify(plant)) as PlantInstance;
      expect(status(plant, now)).toEqual(expected);
    }
  });

  it('tưới nhiều lần quanh một khoảng offline vẫn theo đúng công thức timestamp', () => {
    const time = new FakeTime(1_000_000); const clock = new UtcClock(time); const save = migrateSave(oldSave, 1, time.value, 'test://utc');
    save.inventory.seeds = { 'seed.rose.1':1 }; save.plants = []; save.greenhouses[0].pots[0].plantUid = null;
    const service = new PlantService(save, new InventoryService(save.inventory), clock, { next:() => .99, weighted:<T>(items:T[]) => items[0], id:() => 'watered' } as unknown as Rng, new EventBus(), () => []);
    const plant = service.plant(save.greenhouses[0].pots[0], 'seed.rose.1')!;
    time.advance(600_000); expect(service.status(plant).progressSec).toBe(600); service.water(plant);
    time.advance(3 * 60 * 60 * 1000); expect(service.status(plant).progressSec).toBe(2100); expect(service.status(plant).needsWater).toBe(true);
    service.water(plant); time.advance(900_000); expect(service.status(plant).progressSec).toBe(3000);
  });
});

describe('timezone và DST', () => {
  const runtime = globalThis as unknown as { process:{env:Record<string,string|undefined>} };
  const originalTz = runtime.process.env.TZ;
  afterEach(() => { runtime.process.env.TZ = originalTz; });

  it('cho kết quả giống nhau ở Việt Nam, New York và khi đi qua DST', () => {
    const plant = basePlant({ lastWateredAt:1_730_610_000_000, plantedAt:1_730_610_000_000, growTimeSecAtPlant:20_000 });
    const nowAcrossDst = plant.lastWateredAt + 7_200_000;
    const results = ['Asia/Ho_Chi_Minh', 'America/New_York'].map((tz) => { runtime.process.env.TZ = tz; return status(plant, nowAcrossDst, false); });
    expect(results[0]).toEqual(results[1]); expect(results[0].progressSec).toBe(7200);
  });
});

describe('migration và đơn hàng', () => {
  it('migrate fixture v1 giữ stage và chụp growTime đúng một lần', () => {
    const beforeRatio = Math.min((oldSave.savedAt - oldSave.plants[0].lastWateredAt) / 1000, family.wateringIntervalSec[0]) / family.growTimeSec;
    const migrated = migrateSave(oldSave, 1, oldSave.savedAt, 'http://localhost:5173'); const plant = migrated.plants[0];
    expect(migrated.saveVersion).toBe(3); expect(migrated.lastSeenUtc).toBe(oldSave.savedAt); expect(migrated.originAtSave).toBe('http://localhost:5173');
    expect(migrated.orders[0]).toMatchObject({ uid:'order_old', status:'Open', createdAt:1_200_000, expiresAt:8_400_000 });
    expect(status(plant, oldSave.savedAt).stage).toBe(computePlantStage(beforeRatio, family.stageThresholds));
    const snapshot = plant.growTimeSecAtPlant; let modifiers:Modifier[] = [];
    const service = new PlantService(migrated, new InventoryService(migrated.inventory), new UtcClock({ nowUtcMs:() => oldSave.savedAt }), { next:() => 0, weighted:<T>(items:T[]) => items[0], id:() => '' } as unknown as Rng, new EventBus(), () => modifiers);
    modifiers = [{ stat:'growTime', op:'mult', value:.3, source:'test.buff' }];
    expect(service.status(plant).growTimeSec).toBe(snapshot);
  });

  it('dịch timeline clock ảo v1 nằm trong tương lai mà vẫn giữ stage', () => {
    const now = 1_700_000_000_000; const futureSave = JSON.parse(JSON.stringify(oldSave)) as typeof oldSave;
    futureSave.savedAt = now + 3_600_000; futureSave.plants[0].plantedAt = futureSave.savedAt - 600_000; futureSave.plants[0].lastWateredAt = futureSave.savedAt - 600_000;
    futureSave.orders[0].createdAt = futureSave.savedAt - 300_000; futureSave.orders[0].expiresAt = futureSave.orders[0].createdAt + 7_200_000;
    const migrated = migrateSave(futureSave, 1, now, 'test://utc');
    expect(migrated.savedAt).toBe(now); expect(migrated.plants[0].lastWateredAt).toBe(now - 600_000);
    expect(migrated.orders[0].expiresAt - migrated.orders[0].createdAt).toBe(futureSave.orders[0].expiresAt - futureSave.orders[0].createdAt);
    expect(status(migrated.plants[0], now).stage).toBe(computePlantStage(600 / family.growTimeSec, family.stageThresholds));
  });

  it('clock lùi không giảm tiến độ và đơn hết hạn chỉ fail đúng một lần', () => {
    const storage = new MemoryStorage(); const time = new FakeTime(2_000_000); const clock = new UtcClock(time);
    const game = new Game(storage, { clock, origin:'test://utc', production:true });
    const order = game.orders.open()[0]; game.favor.set(order.customerId, 1); order.expiresAt = time.value + 100;
    let expiredEvents = 0; game.events.on('OrderExpired', () => { expiredEvents++; });
    time.advance(200); game.reconcile(); const favorAfter = game.favor.get(order.customerId).favor;
    game.saveNow(); const progressBeforeClockChange = status(basePlant({ lastWateredAt:2_000_000 }), clock.now()).progressSec; time.value = 1_000_000; game.reconcile();
    expect(order.status).toBe('Expired'); expect(expiredEvents).toBe(1); expect(game.favor.get(order.customerId).favor).toBe(favorAfter); expect(favorAfter).toBeGreaterThanOrEqual(0);
    const plant = basePlant({ lastWateredAt:2_000_000 }); expect(status(plant, clock.now()).progressSec).toBe(progressBeforeClockChange);
  });

  it('đơn quá hạn lúc load được ghi nhận đúng một lần qua nhiều restart', () => {
    const storage = new MemoryStorage(); const time = new FakeTime(5_000_000);
    const first = new Game(storage, { clock:new UtcClock(time), origin:'test://utc', production:true });
    const order = first.orders.open()[0]; first.favor.set(order.customerId, 10); order.expiresAt = time.value - 1; first.saveNow();
    const second = new Game(storage, { clock:new UtcClock(time), origin:'test://utc', production:true });
    const favorAfterExpiration = second.favor.get(order.customerId).favor;
    expect(second.save.orders.find((item) => item.uid === order.uid)?.status).toBe('Expired');
    const third = new Game(storage, { clock:new UtcClock(time), origin:'test://utc', production:true });
    expect(third.favor.get(order.customerId).favor).toBe(favorAfterExpiration); expect(favorAfterExpiration).toBeGreaterThanOrEqual(0);
  });
});
