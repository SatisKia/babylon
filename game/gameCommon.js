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

export const ENEMY_Y_MIN = 40.0;

export const BAKU_FRAME = (WAIT_1 / 4) | 0;

export const ENEMY_TYPE_01 = 0;
export const ENEMY_TYPE_02 = 1;

export const ENEMY01_SPEED = 1.0;
export const ENEMY01_ESCAPE = 50.0;
export const ENEMY01_OUT = 150.0;

export const ENEMY02_SPEED = 1.5;
export const ENEMY02_ESCAPE = 50.0;
export const ENEMY02_OUT = 150.0;

export const ENEMY_SHOT_SPEED = 0.5;
export const ENEMY_SHOT_RADIUS = 0.35 * 1.5;
export const ENEMY_SHOT_END = WAIT_1 * 2;

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

// ワールド単位のおおよその半径（バウンディングボックス最大辺の半分）
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

// ThreeはCameraにぶら下がった高レベルなproject/unprojectでNDCと一致しているのに対し、BabylonはProject/Unprojectがピクセル・ビューポート前提で、しかもY反転などがユーザー側で必要なので、Threeと同等の意味のNDCレイヤーを自前構築している
export function projectWorldToNdc(scene, worldX, worldY, worldZ, outNdc) {
  // sceneとワールド座標を入力し、outNdcにNDC（正規化デバイス座標、clip後の約-1～1）を書き込む
  const engine = scene.getEngine(); // 描画対象エンジン（レンダラー幅・高さの参照元）
  const w = engine.getRenderWidth(); // フレームバッファ等の現在のレンダーターゲット幅（ピクセル）
  const h = engine.getRenderHeight(); // 同上の高さ（ピクセル）
  const viewport = scene.activeCamera.viewport.toGlobal(w, h); // アクティブカメラのビューポートをグローバルピクスル矩形に変換し、Projectと座標空間を揃える
  const p = Vector3.Project(new Vector3(worldX, worldY, worldZ), Matrix.Identity(), scene.getTransformMatrix(), viewport); // ワールド点をワールド行列は単位、投影合成はシーンと同一の変換行列で画面上（ピクセル系）へ射影。p.z は深度に相当する成分。
  outNdc.x = (p.x / w) * 2 - 1; // X: 画面上の横位置を幅で割り、[0,1]→[-1,+1]へ線形変換してNDC Xとする
  outNdc.y = (1 - p.y / h) * 2 - 1; // Y: 画面上は下へ増える想定なので、(1-y/h)で反転後、同様に[-1,+1]へ縮めてNDC Yとする
  outNdc.z = p.z; // Z: Babylon.Projectが返した奥行き成分をそのまま保持（near/farと深度バッファ解釈に追従）
  return outNdc;
}
export function unprojectNdcToWorld(scene, ndcX, ndcY, ndcZ, outWorld) {
  // Threeのndcでunprojectと同様に、「横1pxぶんオフセットした点」のワールド座標を求める（画面ピクセル半径換算や距離算出用）
  const engine = scene.getEngine(); // 同上、幅・高さ取得用
  const w = engine.getRenderWidth(); // UnprojectとprojectWorldToNdcで使う幅と同一にする
  const h = engine.getRenderHeight(); // 同上、高さ
  const deltaNdcX = 2.0 / w; // 横1ピクセルに対応するNDC Xの増分（キャンパス全域を-1～+1とみなしたとき）
  const sx = ((ndcX + deltaNdcX + 1) / 2) * w; // NDCで+1px横にずらした点を、Unprojectが期待するスクリーンX（0～w）へ戻す式（ndcX+δはThree版のndcX1pxに相当）
  const sy = ((1 - ndcY) / 2) * h; // NDC Yをproject側のY反転と逆の対応でスクリーンY（0～h）へ変換
  const transform = scene.getTransformMatrix(); // ビューX投影の合成行列（シェーダに渡るものと一致）
  const inv = transform.clone(); // 元行列を汚さないようコピー
  inv.invert(); // スクリーン座標＋深度からワールドへ戻すための逆行列
  const u = Vector3.Unproject(new Vector3(sx, sy, ndcZ), w, h, transform, inv); // ピクスル系(sx,sy)とclip奥行ndcZからワールド座標を復元
  outWorld.copyFrom(u); // 結果を出力ベクタへ格納（呼び出し側で使い回し）
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

export function checkHit(x1, y1, z1, r1, x2, y2, z2, r2) {
  const x = x1 - x2;
  const y = y1 - y2;
  const z = z1 - z2;
  return Math.sqrt(x * x + y * y + z * z) < r1 + r2;
}

export class MyRandom {
  next(n) {
    if (Math.random() < 0.5) {
      return -Math.floor(Math.random() * n);
    }
    return Math.floor(Math.random() * n);
  }

  nextInt() {
    if (Math.random() < 0.5) {
      return -Math.floor(Math.random() * 0x80000000);
    }
    return Math.floor(Math.random() * 0x80000000);
  }
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

function Enemy(self, type, x, y, z, vx, vy, vz, radius) {
  self._type = type;
  self._x = x;
  self._y = y;
  self._z = z;
  self._tx = x + vx;
  self._ty = y + vy;
  self._tz = z + vz;
  self._radius = radius;
}

export class Enemy01 {
  constructor(x, y, z, vx, vy, vz, radius, flag, jikiRef) {
    Enemy(this, ENEMY_TYPE_01, x, y, z, vx, vy, vz, radius);
    const d = Math.sqrt(vx * vx + vy * vy + vz * vz) || 1.0;
    this._vx = vx / d;
    this._vy = vy / d;
    this._vz = vz / d;
    this._target_vx = this._vx;
    this._target_vy = this._vy;
    this._target_vz = this._vz;
    this._flag = flag;
    this._r = 0.0;
    this._elapse = 0;
    this._step = 0;
    this._jikiRef = jikiRef;
  }
  update() {
    const jiki = this._jikiRef;
    if (this._step === 1) {
      if (_MOD(this._elapse, _DIV(WAIT_1, 15)) === 0) {
        this._target_vx *= 1.1;
        this._target_vy *= 1.1;
        this._target_vz *= 1.1;
        this._vx = (this._vx + this._target_vx / 4.0) / 1.1;
        this._vy = (this._vy + this._target_vy / 4.0) / 1.1;
        this._vz = (this._vz + this._target_vz / 4.0) / 1.1;
      }
      this._r += ((this._flag ? -360.0 : 360.0) / _DIV(WAIT_1, 2));
    }
    this._x += this._vx * ENEMY01_SPEED;
    this._y += this._vy * ENEMY01_SPEED;
    this._z += this._vz * ENEMY01_SPEED;
    const dx = this._x - jiki.x();
    const dy = this._y - jiki.y();
    const dz = this._z - jiki.z();
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (distance > ENEMY01_OUT) return false;
    if (distance < ENEMY01_ESCAPE && this._step === 0) {
      this._target_vx = -(this._vx / 2.0 + jiki.vx());
      this._target_vy = 0.0;
      this._target_vz = -(this._vz / 2.0 + jiki.vz());
      this._step = 1;
    }
    this._elapse++;
    return true;
  }
  damage() {
    return true;
  }
  type() {
    return ENEMY_TYPE_01;
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
  tx() {
    return this._tx;
  }
  ty() {
    return this._ty;
  }
  tz() {
    return this._tz;
  }
  radius() {
    return this._radius;
  }
  r() {
    return this._r;
  }
}

export class Enemy02 {
  constructor(x, y, z, vx, vy, vz, radius, jikiRef, onEnemyShot) {
    Enemy(this, ENEMY_TYPE_02, x, y, z, vx, vy, vz, radius);
    const d = Math.sqrt(vx * vx + vy * vy + vz * vz) || 1.0;
    this._vx = vx / d;
    this._vy = vy / d;
    this._vz = vz / d;
    this._r = 0.0;
    this._step = 0;
    this._jikiRef = jikiRef;
    this._onEnemyShot = onEnemyShot;
    const f = new Vector3(-this._vx, 0.0, -this._vz);
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
    this._lookQuat = Quaternion.FromRotationMatrix(mat);
  }
  update() {
    const jiki = this._jikiRef;
    if (this._step === 1) {
      this._r -= 180.0 / _DIV(WAIT_1, 4);
      if (this._r <= -180.0) {
        this._r = -180.0;
        this._vx = -(this._vx - jiki.vx());
        this._vy = 0.0;
        this._vz = -(this._vz - jiki.vz());
        this._step = 2;
      }
    } else {
      this._x += this._vx * ENEMY02_SPEED;
      this._y += this._vy * ENEMY02_SPEED;
      this._z += this._vz * ENEMY02_SPEED;
      const dx = this._x - jiki.x();
      const dy = this._y - jiki.y();
      const dz = this._z - jiki.z();
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (distance > ENEMY02_OUT) return false;
      if (distance < ENEMY02_ESCAPE && this._step === 0) {
        this._onEnemyShot(this._x, this._y, this._z);
        this._step = 1;
      }
    }
    return true;
  }
  damage() {
    return true;
  }
  type() {
    return ENEMY_TYPE_02;
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
  tx() {
    return this._tx;
  }
  ty() {
    return this._ty;
  }
  tz() {
    return this._tz;
  }
  radius() {
    return this._radius;
  }
  r() {
    return this._r;
  }
}

export class Baku {
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
    return this._elapse <= BAKU_FRAME;
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
  trans() {
    return (1.0 / BAKU_FRAME) * (BAKU_FRAME - (this._elapse - 1.0));
  }
}

export class EnemyShot {
  constructor(x, y, z, tx, ty, tz, radius, jikiRef) {
    this._x = x;
    this._y = y;
    this._z = z;
    this._tx = tx;
    this._ty = ty;
    this._tz = tz;
    let vx = tx - x;
    let vy = ty - y;
    let vz = tz - z;
    const d = Math.sqrt(vx * vx + vy * vy + vz * vz) || 1.0;
    this._vx = (vx / d) * ENEMY_SHOT_SPEED;
    this._vy = (vy / d) * ENEMY_SHOT_SPEED;
    this._vz = (vz / d) * ENEMY_SHOT_SPEED;
    this._radius = radius;
    this._elapse = 0;
    this._elapse2 = 0;
    const jx = x - jikiRef.x();
    const jy = y - jikiRef.y();
    const jz = z - jikiRef.z();
    this._distance = Math.sqrt(jx * jx + jy * jy + jz * jz);
  }
  update(jiki) {
    this._x += this._vx;
    this._y += this._vy;
    this._z += this._vz;
    const dx = this._x - jiki.x();
    const dy = this._y - jiki.y();
    const dz = this._z - jiki.z();
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (distance > this._distance) {
      this._distance = distance;
      this._elapse2++;
      if (this._elapse2 > ENEMY_SHOT_END) return false;
    } else {
      this._elapse2 = 0;
    }
    this._elapse++;
    return true;
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
  tx() {
    return this._tx;
  }
  ty() {
    return this._ty;
  }
  tz() {
    return this._tz;
  }
  radius() {
    return this._radius;
  }
}
