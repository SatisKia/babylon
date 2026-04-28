import { Matrix, Quaternion, Tools, Vector3 } from "@babylonjs/core";

export const WAIT_1 = 60;

export const GROUND_SIZE = 1200.0;

export const JIKI_Y_MIN = 20.0;
export const JIKI_Y_MAX = 100.0;
export const JIKI_RX_MAX = 60.0;
export const JIKI_RZ_MAX = 45.0;

export const JIKI_SPEED = 1.0;
export const JIKI_RX_ADD = 0.1;
export const JIKI_RX_ADD_MAX = 0.5;
export const JIKI_RY_ADD = 0.1;
export const JIKI_RY_ADD_MAX = 0.5;
export const JIKI_RZ_ADD = 1.0;
export const JIKI_RX_ADD2 = 1.0;

export const JIKI_JET_FRAME = (WAIT_1 / 4) | 0;

export const JIKI_SHOT_MAX = 3;
export const JIKI_SHOT_INTERVAL = 8;
export const JIKI_SHOT_SPEED = 3.0;
export const JIKI_SHOT_END = WAIT_1;

export function _MOD(a, b) {
  return ((a % b) + b) % b;
}
export function _DIV(a, b) {
  return (a / b) | 0;
}

function forwardFromPitchYawDeg(rx, ry) {
  const v = new Vector3(0.0, 0.0, -1.0);
  const rotX = Matrix.RotationX(Tools.ToRadians(rx));
  const rotY = Matrix.RotationY(Tools.ToRadians(ry));
  // Three: ry*rx。BabylonのmultiplyはA*BでなくB*AなのでrotX.multiply(rotY)
  const m = rotX.multiply(rotY);
  return Vector3.TransformCoordinates(v, m);
}

// 自機
export class Jiki {
  constructor(radius = 1.0) {
    this._x = 0.0;
    this._y = 50.0;
    this._z = 0.0;
    this._rx = 0.0;
    this._ry = 0.0;
    this._rz = 0.0;
    this._rx_add = 0.0;
    this._ry_add = 0.0;
    this._radius = radius;
    const f = forwardFromPitchYawDeg(this._rx, this._ry);
    this._vx = f.x;
    this._vy = f.y;
    this._vz = f.z;
  }

