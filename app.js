// 依存をURLで直接インポート（importmap不要）
import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { MindARThree } from 'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-three.esm.js';

const $ = (id) => document.getElementById(id);
const showError = (msg) => { const e=$('error'); e.style.display='block'; e.textContent = `ERROR: ${msg}`; };
const setStatus = (text, ok=false) => { const el=$('status'); el.textContent=text; el.style.background = ok?'rgba(0,160,0,.85)':'rgba(200,0,0,.85)'; };

// 画面全体で未捕捉エラーを表示
window.addEventListener('error', (ev)=> showError(ev.message || String(ev.error||ev)));
window.addEventListener('unhandledrejection', (ev)=> showError(ev.reason?.message || String(ev.reason||ev)));

(async () => {
  setStatus('準備中…');

  // まずは“必ず動く既知ターゲット”で検証
  // マーカー画像：https://cdn.jsdelivr.net/gh/hiukim/mind-ar-js@1.2.5/examples/image-tracking/assets/card-example/card.png
  const mindarThree = new MindARThree({
    container: document.body,
    imageTargetSrc: 'https://cdn.jsdelivr.net/gh/hiukim/mind-ar-js@1.2.5/examples/image-tracking/assets/card-example/card.mind',
    uiScanning: true,
    uiLoading: true,
    maxTrack: 1,
    // 背面希望 → 失敗時は後で前面にフォールバック
    videoSetting: { facingMode: { ideal: 'environment' } }
  });

  const { renderer, scene, camera } = mindarThree;
  scene.add(new THREE.AmbientLight(0xffffff, 1));

  const anchor = mindarThree.addAnchor(0);
  anchor.onTargetFound = ()=> setStatus('FOUND #0', true);
  anchor.onTargetLost  = ()=> setStatus('LOST  #0', false);

  // 可視化
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(0.2,0.2),
    new THREE.MeshBasicMaterial({color:0x00ff00, transparent:true, opacity:0.4, side:THREE.DoubleSide})
  );
  plane.rotation.x = -Math.PI/2;
  anchor.group.add(plane, new THREE.AxesHelper(0.15));

  // モデル（立方体）
  const group = new THREE.Group();
  anchor.group.add(group);
  group.add(new THREE.Mesh(
    new THREE.BoxGeometry(0.15,0.15,0.15),
    new THREE.MeshStandardMaterial({ roughness:.8, color: 0x5555ff })
  ));

  // HUD
  const state = { dir:null, speed:2.0 };
  document.querySelectorAll('[data-move]').forEach(b => b.onclick = () => state.dir = b.dataset.move);
  $('speed').oninput = e => state.speed = parseFloat(e.target.value);
  $('reset').onclick = () => { group.position.set(0,0,0); state.dir = null; };

  // 軸
  const axisFromAnchor = (type) => {
    const base = type==='forward' ? new THREE.Vector3(0,0,1)
              : type==='right'   ? new THREE.Vector3(1,0,0)
                                  : new THREE.Vector3(0,1,0);
    return base.applyQuaternion(anchor.group.quaternion).normalize();
  };

  // ループ
  const clock = new THREE.Clock();
  (function loop(){
    const dt = clock.getDelta();
    if (anchor.group.visible && state.dir){
      let ax=null;
      if (state.dir==='forward') ax = axisFromAnchor('forward');
      if (state.dir==='back')    ax = axisFromAnchor('forward').multiplyScalar(-1);
      if (state.dir==='right')   ax = axisFromAnchor('right');
      if (state.dir==='left')    ax = axisFromAnchor('right').multiplyScalar(-1);
      if (ax) group.position.addScaledVector(ax, state.speed * 0.0015);
    }
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  })();

  // Startボタンから起動（iOS安定）
  const startBtn = $('startBtn');
  startBtn.onclick = async () => {
    try {
      setStatus('カメラ起動…');
      startBtn.disabled = true;
      startBtn.textContent = '起動中…';
      await mindarThree.start();        // ここで許可ダイアログが出る想定
      $('start').style.display = 'none';
      setStatus('スキャン中…（カード画像を映してください）');
    } catch (e) {
      // 前面にフォールバック
      try { mindarThree.stop(); } catch {}
      try { mindarThree.video.video.srcObject?.getTracks().forEach(t=>t.stop()); } catch {}
      mindarThree.params.videoSetting = { facingMode: 'user' };
      try {
        setStatus('前面で再試行…');
        await mindarThree.start();
        $('start').style.display = 'none';
        setStatus('スキャン中（前面）…');
      } catch (e2) {
        showError(e2?.message || String(e2));
        setStatus('カメラ開始失敗：Safariのサイト別設定とHTTPSを確認', false);
        startBtn.disabled = false;
        startBtn.textContent = 'Start AR（再試行）';
      }
    }
  };
})();
