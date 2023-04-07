export const createEntityForScene = (entityClass, scene) => {
    const entity = new entityClass(scene);
    scene.addEntity(entity);
    return entity;
}


export default class Scene2D {
    static dimensions = 2;

    constructor(engine) {
        this.engine = engine;
        this._objects = []
    }

    addEntity(object) {
        this._objects.push(object);
    }

    draw() {
        console.log('drawing scene');
        this._objects.forEach(object => {
            object.update();
        })
    }
}
