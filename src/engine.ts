
export default class Engine2D {

    constructor(canvas, glContext) {
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