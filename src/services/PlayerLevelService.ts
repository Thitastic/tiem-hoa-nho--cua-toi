import { PlayerLevel, type PlayerLevelData } from '../models/PlayerLevel';

const SAVE_KEY = 'flower-shop:player-level:v1';

/** Lưu tiến trình offline trên cùng trình duyệt; sau này có thể thay bằng API/DB. */
export class PlayerLevelStorage {
    static load(): PlayerLevel {
        try {
            const raw = localStorage.getItem(SAVE_KEY);
            if (!raw) return new PlayerLevel();
            const data = JSON.parse(raw) as PlayerLevelData;
            return new PlayerLevel(data);
        } catch (error) {
            console.warn('Không đọc được tiến trình cấp độ, dùng dữ liệu mới:', error);
            return new PlayerLevel();
        }
    }

    static save(progress: PlayerLevel): boolean {
        try {
            localStorage.setItem(SAVE_KEY, JSON.stringify(progress.snapshot));
            return true;
        } catch (error) {
            console.warn('Không lưu được tiến trình cấp độ:', error);
            return false;
        }
    }
}