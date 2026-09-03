import { useEffect, useRef } from "react";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { DefaultRenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Engine } from "@babylonjs/core/Engines/engine";
import { GlowLayer } from "@babylonjs/core/Layers/glowLayer";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Scene } from "@babylonjs/core/scene";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import "@babylonjs/core/Rendering/edgesRenderer";
import RouteControls from "../components/RouteControls";
import { resolveAsset } from "../assets/registry";

const thaleiaPortrait = resolveAsset("game.odyssey-reimagined.experiment.portrait.thaleia-painterly");

function brushMaterial(scene, name, base, accent, seed = 1) {
  const texture = new DynamicTexture(`${name}-brush`, { width: 256, height: 256 }, scene, false);
  const context = texture.getContext();
  context.fillStyle = base;
  context.fillRect(0, 0, 256, 256);
  let value = seed * 971;
  for (let index = 0; index < 70; index += 1) {
    value = (value * 48271) % 2147483647;
    const x = value % 256;
    value = (value * 48271) % 2147483647;
    const y = value % 256;
    const width = 18 + (value % 70);
    context.globalAlpha = 0.035 + (index % 5) * 0.015;
    context.strokeStyle = index % 3 === 0 ? accent : "#fff4d1";
    context.lineWidth = 2 + (index % 7);
    context.beginPath();
    context.moveTo(x, y);
    context.quadraticCurveTo(x + width * 0.4, y - 8, x + width, y + 4);
    context.stroke();
  }
  context.globalAlpha = 1;
  texture.update();
  texture.wrapU = Texture.WRAP_ADDRESSMODE;
  texture.wrapV = Texture.WRAP_ADDRESSMODE;
  texture.uScale = 2;
  texture.vScale = 2;

  const material = new StandardMaterial(name, scene);
  material.diffuseTexture = texture;
  material.specularColor = new Color3(0.08, 0.06, 0.04);
  material.roughness = 0.92;
  return material;
}

