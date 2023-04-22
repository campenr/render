"use strict";

import Engine2D from '../engine';
import Scene2D, { createEntityForScene } from '../scene';
import Entity from '../entity';
import Mesh, { createMeshForEntity } from "../mesh";
import { multiply } from '../../wasm/index.wasm';
import { m3 } from "../math";
import {createProgram, createShader} from "../shader";

import App from "./App";
import { store } from "./store";

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

store.set('moveSpeed', 100);

class E_Square extends Entity {
    position: [number, number]; // x,y
    direction: [number, number]; // x,y
    getMoveSpeed: number;
    time: number;

    constructor(scene) {
        super(scene);
        // arrays are [x,y]
        this.position = [0, 0];  // start at the top left
        this.direction = [1, 1];  // start going to the right and down
        this.getMoveSpeed = () => store.get('moveSpeed');
        this.time = 0;
    }

    update() {
        var deltaTime = this.scene.engine.time - this.time;
        this.time = this.scene.engine.time;

        if (this.position[0] > multiply(this.scene.engine.canvas.width * 1.0, 0.92)) {
            this.direction[0] = -1;
        }
        if (this.position[0] < 0) {
            this.direction[0] = 1;
        }
        if (this.position[1] > multiply(this.scene.engine.canvas.height * 1.0, 0.90)) {
            this.direction[1] = -1;
        }
        if (this.position[1] < 0) {
            this.direction[1] = 1;
        }
        this.position[0] = this.position[0] + deltaTime * this.getMoveSpeed() * this.direction[0]
        this.position[1] = this.position[1] + deltaTime * this.getMoveSpeed() * this.direction[1]
        this.postUpdate();
    }
}

class MS_Square extends Mesh {
    program: any;
    resolutionUniformLocation: any;
    matrixLocation: any;
    positions: Array<number>;
    vao: any;
    entity: E_Square;

    constructor(entity: E_Square) {
        super(entity);
        const gl = this.entity.scene.engine.gl;

        // create GLSL shaders, upload the GLSL source, compile the shaders
        var vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
        var fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

        // Link the two shaders into a program
        var program = createProgram(gl, vertexShader, fragmentShader);
        this.program = program;

        // look up where the vertex data needs to go.
        var positionAttributeLocation = gl.getAttribLocation(program, "a_position");

        // look up uniform locations
        this.resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution");
        this.matrixLocation = gl.getUniformLocation(program, "u_matrix");

        // Create a buffer and put three 2d clip space points in it
        var positionBuffer = gl.createBuffer();

        // Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = positionBuffer)
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

        // array of start/end points in clip-space
        var positions = [
            0, 0,
            50, 0,
            0, 50,
            50, 0,
            50, 50,
            0, 50,
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
        this.positions = positions;

        // Create a vertex array object (attribute state)
        var vao = gl.createVertexArray();
        this.vao = vao;

        // and make it the one we're currently working with
        gl.bindVertexArray(vao);

        // Turn on the attribute
        gl.enableVertexAttribArray(positionAttributeLocation);

        // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
        var size = 2;          // two data points per vertex (x,y)
        var type = gl.FLOAT;   // the data is 32bit floats
        var normalize = false; // don't normalize the data
        var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
        var offset = 0;        // start at the beginning of the buffer
        gl.vertexAttribPointer(positionAttributeLocation, size, type, normalize, stride, offset);
    }

    update() {
        const gl = this.entity.scene.engine.gl;

        // Tell WebGL how to convert from clip space to pixels
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        // Clear the canvas
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        // Tell it to use our program (pair of shaders)
        gl.useProgram(this.program);

        // Bind the attribute/buffer set we want.
        gl.bindVertexArray(this.vao);

        // Pass in the canvas resolution so we can convert from
        // pixels to clipspace in the shader
        gl.uniform2f(this.resolutionUniformLocation, gl.canvas.width, gl.canvas.height);

        // Compute the matrices
        var translationMatrix = m3.translation(this.entity.position[0], this.entity.position[1]);

        // Set the matrix.
        gl.uniformMatrix3fv(this.matrixLocation, false, translationMatrix);

        // draw
        var primitiveType = gl.TRIANGLES;
        var offset = 0;
        var count = this.positions.length / 2;  // positions / values per position
        gl.drawArrays(primitiveType, offset, count);
    }
}

function main() {

    var canvas = document.querySelector("#glcanvas") as HTMLCanvasElement;
    var gl = canvas.getContext("webgl2");
    if (!gl) {
        return;
    }

    const engine = setup(canvas, gl);
    engine.run();
}

const setup = (canvas, gl) => {
    const engine = new Engine2D(canvas, gl);

    const scene = new Scene2D(engine);
    const basicEntity = createEntityForScene(E_Square, scene);
    const basicMesh = createMeshForEntity(MS_Square, basicEntity);

    engine.setScene(scene);

    return engine;
}

const app = new App({
  target: document.getElementById('root'),
});

main();