  update(up, down, left, right, useRightHandedSystem = false) {
    // 左手系では、右方向キーで+JIKI_RY_ADD、左方向キーで-JIKI_RY_ADD
    // 右手系では、左方向キーで+JIKI_RY_ADD、右方向キーで-JIKI_RY_ADD
    const ry_add = useRightHandedSystem ? left : right;
    const ry_sub = useRightHandedSystem ? right : left;
    let rx_flag = false;
    let ry_flag = false;
    let rz_flag = false;
    if (up) {
      if (this._y < JIKI_Y_MAX) {
        if (this._rx_add < JIKI_RX_ADD_MAX) {
          this._rx_add += JIKI_RX_ADD;
          if (this._rx_add > JIKI_RX_ADD_MAX) this._rx_add = JIKI_RX_ADD_MAX;
        }
        rx_flag = true;
      }
    }
    if (down) {
      if (this._y > JIKI_Y_MIN) {
        if (this._rx_add > -JIKI_RX_ADD_MAX) {
          this._rx_add -= JIKI_RX_ADD;
          if (this._rx_add < -JIKI_RX_ADD_MAX) this._rx_add = -JIKI_RX_ADD_MAX;
        }
        rx_flag = true;
      }
    }
    if (ry_add) {
      if (this._ry_add < JIKI_RY_ADD_MAX) this._ry_add += JIKI_RY_ADD;
      ry_flag = true;
      if (this._rz < -JIKI_RZ_MAX) {
        this._rz += JIKI_RZ_ADD;
        if (this._rz > -JIKI_RZ_MAX) this._rz = -JIKI_RZ_MAX;
      } else {
        this._rz -= JIKI_RZ_ADD;
        if (this._rz < -JIKI_RZ_MAX) this._rz = -JIKI_RZ_MAX;
      }
      rz_flag = true;
    }
    if (ry_sub) {
      if (this._ry_add > -JIKI_RY_ADD_MAX) this._ry_add -= JIKI_RY_ADD;
      ry_flag = true;
      if (this._rz > JIKI_RZ_MAX) {
        this._rz -= JIKI_RZ_ADD;
        if (this._rz < JIKI_RZ_MAX) this._rz = JIKI_RZ_MAX;
      } else {
        this._rz += JIKI_RZ_ADD;
        if (this._rz > JIKI_RZ_MAX) this._rz = JIKI_RZ_MAX;
      }
      rz_flag = true;
    }

    if (!rx_flag) {
      if (this._rx_add > 0.0) {
        this._rx_add -= JIKI_RX_ADD;
        if (this._rx_add < 0.0) this._rx_add = 0.0;
      } else if (this._rx_add < 0.0) {
        this._rx_add += JIKI_RX_ADD;
        if (this._rx_add > 0.0) this._rx_add = 0.0;
      }
    }
    this._rx += this._rx_add;
    if (this._rx < -JIKI_RX_MAX) this._rx = -JIKI_RX_MAX;
    if (this._rx > JIKI_RX_MAX) this._rx = JIKI_RX_MAX;

    if (!ry_flag) {
      if (this._ry_add > 0.0) {
        this._ry_add -= JIKI_RY_ADD;
        if (this._ry_add < 0.0) this._ry_add = 0.0;
      } else if (this._ry_add < 0.0) {
        this._ry_add += JIKI_RY_ADD;
        if (this._ry_add > 0.0) this._ry_add = 0.0;
      }
    }
    this._ry += this._ry_add;
    if (this._ry < 0.0) this._ry += 360.0;
    if (this._ry > 360.0) this._ry -= 360.0;

    if (!rz_flag) {
      if (this._rz >= 180.0) this._rz -= 360.0;
      else if (this._rz <= -180.0) this._rz += 360.0;
      if (this._rz >= JIKI_RZ_ADD) this._rz -= JIKI_RZ_ADD;
      else if (this._rz <= -JIKI_RZ_ADD) this._rz += JIKI_RZ_ADD;
      else this._rz = 0.0;
    }

    const f = forwardFromPitchYawDeg(this._rx, this._ry);
    this._vx = f.x;
    this._vy = f.y;
    this._vz = f.z;
    this._x += this._vx * JIKI_SPEED;
    this._y += this._vy * JIKI_SPEED;
    this._z += this._vz * JIKI_SPEED;
    if (this._y < JIKI_Y_MIN) {
      this._y = JIKI_Y_MIN;
      if (this._rx < 0.0) {
        this._rx += JIKI_RX_ADD2;
        if (this._rx > 0.0) this._rx = 0.0;
      }
    }
    if (this._y > JIKI_Y_MAX) {
      this._y = JIKI_Y_MAX;
      if (this._rx > 0.0) {
        this._rx -= JIKI_RX_ADD2;
        if (this._rx < 0.0) this._rx = 0.0;
      }
    }
  }

  x() {
    return this._x;
  }
  y() {
    return this._y;
  }
  z() {
    return this._z;
  }
  vx() {
    return this._vx;
  }
  vy() {
    return this._vy;
  }
  vz() {
    return this._vz;
  }
  rx() {
    return this._rx;
  }
  ry() {
    return this._ry;
  }
  rz() {
    return this._rz;
  }
  rx_add() {
    return this._rx_add;
  }
  ry_add() {
    return this._ry_add;
  }
  radius() {
    return this._radius;
  }

  pose(node) {
    const rotX = Matrix.RotationX(Tools.ToRadians(-this.rx()));
    const rotY = Matrix.RotationY(Tools.ToRadians(this.ry() + 180.0));
    const rotZ = Matrix.RotationZ(Tools.ToRadians(this.rz()));

    // rotY*rotX*rotZ
    const m = rotZ.multiply(rotX.multiply(rotY));

    node.rotationQuaternion = Quaternion.FromRotationMatrix(m);
    node.position.set(this.x(), this.y(), this.z());
  }

