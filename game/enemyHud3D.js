import { Color3, DynamicTexture, Mesh, MeshBuilder, StandardMaterial, Texture, Vector3 } from "@babylonjs/core";
import { projectWorldToNdc, unprojectNdcToWorld } from "./gameCommon.js";

const ENEMY_HUD_LABEL_W = 64;
const ENEMY_HUD_LABEL_H = 16;

const enemyHudCorner = new Vector3();
const enemyHudLabelPos = new Vector3();
const enemyHudLabelCenter = new Vector3();
const enemyHudPixelOrigin = new Vector3();
const hitProjNdc = new Vector3();
const hitUnproj = new Vector3();

function screenToWorldAtDepth(px, py, ndcZ, out, scene, canvasWidth, canvasHeight) {
  const ndcX = (px / canvasWidth) * 2.0 - 1.0;
  const ndcY = -((py / canvasHeight) * 2.0 - 1.0);
  return unprojectNdcToWorld(scene, ndcX, ndcY, ndcZ, out);
}

function worldSizeForPixels(wx, wy, wz, pixels, scene, canvasWidth) {
  projectWorldToNdc(scene, wx, wy, wz, hitProjNdc);
  const ndcX1px = hitProjNdc.x + (2.0 / canvasWidth) * pixels;
  unprojectNdcToWorld(scene, ndcX1px, hitProjNdc.y, hitProjNdc.z, hitUnproj);
  enemyHudPixelOrigin.set(wx, wy, wz);
  return Vector3.Distance(enemyHudPixelOrigin, hitUnproj);
}

export function createEnemyHudObjects(scene) {
  const labelTexture = new DynamicTexture("hudLabel", { width: ENEMY_HUD_LABEL_W, height: ENEMY_HUD_LABEL_H }, scene, false);
  labelTexture.hasAlpha = true;
  labelTexture.updateSamplingMode(Texture.NEAREST_NEAREST);

  // マテリアル
  const labelMaterial = new StandardMaterial("hudLabelMat", scene);
  labelMaterial.diffuseTexture = labelTexture;
  labelMaterial.diffuseColor = new Color3(1.0, 1.0, 1.0);
  labelMaterial.specularColor = new Color3(0.0, 0.0, 0.0);
  labelMaterial.emissiveColor = new Color3(0.0, 1.0, 1.0);
  labelMaterial.disableLighting = true;
  labelMaterial.useAlphaFromDiffuseTexture = true;
  labelMaterial.backFaceCulling = false;

  // 距離テキスト
  const labelPlane = MeshBuilder.CreatePlane("hudLabel", { width: 1.0, height: 1.0 }, scene);
  labelPlane.material = labelMaterial;
  labelPlane.billboardMode = Mesh.BILLBOARDMODE_ALL;
  labelPlane.isPickable = false;
  labelPlane.renderingGroupId = 1; // HUDは描画グループ1を使用

  // 引き出し線
  const linePoints = [Vector3.Zero(), Vector3.Zero(), Vector3.Zero()];
  const line = MeshBuilder.CreateLines("hudLine", { points: linePoints, updatable: true }, scene);
  line.color = new Color3(0.0, 1.0, 1.0);
  line.isPickable = false;
  line.renderingGroupId = 1; // HUDは描画グループ1を使用

  // グループ1描画時に深度バッファをクリアしない
  scene.setRenderingAutoClearDepthStencil(1, false);

  return { labelTexture, labelMaterial, labelPlane, line };
}

export function disposeEnemyHudObjects(hud) {
  hud.labelPlane.dispose();
  hud.labelMaterial.dispose();
  hud.labelTexture.dispose();
  hud.line.dispose();
}

export function updateEnemyHud({ hud, enemy, enemyHudProj, jiki, scene, canvas3d }) {
  const ex = enemy.x();
  const ey = enemy.y();
  const ez = enemy.z();
  projectWorldToNdc(scene, ex, ey, ez, enemyHudProj);
  if (enemyHudProj.z < -1.0 || enemyHudProj.z > 1.0) {
    hud.labelPlane.setEnabled(false);
    hud.line.setEnabled(false);
    return;
  }

  const dx = ex - jiki.x();
  const dy = ey - jiki.y();
  const dz = ez - jiki.z();
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
  let seg = 50.0 - distance;
  if (seg < 15.0) seg = 15.0;

  const canvasWidth = canvas3d.width;
  const canvasHeight = canvas3d.height;
  const px = (enemyHudProj.x * 0.5 + 0.5) * canvasWidth;
  const py = (-enemyHudProj.y * 0.5 + 0.5) * canvasHeight;
  const tx = px + seg + 20.0;
  const ty = py - seg;
  const ndcZ = enemyHudProj.z;
  screenToWorldAtDepth(px + seg, ty, ndcZ, enemyHudCorner, scene, canvasWidth, canvasHeight);
  screenToWorldAtDepth(tx, ty, ndcZ, enemyHudLabelPos, scene, canvasWidth, canvasHeight);

  // 引き出し線の更新
  MeshBuilder.CreateLines("hudLine", {
    points: [
      new Vector3(ex, ey, ez),
      enemyHudCorner,
      enemyHudLabelPos,
    ],
    instance: hud.line,
  });

  // 距離テキストの更新
  const label = String((distance * 100.0) | 0);
  const whole = label.slice(0, -2) || "0";
  const frac = label.slice(-2).padStart(2, "0");
  const text = `${whole}.${frac}`;
  const ctx = hud.labelTexture.getContext();
  ctx.clearRect(0, 0, ENEMY_HUD_LABEL_W, ENEMY_HUD_LABEL_H);
  ctx.font = "8px 'MS Gothic', sans-serif";
  ctx.fillStyle = "rgb(0, 255, 255)";
  ctx.textBaseline = "bottom";
  ctx.fillText(text, 0, ENEMY_HUD_LABEL_H - 2);
  hud.labelTexture.update();

  screenToWorldAtDepth(
    px + seg + ENEMY_HUD_LABEL_W * 0.5,
    ty - ENEMY_HUD_LABEL_H * 0.5,
    ndcZ,
    enemyHudLabelCenter,
    scene,
    canvasWidth,
    canvasHeight
  );
  hud.labelPlane.position.copyFrom(enemyHudLabelCenter);
  const scaleX = worldSizeForPixels(enemyHudLabelCenter.x, enemyHudLabelCenter.y, enemyHudLabelCenter.z, ENEMY_HUD_LABEL_W, scene, canvasWidth);
  const scaleY = worldSizeForPixels(enemyHudLabelCenter.x, enemyHudLabelCenter.y, enemyHudLabelCenter.z, ENEMY_HUD_LABEL_H, scene, canvasWidth);
  hud.labelPlane.scaling.set(scaleX, scaleY, 1.0);
  hud.labelPlane.setEnabled(true);
  hud.line.setEnabled(true);
}
