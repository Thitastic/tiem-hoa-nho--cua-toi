import { GAME_EVENTS } from '../data/events';
import type { Event } from '../models/Event';

export class EventService {
  getActiveEvents(at: Date = new Date()): Event[] {
    const now = at.getTime();
    return GAME_EVENTS.filter((event) => Date.parse(event.due_date) > now)
      .sort((a, b) => Date.parse(a.due_date) - Date.parse(b.due_date));
  }

  getActiveEvent(id: number, at: Date = new Date()): Event | undefined {
    return this.getActiveEvents(at).find((event) => event.id === id);
  }
}

export const eventService = new EventService();
