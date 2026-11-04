
import { Container } from "pixi.js";

export abstract class BaseScene extends Container {
    abstract readonly sceneName: string;

    protected sceneWidth = 540;
    protected sceneHeight = 704;

    onEnter(): void {}

    onExit(): void {}

    resize(width: number, height: number): void {
        this.sceneWidth = width;
        this.sceneHeight = height;
    }
}
