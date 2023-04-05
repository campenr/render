"use strict";
var vertexShaderSource = "#version 300 es\n\n// an attribute is an input (in) to a vertex shader.\n// It will receive data from a buffer\nin vec2 a_position;\n\n// Used to pass in the resolution of the canvas\nuniform vec2 u_resolution;\n\n// A matrix to transform the positions by\nuniform mat3 u_matrix;\n\n// all shaders have a main function\nvoid main() {\n  // Multiply the position by the matrix.\n  vec2 position = (u_matrix * vec3(a_position, 1)).xy;\n\n  // convert the position from pixels to 0.0 to 1.0\n  vec2 zeroToOne = position / u_resolution;\n\n  // convert from 0->1 to 0->2\n  vec2 zeroToTwo = zeroToOne * 2.0;\n\n  // convert from 0->2 to -1->+1 (clipspace)\n  vec2 clipSpace = zeroToTwo - 1.0;\n\n  gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);\n}\n";
var fragmentShaderSource = "#version 300 es\n\n// fragment shaders don't have a default precision so we need\n// to pick one. highp is a good default. It means \"high precision\"\nprecision highp float;\n\n// we need to declare an output for the fragment shader\nout vec4 outColor;\n\nvoid main() {\n  // Just set the output to a constant redish-purple\n  outColor = vec4(1, 0, 0.5, 1);\n}\n";
var m3 = {
    translation: function translation(tx, ty) {
        return [
            1, 0, 0,
            0, 1, 0,
            tx, ty, 1
        ];
    },
    rotation: function rotation(angleInRadians) {
        var c = Math.cos(angleInRadians);
        var s = Math.sin(angleInRadians);
        return [
            c, -s, 0,
            s, c, 0,
            0, 0, 1
        ];
    },
    scaling: function scaling(sx, sy) {
        return [
            sx, 0, 0,
            0, sy, 0,
            0, 0, 1
        ];
    },
};
function createShader(gl, type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) {
        return shader;
    }
    console.log(gl.getShaderInfoLog(shader)); // eslint-disable-line
    gl.deleteShader(shader);
    return undefined;
}
function createProgram(gl, vertexShader, fragmentShader) {
    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    var success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) {
        return program;
    }
    console.log(gl.getProgramInfoLog(program)); // eslint-disable-line
    gl.deleteProgram(program);
    return undefined;
}
function main() {
    // Get A WebGL context
    var canvas = document.querySelector("#glcanvas");
    var gl = canvas.getContext("webgl2");
    if (!gl) {
        return;
    }
    // create GLSL shaders, upload the GLSL source, compile the shaders
    var vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    var fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    // Link the two shaders into a program
    var program = createProgram(gl, vertexShader, fragmentShader);
    // look up where the vertex data needs to go.
    var positionAttributeLocation = gl.getAttribLocation(program, "a_position");
    // look up uniform locations
    var resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution");
    var matrixLocation = gl.getUniformLocation(program, "u_matrix");
    // Create a buffer and put three 2d clip space points in it
    var positionBuffer = gl.createBuffer();
    // Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = positionBuffer)
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    // array of start/end points in clip-space
    var positions = [
        10, 20,
        80, 20,
        10, 30,
        10, 30,
        80, 20,
        80, 30,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    // Create a vertex array object (attribute state)
    var vao = gl.createVertexArray();
    // and make it the one we're currently working with
    gl.bindVertexArray(vao);
    // Turn on the attribute
    gl.enableVertexAttribArray(positionAttributeLocation);
    // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
    var size = 2; // 2 components per iteration
    var type = gl.FLOAT; // the data is 32bit floats
    var normalize = false; // don't normalize the data
    var stride = 0; // 0 = move forward size * sizeof(type) each iteration to get the next position
    var offset = 0; // start at the beginning of the buffer
    gl.vertexAttribPointer(positionAttributeLocation, size, type, normalize, stride, offset);
    // First let's make some variables
    // to hold the translation,
    var translation = [0, 0];
    function drawScene() {
        console.log('drawing');
        // Tell WebGL how to convert from clip space to pixels
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        // Clear the canvas
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        // Tell it to use our program (pair of shaders)
        gl.useProgram(program);
        // Bind the attribute/buffer set we want.
        gl.bindVertexArray(vao);
        // Pass in the canvas resolution so we can convert from
        // pixels to clipspace in the shader
        gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);
        // Compute the matrices
        var translationMatrix = m3.translation(translation[0], translation[1]);
        // Set the matrix.
        gl.uniformMatrix3fv(matrixLocation, false, translationMatrix);
        // draw
        var primitiveType = gl.TRIANGLES;
        var offset = 0;
        var count = positions.length / size; // positions / values per position
        gl.drawArrays(primitiveType, offset, count);
    }
    requestAnimationFrame(drawScene);
    var time = 0;
    var moveSpeed = 100;
    var testRender = function (time_) {
        var deltaTime = time_ / 1000 - time;
        console.log('test render: ', { translation: translation, deltaTime: deltaTime });
        time = time_ / 1000;
        translation = [translation[0] + deltaTime * moveSpeed, translation[1] + deltaTime * moveSpeed];
        if (translation[0] < gl.canvas.height * 0.90) {
            drawScene();
            requestAnimationFrame(testRender);
        }
    };
    testRender(time);
}
main();
