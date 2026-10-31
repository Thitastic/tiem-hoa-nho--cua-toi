export const THEME={
  colors:{
    page:0x10251f,background:0x244c3e,backgroundSoft:0x315f4f,panel:0xf8efdf,panelAlt:0xead8b8,
    primary:0x477d64,primaryDark:0x295542,accent:0xd7a942,success:0x3f8a63,danger:0xb95662,
    text:0x17342b,textOnDark:0xfffaf0,muted:0x746d62,disabled:0x9b9589,outline:0xfffaf0,shadow:0x0b1d17,
  },
  rarity:{common:0x79a66b,rare:0x5b8fd9,epic:0xae74d4,legendary:0xe7ac42},
  spacing:{xs:8,sm:16,md:24,lg:32,xl:48,xxl:64},
  radius:{sm:14,md:22,lg:30,sheet:36},
  font:{family:'system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',title:40,heading:34,body:28,caption:22,micro:18,weight:700},
  stroke:{thin:2,normal:3,strong:4},
  tap:{min:88,gap:16,dragCancelCss:10,longPressMs:400,pressScale:.96,hapticMs:8},
  shadow:{offsetX:0,offsetY:8,alpha:.2},
  opacity:{safeGuide:.8,targetGuide:.72,placeholderCircle:.94,placeholderOutline:.9,placeholderBackground:.82,placeholderCard:.95,placeholderBorder:.75,potOutline:.42,disabled:.62,buttonOutline:.58,sheetBackdrop:.64,sheetHandle:.5,chip:.16,cardBorder:.9,sceneVeil:.2,hud:.97,modalBackdrop:.72,progressTrack:.28,scrollbar:.48,tabBar:.98,toast:.96,toastBorder:.7},
  placeholder:{resolution:2,labelMaxLength:28,labelFontMin:18,labelFontMax:28,labelWidthRatio:.82,labelScaleDivisor:8,cornerRatio:.12,circleRatio:.44},
}as const;

export const MOBILE_FEATURES={waterAllEnabled:false,hapticsEnabled:true}as const;

