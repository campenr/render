"use strict";

import Engine2D from '../engine';
import { createProgram, createShader } from "../shader";

import App from "./App";
import { controls } from "./store";
import ECS from "../ecs";
import { Position, Render } from "../components";

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

// the texCoords passed in from the vertex shader.
in vec2 v_texCoord;

// we need to declare an output for the fragment shader
out vec4 outColor;

vec4 textureBilinear(sampler2D textureSampler, vec2 textureCoordinate) {
    vec2 texelSize = 1.0 / vec2(textureSize(textureSampler, 0));
    vec4 p0q0 = texture(textureSampler, textureCoordinate);
    vec4 p1q0 = texture(textureSampler, textureCoordinate + vec2(texelSize.x, 0));
    vec4 p0q1 = texture(textureSampler, textureCoordinate + vec2(0, texelSize.y));
    vec4 p1q1 = texture(textureSampler, textureCoordinate + vec2(texelSize.x , texelSize.y));
    
    float a = fract(textureCoordinate.x);
    float b = fract(textureCoordinate.y);
    vec4 pInterp_q0 = mix(p0q0, p1q0, a);
    vec4 pInterp_q1 = mix(p0q1, p1q1, a);
    return mix(pInterp_q0, pInterp_q1, b);
}

void main() {
    // smooth the downsampled image to improve final quality
    vec3 pixel = textureBilinear(u_image, v_texCoord).rgb;
    outColor = vec4(pixel.rgb, 1);

}`;

const INITIAL_WIDTH = 640;
const INITIAL_HEIGHT = 480;
const DOWNSAMPLE = 8;

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

controls['downscaling'] = {
    'type': 'number',
    'value': DOWNSAMPLE,
};

function getDownsample() {
    return controls['downscaling'].value;
}

class RenderingSystem {
    private gl: WebGLRenderingContext;
    private resolutionUniformLocation: any;
    private imageLocation: any;
    private positionBuffer: any;
    private currentDownscale: number = DOWNSAMPLE;
    private previousDownscale: number = DOWNSAMPLE;

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
        const texCoordAttributeLocation = this.gl.getAttribLocation(program, "a_texCoord");

        // look up uniform locations
        this.resolutionUniformLocation = this.gl.getUniformLocation(program, "u_resolution");
        this.imageLocation = this.gl.getUniformLocation(program, "u_image");

        // Tell WebGL how to convert from clip space to pixels
        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);

        // Pass in the canvas resolution so we can convert from
        // pixels to clipspace in the shader
        // upsizing the image after downscale
        this.gl.uniform2f(this.resolutionUniformLocation, this.gl.canvas.width * this.currentDownscale, this.gl.canvas.height * this.currentDownscale);

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

    update(ecs: ECS, deltaTime: number): void {
        // Clear the canvas
        this.gl.clearColor(0, 0, 0, 1);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        // this.currentDownscale = getDownsample();
        // if (this.currentDownscale != this.previousDownscale) {
        //     console.log('current, prev, get: ', this.currentDownscale, this.previousDownscale, getDownsample())
        //     console.log('w/h: ', this.gl.canvas.width, this.gl.canvas.height)
        //
        //     // update the canvas resolution
        //     this.gl.canvas.width = INITIAL_WIDTH / this.currentDownscale;
        //     this.gl.canvas.height = INITIAL_HEIGHT / this.currentDownscale;
        //
        //     // because we can change the downsample on the fly we need to re-run this on update.
        //     this.gl.uniform2f(this.resolutionUniformLocation, this.gl.canvas.width, this.gl.canvas.height);
        //
        //     this.previousDownscale = this.currentDownscale;
        // }

        // iterate and render the entities
        // Note: we could look to batch draws for perf.
        const entities = ecs.getEntitiesWithComponents([Position, Render]);
        for (let i = 0; i < entities.length; i++) {
            const entity = entities[i];

            const position = ecs.getComponent(entity, Position)

            // Bind the position buffer so gl.bufferData that will be called
            // in setRectangle puts data in the position buffer
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);

            let downsampleChange = this.previousDownscale / this.currentDownscale;

            // Set a rectangle the same size as the image.
            setRectangle(this.gl, position.x, position.y, this.gl.canvas.width * this.currentDownscale, this.gl.canvas.height * this.currentDownscale);

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
    // for simplicity, we downscale the image by downscaling the whole canvas.
    // we upscale it in the shader by multiplying the shader resolution by the amount we downscaled.
    let downsample = getDownsample();
    canvas.width = INITIAL_WIDTH / downsample;
    canvas.height = INITIAL_HEIGHT / downsample;
    // because we're downscaling the image using the canvas itself we need to also make sure
    // it doesn't do the default when we upscale it back up of interpolating pixel colors.
    canvas.style.imageRendering = "pixelated";

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
