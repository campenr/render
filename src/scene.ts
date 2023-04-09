import Entity from "./entity";
import Engine2D from "./engine";

export const createEntityForScene = (entityClass, scene) => {
    const entity = new entityClass(scene);
    scene.addEntity(entity);
    return entity;
}

export default class Scene2D {

    static dimensions: number = 2;
    engine: Engine2D;
    _entities: Array<Entity>;

    constructor(engine) {
        this.engine = engine;
        this._entities = []
    }

    addEntity(entity) {
        this._entities.push(entity);
    }

    draw(): void {
        this._entities.forEach(entity => {
            entity.update();
        })
    }
}
