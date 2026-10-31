import { Container, Text } from 'pixi.js';
import type { Game } from '../Game';
import type { BottomSheet } from './BottomSheet';
import { ROSE_TRACK } from '../data/tracks/roseTrack';
import { STRINGS } from '../data/strings';
import { LAYOUT } from '../data/layout';
import { THEME } from '../data/theme';
import { Card } from './Card';
import { ProgressBar } from './ProgressBar';
import { ScrollList } from './ScrollList';

export class QuestSheet {
  constructor(private game: Game, private sheet: BottomSheet) {}

  open(): void {
    const root = new Container(); const width = LAYOUT.designWidth - LAYOUT.sheet.sidePadding * 2;
    const track = new Card(width, LAYOUT.quests.trackHeight); const rank = this.game.progress.rank(); const points = this.game.progress.points();
    const title = new Text({ text: `${STRINGS.rankTrack} · ${STRINGS.rank} ${rank}/${ROSE_TRACK.milestones.length}`, style: { fontFamily: THEME.font.family, fontSize: THEME.font.heading, fontWeight: '700', fill: THEME.colors.text } }); title.position.set(THEME.spacing.md, THEME.spacing.md);
    const current = rank === 0 ? 0 : ROSE_TRACK.milestones[rank - 1].points; const next = ROSE_TRACK.milestones[Math.min(rank, ROSE_TRACK.milestones.length - 1)].points;
    const detail = new Text({ text: `${points.toLocaleString('vi-VN')} / ${next.toLocaleString('vi-VN')} ${STRINGS.points}`, style: { fontFamily: THEME.font.family, fontSize: THEME.font.body, fill: THEME.colors.muted } }); detail.position.set(THEME.spacing.md, THEME.spacing.xxl + THEME.spacing.sm);
    const progress = new ProgressBar(width - THEME.spacing.xl, THEME.spacing.md); progress.position.set(THEME.spacing.md, LAYOUT.quests.trackHeight - THEME.spacing.xl); progress.set(rank >= ROSE_TRACK.milestones.length ? 1 : (points - current) / Math.max(1, next - current), THEME.colors.accent); track.addChild(title, detail, progress);
    const list = new ScrollList(width, LAYOUT.sheet.maxHeight); list.position.y = LAYOUT.quests.trackHeight + THEME.spacing.sm; root.addChild(track, list);
    list.setItems(ROSE_TRACK.quests.map((quest) => {
      const state = this.game.save.quests[quest.id]; const value = Math.min(state?.progress ?? 0, quest.condition.count); const card = new Card(width, LAYOUT.quests.cardHeight);
      const name = new Text({ text: `${state?.completed ? '✓' : '○'} ${quest.name}`, style: { fontFamily: THEME.font.family, fontSize: THEME.font.body, fontWeight: '700', fill: state?.completed ? THEME.colors.success : THEME.colors.text, wordWrap: true, wordWrapWidth: width - THEME.spacing.xl } }); name.position.set(THEME.spacing.md, THEME.spacing.md);
      const info = new Text({ text: `${value}/${quest.condition.count}  ·  +${quest.rewardPoints} ${STRINGS.points}`, style: { fontFamily: THEME.font.family, fontSize: THEME.font.caption, fill: THEME.colors.muted } }); info.position.set(THEME.spacing.md, LAYOUT.quests.cardHeight - THEME.spacing.xl); card.addChild(name, info); return card;
    }), LAYOUT.scene.listGap);
    this.sheet.show(STRINGS.quests, root, LAYOUT.sheet.maxHeight, (innerWidth, innerHeight) => { track.resize(innerWidth, LAYOUT.quests.trackHeight); list.resize(innerWidth, Math.max(0, innerHeight - list.y)); });
  }
}
