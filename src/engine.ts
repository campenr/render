import { fps } from "./examples/store"
import ECS from "./ecs";


export default class Engine2D {
    ecs: ECS
    systems: any; // todo
    time: DOMHighResTimeStamp;
    _fpsHistory: any  // todo

    constructor(systems: any, ecs: ECS) {  // todo;
        this.systems = systems;
        this.ecs = ecs;
        this.time = 0;
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

        for (let i = 0; i < this.systems.length; i++) {
            this.systems[i].update(this.ecs, deltaTime)
        }

        const fps_ = Math.round((1 / deltaTime))
        this._fpsHistory.push(fps_)
        this._fpsHistory.shift()
        const fpsValue = this._fpsHistory.reduce((a, b) => a + b) / this._fpsHistory.length;
        fps.set(Math.floor(fpsValue));

        requestAnimationFrame((time_) => this.tick(time_));
    }
}