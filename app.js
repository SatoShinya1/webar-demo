import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MindARThree } from 'mindar-image-three';

(async () => {
  const mindarThree = new MindARThree({
    container: document.body,
    imageTargetSrc: './targets.mind', // ここは必ず存在する相対パスに
  });
  const { renderer, scene, camera } = mindarThree;

  // ライト（真っ黒対策）
  scene.add(new THREE.AmbientLight(0xffffff, 1));

  // アンカー
  const anchor = mindarThree.addAnchor(0);//hennkou

  // プレースホルダー（まずは立方体でOK）
  const group = new THREE.Group();
  anchor.group.add(group);
  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(0.15,0.15,0.15),
    new THREE.MeshStandardMaterial({ roughness:.8 })
  );
  group.add(cube);

  // UI状態
  const state = { dir:null, speed:2.0 };
  document.querySelectorAll('[data-move]').forEach(b=>b.onclick=()=>state.dir=b.dataset.move);
  document.getElementById('speed').oninput = e => state.speed = parseFloat(e.target.value);
  document.getElementById('reset').onclick = ()=>{ group.position.set(0,0,0); state.dir=null; };

  // 軸ベクトル
  const axisFromAnchor = (type)=>{
    const base = type==='forward' ? new THREE.Vector3(0,0,1)
               : type==='right'   ? new THREE.Vector3(1,0,0)
                                   : new THREE.Vector3(0,1,0);
    return base.applyQuaternion(anchor.group.quaternion).normalize();
  };

  // ★カメラ起動（ここでiOSは許可ダイアログが出る）
  try {
    await mindarThree.start();
  } catch (e) {
    console.error(e);
    alert('カメラを開始できませんでした。\nSafariのカメラ許可設定やHTTPSを確認してください。');
    return;
  }

  const clock = new THREE.Clock();
  function animate(){
    const dt = clock.getDelta();
    if (anchor.group.visible && state.dir){
      let ax = null;
      if (state.dir==='forward') ax = axisFromAnchor('forward');
      if (state.dir==='back')    ax = axisFromAnchor('forward').multiplyScalar(-1);
      if (state.dir==='right')   ax = axisFromAnchor('right');
      if (state.dir==='left')    ax = axisFromAnchor('right').multiplyScalar(-1);
      if (ax) group.position.addScaledVector(ax, state.speed*0.0015);
    }
    renderer.render(scene,camera);
    requestAnimationFrame(animate);
  }
  animate();
})();


// 追加: 見つかった/見失ったイベント
anchor.onTargetFound = () => { console.log('FOUND marker #0'); };
anchor.onTargetLost  = () => { console.log('LOST marker #0'); };

// 追加: デバッグ表示（アンカー直下）
const debugPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(0.2, 0.2),
  new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.4, side: THREE.DoubleSide })
);
debugPlane.rotation.x = -Math.PI/2; // 床向きに
const axis = new THREE.AxesHelper(0.15); // RGB軸
anchor.group.add(debugPlane);
anchor.group.add(axis);

