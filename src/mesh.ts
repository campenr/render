export const createMeshForEntity = (meshClass, entity) => {
    const mesh = new meshClass(entity);
    entity.setMesh(mesh);
    return mesh;
}

export default class Mesh {
    constructor(entity) {
        this.entity = entity;
    }

    update() {
        // do things here
    }
}
