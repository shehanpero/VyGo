// Validate GLB files using the same THREE.GLTFLoader the app uses.
// Usage: node build/3d/validate_glb.mjs <file.glb> [...]
import { pathToFileURL } from 'url';
import { resolve, dirname } from 'path';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const THREE_BASE = resolve(__dirname, '..', '..', 'frontend', 'node_modules', 'three');
const threeMod = await import(pathToFileURL(resolve(THREE_BASE, 'build', 'three.module.js')).href);
const THREE = threeMod;
const { GLTFLoader } = await import(pathToFileURL(resolve(THREE_BASE, 'examples', 'jsm', 'loaders', 'GLTFLoader.js')).href);

if (typeof self === 'undefined') globalThis.self = globalThis;
if (typeof window === 'undefined') globalThis.window = globalThis;

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('usage: node validate_glb.mjs <file.glb> [...]');
  process.exit(2);
}

for (const f of files) {
  const abs = resolve(f);
  if (!existsSync(abs)) { console.error(`${f} -> MISSING`); process.exitCode = 1; continue; }
  const buf = readFileSync(abs);
  const loader = new GLTFLoader();
  const t0 = Date.now();
  try {
    const gltf = await new Promise((res, rej) =>
      loader.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), abs, res, rej));
    const scene = gltf.scene;
    let meshes = 0, tris = 0, verts = 0, worst = 0, worstName = '';
    const mats = new Set();
    const bmin = new THREE.Vector3(1e9, 1e9, 1e9);
    const bmax = new THREE.Vector3(-1e9, -1e9, -1e9);
    const box = new THREE.Box3();
    scene.traverse((o) => {
      if (!o.isMesh) return;
      meshes++;
      o.updateWorldMatrix(true, false);
      box.setFromObject(o);
      const d = box.getSize(new THREE.Vector3()).length();
      if (d > worst) { worst = d; worstName = o.name; }
      bmin.min(box.min); bmax.max(box.max);
      const g = o.geometry;
      verts += g.attributes.position.count;
      tris += (g.index ? g.index.count : g.attributes.position.count) / 3;
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m && mats.add(m.name));
    });
    console.log(`${f} -> LOADED in ${Date.now() - t0}ms`);
    console.log(`  meshes=${meshes} tris=${tris} verts=${verts} materials=${mats.size}`);
    console.log(`  bbox=(${bmin.x.toFixed(2)}, ${bmin.y.toFixed(2)}, ${bmin.z.toFixed(2)}) - (${bmax.x.toFixed(2)}, ${bmax.y.toFixed(2)}, ${bmax.z.toFixed(2)})  size=${(bmax.x - bmin.x).toFixed(2)} x ${(bmax.y - bmin.y).toFixed(2)} x ${(bmax.z - bmin.z).toFixed(2)} m`);
    console.log(`  worstMeshDiag=${worst.toFixed(2)} m (${worstName})`);
  } catch (e) {
    console.error(`${f} -> LOAD FAILED: ${e.message}`);
    process.exitCode = 1;
  }
}