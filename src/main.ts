import { Application, Graphics, Text } from 'pixi.js';
import './style.css';
import { ASSET_MANIFEST } from './data/assetPaths';
import { AssetLoader } from './render/AssetLoader';
import { PlaceholderFactory } from './render/PlaceholderFactory';
import { TextureProvider } from './render/TextureProvider';
import { Game } from './Game';
import { SceneManager } from './scenes/SceneManager';
import { Hud } from './ui/Hud';
import { TabBar, type SceneId } from './ui/TabBar';
import { Toast } from './ui/Toast';
import { Modal } from './ui/Modal';
import { BottomSheet } from './ui/BottomSheet';
import { InventorySheet } from './ui/InventorySheet';
import { QuestSheet } from './ui/QuestSheet';
import { ScrollList } from './ui/ScrollList';
import { Button } from './ui/Button';
import { DebugPanel } from './debug/DebugPanel';
import { DebugOverlay } from './debug/DebugOverlay';
import { STRINGS } from './data/strings';
import { LAYOUT } from './data/layout';
import { THEME } from './data/theme';
import { LayoutManager, type ViewportInfo } from './layout/LayoutManager';

async function main(): Promise<void> {
  const outer = document.querySelector<HTMLDivElement>('#app')!;
  const shell = document.querySelector<HTMLDivElement>('#game-shell')!;
  const safeProbe = document.querySelector<HTMLDivElement>('#safe-area-probe')!;
  const cssColor=(value:number)=>`#${value.toString(16).padStart(6,'0')}`;const cssRgba=(value:number,alpha:number)=>`rgba(${value>>16&255},${value>>8&255},${value&255},${alpha})`;const rootStyle=document.documentElement.style;rootStyle.setProperty('--game-page',cssColor(THEME.colors.page));rootStyle.setProperty('--game-background',cssColor(THEME.colors.background));rootStyle.setProperty('--game-column-shadow',`0 0 ${LAYOUT.desktopShadowBlurCss}px ${cssRgba(THEME.colors.shadow,THEME.shadow.alpha)}`);document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content',cssColor(THEME.colors.page));
  const app = new Application();
  await app.init({
    resizeTo: shell, background: THEME.colors.background, backgroundAlpha: 1, antialias: false,
    resolution: Math.min(devicePixelRatio || 1, 2), autoDensity: true, powerPreference: 'high-performance',
    sharedTicker: false, gcActive: true, eventFeatures: { move: true, globalMove: true, click: true, wheel: true },
  });
  shell.appendChild(app.canvas); ScrollList.configure(app.ticker); BottomSheet.configure(app.ticker);

  let manager: SceneManager | undefined; let hud: Hud | undefined; let tabs: TabBar | undefined; let toast: Toast | undefined;
  let modal: Modal | undefined; let sheet: BottomSheet | undefined; let overlay: DebugOverlay | undefined; let currentViewport: ViewportInfo | undefined;
  const layout = new LayoutManager(outer, shell, safeProbe, (vp) => {
    currentViewport = vp; app.resize(); app.stage.scale.set(vp.scale); app.stage.position.set(0, 0);
    manager?.layout(vp); hud?.layout(vp); tabs?.layout(vp); toast?.layout(vp); sheet?.layout(vp); modal?.layout(vp); overlay?.layout(vp);
  });
  const stopBrowserGesture = (event: Event) => event.preventDefault();
  app.canvas.addEventListener('contextmenu', stopBrowserGesture); app.canvas.addEventListener('touchmove', stopBrowserGesture, { passive: false });
  app.canvas.addEventListener('dblclick', stopBrowserGesture); document.addEventListener('gesturestart', stopBrowserGesture, { passive: false });

  const loadingBg = new Graphics().rect(0, 0, LAYOUT.designWidth, LAYOUT.safeFrameHeight).fill(THEME.colors.background);
  const loadingText = new Text({ text: STRINGS.loading, style: { fontFamily: THEME.font.family, fontSize: THEME.font.heading, fontWeight: '700', fill: THEME.colors.textOnDark } });
  loadingText.anchor.set(.5); loadingText.position.set(LAYOUT.designWidth / 2, LAYOUT.safeFrameHeight / 2); app.stage.addChild(loadingBg, loadingText); layout.refresh();
  const loader = new AssetLoader(); await loader.load(ASSET_MANIFEST); app.stage.removeChild(loadingBg, loadingText); loadingBg.destroy(); loadingText.destroy();
  const textures = new TextureProvider(loader, new PlaceholderFactory(app.renderer)); Button.configure(textures);

  const game = new Game(); toast = new Toast(textures); modal = new Modal(); sheet = new BottomSheet(); let debug: DebugPanel | undefined; let active: SceneId = 'greenhouse';
  const showSettings = () => modal!.menu(STRINGS.settings, STRINGS.settingsHint, [{ label: STRINGS.deleteData, action: () => modal!.confirm(STRINGS.deleteData, STRINGS.deleteConfirm, () => { game.deleteSave(); toast!.show(STRINGS.reloadAfterDelete); setTimeout(() => location.reload(), 800); }) }]);
  const inventorySheet = new InventorySheet(game, textures, sheet, modal); const questSheet = new QuestSheet(game, sheet, textures);
  tabs = new TabBar((id) => { active = id; tabs!.setActive(id); manager!.change(id); }); tabs.setActive(active);
  hud = new Hud(game, { onInventory: () => inventorySheet.open(), onQuests: () => questSheet.open(), onSettings: showSettings, onDebugToggle: () => debug?.toggle() });
  manager = new SceneManager(app, game, textures, toast, modal, sheet); manager.change(active);
  overlay = new DebugOverlay(app.stage); debug = new DebugPanel(game, toast, sheet, () => overlay!.toggle());
  app.stage.addChild(hud, tabs, toast, overlay, sheet, modal);
  if (currentViewport) { manager.layout(currentViewport); hud.layout(currentViewport); tabs.layout(currentViewport); toast.layout(currentViewport); sheet.layout(currentViewport); modal.layout(currentViewport); overlay.layout(currentViewport); }

  game.progress.onRankUp((rank, name) => toast!.show(`${STRINGS.rankUp} ${rank}: ${name}`)); game.events.on('OrderCreated', () => toast!.show(STRINGS.newOrder));
  app.ticker.add(() => { game.tick(); manager!.update(); hud!.update(); toast!.update(); debug!.update(); });
  const save = () => game.saveNow();
  const visibility = () => { if (document.hidden) { save(); app.stop(); } else { game.tick(); layout.refresh(); manager!.update(); hud!.update(true); app.start(); } };
  document.addEventListener('visibilitychange', visibility); window.addEventListener('pagehide', save); window.addEventListener('beforeunload', save); layout.refresh();
}

main().catch((error) => { console.error(error); document.body.textContent = STRINGS.startupError; });
