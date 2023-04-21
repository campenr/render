"use strict";

import Engine2D from '../engine';
import Scene2D, { createEntityForScene } from '../scene';
import Entity from '../entity';
import Mesh, { createMeshForEntity } from "../mesh";
import { multiply } from '../../wasm/index.wasm';
import { m3 } from "../math";
import {createProgram, createShader} from "../shader";


var vertexShaderSource = `#version 300 es

void main() {
    gl_Position = vec4(0.5, 0.5, 0, 1);
}

`;

var fragmentShaderSource = `#version 300 es
precision highp float;

out vec4 outColor;

void main() {
  outColor = vec4(1, 0, 0.5, 1);
}
`;


class E_Plane extends Entity {
    dimensions: [number, number];
    rippleSpeed: number;
    time: number;

    constructor(scene) {
        super(scene);
        // arrays are [width, height]
        this.dimensions = [scene.engine.canvas.height, scene.engine.canvas.width]
        this.rippleSpeed = 100;
        this.time = 0;
    }

    update() {
        this.postUpdate();
    }
}

class MS_Plane extends Mesh {
    program: any;
    resolutionUniformLocation: any;
    matrixLocation: any;
    positions: Array<number>;
    vao: any;
    entity: E_Plane;

    constructor(entity: E_Plane) {
        super(entity);

        const gl = this.entity.scene.engine.gl;

        // create GLSL shaders, upload the GLSL source, compile the shaders
        var vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
        var fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

        // Link the two shaders into a program
        var program = createProgram(gl, vertexShader, fragmentShader);
        this.program = program;

    }

    update() {
        const gl = this.entity.scene.engine.gl;

        // Tell WebGL how to convert from clip space to pixels
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        // Clear the canvas
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        // Tell it to use our program (pair of shaders)
        gl.useProgram(this.program);
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
    const basicEntity = createEntityForScene(E_Plane, scene);
    const basicMesh = createMeshForEntity(MS_Plane, basicEntity);

    engine.setScene(scene);

    return engine;
}

main();
