"use strict";

import Engine2D from '../engine';
import Entity from '../entity';
import { multiply } from '../../wasm/index.wasm';
import { m3 } from "../math";
import {createProgram, createShader} from "../shader";

import App from "./App";
import { controls } from "./store";
import ECS from "../ecs";
import {Position, Render} from "../components";

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

// Define several convolution kernels
const kernels = {
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

controls['kernel'] = {
    'type': 'choice',
    'value': 'normal',
    'choices': Object.keys(kernels),
};

function getKernel() {
    return controls['kernel'].value;
}
class RenderingSystem {
    private gl: WebGLRenderingContext;
    private resolutionUniformLocation: any;
    private imageLocation: any;
    private positionBuffer: any;
    private kernelLocation: any;
    private kernelWeightLocation: any;

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
        const texCoordAttributeLocation = this.gl.getAttribLocation(program, "a_texCoord");

        // look up uniform locations
        this.resolutionUniformLocation = this.gl.getUniformLocation(program, "u_resolution");
        this.imageLocation = this.gl.getUniformLocation(program, "u_image");
        this.kernelLocation = this.gl.getUniformLocation(program, "u_kernel[0]");
        this.kernelWeightLocation = this.gl.getUniformLocation(program, "u_kernelWeight");

        // Tell WebGL how to convert from clip space to pixels
        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);

        // Pass in the canvas resolution so we can convert from
        // pixels to clipspace in the shader
        this.gl.uniform2f(this.resolutionUniformLocation, this.gl.canvas.width, this.gl.canvas.height);

        // Create a vertex array object (attribute state)
        const vao = this.gl.createVertexArray();

        // and make it the one we're currently working with
        this.gl.bindVertexArray(vao);

        // Create a buffer and put a single pixel space rectangle in
        // it (2 triangles)
        this.positionBuffer = this.gl.createBuffer();

        // Turn on the attribute
        this.gl.enableVertexAttribArray(positionAttributeLocation);

        // Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = positionBuffer)
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);

        // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
        var size = 2;          // 2 components per iteration
        var type = this.gl.FLOAT;   // the data is 32bit floats
        var normalize = false; // don't normalize the data
        var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
        var offset = 0;        // start at the beginning of the buffer
        this.gl.vertexAttribPointer(positionAttributeLocation, size, type, normalize, stride, offset);

        // provide texture coordinates for the rectangle.
        var texCoordBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, texCoordBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([
           0.0,  0.0,
           1.0,  0.0,
           0.0,  1.0,
           0.0,  1.0,
           1.0,  0.0,
           1.0,  1.0,
        ]), this.gl.STATIC_DRAW);

        // Turn on the attribute
        this.gl.enableVertexAttribArray(texCoordAttributeLocation);

        // Tell the attribute how to get data out of texCoordBuffer (ARRAY_BUFFER)
        var size = 2;          // 2 components per iteration
        var type = this.gl.FLOAT;   // the data is 32bit floats
        var normalize = false; // don't normalize the data
        var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
        var offset = 0;        // start at the beginning of the buffer
        this.gl.vertexAttribPointer(texCoordAttributeLocation, size, type, normalize, stride, offset);

        // Create a texture.
        var texture = this.gl.createTexture();

        // make unit 0 the active texture uint
        // (ie, the unit all other texture commands will affect
        this.gl.activeTexture(this.gl.TEXTURE0 + 0);

        // Bind it to texture unit 0' 2D bind point
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);

        // Set the parameters so we don't need mips and so we're not filtering
        // and we don't repeat at the edges
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);

        // Upload the image into the texture.
        var mipLevel = 0;               // the largest mip
        var internalFormat = this.gl.RGBA;   // format we want in the texture
        var srcFormat = this.gl.RGBA;        // format of data we are supplying
        var srcType = this.gl.UNSIGNED_BYTE; // type of data we are supplying
        this.gl.texImage2D(this.gl.TEXTURE_2D, mipLevel, internalFormat, srcFormat, srcType, image);
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
        const entities = ecs.getEntitiesWithComponents([Position, Render]);
        for (let i = 0; i < entities.length; i++) {
            const entity = entities[i];

            const position = ecs.getComponent(entity, Position)

            // set the kernel and it's weight
            const activeKernel = getKernel();
            this.gl.uniform1fv(this.kernelLocation, kernels[activeKernel]);
            this.gl.uniform1f(this.kernelWeightLocation, computeKernelWeight(kernels[activeKernel]));

            // Bind the position buffer so gl.bufferData that will be called
            // in setRectangle puts data in the position buffer
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);

            // Set a rectangle the same size as the image.
            setRectangle(this.gl, position.x, position.y, image.width, image.height);

            // Draw the rectangle.
            var primitiveType = this.gl.TRIANGLES;
            var offset = 0;
            var count = 6;
            this.gl.drawArrays(primitiveType, offset, count);

        }
    }
}

function main() {

    const canvas = document.querySelector("#glcanvas") as HTMLCanvasElement;

    const ecs = new ECS();

    const renderingSystem = new RenderingSystem(canvas, vertexShaderSource, fragmentShaderSource);

    const engine = new Engine2D(
        [renderingSystem],
        ecs
    )

    const entity1 = ecs.createEntity();
    ecs.addComponent(entity1, new Position(0, 0));
    ecs.addComponent(entity1, new Render());

    engine.run()
}


const app = new App({
  target: document.getElementById('root'),
});

main();