  jetOffsetWorld() {
    const rotX = Matrix.RotationX(Tools.ToRadians(-this.rx()));
    const rotY = Matrix.RotationY(Tools.ToRadians(this.ry()));
    const rotZ = Matrix.RotationZ(Tools.ToRadians(-this.rz()));

    // rotY*rotX*rotZ
    const m = rotZ.multiply(rotX.multiply(rotY));

    const right = Vector3.TransformCoordinates(new Vector3(1.0, 0.0, 0.0), m);
    const left = right.clone().multiplyByFloats(-1.0, -1.0, -1.0);
    return { right, left };
  }
}

// 噴射
export class JikiJet {
  constructor(x, y, z, vx, vy, vz) {
    this._x = x;
    this._y = y;
    this._z = z;
    this._vx = vx;
    this._vy = vy;
    this._vz = vz;
    this._elapse = 0;
  }
  update() {
    this._x += this._vx;
    this._y += this._vy;
    this._z += this._vz;
    this._elapse++;
    return this._elapse <= JIKI_JET_FRAME;
  }
  x() {
    return this._x;
  }
  y() {
    return this._y;
  }
  z() {
    return this._z;
  }
  elapse() {
    return this._elapse;
  }
  trans() {
    return (1.0 / JIKI_JET_FRAME) * (JIKI_JET_FRAME - (this._elapse - 1.0));
  }
}

// 自弾
export class JikiShot {
  constructor(x, y, z, vx, vy, vz, rz, shotRadius) {
    this._x = x;
    this._y = y;
    this._z = z;
    this._vx = vx;
    this._vy = vy;
    this._vz = vz;
    this._rz = rz;
    this._radius = shotRadius;
    this._elapse = 0;
  }
  update(expandHitFlag) {
    if (expandHitFlag && _MOD(this._elapse, _DIV(WAIT_1, 15)) === 0) this._radius += 0.5;
    this._x += this._vx;
    this._y += this._vy;
    this._z += this._vz;
    this._elapse++;
    return this._elapse <= JIKI_SHOT_END;
  }
  x() {
    return this._x;
  }
  y() {
    return this._y;
  }
  z() {
    return this._z;
  }
  vx() {
    return this._vx;
  }
  vy() {
    return this._vy;
  }
  vz() {
    return this._vz;
  }
  rz() {
    return this._rz;
  }
  elapse() {
    return this._elapse;
  }
  radius() {
    return this._radius;
  }
}

export class JikiShots {
  constructor(shotRadius) {
    this._shotRadius = shotRadius;
    this._shots = [];
    this._elapse = -JIKI_SHOT_INTERVAL;
  }
  add(elapse, jx, jy, jz, jvx, jvy, jvz, jrz) {
    if (this._shots.length < JIKI_SHOT_MAX && elapse >= this._elapse + JIKI_SHOT_INTERVAL) {
      this._elapse = elapse;
      this._shots.push(
        new JikiShot(jx, jy, jz, jvx * JIKI_SHOT_SPEED, jvy * JIKI_SHOT_SPEED, jvz * JIKI_SHOT_SPEED, jrz, this._shotRadius)
      );
      return true;
    }
    return false;
  }
  size() {
    return this._shots.length;
  }
  get(i) {
    return this._shots[i];
  }
  remove(i) {
    this._shots.splice(i, 1);
  }
  update(expandHitFlag) {
    for (let i = this._shots.length - 1; i >= 0; i--) {
      if (!this._shots[i].update(expandHitFlag)) this._shots.splice(i, 1);
    }
  }
}

export function modelBoundingRadius(root) {
  const meshes = root.getChildMeshes ? root.getChildMeshes(true) : [];
  if (root.getClassName && root.getClassName() === "Mesh") meshes.push(root);
  if (meshes.length === 0) return 1.0;
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  for (const mesh of meshes) {
    mesh.computeWorldMatrix(true);
    const boundingBox = mesh.getBoundingInfo().boundingBox;
    const bmin = boundingBox.minimumWorld;
    const bmax = boundingBox.maximumWorld;
    minX = Math.min(minX, bmin.x);
    minY = Math.min(minY, bmin.y);
    minZ = Math.min(minZ, bmin.z);
    maxX = Math.max(maxX, bmax.x);
    maxY = Math.max(maxY, bmax.y);
    maxZ = Math.max(maxZ, bmax.z);
  }
  const dx = maxX - minX;
  const dy = maxY - minY;
  const dz = maxZ - minZ;
  return (Math.max(dx, dy, dz) * 0.5) || 1.0;
}

