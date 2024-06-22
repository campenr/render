export class Position {
    constructor(public x: number = 0, public y: number = 0) {}
}

export class Velocity {
    constructor(public dx: number = 0, public dy: number = 0) {}
}

export class Render {
    // empty component that indicates an entity is renderable
    constructor() {}
}
