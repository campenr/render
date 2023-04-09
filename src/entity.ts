import Mesh from "./mesh";
import Scene2D from "./scene";

export default class Entity {
    scene: Scene2D;  // todo: interface instead for base Scene
    _mesh: Mesh;

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