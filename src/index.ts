"use strict";

import Engine2D from './engine.ts';
import Scene2D, { createEntityForScene } from './scene.ts';
import Entity from './entity.ts';
import Mesh, { createMeshForEntity } from "./mesh.ts";

import { multiply } from '../wasm/index.wasm';


function main() {

  var canvas = document.querySelector("#glcanvas") as HTMLCanvasElement;
  var gl = canvas.getContext("webgl2");
  if (!gl) {
    return;
  }

  const engine = new Engine2D(canvas, gl);
  const scene = new Scene2D(engine);

  const basicEntity = createEntityForScene(Entity, scene);
  const basicMesh = createMeshForEntity(Mesh, basicEntity);

  requestAnimationFrame(() => scene.draw());

  var time = 0;
  var moveSpeed = 100;

  const testRender = (time_) => {
    var deltaTime = time_ / 1000 - time;
    time = time_ / 1000;
    basicEntity.translation = [basicEntity.translation[0] + deltaTime * moveSpeed, basicEntity.translation[1] + deltaTime * moveSpeed];
    if (basicEntity.translation[0] < multiply(gl.canvas.height * 1.0, 0.90)) {
      scene.draw();
      requestAnimationFrame(testRender);
    }
  }

  testRender(time)

}

main();
