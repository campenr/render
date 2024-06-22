import {createProgram, createShader} from "../shader";
import ECS from "./ecs";
import {Position, Render} from "./components";
import {m3} from "./math";

export default class RenderingSystem {
    private gl: WebGLRenderingContext;
    program: any;
    positionLocation: any;
    colorLocation: any;
    positionBuffer: any;
    resolutionUniformLocation: any;
    matrixLocation: any;
    positions: Array<number>;
    vao: any;

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
        this.program = program;
        this.gl.useProgram(program);

        // look up where the vertex data needs to go.
        const positionAttributeLocation = this.gl.getAttribLocation(program, "a_position");

        // look up uniform locations
        this.resolutionUniformLocation = this.gl.getUniformLocation(program, "u_resolution");
        this.matrixLocation = this.gl.getUniformLocation(program, "u_matrix");

        // Create a buffer and put three 2d clip space points in it
        const positionBuffer = this.gl.createBuffer();

        // Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = positionBuffer)
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);

        // array of start/end points in clip-space
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
        var vao = this.gl.createVertexArray();
        this.vao = vao;

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

        // this.positionLocation = this.gl.getAttribLocation(program, "a_position");
        // this.colorLocation = this.gl.getUniformLocation(program, "u_color");
        //
        // this.positionBuffer = this.gl.createBuffer();
        // this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
        // this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([
        //     -0.1, -0.1,
        //      0.1, -0.1,
        //     -0.1,  0.1,
        //      0.1,  0.1,
        // ]), this.gl.STATIC_DRAW);
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

    update(ecs: ECS): void {
        const entities = ecs.entities;

        // Tell WebGL how to convert from clip space to pixels
        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);

        // Clear the canvas
        this.gl.clearColor(0, 0, 0, 1);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        // Tell it to use our program (pair of shaders)
        this.gl.useProgram(this.program);

        // Bind the attribute/buffer set we want.
        this.gl.bindVertexArray(this.vao);

        // Pass in the canvas resolution so we can convert from
        // pixels to clipspace in the shader
        this.gl.uniform2f(this.resolutionUniformLocation, this.gl.canvas.width, this.gl.canvas.height);

        // Compute the matrices
        var translationMatrix = m3.translation(0.5, 0.5);

        // Set the matrix.
        this.gl.uniformMatrix3fv(this.matrixLocation, false, translationMatrix);

        // draw
        var primitiveType = this.gl.TRIANGLES;
        var offset = 0;
        var count = this.positions.length / 2;  // positions / values per position
        this.gl.drawArrays(primitiveType, offset, count);

        ///////

        // this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        // for (const entity of entities) {
        //     const position = ecs.getComponent(entity, Position);
        //     const render = ecs.getComponent(entity, Render);
        //
        //     if (position && render) {
        //         this.gl.uniform4fv(this.colorLocation, render.color);
        //
        //         this.gl.enableVertexAttribArray(this.positionLocation);
        //         this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
        //         this.gl.vertexAttribPointer(this.positionLocation, 2, this.gl.FLOAT, false, 0, 0);
        //
        //         this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
        //     }
        // }
    }
}
