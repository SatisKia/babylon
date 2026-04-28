import { Color3, LoadAssetContainerAsync, StandardMaterial, Texture, TransformNode, VertexBuffer, VertexData } from "@babylonjs/core";
import { MTLFileLoader } from "@babylonjs/loaders/OBJ/mtlFileLoader.js";
import "@babylonjs/loaders/OBJ/objFileLoader.js"; // OBJローダー読み込みで@babylonjs/loaders側がRegisterSceneLoaderPluginを実行する

// MTLマテリアル名に対応する拡散テクスチャをdata URLで差し替える
export function applyDiffuseDataUrlTextures(scene, root, materialDataUrlByName) {
  const dataUrlMap = {};
  for (const entry of materialDataUrlByName) {
    dataUrlMap[entry.materialName] = entry.dataUrl;
  }
  if (!dataUrlMap) return;
  const meshes = root.getChildMeshes ? root.getChildMeshes(true) : [];
  if (root.getClassName && root.getClassName() === "Mesh") meshes.push(root);
  for (const mesh of meshes) {
    const mat = mesh.material;
    if (!mat || !mat.name) continue;
    const url = dataUrlMap[mat.name];
    if (url == null || typeof url !== "string") continue;
    const old = mat.diffuseTexture || mat.albedoTexture;
    if (old) old.dispose();
    // MTLFileLoader.INVERT_TEXTURE_Y: MTLのmap_Kdと同じY反転。falseのままだとOBJのUV向きと一致せず貼り付きが壊れて見える
    const tex = new Texture(url, scene, false, MTLFileLoader.INVERT_TEXTURE_Y, Texture.TRILINEAR_SAMPLINGMODE);
    if ("diffuseTexture" in mat) mat.diffuseTexture = tex;
    else if ("albedoTexture" in mat) mat.albedoTexture = tex;
  }
}

export async function loadObjMtl(scene, basePath, modelName) {
  const path = basePath.endsWith("/") ? basePath : `${basePath}/`;
  const container = await LoadAssetContainerAsync(`${modelName}.obj`, scene, {
    rootUrl: path,
    pluginExtension: ".obj",
  });
  container.addAllToScene();
  const rootTn = container.transformNodes?.find((t) => t.name === "__root__");
  if (rootTn) return rootTn;
  const named = container.meshes.find((m) => m.name === "__root__");
  if (named && named.getClassName?.() === "TransformNode") return named;
  const root = new TransformNode(`${modelName}_root`, scene);
  const list = (container.meshes || []).filter((m) => m && m.name !== "__root__");
  const meshSet = new Set(list);
  const tops = [];
  for (const m of list) {
    let p = m.parent;
    let top = true;
    while (p) {
      if (meshSet.has(p)) {
        top = false;
        break;
      }
      p = p.parent;
    }
    if (top) tops.push(m);
  }
  for (const m of tops) m.setParent(root);
  return root;
}

export function convertMaterialsToLambert(root) {
  const meshes = root.getChildMeshes ? root.getChildMeshes(true) : [];
  if (root.getClassName && root.getClassName() === "Mesh") meshes.push(root);
  const oldMaterials = new Set();
  for (const mesh of meshes) {
    const material = mesh.material;
    if (!material) continue;
    oldMaterials.add(material);
    const std = new StandardMaterial(`${mesh.name}_lambert`, mesh.getScene());
    const any = material;
    if (any.diffuseTexture) std.diffuseTexture = any.diffuseTexture;
    else if (any.albedoTexture) std.diffuseTexture = any.albedoTexture;
    if (any.diffuseColor) std.diffuseColor = any.diffuseColor.clone();
    else if (any.albedoColor)
      std.diffuseColor = any.albedoColor.clone
        ? any.albedoColor.clone()
        : Color3.FromArray(any.albedoColor.asArray?.() || [1, 1, 1]);
    if (any.emissiveColor) std.emissiveColor = any.emissiveColor.clone();
    if (any.ambientColor) std.ambientColor = any.ambientColor.clone();
    std.specularColor = Color3.Black();
    std.specularPower = 1;
    // 共有しない: disposeは最後で行う（OBJは同一MTLを複数メッシュで共有する）
    mesh.material = std;
  }
  for (const material of oldMaterials) {
    if (typeof material.getBindedMeshes === "function" && material.getBindedMeshes().length === 0) {
      material.dispose();
    }
  }
}

