import { Flower } from '../models/Flower';

export const FLOWERS: readonly Flower[] = [
  new Flower({ id: 1, name: 'Cúc mẫu đơn - Chrysanthemum', growMinutes: 30, wateringMinutes: 10 }),
];

export const getFlowerById = (id: number): Flower | undefined => FLOWERS.find((flower) => flower.id === id);
