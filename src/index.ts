"use strict";

import Engine2D from './engine.ts';
import Scene2D, { createEntityForScene } from './scene.ts';
import Entity from './entity.ts';
import Mesh, { createMeshForEntity } from "./mesh.ts";


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
  const basicEntity = createEntityForScene(Entity, scene);
  const basicMesh = createMeshForEntity(Mesh, basicEntity);

  engine.setScene(scene);

  return engine;
}

main();
