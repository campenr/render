import Scene2D from "./scene";

export default class Engine2D {
    canvas: any; // todo
    gl: any; // todo
    time: DOMHighResTimeStamp;
    _currentScene: Scene2D; // todo use scene interface

    constructor(canvas: any, glContext: any) {  // todo;
        this.canvas = canvas;
        this.gl = glContext;
        this.time;
        this._currentScene;
    }

    setScene(scene) {
        this._currentScene = scene;
    }

    run() {
        this.tick(0);
    }

    tick(time) {
        this.time = time / 1000;
        if (this._currentScene) {
            this._currentScene.draw();
        }
        requestAnimationFrame((time_) => this.tick(time_));
    }
}