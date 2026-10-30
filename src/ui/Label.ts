import{Text,type TextStyleOptions}from'pixi.js';import{UI_CONFIG}from'../data/uiConfig';
export class Label extends Text{constructor(text:string,options:Partial<TextStyleOptions>={}){super({text,style:{fontFamily:UI_CONFIG.font,fontSize:18,fill:UI_CONFIG.colors.ink,...options}});}}
