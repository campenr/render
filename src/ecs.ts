import Entity from "./entity";


export default class ECS {
    public entities: Entity[] = [];
    private components: Map<number, Map<string, any>> = new Map();

    createEntity(): Entity {
        const entity = new Entity();
        this.entities.push(entity);
        this.components.set(entity.id, new Map());
        return entity;
    }

    addComponent<T>(entity: Entity, component: T): void {
        const components = this.components.get(entity.id);
        if (components) {
            components.set(component.constructor.name, component);
        }
    }

    getComponent<T>(entity: Entity, componentType: new (...args: any[]) => T): T | undefined {
        const components = this.components.get(entity.id);
        return components ? components.get(componentType.name) : undefined;
    }

    getEntitiesWithComponents(componentTypes: (new (...args: any[]) => any)[]): Entity[] {
        return this.entities.filter(entity => {
            const components = this.components.get(entity.id);
            return componentTypes.every(type => components?.has(type.name));
        });
    }
}
