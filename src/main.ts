
import { Game } from "./core/Game";
import "./style.css";

const game = new Game();

game.start().catch((error: unknown) => {
    console.error("Không thể khởi động Flower Shop:", error);
});
