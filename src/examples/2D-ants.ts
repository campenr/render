"use strict";

import Engine2D from '../engine';
import { m3 } from "../math";

import App from "./App";
import { controls } from "./store";
import ECS from "../ecs";
import { Position, Render, Velocity } from "../components";
import { multiply } from '../../wasm/index.wasm'
import { createProgram, createShader } from "../shader";

var vertexShaderSource = `#version 300 es

// an attribute is an input (in) to a vertex shader.
// It will receive data from a buffer
in vec2 a_position;

// Used to pass in the resolution of the canvas
uniform vec2 u_resolution;

// A matrix to transform the positions by
uniform mat3 u_matrix;

// all shaders have a main function
void main() {
  // Multiply the position by the matrix.
  vec2 position = (u_matrix * vec3(a_position, 1)).xy;

  // convert the position from pixels to 0.0 to 1.0
  vec2 zeroToOne = position / u_resolution;

  // convert from 0->1 to 0->2
  vec2 zeroToTwo = zeroToOne * 2.0;

  // convert from 0->2 to -1->+1 (clipspace)
  vec2 clipSpace = zeroToTwo - 1.0;

  gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
}
`;

var fragmentShaderSource = `#version 300 es

// fragment shaders don't have a default precision so we need
// to pick one. highp is a good default. It means "high precision"
precision highp float;

uniform vec4 u_color;

// we need to declare an output for the fragment shader
out vec4 outColor;

void main() {
  // Just set the output to a constant redish-purple
  outColor = u_color;
}
`;

const ENTITY_SIZE = 50;
const ENTITY_COUNT = 9;
const ENTITY_SPEED = 100;

const COLORS = [
    [8, 65, 215],
    [226, 57, 223],
    [23, 140, 141],
    [215, 76, 20],
    [98, 85, 200],
    [145, 241, 212],
    [45, 3, 146],
    [236, 76, 24],
    [254, 221, 157],
]

const LOCATION = [
    [0.1, 0.7],
    [0.8, 0.3],
    [0.2, 0.8],
    [0.1, 0.1],
    [0.8, 0.8],
    [0.3, 0.4],
    [0.45, 0.5],
    [0.7, 0.3],
    [0.2, 0.6],
]

controls['moveSpeed'] = {
    'type': 'number',
    'value': ENTITY_SPEED,
};

function getMoveSpeed() {
    return controls['moveSpeed'].value;
}


class RenderingSystem {
    private gl: WebGLRenderingContext;
    private resolutionUniformLocation: any;
    private colorUniformLocation: any;
    private matrixLocation: any;
    private positions: Array<number>;

    constructor(canvas: HTMLCanvasElement, vertexShaderSource: string, fragmentShaderSource: string) {
        this.gl = canvas.getContext("webgl2");
        if (!this.gl) {
            return;
        }
        this.initGL(vertexShaderSource, fragmentShaderSource);
    }

    private initGL(vertexShaderSource: string, fragmentShaderSource: string): void {
        const vertexShader = createShader(this.gl, this.gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = createShader(this.gl, this.gl.FRAGMENT_SHADER, fragmentShaderSource);
        const program = createProgram(this.gl, vertexShader, fragmentShader);
        this.gl.useProgram(program);

        // look up where the vertex data needs to go.
        const positionAttributeLocation = this.gl.getAttribLocation(program, "a_position");

        // look up uniform locations
        this.resolutionUniformLocation = this.gl.getUniformLocation(program, "u_resolution");
        this.colorUniformLocation = this.gl.getUniformLocation(program, "u_color");
        this.matrixLocation = this.gl.getUniformLocation(program, "u_matrix");

        // Tell WebGL how to convert from clip space to pixels
        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);

        // Pass in the canvas resolution so we can convert from
        // pixels to clipspace in the shader
        this.gl.uniform2f(this.resolutionUniformLocation, this.gl.canvas.width, this.gl.canvas.height);

        // Create a buffer and put three 2d clip space points in it
        const positionBuffer = this.gl.createBuffer();

        // Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = positionBuffer)
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);

        // array of start/end points in clip-space
        // Note: this means all entities are squares
        const positions = [
            0, 0,
            ENTITY_SIZE, 0,
            0, ENTITY_SIZE,
            ENTITY_SIZE, 0,
            ENTITY_SIZE, ENTITY_SIZE,
            0, ENTITY_SIZE,
        ];
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW);
        this.positions = positions;

        // Create a vertex array object (attribute state)
        const vao = this.gl.createVertexArray();

        // and make it the one we're currently working with
        this.gl.bindVertexArray(vao);

        // Turn on the attribute
        this.gl.enableVertexAttribArray(positionAttributeLocation);

        // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
        var size = 2;          // two data points per vertex (x,y)
        var type = this.gl.FLOAT;   // the data is 32bit floats
        var normalize = false; // don't normalize the data
        var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
        var offset = 0;        // start at the beginning of the buffer
        this.gl.vertexAttribPointer(positionAttributeLocation, size, type, normalize, stride, offset);
    }

    update(ecs: ECS, deltaTime: number): void {
        // Clear the canvas
        this.gl.clearColor(0, 0, 0, 1);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        // iterate and render the entities
        // Note: we could look to batch draws for perf.
        const entities = ecs.getEntitiesWithComponents([Render, Position]);
        for (let i = 0; i < entities.length; i++) {
            const entity = entities[i];

            // set the positions in the buffer
            const position = ecs.getComponent(entity, Position);
            const translationMatrix = m3.translation(position.x, position.y);
            this.gl.uniformMatrix3fv(this.matrixLocation, false, translationMatrix);

            // Set a color based on the index
            const color = COLORS[i]
            this.gl.uniform4f(this.colorUniformLocation, color[0] / 255, color[1] / 255, color[2] / 255, 1);

            // draw
            const primitiveType = this.gl.TRIANGLES;
            const offset = 0;
            const count = this.positions.length / 2;  // positions / values per position
            this.gl.drawArrays(primitiveType, offset, count);

        }
    }
}


