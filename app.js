import * as THREE from 'three';
import { MindARThree } from 'mindar-image-three';

(async () => {
  // ★ まずは“必ず動く既知の .mind”を使って動作確認します
  const mindarThree = new MindARThree({
    container: document.body,
    imageTargetSrc: 'https://cdn.jsdelivr.net/gh/hiukim/mind-ar-js@1.2.5/examples/image-tracking/assets/card-example/card.mind',
  });

  const { renderer, scene, camera } = mindarThree;
  scene.add(new THREE.AmbientLight(0xffffff, 1));

  // アンカー（card.mindは1枚＝index 0）
  const anchor = mindarThree.addAnchor(0);

  // デバッグ：検出ログ
  anchor.onTargetFound = ()=> console.log('FOUND #0');
  anchor.onTargetLost  = ()=> console.log('LOST  #0');

  // デバッグ：アンカーに平面と軸を表示（見つかった時にその位置に出る）
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(0.2,0.2),
    new THREE.MeshBasicMaterial({color:0x00ff00, transparent:true, opacity:0.4, side:THREE.DoubleSide})
  );
  plane.rotation.x = -Math.PI/2;
  const axes = new THREE.AxesHelper(0.15);
  anchor.group.add(plane);
  anchor.group.add(axes);

  // モデルの親
  const group = new THREE.Group();
  anchor.group.add(group);

  // まずは立方体（プレースホルダー）でOK
  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(0.15,0.15,0.15),
    new THREE.MeshStandardMaterial({ roughness:.8, color: 0x5555ff })
  );
  group.add(cube);

  // HUDの状態
  const state = { dir:null, speed:2.0 };
  document.querySelectorAll('[data-move]').forEach(b=>b.onclick=()=>state.dir=b.dataset.move);
  document.getElementById('speed').oninput = e => state.speed = parseFloat(e.target.value);
  document.getElementById('reset').onclick = ()=>{ group.position.set(0,0,0); state.dir=null; };

  // アンカー姿勢から軸を得る
  const axisFromAnchor = (type)=>{
    const base = type==='forward' ? new THREE.Vector3(0,0,1)
               : type==='right'   ? new THREE.Vector3(1,0,0)
                                   : new THREE.Vector3(0,1,0);
    return base.applyQuaternion(anchor.group.quaternion).normalize();
  };

  // カメラ開始（ここで許可ダイアログが出る）
  await mindarThree.start();

  const clock = new THREE.Clock();
  function loop(){
    const dt = clock.getDelta();

    // 検出できている時だけ動かす
    if (anchor.group.visible && state.dir){
      let ax = null;
      if (state.dir==='forward') ax = axisFromAnchor('forward');      // Z+
      if (state.dir==='back')    ax = axisFromAnchor('forward').multiplyScalar(-1);
      if (state.dir==='right')   ax = axisFromAnchor('right');        // X+
      if (state.dir==='left')    ax = axisFromAnchor('right').multiplyScalar(-1);
      if (ax) group.position.addScaledVector(ax, state.speed*0.0015);
    }

    renderer.render(scene,camera);
    requestAnimationFrame(loop);
  }
  loop();
})();
