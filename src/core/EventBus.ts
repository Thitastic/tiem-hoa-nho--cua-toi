import type { GameEvent } from './types';
type Listener=(event:GameEvent)=>void;
export class EventBus{private listeners=new Map<string,Set<Listener>>();on(type:string,listener:Listener):()=>void{const set=this.listeners.get(type)??new Set();set.add(listener);this.listeners.set(type,set);return()=>{set.delete(listener);};}emit(event:GameEvent):void{this.listeners.get(event.type)?.forEach((listener)=>listener(event));this.listeners.get('*')?.forEach((listener)=>listener(event));}}