function BabylonPainterly({ world, actions }) {
  const canvasRef = useRef(null);
  const stateRef = useRef(world);
  stateRef.current = world;

  useEffect(() => {
    const canvas = canvasRef.current;
    const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.025, 0.075, 0.11, 1);
    scene.fogMode = Scene.FOGMODE_EXP2;
    scene.fogDensity = 0.012;
    scene.fogColor = new Color3(0.17, 0.34, 0.37);

    const camera = new ArcRotateCamera("camera", -1.28, 1.34, 16.4, new Vector3(0, 1.05, 1.65), scene);
    camera.lowerRadiusLimit = 14.8;
    camera.upperRadiusLimit = 19;
    camera.lowerBetaLimit = 1.18;
    camera.upperBetaLimit = 1.44;
    camera.wheelPrecision = 80;
    camera.attachControl(canvas, true);

    const ambient = new HemisphericLight("harbor-bounce", new Vector3(0, 1, 0), scene);
    ambient.intensity = 0.92;
    ambient.diffuse = new Color3(0.48, 0.72, 0.74);
    ambient.groundColor = new Color3(0.23, 0.13, 0.08);

    const sun = new DirectionalLight("late-sun", new Vector3(-0.7, -1, 0.45), scene);
    sun.position = new Vector3(8, 14, -10);
    sun.intensity = 3.75;
    sun.diffuse = new Color3(1, 0.62, 0.34);
    const shadows = new ShadowGenerator(1024, sun);
    shadows.useBlurExponentialShadowMap = true;
    shadows.blurKernel = 24;

    const stone = brushMaterial(scene, "salt-stone", "#dcc08a", "#6c9690", 3);
    const darkStone = brushMaterial(scene, "shadow-stone", "#795f4c", "#2f6970", 8);
    darkStone.emissiveColor = new Color3(0.035, 0.025, 0.02);
    const seaMat = brushMaterial(scene, "painted-sea", "#20677a", "#86c7bc", 11);
    seaMat.emissiveColor = new Color3(0.03, 0.1, 0.12);
    const bronze = brushMaterial(scene, "oxidized-bronze", "#7d512e", "#4a9288", 17);
    bronze.emissiveColor = new Color3(0.05, 0.1, 0.08);
    const indigo = brushMaterial(scene, "indigo-cloth", "#17283b", "#a36335", 23);

    const root = new TransformNode("saltcape", scene);
    const ground = MeshBuilder.CreateGround("quay", { width: 15, height: 11, subdivisions: 3 }, scene);
    ground.position.z = -0.3;
    ground.material = stone;
    ground.receiveShadows = true;
    ground.parent = root;

    const sea = MeshBuilder.CreateGround("sea", { width: 28, height: 16, subdivisions: 24 }, scene);
    sea.position = new Vector3(0, -0.55, 10);
    sea.material = seaMat;
    sea.parent = root;

    const addBlock = (name, position, scale, material = stone) => {
      const mesh = MeshBuilder.CreateBox(name, { size: 1 }, scene);
      mesh.position = Vector3.FromArray(position);
      mesh.scaling = Vector3.FromArray(scale);
      mesh.material = material;
      mesh.receiveShadows = true;
      mesh.enableEdgesRendering();
      mesh.edgesWidth = 1.25;
      mesh.edgesColor = new Color4(0.1, 0.08, 0.07, 0.42);
      shadows.addShadowCaster(mesh);
      mesh.parent = root;
      return mesh;
    };

    addBlock("left-house", [-5.4, 1.5, 0.7], [3.1, 3.5, 2.8]);
    addBlock("left-tower", [-3.25, 2.05, 1.8], [1.45, 4.5, 1.8], darkStone);
    addBlock("right-house", [5.25, 1.8, 1.6], [3.3, 4.1, 3.2]);
    addBlock("archive", [2.7, 1.1, -2.7], [3.0, 2.5, 2.2], darkStone);
    for (let step = 0; step < 5; step += 1) {
      addBlock(`step-${step}`, [0, -0.03 + step * 0.12, 3.1 + step * 0.75], [3.5, 0.24, 0.72]);
    }

    const gate = MeshBuilder.CreateTorus("tide-gate", { diameter: 2.6, thickness: 0.25, tessellation: 48 }, scene);
    gate.position = new Vector3(4.05, 1.2, -0.12);
    gate.rotation.x = Math.PI / 2;
    gate.material = bronze;
    gate.enableEdgesRendering();
    gate.edgesWidth = 2;
    gate.edgesColor = new Color4(0.1, 0.42, 0.38, 0.9);
    shadows.addShadowCaster(gate);

    const seal = MeshBuilder.CreateCylinder("ship-seal", { diameter: 0.72, height: 0.16, tessellation: 32 }, scene);
    seal.position = new Vector3(-2.1, 1.15, -2.1);
    seal.rotation.x = Math.PI / 2;
    seal.material = bronze;
    const glow = new GlowLayer("seal-glow", scene, { blurKernelSize: 34 });
    glow.intensity = 0.35;

    const ship = new TransformNode("returning-tide", scene);
    ship.position = new Vector3(0.4, -0.1, 7.2);
    const hull = MeshBuilder.CreateCylinder("hull", { height: 4.8, diameterTop: 1.1, diameterBottom: 0.45, tessellation: 5 }, scene);
    hull.rotation.z = Math.PI / 2;
    hull.scaling.y = 0.7;
    hull.material = darkStone;
    hull.parent = ship;
    const mast = MeshBuilder.CreateCylinder("mast", { height: 4.6, diameter: 0.13, tessellation: 12 }, scene);
    mast.position.y = 2.1;
    mast.material = bronze;
    mast.parent = ship;
    const sail = MeshBuilder.CreatePlane("sail", { width: 3.4, height: 2.4, sideOrientation: 2 }, scene);
    sail.position = new Vector3(0, 2.3, 0);
    sail.rotation.y = Math.PI / 2;
    sail.material = stone;
    sail.parent = ship;

    const makeActor = (name, position, cloth, scale = 1) => {
      const actor = new TransformNode(name, scene);
      actor.position = Vector3.FromArray(position);
      actor.scaling.scaleInPlace(scale);
      const body = MeshBuilder.CreateCylinder(`${name}-body`, { height: 1.7, diameterTop: 0.58, diameterBottom: 0.88, tessellation: 7 }, scene);
      body.position.y = 0.85;
      body.material = cloth;
      body.parent = actor;
      const head = MeshBuilder.CreateSphere(`${name}-head`, { diameter: 0.48, segments: 12 }, scene);
      head.position.y = 1.92;
      head.material = stone;
      head.parent = actor;
      body.enableEdgesRendering();
      body.edgesColor = new Color4(0.03, 0.04, 0.05, 0.8);
      shadows.addShadowCaster(body);
      shadows.addShadowCaster(head);
      return actor;
    };
    makeActor("player", [-0.7, 0.05, -1.1], indigo, 1.12).rotation.y = -0.25;
    const thaleia = makeActor("thaleia", [1.3, 0.03, 2.8], bronze, 0.92);
    const ion = makeActor("ion", [-2.4, 0.03, 2.3], stone, 0.82);

    const pipeline = new DefaultRenderingPipeline("cinematic", true, scene, [camera]);
    pipeline.samples = 2;
    pipeline.fxaaEnabled = true;
    pipeline.bloomEnabled = true;
    pipeline.bloomThreshold = 0.72;
    pipeline.bloomWeight = 0.18;
    pipeline.imageProcessingEnabled = true;
    pipeline.imageProcessing.contrast = 1.16;
    pipeline.imageProcessing.exposure = 1.34;

    scene.onBeforeRenderObservable.add(() => {
      const time = performance.now() * 0.001;
      sea.position.y = -0.54 + Math.sin(time * 0.7) * 0.025;
      ship.rotation.z = Math.sin(time * 0.55) * 0.018;
      sail.scaling.x = 1 + Math.sin(time * 0.9) * 0.025;
      thaleia.rotation.y = -0.35 + Math.sin(time * 0.42) * 0.04;
      ion.position.x = -2.4 + Math.sin(time * 0.22) * 0.35;
      seal.scaling.setAll(stateRef.current.observed ? 1.15 + Math.sin(time * 3) * 0.08 : 1);
      glow.intensity = stateRef.current.observed ? 0.72 : 0.22;
      const sunsetShift = (stateRef.current.sunset - 1) * 0.18;
      sun.intensity = 3.75 - sunsetShift;
    });

    engine.runRenderLoop(() => scene.render());
    const resize = () => engine.resize();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      scene.dispose();
      engine.dispose();
    };
  }, []);

  const identityLabel = world.identity === "captain" ? "特洛伊归来的船长" : world.identity === "pilgrim" ? "风暴后的无名朝圣者" : "尚未宣称";

  return (
    <div className="scene-layout painterly-layout" data-testid="scene-painterly">
      <div className="canvas-stage painterly-stage">
        <canvas ref={canvasRef} aria-label="Babylon.js 绘画性盐岬港场景" />
        <div className="cinema-vignette" />
        <div className="world-title">
          <span>第三潮钟</span>
          <strong>港口正在决定你是谁</strong>
        </div>
        <div className="cinema-objective">
          <span className="objective-index">01</span>
          <p>日落前取回船印<br /><strong>让伊翁相信一个版本</strong></p>
        </div>
      </div>

      <aside className="route-panel painterly-panel">
        <div className="portrait-wrap">
          <img src={thaleiaPortrait} alt="塔勒娅原创实验肖像" />
          <div className="portrait-caption"><span>潮门守誓者</span><strong>塔勒娅</strong></div>
        </div>
        <blockquote>“海不会核对你的名字。人会。”</blockquote>
        <div className="identity-readout">
          <small>公开身份</small>
          <strong>{identityLabel}</strong>
          <span>{world.identity === "captain" ? "权限：执政厅外院 / 风险：王印缺失" : world.identity === "pilgrim" ? "权限：海神庙 / 风险：不可持有船印" : "先观察，再让一个名字承担代价"}</span>
        </div>
        <RouteControls world={world} actions={actions} variant="painterly" />
      </aside>
    </div>
  );
}

export default BabylonPainterly;
