
export default class Entity {
    constructor(scene) {
        this.scene = scene;
        this._mesh;
        // todo: make the following a _transform.
        this.translation = [0, 0];
    }

    setMesh(mesh) {
        this._mesh = mesh;
    }

    update() {
        console.log('updating entity');
        if (this._mesh) {
            this._mesh.update()
        }
    }
}