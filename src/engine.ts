import Scene2D from "./scene";

import { fps } from "./examples/store"


export default class Engine2D {
    canvas: any; // todo
    gl: any; // todo
    time: DOMHighResTimeStamp;
    _currentScene: Scene2D; // todo use scene interface
    _fpsHistory: any  // todo

    constructor(canvas: any, glContext: any) {  // todo;
        this.canvas = canvas;
        this.gl = glContext;
        this.time;
        this._currentScene;
        // we average over a range of frames to calculate FPS to somewhat stabilise the values
        this._fpsHistory = new Array(120);
        this._fpsHistory.fill(0);
    }

    setScene(scene) {
        this._currentScene = scene;
    }

    run() {
        this.tick(0);
    }

    tick(currentTime: DOMHighResTimeStamp) {
        const currentTime_ms = currentTime / 1000;
        const deltaTime = currentTime_ms - this.time;

        this.time = currentTime_ms
        if (this._currentScene) {
            this._currentScene.draw();
        }

        const fps_ = Math.round((1 / deltaTime))
        this._fpsHistory.push(fps_)
        this._fpsHistory.shift()
        const fpsValue = this._fpsHistory.reduce((a, b) => a + b) / this._fpsHistory.length;
        fps.set(Math.floor(fpsValue));

        requestAnimationFrame((time_) => this.tick(time_));
    }
}