import { Assets, Graphics, Sprite, Text, TextStyle, Texture } from 'pixi.js';
import { BaseScene } from './BaseScene';
import type { Event } from '../models/Event';

/** Màn hình chi tiết sự kiện, có thể mở rộng nhiệm vụ/phần thưởng sau. */
export class EventScene extends BaseScene {
  readonly sceneName = 'Sự kiện';
  private readonly background = new Graphics();
  private readonly nameText = new Text({ text: '', style: new TextStyle({
    fontFamily: 'Oswald, Arial, sans-serif', fontSize: 27, fontWeight: 'bold', fill: 0x315f45,
  }) });
  private readonly dueText = new Text({ text: '', style: new TextStyle({
    fontFamily: 'Oswald, Arial, sans-serif', fontSize: 16, fill: 0x68604f,
  }) });
  private readonly back = new Text({ text: '← Quay lại', style: new TextStyle({
    fontFamily: 'Oswald, Arial, sans-serif', fontSize: 18, fontWeight: 'bold', fill: 0x356e4e,
  }) });
  private image?: Sprite;
  private imageRequest = 0;

  constructor(private readonly onBack: () => void) {
    super();
    this.addChild(this.background, this.back, this.nameText, this.dueText);
    this.back.eventMode = 'static';
    this.back.cursor = 'pointer';
    this.back.on('pointertap', () => this.onBack());
    this.nameText.anchor.set(0.5, 0);
    this.dueText.anchor.set(0.5, 0);
  }

  showEvent(event: Event): void {
    this.nameText.text = event.name;
    this.dueText.text = `Kết thúc: ${new Date(event.due_date).toLocaleString('vi-VN')}`;
    if (this.image) {
      this.removeChild(this.image);
      this.image.destroy();
      this.image = undefined;
    }
    const request = ++this.imageRequest;
    void Assets.load<Texture>(event.asset).then((texture) => {
      if (this.destroyed || request !== this.imageRequest) return;
      this.image = new Sprite(texture);
      this.image.anchor.set(0.5);
      this.image.eventMode = 'none';
      this.addChild(this.image);
      this.resize(this.sceneWidth, this.sceneHeight);
    }).catch(() => { /* Không có ảnh thì vẫn hiện tên và hạn sự kiện. */ });
    this.resize(this.sceneWidth, this.sceneHeight);
  }

  override resize(width: number, height: number): void {
    super.resize(width, height);
    this.background.clear().rect(0, 0, width, height).fill(0xfff8ed);
    this.back.position.set(20, 18);
    this.nameText.position.set(width / 2, 85);
    this.dueText.position.set(width / 2, 125);
    if (this.image) {
      this.image.position.set(width / 2, height / 2 + 60);
      this.image.scale.set(Math.min(320 / this.image.texture.width, 280 / this.image.texture.height));
    }
  }
}
