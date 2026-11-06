export enum FlowerRarityId {
  Common = 1,
  Rare = 2,
  Epic = 3,
  Legend = 4,
}

export interface FlowerRarityData {
  id: FlowerRarityId;
  name: string;
}

export class FlowerRarity implements Readonly<FlowerRarityData> {
  readonly id: FlowerRarityId;
  readonly name: string;

  constructor(data: FlowerRarityData) {
    this.id = data.id;
    this.name = data.name;
  }
}

export const FLOWER_RARITIES: Readonly<Record<FlowerRarityId, FlowerRarity>> = {
  [FlowerRarityId.Common]: new FlowerRarity({ id: FlowerRarityId.Common, name: 'Common' }),
  [FlowerRarityId.Rare]: new FlowerRarity({ id: FlowerRarityId.Rare, name: 'Rare' }),
  [FlowerRarityId.Epic]: new FlowerRarity({ id: FlowerRarityId.Epic, name: 'Epic' }),
  [FlowerRarityId.Legend]: new FlowerRarity({ id: FlowerRarityId.Legend, name: 'Legend' }),
};
