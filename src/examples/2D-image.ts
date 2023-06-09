"use strict";

import Engine2D from '../engine';
import Scene2D, { createEntityForScene } from '../scene';
import Entity from '../entity';
import Mesh, { createMeshForEntity } from "../mesh";
import { multiply } from '../../wasm/index.wasm';
import { m3 } from "../math";
import {createProgram, createShader} from "../shader";

import App from "./App";
import { controls } from "./store";

var vertexShaderSource = `#version 300 es
// an attribute is an input (in) to a vertex shader.
// It will receive data from a buffer
in vec2 a_position;
in vec2 a_texCoord;

// Used to pass in the resolution of the canvas
uniform vec2 u_resolution;

// Used to pass the texture coordinates to the fragment shader
out vec2 v_texCoord;

// all shaders have a main function
void main() {

  // convert the position from pixels to 0.0 to 1.0
  vec2 zeroToOne = a_position / u_resolution;

  // convert from 0->1 to 0->2
  vec2 zeroToTwo = zeroToOne * 2.0;

  // convert from 0->2 to -1->+1 (clipspace)
  vec2 clipSpace = zeroToTwo - 1.0;

  gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);

  // pass the texCoord to the fragment shader
  // The GPU will interpolate this value between points.
  v_texCoord = a_texCoord;
}`;

var fragmentShaderSource = `#version 300 es
// fragment shaders don't have a default precision so we need
// to pick one. highp is a good default. It means "high precision"
precision highp float;

// our texture
uniform sampler2D u_image;

// the convolution kernel data
uniform float u_kernel[9];
uniform float u_kernelWeight;

// the texCoords passed in from the vertex shader.
in vec2 v_texCoord;

// we need to declare an output for the fragment shader
out vec4 outColor;

void main() {
  vec2 onePixel = vec2(1) / vec2(textureSize(u_image, 0));

  vec4 colorSum =
      texture(u_image, v_texCoord + onePixel * vec2(-1, -1)) * u_kernel[0] +
      texture(u_image, v_texCoord + onePixel * vec2( 0, -1)) * u_kernel[1] +
      texture(u_image, v_texCoord + onePixel * vec2( 1, -1)) * u_kernel[2] +
      texture(u_image, v_texCoord + onePixel * vec2(-1,  0)) * u_kernel[3] +
      texture(u_image, v_texCoord + onePixel * vec2( 0,  0)) * u_kernel[4] +
      texture(u_image, v_texCoord + onePixel * vec2( 1,  0)) * u_kernel[5] +
      texture(u_image, v_texCoord + onePixel * vec2(-1,  1)) * u_kernel[6] +
      texture(u_image, v_texCoord + onePixel * vec2( 0,  1)) * u_kernel[7] +
      texture(u_image, v_texCoord + onePixel * vec2( 1,  1)) * u_kernel[8] ;
  outColor = vec4((colorSum / u_kernelWeight).rgb, 1);
}`;

var image = new Image();
image.src = "/static/image/flowers.jpg";


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

function setRectangle(gl, x, y, width, height) {
  var x1 = x;
  var x2 = x + width;
  var y1 = y;
  var y2 = y + height;
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
     x1, y1,
     x2, y1,
     x1, y2,
     x1, y2,
     x2, y1,
     x2, y2,
  ]), gl.STATIC_DRAW);
}

function computeKernelWeight(kernel) {
    const weight = kernel.reduce(function(prev, curr) {
        return prev + curr;
    });
    return weight <= 0 ? 1 : weight;
}

controls['kernel'] = {
    'type': 'choice',
    'value': 'normal',
    'choices': [
        'normal',
        'gaussianBlur',
        'sharpen',
        'edgeDetect',
        'emboss',
    ],
};

function getKernel() {
    return controls['kernel'].value;
}

class MS_Plane extends Mesh {
    program: any;
    resolutionUniformLocation: any;
    matrixLocation: any;
    positions: Array<number>;
    vao: any;
    entity: E_Plane;
    getKernel: String;

    constructor(entity: E_Plane) {
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
        var texCoordAttributeLocation = gl.getAttribLocation(program, "a_texCoord");

        // look up uniform locations
        this.resolutionLocation = gl.getUniformLocation(program, "u_resolution");
        this.imageLocation = gl.getUniformLocation(program, "u_image");
        this.kernelLocation = gl.getUniformLocation(program, "u_kernel[0]");
        this.kernelWeightLocation = gl.getUniformLocation(program, "u_kernelWeight");

        // Create a vertex array object (attribute state)
        var vao = gl.createVertexArray();
        this.vao = vao;

        // and make it the one we're currently working with
        gl.bindVertexArray(vao);

        // Create a buffer and put a single pixel space rectangle in
        // it (2 triangles)
        this.positionBuffer = gl.createBuffer();

        // Turn on the attribute
        gl.enableVertexAttribArray(positionAttributeLocation);

        // Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = positionBuffer)
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);

        // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
        var size = 2;          // 2 components per iteration
        var type = gl.FLOAT;   // the data is 32bit floats
        var normalize = false; // don't normalize the data
        var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
        var offset = 0;        // start at the beginning of the buffer
        gl.vertexAttribPointer(positionAttributeLocation, size, type, normalize, stride, offset);

        // provide texture coordinates for the rectangle.
        var texCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
           0.0,  0.0,
           1.0,  0.0,
           0.0,  1.0,
           0.0,  1.0,
           1.0,  0.0,
           1.0,  1.0,
        ]), gl.STATIC_DRAW);

        // Turn on the attribute
        gl.enableVertexAttribArray(texCoordAttributeLocation);

        // Tell the attribute how to get data out of texCoordBuffer (ARRAY_BUFFER)
        var size = 2;          // 2 components per iteration
        var type = gl.FLOAT;   // the data is 32bit floats
        var normalize = false; // don't normalize the data
        var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
        var offset = 0;        // start at the beginning of the buffer
        gl.vertexAttribPointer(texCoordAttributeLocation, size, type, normalize, stride, offset);

        // Create a texture.
        var texture = gl.createTexture();

        // make unit 0 the active texture uint
        // (ie, the unit all other texture commands will affect
        gl.activeTexture(gl.TEXTURE0 + 0);

        // Bind it to texture unit 0' 2D bind point
        gl.bindTexture(gl.TEXTURE_2D, texture);

        // Set the parameters so we don't need mips and so we're not filtering
        // and we don't repeat at the edges
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

        // Upload the image into the texture.
        var mipLevel = 0;               // the largest mip
        var internalFormat = gl.RGBA;   // format we want in the texture
        var srcFormat = gl.RGBA;        // format of data we are supplying
        var srcType = gl.UNSIGNED_BYTE; // type of data we are supplying
        gl.texImage2D(gl.TEXTURE_2D, mipLevel, internalFormat, srcFormat, srcType, image);

        // Define several convolution kernels
        this.kernels = {
            normal: [
              0, 0, 0,
              0, 1, 0,
              0, 0, 0,
            ],
            gaussianBlur: [
              0.045, 0.122, 0.045,
              0.122, 0.332, 0.122,
              0.045, 0.122, 0.045,
            ],
            sharpen: [
               -1, -1, -1,
               -1, 16, -1,
               -1, -1, -1,
            ],
            edgeDetect: [
               -1, -1, -1,
               -1,  8, -1,
               -1, -1, -1,
            ],
            emboss: [
               -2, -1,  0,
               -1,  1,  1,
                0,  1,  2,
            ],
        };
        this.getKernel = getKernel;
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

        // Bind the attribute/buffer set we want.
        gl.bindVertexArray(this.vao);

        // Pass in the canvas resolution so we can convert from
        // pixels to clipspace in the shader
        gl.uniform2f(this.resolutionLocation, gl.canvas.width, gl.canvas.height);

        // Tell the shader to get the texture from texture unit 0
        gl.uniform1i(this.imageLocation, 0);

        // set the kernel and it's weight
        const activeKernel = this.getKernel();
        gl.uniform1fv(this.kernelLocation, this.kernels[activeKernel]);
        gl.uniform1f(this.kernelWeightLocation, computeKernelWeight(this.kernels[activeKernel]));

        // Bind the position buffer so gl.bufferData that will be called
        // in setRectangle puts data in the position buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);

        // Set a rectangle the same size as the image.
        setRectangle(gl, 0, 0, image.width, image.height);

        // Draw the rectangle.
        var primitiveType = gl.TRIANGLES;
        var offset = 0;
        var count = 6;
        gl.drawArrays(primitiveType, offset, count);

    }
}


function main() {

    var canvas = document.querySelector("#glcanvas") as HTMLCanvasElement;
    var gl = canvas.getContext("webgl2");
    if (!gl) {
        return;
    }

    image.onload = () => {
        const engine = setup(canvas, gl);
        engine.run();
    };
}

const setup = (canvas, gl) => {
    const engine = new Engine2D(canvas, gl);

    const scene = new Scene2D(engine);
    const basicEntity = createEntityForScene(E_Plane, scene);
    const basicMesh = createMeshForEntity(MS_Plane, basicEntity);

    engine.setScene(scene);

    return engine;
}

const app = new App({
  target: document.getElementById('root'),
});

main();
