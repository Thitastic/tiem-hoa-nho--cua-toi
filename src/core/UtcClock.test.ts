import { describe, expect, it } from 'vitest';
import { UtcClock, type TimeSource } from './UtcClock';
import type { StorageLike } from './SaveManager';

class FakeTime implements TimeSource { constructor(public value:number) {} nowUtcMs():number { return this.value; } }
class MemoryStorage implements StorageLike {
  data = new Map<string,string>();
  getItem(key:string):string|null { return this.data.get(key) ?? null; }
  setItem(key:string, value:string):void { this.data.set(key, value); }
  removeItem(key:string):void { this.data.delete(key); }
}

describe('UtcClock', () => {
  it('không lùi sau mốc lastSeen đã lưu', () => {
    const source = new FakeTime(2_000); const clock = new UtcClock(source);
    expect(clock.now()).toBe(2_000); clock.restoreLastSeen(5_000); source.value = 1_000;
    expect(clock.now()).toBe(5_000); expect(clock.lastSeen()).toBe(5_000);
  });

  it('lưu debugOffset riêng và bỏ qua hoàn toàn trong production', () => {
    const storage = new MemoryStorage(); const source = new FakeTime(10_000);
    const dev = new UtcClock(source, { storage, debugStorageKey:'debug', production:false });
    dev.advanceDebug(3_600_000); expect(dev.now()).toBe(3_610_000); expect(storage.getItem('debug')).toBe('3600000');
    expect(new UtcClock(source, { storage, debugStorageKey:'debug', production:false }).now()).toBe(3_610_000);
    const production = new UtcClock(source, { storage, debugStorageKey:'debug', production:true });
    production.advanceDebug(3_600_000); expect(production.getDebugOffsetMs()).toBe(0); expect(production.now()).toBe(10_000);
  });
});
