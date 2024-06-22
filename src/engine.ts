import { fps } from "./examples/store"
import ECS from "./ecs";


export default class Engine2D {
    renderer: any; // todo
    ecs: ECS
    time: DOMHighResTimeStamp;
    // _currentScene: Scene2D; // todo use scene interface
    _fpsHistory: any  // todo

    constructor(renderer: any, ecs: ECS) {  // todo;
        this.renderer = renderer;
        this.ecs = ecs;
        this.time;
        // we average over a range of frames to calculate FPS to somewhat stabilise the values
        this._fpsHistory = new Array(120);
        this._fpsHistory.fill(0);
    }

    run() {
        this.tick(0);
    }

    tick(currentTime: DOMHighResTimeStamp) {
        const currentTime_ms = currentTime / 1000;
        const deltaTime = currentTime_ms - this.time;

        this.time = currentTime_ms

        this.renderer.update(this.ecs)

        const fps_ = Math.round((1 / deltaTime))
        this._fpsHistory.push(fps_)
        this._fpsHistory.shift()
        const fpsValue = this._fpsHistory.reduce((a, b) => a + b) / this._fpsHistory.length;
        fps.set(Math.floor(fpsValue));

        requestAnimationFrame((time_) => this.tick(time_));
    }
}