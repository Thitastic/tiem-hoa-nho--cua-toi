import type { StorageLike } from './SaveManager';

export interface TimeSource { nowUtcMs(): number }

export interface UtcSyncOptions {
  enabled: boolean;
  url: string;
  timeoutMs: number;
  storageKey: string;
}

export interface UtcClockOptions {
  storage?: StorageLike;
  debugStorageKey?: string;
  production?: boolean;
}

const systemTimeSource: TimeSource = { nowUtcMs: () => Date.now() };

export class UtcClock {
  private source: TimeSource;
  private highestSeen = 0;
  private syncOffsetMs = 0;
  private debugOffsetMs = 0;
  private readonly storage?: StorageLike;
  private readonly debugStorageKey?: string;
  private readonly production: boolean;

  constructor(source: TimeSource = systemTimeSource, options: UtcClockOptions = {}) {
    this.source = source;
    this.storage = options.storage;
    this.debugStorageKey = options.debugStorageKey;
    this.production = options.production ?? false;
    if (!this.production && this.storage && this.debugStorageKey) {
      this.debugOffsetMs = this.readStoredNumber(this.debugStorageKey);
    }
  }

  now(): number {
    const candidate = Math.floor(this.source.nowUtcMs() + this.syncOffsetMs + (this.production ? 0 : this.debugOffsetMs));
    this.highestSeen = Math.max(this.highestSeen, candidate);
    return this.highestSeen;
  }

  lastSeen(): number { return this.highestSeen; }

  setTimeSource(source: TimeSource): void { this.source = source; }

  restoreLastSeen(lastSeenUtc: number): void {
    if (Number.isFinite(lastSeenUtc)) this.highestSeen = Math.max(this.highestSeen, Math.floor(lastSeenUtc));
  }

  getDebugOffsetMs(): number { return this.production ? 0 : this.debugOffsetMs; }

  advanceDebug(ms: number): void {
    if (this.production || !Number.isFinite(ms) || ms <= 0) return;
    this.debugOffsetMs = Math.floor(this.debugOffsetMs + ms);
    this.persistDebugOffset();
    this.now();
  }

  resetDebugTime(): void {
    if (this.production) return;
    this.debugOffsetMs = 0;
    this.persistDebugOffset();
  }

  async syncFromNetwork(options: UtcSyncOptions): Promise<boolean> {
    this.syncOffsetMs = 0;
    if (!options.enabled) return false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
    try {
      const startedAt = this.source.nowUtcMs();
      const response = await fetch(options.url, { method: 'HEAD', cache: 'no-store', signal: controller.signal });
      const endedAt = this.source.nowUtcMs();
      const serverUtc = Date.parse(response.headers.get('date') ?? '');
      if (!response.ok || !Number.isFinite(serverUtc)) return false;
      this.syncOffsetMs = Math.round(serverUtc + (endedAt - startedAt) / 2 - endedAt);
      this.storage?.setItem(options.storageKey, String(this.syncOffsetMs));
      return true;
    } catch {
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }

  private persistDebugOffset(): void {
    if (this.storage && this.debugStorageKey) this.storage.setItem(this.debugStorageKey, String(this.debugOffsetMs));
  }

  private readStoredNumber(key: string): number {
    const value = Number(this.storage?.getItem(key));
    return Number.isFinite(value) ? Math.floor(value) : 0;
  }
}
