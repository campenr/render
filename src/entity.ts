export default class Entity {
    constructor(scene) {
        this.scene = scene;
        this._mesh;
    }

    setMesh(mesh) {
        this._mesh = mesh;
    }

    update() {
        // do things here.
        this.postUpdate();
    }

    postUpdate() {
        if (this._mesh) {
            this._mesh.update()
        }
    }
}