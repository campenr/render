"use strict";

import Engine2D from '../engine';
import Scene2D, { createEntityForScene } from '../scene';
import Entity from '../entity';
import Mesh, { createMeshForEntity } from "../mesh";
import { multiply } from '../../wasm/index.wasm';
import { m3 } from "../math";
import {createProgram, createShader} from "../shader";


var vertexShaderSource = `#version 320 es
`;

var fragmentShaderSource = `#version 320 es
`;


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

    engine.setScene(scene);

    return engine;
}

main();