class MovementSystem {
    canvas: HTMLCanvasElement;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
    }

    update(ecs: ECS, deltaTime: number): void {
        const moveSpeed = getMoveSpeed() as number;

        const entities = ecs.getEntitiesWithComponents([Position, Velocity]);
        for (let i = 0; i < entities.length; i++) {
            const entity = entities[i];

            const position = ecs.getComponent(entity, Position);
            const velocity = ecs.getComponent(entity, Velocity);

            // we move the entity first before calculating any collisions, so we can
            // more easily determine how to update the velocity post collision
            position.x = position.x + deltaTime * moveSpeed * velocity.dx;
            position.y = position.y + deltaTime * moveSpeed * velocity.dy;

            // calculate collisions with edge of the screen first
            // reverse the movement before applying the velocity change to avoid getting stuck
            if (position.x + ENTITY_SIZE > this.canvas.clientWidth || position.x < 0) {
                position.x = position.x - deltaTime * moveSpeed * velocity.dx;
                velocity.dx = velocity.dx * -1;
            }
            else if (position.y + ENTITY_SIZE > this.canvas.clientHeight || position.y < 0) {
                position.y = position.y - deltaTime * moveSpeed * velocity.dy;
                velocity.dy = velocity.dy * -1;
            }

            // iterate every other entity to see if it's colling with the current one, and if so then update
            // the velocities of both.
            // NOTE: because we're doing this for every single entity it's performance will not scale well.
            for (let j = 0; j < entities.length; j++) {
                const otherEntity = entities[j];

                // don;t calculate collisions with self.
                if (entity.id == otherEntity.id) { continue; }

                const otherPosition = ecs.getComponent(otherEntity, Position);
                const otherVelocity = ecs.getComponent(otherEntity, Velocity);

                // first detect if there is any overlap at all. because we're working with simple squares
                // this is doing a box collision i.e. AABB - AABB
                if (
                    position.x < otherPosition.x + ENTITY_SIZE &&
                    position.x + ENTITY_SIZE > otherPosition.x &&
                    position.y < otherPosition.y + ENTITY_SIZE &&
                    position.y + ENTITY_SIZE > otherPosition.y
                ) {
                    // update the velocities in response to the collision. To determine which axis to update the
                    // velocity along we just check if the overlapping quad is longer along the x or y axis, with the
                    // former indicating a horizontal collision, else a vertical one.
                    if (position.x + ENTITY_SIZE - otherPosition.x > position.y + ENTITY_SIZE - otherPosition.y) {
                        // bounce the objects back apart the same distance before the collision was detected
                        position.x = position.x - deltaTime * moveSpeed * velocity.dx;
                        // otherPosition.x = otherPosition.x - deltaTime * moveSpeed * otherVelocity.dx;
                        velocity.dx = velocity.dx * -1;
                        otherVelocity.dx = otherVelocity.dx * -1;
                    } else {
                        // bounce the objects back apart the same distance before the collision was detected
                        position.y = position.y - deltaTime * moveSpeed * velocity.dy;
                        // otherPosition.y = otherPosition.y - deltaTime * moveSpeed * otherVelocity.dy;
                        velocity.dy = velocity.dy * -1;
                        otherVelocity.dy = otherVelocity.dy * -1;
                    }
                }
            }
        }
    }
}


function main() {

    const canvas = document.querySelector("#glcanvas") as HTMLCanvasElement;

    const ecs = new ECS();

    const renderingSystem = new RenderingSystem(canvas, vertexShaderSource, fragmentShaderSource);
    const movementSystem = new MovementSystem(canvas);

    const engine = new Engine2D(
        [renderingSystem, movementSystem],
        ecs
    )

    for (let i = 0; i < ENTITY_COUNT; i++) {
        const entity = ecs.createEntity();
        ecs.addComponent(entity, new Position(LOCATION[i][0] * canvas.clientWidth, LOCATION[i][1] * canvas.clientHeight));
        ecs.addComponent(entity, new Velocity(1, i % 2 == 0 ? 1 : -1));
        ecs.addComponent(entity, new Render());
    }

    engine.run()
}


const app = new App({
  target: document.getElementById('root'),
});

main();
