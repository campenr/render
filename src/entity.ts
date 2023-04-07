import { multiply } from '../wasm/index.wasm';


export default class Entity {
    constructor(scene) {
        this.scene = scene;
        this._mesh;
        // todo: make the following a _transform.
        this.translation = [0, 0];
        this.moveSpeed = 100;
        this.time = 0;
    }

    setMesh(mesh) {
        this._mesh = mesh;
    }

    update() {
        console.log('updating entity: ', this.translation );
        var deltaTime = this.scene.engine.time - this.time;
        this.time = this.scene.engine.time;
        if (this.translation[0] < multiply(this.scene.engine.canvas.height * 1.0, 0.9))
        this.translation = [this.translation[0] + deltaTime * this.moveSpeed, this.translation[1] + deltaTime * this.moveSpeed];
        // todo: separate parent class from the logic above.
        if (this._mesh) {
            this._mesh.update()
        }
    }
}