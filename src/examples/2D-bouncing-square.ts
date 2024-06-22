"use strict";

import Engine2D from '../engine';
import { m3 } from "../math";

import App from "./App";
import { controls } from "./store";
import ECS from "../ecs";
import { Position, Render, Velocity } from "../components";
import { multiply } from '../../wasm/index.wasm'

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

// we need to declare an output for the fragment shader
out vec4 outColor;

void main() {
  // Just set the output to a constant redish-purple
  outColor = vec4(1, 0, 0.5, 1);
}
`;

controls['moveSpeed'] = {
    'type': 'number',
    'value': 100,
};

function getMoveSpeed() {
    return controls['moveSpeed'].value;
}


class RenderingSystem {
    private gl: WebGLRenderingContext;
    private resolutionUniformLocation: any;
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
        const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);
        const program = this.createProgram(vertexShader, fragmentShader);
        this.gl.useProgram(program);

        // look up where the vertex data needs to go.
        const positionAttributeLocation = this.gl.getAttribLocation(program, "a_position");

        // look up uniform locations
        this.resolutionUniformLocation = this.gl.getUniformLocation(program, "u_resolution");
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
            50, 0,
            0, 50,
            50, 0,
            50, 50,
            0, 50,
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

    private createShader(type: number, source: string): WebGLShader {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error(this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            throw new Error("Shader compile failed");
        }
        return shader;
    }

    private createProgram(vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram {
        const program = this.gl.createProgram();
        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);
        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            console.error(this.gl.getProgramInfoLog(program));
            this.gl.deleteProgram(program);
            throw new Error("Program link failed");
        }
        return program;
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

            // TODO: would be good to put this collision logic into its own component
            if (position.x > multiply(this.canvas.width * 1.0, 0.92)) {
                velocity.dx = -1;
            }
            if (position.x < 0) {
                velocity.dx = 1;
            }
            if (position.y > multiply(this.canvas.height * 1.0, 0.90)) {
                velocity.dy = -1;
            }
            if (position.y < 0) {
                velocity.dy = 1;
            }

            position.x = position.x + deltaTime * moveSpeed * velocity.dx;
            position.y = position.y + deltaTime * moveSpeed * velocity.dy;
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

    const entity1 = ecs.createEntity();
    ecs.addComponent(entity1, new Position(0, 0));
    ecs.addComponent(entity1, new Velocity(1, 1));
    ecs.addComponent(entity1, new Render());

    const entity2 = ecs.createEntity();
    ecs.addComponent(entity2, new Position(100, 200));
    ecs.addComponent(entity2, new Velocity(1, -1));
    ecs.addComponent(entity2, new Render());

    engine.run()
}


const app = new App({
  target: document.getElementById('root'),
});

main();
