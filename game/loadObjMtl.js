import { Color3, LoadAssetContainerAsync, StandardMaterial, Texture, TransformNode, VertexBuffer, VertexData } from "@babylonjs/core";
import { MTLFileLoader } from "@babylonjs/loaders/OBJ/mtlFileLoader.js";
import "@babylonjs/loaders/OBJ/objFileLoader.js"; // OBJローダー読み込みで@babylonjs/loaders側がRegisterSceneLoaderPluginを実行する

export async function loadObjMtl(scene, basePath, modelName) {
  const path = basePath.endsWith("/") ? basePath : `${basePath}/`;
  const objUrl = `${path}${modelName}.obj`;
  const response = await fetch(objUrl);
  if (!response.ok) return null;
  const objText = await response.text();

  // vnの存在をチェックする。vnが無いとローダーは全頂点の法線を(0,1,0)で埋める。
  const hasVertexNormals = /^vn\s/m.test(objText);

  const container = await LoadAssetContainerAsync(`data:${objText}`, scene, {
    rootUrl: path,
    pluginExtension: ".obj",
  });

  // vnが無い場合にローダーが格納した法線を外す
  if (!hasVertexNormals) {
    for (const mesh of container.meshes || []) {
      if (mesh.isVerticesDataPresent?.(VertexBuffer.NormalKind)) {
        mesh.removeVerticesData(VertexBuffer.NormalKind);
      }
    }
  }

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

// 配下メッシュのマテリアルを、共有しないStandardMaterialに差し替え、テクスチャ・拡散色・環境色などを引き継ぎつつ、鏡面をほぼ無効化（黒い鏡面色・低いspecularPower）して拡散寄りの見え方にそろえる
export function convertMaterialsToLambert(root) {
  const meshes = root.getChildMeshes ? root.getChildMeshes(true) : [];
  if (root.getClassName && root.getClassName() === "Mesh") meshes.push(root);
  const oldMaterials = new Set();
  for (const mesh of meshes) {
    const material = mesh.material;
    if (!material) continue;
    oldMaterials.add(material);
    const any = material;
    // MTL名を維持しておくと、convertのあとにapplyDiffuseMapsFromUrlsを実行してもmaterialNameで引くことができる
    const raw = any.name != null ? String(any.name).trim() : "";
    const stdName = raw || `${mesh.name}_lambert`;
    const std = new StandardMaterial(stdName, mesh.getScene());
    if (any.diffuseTexture) std.diffuseTexture = any.diffuseTexture;
    else if (any.albedoTexture) std.diffuseTexture = any.albedoTexture;
    if (any.diffuseColor) std.diffuseColor = any.diffuseColor.clone();
    else if (any.albedoColor)
      std.diffuseColor = any.albedoColor.clone ?
        any.albedoColor.clone() :
        Color3.FromArray(any.albedoColor.asArray?.() || [1, 1, 1]);
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

// 各メッシュのdiffuseColorまたはalbedoColorを、指定のColor3にそろえる
export function applyDiffuse(root, diffuseColor) {
  const meshes = root.getChildMeshes ? root.getChildMeshes(true) : [];
  if (root.getClassName && root.getClassName() === "Mesh") meshes.push(root);
  for (const mesh of meshes) {
    const material = mesh.material;
    if (!material) continue;
    if (material.diffuseColor) material.diffuseColor.copyFrom(diffuseColor);
    else if (material.albedoColor) material.albedoColor.copyFrom(diffuseColor);
  }
}

// 拡散／アルベド色を基準にemissiveColorをambient倍した色にし、環境光による明るさの近似を足す
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

// diffuseColorを黒にして拡散項（頂点色・拡散テクスチャ）を消し、emissiveColorだけ設定する
export function applyEmissive(root, color) {
  const meshes = root.getChildMeshes ? root.getChildMeshes(true) : [];
  if (root.getClassName && root.getClassName() === "Mesh") meshes.push(root);
  for (const mesh of meshes) {
    const material = mesh.material;
    if (!material) continue;
    if (material.diffuseColor) material.diffuseColor.set(0, 0, 0);
    material.emissiveColor = new Color3(color.r, color.g, color.b);
    material.useEmissiveAsIllumination = true; // 頂点色の影響を外す
  }
}

// OBJの頂点法線を維持したGouraudシェーディング。ストリップ内（法線が共有される面）は補間され、法線が分かれた境界だけエッジが立つ。
export function applyGouraudShading(root) {
  const meshes = root.getChildMeshes ? root.getChildMeshes(true) : [];
  if (root.getClassName && root.getClassName() === "Mesh") meshes.push(root);
  for (const mesh of meshes) {
    if (!mesh.isVerticesDataPresent(VertexBuffer.PositionKind)) continue;
    if (mesh.isVerticesDataPresent(VertexBuffer.NormalKind)) continue;
    const positions = mesh.getVerticesData(VertexBuffer.PositionKind, true);
    const indices = mesh.getIndices();
    if (!positions || !indices) continue;
    const normals = [];
    VertexData.ComputeNormals(positions, indices, normals);
    mesh.setVerticesData(VertexBuffer.NormalKind, normals, true);
  }
}

// 位置・インデックスから頂点法線を再計算し、同一座標付近の分裂頂点で法線を平均してからNormalKindを書き戻し、面の境が滑らかに見えるようにする
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