export function projectWorldToNdc(scene, worldX, worldY, worldZ, outNdc) {
  const engine = scene.getEngine();
  const w = engine.getRenderWidth();
  const h = engine.getRenderHeight();
  const viewport = scene.activeCamera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight()); // 実描画解像度（ピクセル）上のビューポート
  const p = Vector3.Project(new Vector3(worldX, worldY, worldZ), Matrix.Identity(), scene.getTransformMatrix(), viewport);
  outNdc.x = (p.x / w) * 2 - 1;
  outNdc.y = (1 - p.y / h) * 2 - 1; // スクリーン座標が下向きに対し、縦方向のNDC座標は下向きになるので、1 - p.yで反転する。
  outNdc.z = p.z;
  return outNdc;
}

export function unprojectNdcToWorld(scene, ndcX, ndcY, ndcZ, outWorld) {
  const engine = scene.getEngine();
  const w = engine.getRenderWidth();
  const h = engine.getRenderHeight();
  const deltaNdcX = 2.0 / w; // 横1px相当のNDC座標の変化量
  const sx = ((ndcX + deltaNdcX + 1) / 2) * w; // 横方向のNDC座標[-1, 1]を[0, w]に線形に対応。+1で[0, 2]にして2で割ると[0, 1]になる。*wで[0, w]になる。
  const sy = ((1 - ndcY) / 2) * h; // 縦方向のNDC座標[-1, 1]を[0, h]に線形に対応。1 - ndcYで[0, 2]にして2で割ると[0, 1]になる。*hで[0, h]になる。なお、スクリーン座標が下向きに対し、縦方向のNDC座標は下向きになるので、1 - ndcYで反転する。
  const transform = scene.getTransformMatrix();
  const inv = transform.clone();
  inv.invert();
  const u = Vector3.Unproject(new Vector3(sx, sy, ndcZ), w, h, transform, inv);
  outWorld.copyFrom(u);
  return outWorld;
}

// forwardFromPitchYawDegと同じ基準で、単位前方ベクトルからrxとry（度）を復元
export function rxRyDegFromForward(fx, fy, fz) {
  const rx = Tools.ToDegrees(Math.asin(Math.max(-1, Math.min(1, fy))));
  const ry = Tools.ToDegrees(Math.atan2(-fx, -fz));
  return { rx, ry };
}

// Jiki.pose(node)と同じ姿勢（rotZ*rotX*rotY、ry+180deg / -rx / rz）
export function quaternionJikiPose(rxDeg, ryDeg, rzDeg) {
  const rotY = Matrix.RotationY(Tools.ToRadians(ryDeg + 180.0));
  const rotX = Matrix.RotationX(Tools.ToRadians(-rxDeg));
  const rotZ = Matrix.RotationZ(Tools.ToRadians(rzDeg));
  const m = rotZ.multiply(rotX.multiply(rotY));
  return Quaternion.FromRotationMatrix(m);
}

export function quatLookAtXZ(vx, vz) {
  const f = new Vector3(-vx, 0.0, -vz);
  if (f.lengthSquared() < 1e-12) f.copyFromFloats(0.0, 0.0, 1.0);
  f.normalize();
  const worldUp = Vector3.Up();
  let r = Vector3.Cross(worldUp, f);
  if (r.lengthSquared() < 1e-12) r = Vector3.Cross(new Vector3(1, 0, 0), f);
  r.normalize();
  const u = Vector3.Cross(f, r);
  const mat = Matrix.FromValues(
    r.x, u.x, f.x, 0,
    r.y, u.y, f.y, 0,
    r.z, u.z, f.z, 0,
    0, 0, 0, 1
  );
  return Quaternion.FromRotationMatrix(mat);
}
