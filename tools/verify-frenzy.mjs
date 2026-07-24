// verify-frenzy.mjs — mot tiec san moi phai re, va ca moi phai THUC SU ne.
// Cai lam canh nay dung khong phai vong xoay ma la phan ung: qua cau mo ra
// quanh ke tan cong roi khep lai. Neu ca moi ket cung trong ke san moi thi
// hong, nen day la thu duoc do.
import { fileURLToPath } from 'url';
import path from 'path';
process.chdir(path.dirname(fileURLToPath(import.meta.url)));
import * as THREE from 'three';
import { BaitBall, FrenzyManager } from '../src/entities/baitball.js';

let fail = 0;
const ball = new BaitBall(new THREE.Vector3(0, -40, 0));
let dc = 0, tris = 0;
for (const m of ball.meshes) { dc++; tris += m.geometry.index.count / 3 * m.count; }
console.log(`  lenh ve: ${dc} (can 2)   tris: ${Math.round(tris / 1000)}k (can duoi 30k)`);
if (dc !== 2 || tris > 30000) fail++;

for (let i = 0; i < 240; i++) ball.update(1 / 60, i / 60);
const t = process.hrtime.bigint();
for (let i = 0; i < 300; i++) ball.update(1 / 60, i / 60);
const ms = Number(process.hrtime.bigint() - t) / 1e6 / 300;
console.log(`  update: ${ms.toFixed(2)} ms/khung (can duoi 1,5)`);
if (ms > 1.5) fail++;

// khong con ca moi nao duoc ket ben trong ke san moi
const m = new THREE.Matrix4(), p = new THREE.Vector3();
let stuck = 0, sum = 0;
for (let i = 0; i < ball.baitCount; i++) {
  ball.bait.mesh.getMatrixAt(i, m); p.setFromMatrixPosition(m);
  sum += p.distanceTo(ball.center);
  for (const pr of ball.preds) if (p.distanceTo(pr.pos) < 3.0) { stuck++; break; }
}
console.log(`  ca moi ket trong ke san moi: ${stuck} (phai la 0)`);
if (stuck > 0) fail++;
const meanR = sum / ball.baitCount;
console.log(`  ban kinh trung binh: ${meanR.toFixed(2)} m — qua cau con giu hinh`);
if (meanR < 3 || meanR > 12) { console.log('    qua cau bi tan ra hoac co lai'); fail++; }

// quan ly phai thu don
const scene = new THREE.Scene();
const mgr = new FrenzyManager(scene, () => {});
const pos = new THREE.Vector3(0, -40, 0);
for (let i = 0; i < 3000; i++) mgr.update(1 / 30, i / 30, pos, 'coral_reef');
const alive = mgr.active ? 1 : 0;
mgr.clear();
console.log(`\n  sinh ra duoc: ${alive ? 'co' : 'KHONG'} | sau clear(): ${scene.children.length} vat the (phai 0)`);
if (!alive || scene.children.length !== 0) fail++;

// khong duoc sinh o vuc tham hay vung cuc
const s2 = new THREE.Scene(), m2 = new FrenzyManager(s2, () => {});
for (let i = 0; i < 3000; i++) m2.update(1 / 30, i / 30, pos, 'deep_sea');
console.log(`  o vuc tham: ${m2.active ? 'CO SINH (sai)' : 'khong sinh (dung)'}`);
if (m2.active) fail++;
process.exit(fail ? 1 : 0);
