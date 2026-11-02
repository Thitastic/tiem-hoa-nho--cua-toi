import { Container, Graphics, Sprite, Text } from 'pixi.js';
import type { Game } from '../Game';
import type { TextureProvider } from '../render/TextureProvider';
import type { Toast } from '../ui/Toast';
import type { ViewportInfo } from '../layout/LayoutManager';
import type { BouquetDef } from '../core/types';
import { computeRegions } from '../layout/LayoutManager';
import { BOUQUETS } from '../data/bouquets';
import { variantById } from '../data/plants/rose';
import { STRINGS } from '../data/strings';
import { LAYOUT } from '../data/layout';
import { THEME } from '../data/theme';
import { ScrollList } from '../ui/ScrollList';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Chip } from '../ui/Chip';
import { CurrencyLabel } from '../ui/CurrencyLabel';
import { fitSprite } from '../render/fitSprite';

export class PackingScene {
  readonly view = new Container();
  private background: Sprite;
  private shade = new Graphics();
  private title = new Text({ text: STRINGS.allRecipes, style: this.textStyle(THEME.font.heading, THEME.colors.textOnDark, true) });
  private list = new ScrollList(LAYOUT.designWidth - LAYOUT.sidePadding * 2, LAYOUT.minHeight);
  private sticky = new Card(LAYOUT.designWidth - LAYOUT.sidePadding * 2, LAYOUT.packing.stickyHeight);
  private selectedName = new Text({ style: this.textStyle(THEME.font.heading, THEME.colors.text, true) });
  private selectedInfo = new Text({ style: { ...this.textStyle(THEME.font.caption, THEME.colors.muted), wordWrap: true } });
  private wrapButton = new Button(STRINGS.wrap, LAYOUT.packing.actionWidth, () => this.wrap());
  private selected = BOUQUETS[0];

  constructor(private game: Game, private textures: TextureProvider, private toast: Toast) {
    this.background = new Sprite(textures.getBackground('packing_table'));
    this.sticky.addChild(this.selectedName, this.selectedInfo, this.wrapButton);
    this.view.addChild(this.background, this.shade, this.title, this.list, this.sticky);
    this.refresh();
  }

  layout(vp: ViewportInfo): void {
    const content = computeRegions(vp).content;
    this.background.width = vp.width;
    this.background.height = vp.height;
    this.shade.clear().rect(0, 0, vp.width, vp.height).fill({ color: THEME.colors.shadow, alpha: LAYOUT.scene.backgroundShadeAlpha });
    this.title.position.set(LAYOUT.sidePadding, content.y + THEME.spacing.sm);
    const stickyY = content.y + content.height - LAYOUT.packing.stickyHeight - THEME.spacing.sm;
    this.list.position.set(LAYOUT.sidePadding, this.title.y + LAYOUT.scene.titleHeight);
    this.list.resize(content.width - LAYOUT.sidePadding * 2, stickyY - THEME.spacing.sm - this.list.y);
    this.sticky.position.set(LAYOUT.sidePadding, stickyY);
    this.sticky.resize(content.width - LAYOUT.sidePadding * 2, LAYOUT.packing.stickyHeight);
    this.selectedName.position.set(THEME.spacing.md, THEME.spacing.md);
    this.selectedInfo.position.set(THEME.spacing.md, THEME.spacing.xl + THEME.spacing.md);
    this.selectedInfo.style.wordWrapWidth = content.width - LAYOUT.sidePadding * 2 - LAYOUT.packing.actionWidth - THEME.spacing.xxl;
    this.wrapButton.position.set(content.width - LAYOUT.sidePadding * 2 - LAYOUT.packing.actionWidth - THEME.spacing.md, LAYOUT.packing.stickyHeight - THEME.spacing.md - THEME.tap.min);
  }

  update(): void {}
  destroy(): void { this.view.destroy({ children: true }); }

  private refresh(): void {
    const width = LAYOUT.designWidth - LAYOUT.sidePadding * 2;
    this.list.setItems(BOUQUETS.map((def) => this.recipeCard(def, width)), LAYOUT.scene.listGap);
    const ingredients = this.selected.ingredients.map((ingredient) => {
      const id = ingredient.match.variantId!;
      return `${variantById(id).name} ${this.game.inventory.count('flowers', id)}/${ingredient.count}`;
    }).join('  •  ');
    this.selectedName.text = this.selected.name;
    this.selectedInfo.text = `${ingredients}\n${this.game.bouquets.canCraft(this.selected) ? STRINGS.recipeReady : STRINGS.recipeMissing}`;
    this.wrapButton.setEnabled(this.game.bouquets.canCraft(this.selected));
  }

  private recipeCard(def: BouquetDef, width: number): Container {
    const card = new Card(width, LAYOUT.packing.cardHeight);
    const icon = new Sprite(this.textures.getItemTexture(def.id));
    icon.position.set(THEME.spacing.md, THEME.spacing.md); fitSprite(icon,LAYOUT.packing.iconSize,LAYOUT.packing.iconSize);
    const name = new Text({ text: def.name, style: this.textStyle(THEME.font.heading, THEME.colors.text, true) });
    name.position.set(THEME.spacing.xxl + LAYOUT.packing.iconSize, THEME.spacing.md);
    const chips = new Container(); const chipAreaWidth=width-name.x-THEME.spacing.md;const chipGap=THEME.spacing.sm;const chipWidth=(chipAreaWidth-chipGap)/2;
    def.ingredients.forEach((ingredient,index)=>{const id=ingredient.match.variantId!;const have=this.game.inventory.count('flowers',id);const chip=new Chip(`${variantById(id).name} ${have}/${ingredient.count}`,have>=ingredient.count,chipWidth);chip.position.set((index%2)*(chipWidth+chipGap),Math.floor(index/2)*(THEME.spacing.xl+chipGap));chips.addChild(chip);});
    chips.position.set(name.x,THEME.spacing.xxl+THEME.spacing.sm);
    const price = new CurrencyLabel(this.textures, `${this.game.bouquets.price(def)} · ${def.points} ${STRINGS.points}`, THEME.font.caption, THEME.colors.primaryDark);
    const actionY=LAYOUT.packing.cardHeight-THEME.tap.min-THEME.spacing.md;price.position.set(THEME.spacing.md,actionY+(THEME.tap.min-THEME.font.caption)/2);
    const select = new Button(STRINGS.select, LAYOUT.packing.actionWidth, () => { this.selected = def; this.refresh(); }, THEME.tap.min, THEME.font.caption);
    select.position.set(width - LAYOUT.packing.actionWidth - THEME.spacing.md,actionY);
    card.addChild(icon, name, chips, price, select);
    return card;
  }

  private wrap(): void {
    if (this.game.bouquets.craft(this.selected)) { this.toast.show(`${STRINGS.wrapped} ${this.selected.name}`); this.refresh(); }
  }

  private textStyle(fontSize: number, fill: number, bold = false) {
    return { fontFamily: THEME.font.family, fontSize, fill, fontWeight: bold ? '700' as const : '400' as const };
  }
}
