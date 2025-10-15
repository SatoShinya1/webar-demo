import * as THREE from 'three';
import { MindARThree } from 'mindar-image-three';

const setStatus = (text, ok=false) => {
  const el = document.getElementById('status');
  el.textContent = text;
  el.style.background = ok ? 'rgba(0,160,0,.85)' : 'rgba(200,0,0,.85)';
};

(async () => {
  console.log('[app] init');
  setStatus('読み込み中…');

  // ★ まずは「必ず動く既知ターゲット」で検証
  //   カード画像 → https://cdn.jsdelivr.net/gh/hiukim/mind-ar-js@1.2.5/examples/image-tracking/assets/card-example/card.png
  const mindarThree = new MindARThree({
    container: document.body,
    imageTargetSrc:
      'https://cdn.jsdelivr.net/gh/hiukim/mind-ar-js@1.2.5/examples/image-tracking/assets/card-example/card.mind',
    // 重要：バックカメラ固定
    uiScanning: true,
    uiLoading: true,
    maxTrack: 1,
    warmupTolerance: 5,
    filterMinCF: 0.0001,
    filterBeta: 10000,
    // ビデオ設定（バックカメラを強制）
    // ※ MindAR 1.2.5 は内部で設定しますが、端末によっては front になることがあるため指定
    videoSetting: { facingMode: { exact: 'environment' } }
  });

  const { renderer, scene, camera } = mindarThree;
  scene.add(new THREE.AmbientLight(0xffffff, 1));

  const anchor = mindarThree.addAnchor(0);

  // 検出イベントを画面表示
  anchor.onTargetFound = () => { console.log('FOUND #0'); setStatus('FOUND #0', true); };
  anchor.onTargetLost  = () => { console.log('LOST  #0');  setStatus('LOST  #0', false); };

  // アンカー位置の可視化
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(0.2,0.2),
    new THREE.MeshBasicMaterial({color:0x00ff00, transparent:true, opacity:0.4, side:THREE.DoubleSide})
  );
  plane.rotation.x = -Math.PI/2;
  anchor.group.add(plane);
  anchor.group.add(new THREE.AxesHelper(0.15));

  // モデル親（立方体）
  const group = new THREE.Group();
  anchor.group.add(group);
  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(0.15,0.15,0.15),
    new THREE.MeshStandardMaterial({ roughness:.8, color: 0x5555ff })
  );
  group.add(cube);

  // HUD
  const state = { dir:null, speed:2.0 };
  document.querySelectorAll('[data-move]').forEach(b => b.onclick = () => state.dir = b.dataset.move);
  document.getElementById('speed').oninput = e => state.speed = parseFloat(e.target.value);
  document.getElementById('reset').onclick = () => { group.position.set(0,0,0); state.dir = null; };

  const axisFromAnchor = (type) => {
    const base = type === 'forward' ? new THREE.Vector3(0,0,1)
              :  type === 'right'   ? new THREE.Vector3(1,0,0)
                                    : new THREE.Vector3(0,1,0);
    return base.applyQuaternion(anchor.group.quaternion).normalize();
  };

  // カメラ起動
  try {
    await mindarThree.start();
    console.log('[app] camera started');
    setStatus('スキャン中…（カード画像を映してください）', false);
  } catch (e) {
    console.error('[app] camera start failed', e);
    setStatus('カメラ開始失敗（HTTPS/権限を確認）', false);
    alert('カメラを開始できませんでした。HTTPSとSafariのカメラ許可を確認してください。');
    return;
  }

  const clock = new THREE.Clock();
  (function loop(){
    const dt = clock.getDelta();
    if (anchor.group.visible && state.dir){
      let ax = null;
      if (state.dir==='forward') ax = axisFromAnchor('forward');
      if (state.dir==='back')    ax = axisFromAnchor('forward').multiplyScalar(-1);
      if (state.dir==='right')   ax = axisFromAnchor('right');
      if (state.dir==='left')    ax = axisFromAnchor('right').multiplyScalar(-1);
      if (ax) group.position.addScaledVector(ax, state.speed * 0.0015);
    }
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  })();
})();
