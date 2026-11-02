export const LAYOUT={
  designWidth:720,minHeight:1080,maxHeight:1680,safeFrameHeight:1280,desktopMaxCssWidth:480,desktopShadowBlurCss:48,
  hudHeight:120,tabBarHeight:136,sidePadding:24,contentGap:16,
  hud:{padding:16,coinWidth:160,rankWidth:184,controlSize:88,debugTapWindowMs:1400,rankTextY:24,progressY:72,progressHeight:12},
  tabs:{paddingX:24,paddingY:16,gap:16,buttonWidth:156,buttonHeight:104},
  greenhouse:{switcherHeight:88,contextHeight:248,contextPadding:24,actionWidth:280},
  scene:{titleHeight:56,backgroundShadeAlpha:.34,listGap:16},
  packing:{stickyHeight:224,cardHeight:424,iconSize:112,actionWidth:232},
  shop:{tabsHeight:88,cardHeight:176,iconSize:112,actionWidth:176},
  counter:{customerHeight:264,portraitSize:184,cardHeight:264,actionWidth:280},
  inventory:{tabsHeight:88,columns:4,slotGap:16,slotHeight:176},
  quests:{trackHeight:216,cardHeight:152},
  potView:{potY:.9,potWidth:.68,potHeight:.55,rimY:.24,plantWidth:.64,plantHeight:.48,statusIconSize:40,statusIconY:28,bobDistance:4,bobSpeed:.004,lockedAlpha:.28,normalAlpha:.46},
  sheet:{headerHeight:112,maxHeight:1280,sidePadding:24,handleWidth:96,handleHeight:8,swipeCloseDistance:120},
  modal:{width:640,minHeight:320,maxHeight:720,padding:24},
  scroll:{scrollbarWidth:8,wheelMultiplier:1,friction:.92,minVelocity:.015},
  animation:{sheetDecay:.002,toastDurationMs:2600},toastHeight:72,toastMinWidth:320,
}as const;

