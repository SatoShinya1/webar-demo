import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.158/examples/jsm/loaders/GLTFLoader.js";

const mindarThree = new window.MINDAR.IMAGE.MindARThree({
  container: document.body,
  imageTargetSrc: './targets.mind',
});
const { renderer, scene, camera } = mindarThree;

// ---- アンカー作成（ターゲット0を使用） ----
const anchor = mindarThree.addAnchor(0);

// ---- モデル or 代替プレースホルダー ----
let model, mixer, clock = new THREE.Clock();
const group = new THREE.Group();  // モデル親（これをアンカーの子に付ける）
anchor.group.add(group);

// A) 代替：プリミティブ（即動く）
const cube = new THREE.Mesh(
  new THREE.BoxGeometry(0.15,0.15,0.15),           // 15cm程度
  new THREE.MeshStandardMaterial({ roughness:.8 })
);
cube.castShadow = true;
group.add(cube);
model = cube;    // モデル扱い（後でGLBに置換可）

// B) 本番GLBを使う場合は次を有効化（上のcubeはコメントアウト）
// const loader = new GLTFLoader();
// loader.load('./assets/character.glb', (gltf)=>{
//   model = gltf.scene;
//   model.scale.set(0.01,0.01,0.01); // 適宜調整（1=1m）
//   group.add(model);
//   if (gltf.animations?.length){
//     mixer = new THREE.AnimationMixer(model);
//     mixer.clipAction(gltf.animations[0]).play(); // 歩行など
//   }
// });

await mindarThree.start();

// ---- UI（方向と速度） ----
const state = { dir:null, speed:2.0 };
document.querySelectorAll('[data-move]').forEach(btn=>{
  btn.addEventListener('click', ()=> state.dir = btn.dataset.move);
});
document.getElementById('speed').addEventListener('input', e=>{
  state.speed = parseFloat(e.target.value);
});
document.getElementById('reset').addEventListener('click', ()=>{
  group.position.set(0,0,0);
  state.dir = null;
});

// ---- マーカー姿勢から軸ベクトルを得る ----
function axisFromAnchor(type){
  // 前:Z+ / 右:X+ / 上:Y+
  const base =
    type==='forward' ? new THREE.Vector3(0,0,1) :
    type==='right'   ? new THREE.Vector3(1,0,0) :
    /* up */           new THREE.Vector3(0,1,0);
  return base.applyQuaternion(anchor.group.quaternion).normalize();
}

// ---- ループ ----
function animate(){
  const dt = clock.getDelta();
  if (mixer) mixer.update(dt);

  if (model && anchor.group.visible){
    const v = state.speed * 0.0015;   // 実移動速度（調整用）
    let moveAxis = null;
    if (state.dir==='forward') moveAxis = axisFromAnchor('forward');      // Z+
    if (state.dir==='back')    moveAxis = axisFromAnchor('forward').multiplyScalar(-1);
    if (state.dir==='right')   moveAxis = axisFromAnchor('right');        // X+
    if (state.dir==='left')    moveAxis = axisFromAnchor('right').multiplyScalar(-1);

    if (moveAxis){
      group.position.addScaledVector(moveAxis, v); // ★ここが“ポーズ座標で素直にZ移動”の核心
    }
  }
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();
