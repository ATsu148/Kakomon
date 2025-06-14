// リップルエフェクトを生成するためのキャンバス
const canvas = document.createElement('canvas');
canvas.width = 256;
canvas.height = 256;
const ctx = canvas.getContext('2d');

// <feImage>要素を取得
const rippleImg = document.getElementById('rippleMap');

let fadeId = null;
let alpha = 0;

// リップルを描画
function drawRipple(x, y) {
  // キャンバスをクリア
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // マウス位置に合わせてグラデーションを作成
  const grad = ctx.createRadialGradient(x, y, 0, x, y, 60);
  grad.addColorStop(0, 'rgba(0,128,255,1)');
  grad.addColorStop(1, 'rgba(0,128,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // feImage にデータURLをセット
  rippleImg.setAttribute('href', canvas.toDataURL());
  alpha = 1;
  cancelAnimationFrame(fadeId);
  fadeOut();
}

// 徐々にリップルを消す
function fadeOut() {
  alpha *= 0.95;
  ctx.fillStyle = `rgba(0,0,0,${1 - alpha})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  rippleImg.setAttribute('href', canvas.toDataURL());
  if (alpha > 0.05) {
    fadeId = requestAnimationFrame(fadeOut);
  }
}

// リップル対象のレイヤー
const layer = document.querySelector('#searchPanel .layer-2');
if (layer) {
  // マウス移動でリップルを発生
  layer.addEventListener('mousemove', (e) => {
    const rect = layer.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    drawRipple(x, y);
  });
}
