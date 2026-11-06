import { Assets } from "pixi.js";

const FONT_FAMILY = "Oswald";

const OSWALD_FILES = [
  { weight: "200", file: "Oswald-ExtraLight.ttf" },
  { weight: "300", file: "Oswald-Light.ttf" },
  { weight: "400", file: "Oswald-Regular.ttf" },
  { weight: "500", file: "Oswald-Medium.ttf" },
  { weight: "600", file: "Oswald-SemiBold.ttf" },
  { weight: "700", file: "Oswald-Bold.ttf" },
] as const;

let pendingLoad: Promise<void> | undefined;

/** Must resolve before any PixiJS Text objects are created. */
export function loadGameFont(): Promise<void> {
  if (pendingLoad) return pendingLoad;

  const fontBaseUrl = `${import.meta.env.BASE_URL}fonts/`;

  pendingLoad = Promise.all(
    OSWALD_FILES.map(({ weight, file }) =>
      Assets.load({
        alias: `game-font-oswald-${weight}`,
        src: `${fontBaseUrl}${file}`,
        data: {
          family: FONT_FAMILY,
          weights: [weight],
          style: "normal",
          display: "swap",
        },
      }),
    ),
  )
    .then(() => undefined)
    .catch((error: unknown) => {
      pendingLoad = undefined;
      throw error;
    });

  return pendingLoad;
}
