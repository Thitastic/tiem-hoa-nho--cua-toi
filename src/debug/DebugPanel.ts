import { Container, Text } from 'pixi.js';
import type { Game } from '../Game';
import type { Toast } from '../ui/Toast';
import type { BottomSheet } from '../ui/BottomSheet';
import { GAME_CONFIG, STAT_LIMITS } from '../data/config';
import { STRINGS } from '../data/strings';
import { LAYOUT } from '../data/layout';
import { THEME } from '../data/theme';
import { Button } from '../ui/Button';
import { ScrollList } from '../ui/ScrollList';
import { allSeeds } from '../data/seeds';
import { POTS } from '../data/pots';
import { allPlantVariants } from '../data/catalogRegistry';
import { StatResolver } from '../core/Modifier';
import { resolvePlantAsset } from '../data/assetPaths';
import { EXP_SOURCES, PLAYER_LEVELS } from '../data/levels';

export class DebugPanel {
  private details?: Text;
  private opened = false;
  private lastSecond = -1;
  private keyDown = (event: KeyboardEvent) => { if (event.key === '`') this.toggle(); };

  constructor(private game: Game, private toast: Toast, private sheet: BottomSheet, private toggleOverlay: () => boolean) { window.addEventListener('keydown', this.keyDown); }

  toggle(): void { if (this.opened) { this.opened = false; this.sheet.close(); } else this.open(); }
  destroy(): void { window.removeEventListener('keydown', this.keyDown); }

  update(): void {
    if (!this.opened || !this.details) return; const second = Math.floor(this.game.clock.now() / 1000); if (second === this.lastSecond) return; this.lastSecond = second;
    const resolver = new StatResolver(() => this.game.globalModifiers(), STAT_LIMITS);
    const stats = ['mutationChance', 'growTime', 'sellPrice', 'bouquetPrice', 'waterReduction'].map((stat) => {
      const result = resolver.explain(stat, { base: stat === 'growTime' ? 3600 : stat.includes('Price') ? 100 : 0, family: 'rose', tag: 'rose', tags: ['rose'] });
      return `${stat}: ${result.result.toFixed(2)} · ${result.active.map((modifier) => modifier.source).join(', ') || '—'}`;
    });
    const variants=allPlantVariants();const selected=this.game.plants.findPlant(this.game.plants.debugSelectedPlantUid);const variantId=selected?.variantId??this.game.plants.forcedVariantId??variants[0].id;const stage=this.game.plants.forcedStage??0;const image=resolvePlantAsset(variantId,stage as 0|1|2|3|4);
    const warnings=this.game.originMismatch?[STRINGS.originMismatch]:[];
    this.details.text=[...warnings,...stats,`${STRINGS.exp}: ${this.game.save.player.totalExp} · ${STRINGS.level} ${this.game.level.level()}`,`${STRINGS.expSourceHarvest}: ${JSON.stringify(EXP_SOURCES.harvestPerStem)}`,`${STRINGS.expSourceSell}: ${JSON.stringify(EXP_SOURCES.sellPerStem)}`,`stage: ${this.game.plants.forcedStage??'auto'} · ${image?.path??'placeholder'}`].join('\n');
  }

  private open(): void {
    this.opened = true; const root = new Container(); const width = LAYOUT.designWidth - LAYOUT.sheet.sidePadding * 2; const list = new ScrollList(width, LAYOUT.sheet.maxHeight); root.addChild(list);
    const rows: Container[] = []; const actions: { label: string; action: () => void }[] = [
      { label: STRINGS.advanceHour, action: () => this.game.clock.advanceDebug(GAME_CONFIG.advanceHourMs) }, { label: STRINGS.advanceDay, action: () => this.game.clock.advanceDebug(GAME_CONFIG.advanceDayMs) },
      { label: STRINGS.resetDebugTime, action: () => this.game.clock.resetDebugTime() },
      { label: STRINGS.addCoins, action: () => this.game.wallet.add('coin', GAME_CONFIG.debugAddCoins) }, { label: STRINGS.addPoints, action: () => this.game.progress.addPoints(GAME_CONFIG.debugAddPoints) },
      { label: STRINGS.addExp, action: () => this.game.level.addExp(GAME_CONFIG.debugAddExp,'debug',{type:'DebugExp',at:this.game.clock.now(),payload:{}}) },
      { label: STRINGS.setLevel, action: () => {const next=Math.min(PLAYER_LEVELS.length,this.game.level.level()+1);this.game.level.setTotalExp(PLAYER_LEVELS[next-1].expRequired);} },
      { label: STRINGS.resetExp, action: () => this.game.level.setTotalExp(0) },
      { label: STRINGS.generateOrder, action: () => this.game.orders.generate() }, { label: STRINGS.debugOverlay, action: () => this.toggleOverlay() },
      ...allSeeds().map((seed) => ({ label: `${STRINGS.addSeed} ${seed.starLevel}★`, action: () => this.game.inventory.add('seeds', seed.id, 1) })),
      ...POTS.map((pot) => ({ label: pot.name, action: () => this.game.inventory.add('pots', pot.id, 1) })),
      { label: STRINGS.forceVariant, action: () => { const variants=allPlantVariants();const current = this.game.plants.forcedVariantId; const index = variants.findIndex((variant) => variant.id === current); this.game.plants.forcedVariantId = variants[(index + 1) % variants.length]?.id ?? null; this.toast.show(this.game.plants.forcedVariantId ?? STRINGS.automatic); } },
      { label: `${STRINGS.forceStage}: ${this.game.plants.forcedStage??STRINGS.automatic}`, action: () => { const selected=this.game.plants.findPlant(this.game.plants.debugSelectedPlantUid);if(!selected){this.toast.show(STRINGS.selectPlantForDebug);return;}const current=this.game.plants.forcedStage;this.game.plants.forcedStage=current===null?0:current>=4?null:current+1;const asset=this.game.plants.forcedStage===null?undefined:resolvePlantAsset(selected.variantId,this.game.plants.forcedStage as 0|1|2|3|4);this.toast.show(this.game.plants.forcedStage===null?STRINGS.automatic:`${STRINGS.stage} ${this.game.plants.forcedStage}: ${asset?.file??'placeholder'}`);this.opened=false;this.open(); } },
    ];
    const gap = THEME.tap.gap; const buttonWidth = (width - gap) / 2;
    for (let index = 0; index < actions.length; index += 2) { const row = new Container(); actions.slice(index, index + 2).forEach((action, column) => { const button = new Button(action.label, buttonWidth, action.action, THEME.tap.min, THEME.font.caption); button.x = column * (buttonWidth + gap); row.addChild(button); }); rows.push(row); }
    const details = new Text({ style: { fontFamily: THEME.font.family, fontSize: THEME.font.caption, fill: THEME.colors.text, wordWrap: true, wordWrapWidth: width, lineHeight: THEME.font.body } }); this.details = details; rows.push(new Container()); rows.at(-1)!.addChild(details);
    list.setItems(rows, gap); this.sheet.show(STRINGS.debug, root, LAYOUT.sheet.maxHeight, (innerWidth, innerHeight) => list.resize(innerWidth, innerHeight)); this.update();
  }
}
