import{Text,type TextStyleOptions}from'pixi.js';import{THEME}from'../data/theme';
export class Label extends Text{constructor(text:string,options:Partial<TextStyleOptions>={}){super({text,style:{fontFamily:THEME.font.family,fontSize:THEME.font.body,fill:THEME.colors.text,...options}});}}