// 拡散テクスチャをライティングなしで表示（emissive経由でアルベド相当を出す）
export function applyUnlitDiffuseTexture(root) {
  const meshes = root.getChildMeshes ? root.getChildMeshes(true) : [];
  if (root.getClassName && root.getClassName() === "Mesh") meshes.push(root);
  for (const mesh of meshes) {
    const material = mesh.material;
    if (!material || material.getClassName?.() !== "StandardMaterial") continue;
    material.disableLighting = true; // ライト計算を切る
    material.emissiveColor = Color3.White();
    if (material.diffuseTexture) material.emissiveTexture = material.diffuseTexture; // emissiveTextureに拡散テクスチャを流用
    material.specularColor = Color3.Black(); // 鏡面反射をゼロにして、ライティング無効のテクスチャ色が正しく反映されるように
  }
}

export function applyDiffuse(root, r, g, b) {
  const meshes = root.getChildMeshes ? root.getChildMeshes(true) : [];
  if (root.getClassName && root.getClassName() === "Mesh") meshes.push(root);
  for (const mesh of meshes) {
    const material = mesh.material;
    if (!material) continue;
    if (material.diffuseColor) material.diffuseColor.set(r, g, b);
    else if (material.albedoColor) material.albedoColor.set(r, g, b);
  }
}

// MTLのKa（ambientColor）を拡散色へブレンドして、ライティングが弱いときでもKaの色味が乗りやすくする。
// weight=0で無効、1に近いほどKa寄り（Kdは薄まる）。
export function applyKaBlendToDiffuse(root, weight) {
  if (weight <= 0) return;
  const w = Math.min(1, weight);
  const meshes = root.getChildMeshes ? root.getChildMeshes(true) : [];
  if (root.getClassName && root.getClassName() === "Mesh") meshes.push(root);
  for (const mesh of meshes) {
    const material = mesh.material;
    if (!material || !material.ambientColor) continue;
    const base = material.diffuseColor || material.albedoColor;
    if (!base) continue;
    const a = material.ambientColor;
    const ow = 1 - w;
    base.r = base.r * ow + a.r * w;
    base.g = base.g * ow + a.g * w;
    base.b = base.b * ow + a.b * w;
  }
}

export function applyAmbient(root, ambient) {
  const meshes = root.getChildMeshes ? root.getChildMeshes(true) : [];
  if (root.getClassName && root.getClassName() === "Mesh") meshes.push(root);
  for (const mesh of meshes) {
    const material = mesh.material;
    if (!material) continue;
    const base = material.diffuseColor || material.albedoColor;
    if (!base) continue;
    const e = base.clone ? base.clone() : Color3.White();
    material.emissiveColor = new Color3(e.r * ambient, e.g * ambient, e.b * ambient);
  }
}

export function applySmoothShading(root) {
  const meshes = root.getChildMeshes ? root.getChildMeshes(true) : [];
  if (root.getClassName && root.getClassName() === "Mesh") meshes.push(root);
  for (const mesh of meshes) {
    if (!mesh.isVerticesDataPresent(VertexBuffer.PositionKind)) continue;
    const positions = mesh.getVerticesData(VertexBuffer.PositionKind, true);
    const indices = mesh.getIndices();
    if (!positions || !indices) continue;
    const normals = [];
    VertexData.ComputeNormals(positions, indices, normals);
    // 座標が（ほぼ）同一の分裂頂点どうしで法線を平均する（Metasequoia等のOBJ向け）
    {
      const tolerance = 1e-4;
      if (positions && normals) {
        const nVerts = positions.length / 3;
        if (normals.length / 3 === nVerts) {
          const invTol = 1 / tolerance;
          const keyFor = (i) => {
            const ix = i * 3;
            return `${Math.round(positions[ix] * invTol)},${Math.round(positions[ix + 1] * invTol)},${Math.round(positions[ix + 2] * invTol)}`;
          };
          const groups = new Map();
          for (let i = 0; i < nVerts; i++) {
            const k = keyFor(i);
            if (!groups.has(k)) groups.set(k, []);
            groups.get(k).push(i);
          }
          const tmp1 = [0, 0, 0];
          const tmp2 = [0, 0, 0];
          for (const indices of groups.values()) {
            if (indices.length < 2) continue;
            tmp2[0] = tmp2[1] = tmp2[2] = 0;
            for (const i of indices) {
              const o = i * 3;
              tmp1[0] = normals[o];
              tmp1[1] = normals[o + 1];
              tmp1[2] = normals[o + 2];
              tmp2[0] += tmp1[0];
              tmp2[1] += tmp1[1];
              tmp2[2] += tmp1[2];
            }
            const len = Math.hypot(tmp2[0], tmp2[1], tmp2[2]);
            if (len === 0) continue;
            tmp2[0] /= len;
            tmp2[1] /= len;
            tmp2[2] /= len;
            for (const i of indices) {
              const o = i * 3;
              normals[o] = tmp2[0];
              normals[o + 1] = tmp2[1];
              normals[o + 2] = tmp2[2];
            }
          }
        }
      }
    }
    mesh.setVerticesData(VertexBuffer.NormalKind, normals, true);
  }
}
