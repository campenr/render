"use strict";(()=>{var n=class{constructor(e,r){this.canvas=e,this.gl=r}};var b=`#version 300 es

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
`,x=`#version 300 es

// fragment shaders don't have a default precision so we need
// to pick one. highp is a good default. It means "high precision"
precision highp float;

// we need to declare an output for the fragment shader
out vec4 outColor;

void main() {
  // Just set the output to a constant redish-purple
  outColor = vec4(1, 0, 0.5, 1);
}
`,S={translation:function(e,r){return[1,0,0,0,1,0,e,r,1]},rotation:function(e){var r=Math.cos(e),o=Math.sin(e);return[r,-o,0,o,r,0,0,0,1]},scaling:function(e,r){return[e,0,0,0,r,0,0,0,1]}};function h(t,e,r){var o=t.createShader(e);t.shaderSource(o,r),t.compileShader(o);var a=t.getShaderParameter(o,t.COMPILE_STATUS);if(a)return o;console.log(t.getShaderInfoLog(o)),t.deleteShader(o)}function A(t,e,r){var o=t.createProgram();t.attachShader(o,e),t.attachShader(o,r),t.linkProgram(o);var a=t.getProgramParameter(o,t.LINK_STATUS);if(a)return o;console.log(t.getProgramInfoLog(o)),t.deleteProgram(o)}var s=class{constructor(e){this.engine=e;let r=this.engine.gl;var o=h(r,r.VERTEX_SHADER,b),a=h(r,r.FRAGMENT_SHADER,x),i=A(r,o,a);this.program=i;var c=r.getAttribLocation(i,"a_position");this.resolutionUniformLocation=r.getUniformLocation(i,"u_resolution"),this.matrixLocation=r.getUniformLocation(i,"u_matrix");var f=r.createBuffer();r.bindBuffer(r.ARRAY_BUFFER,f);var u=[10,20,80,20,10,30,10,30,80,20,80,30];r.bufferData(r.ARRAY_BUFFER,new Float32Array(u),r.STATIC_DRAW),this.positions=u;var m=r.createVertexArray();this.vao=m,r.bindVertexArray(m),r.enableVertexAttribArray(c);var v=2;this.size=v;var l=r.FLOAT,p=!1,d=0,g=0;r.vertexAttribPointer(c,v,l,p,d,g),this.translation=[0,0]}draw(){console.log("drawing");let e=this.engine.gl;e.viewport(0,0,e.canvas.width,e.canvas.height),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT),e.useProgram(this.program),e.bindVertexArray(this.vao),e.uniform2f(this.resolutionUniformLocation,e.canvas.width,e.canvas.height);var r=S.translation(this.translation[0],this.translation[1]);e.uniformMatrix3fv(this.matrixLocation,!1,r);var o=e.TRIANGLES,a=0,i=this.positions.length/this.size;e.drawArrays(o,a,i)}};function T(){var t=document.querySelector("#glcanvas"),e=t.getContext("webgl2");if(!e)return;let r=new n(t,e),o=new s(r);requestAnimationFrame(()=>o.draw())}T();})();
