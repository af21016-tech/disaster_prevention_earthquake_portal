const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const menuScreen = document.getElementById('menu-screen');
const resultScreen = document.getElementById('result-screen');
const uiOverlay = document.getElementById('ui-overlay');
const timerBar = document.getElementById('timer-bar');
const alertBar = document.getElementById('alert-bar');
const mainContainer = document.getElementById('main-container');

// --- 画像アセットの管理 ---
const assets = {
    sleep_bg: { src: './images/sleep_bg_plain.jpg', img: new Image(), loaded: false },
    arena_bg: { src: './images/arena_bg.jpg', img: new Image(), loaded: false },
    furniture: { src: './images/furniture_bookshelf.png', img: new Image(), loaded: false },
    // dch_icons: { src: './images/DCH_icons.png', img: new Image(), loaded: false }, // 推奨
};
// 画像の読み込み処理（失敗してもフォールバック描画で動作するようにする）
for (let key in assets) {
    assets[key].img.src = assets[key].src;
    assets[key].img.onload = () => { assets[key].loaded = true; };
}

// --- ゲーム状態管理 ---
let currentScene = null;
let gameState = 'init'; // init, setup_sleep, playing, gameover, clear
let currentPhase = 0; // 0:Intro, 1:Drop, 2:Cover, 3:Holdon
let phaseTimeLimit = 0;
let phaseStartTime = 0;
let animationId;
let shakeIntensity = 0;

// --- 入力状態 ---
let input = { isDown: false, x: 0, y: 0, isDragging: false };

// --- アクション用ターゲットオブジェクト ---
let targetDrop = { x: 400, y: 300, radius: 70 }; // フェーズ1:DROP
let itemCover = { x: 400, y: 500, radius: 45 };  // フェーズ2:COVER（防具）
let targetCover = { x: 400, y: 150, radius: 70 }; // フェーズ2:COVER（頭）
let targetHold = { x: 400, y: 300, radius: 80 }; // フェーズ3:HOLD ON（長押し）
let holdProgress = 0; 

// 就寝中セットアップ用（家具）
let furnitureObj = { x: 100, y: 100, width: 120, height: 120, isDragging: false, initialX: 100, initialY: 100 };
let fallingAnim = 0; // 家具が倒れてくるアニメーション（0〜1）
let bedArea = { x: 300, y: 200, width: 200, height: 300 }; // ベッド（あなた）のエリア

// --- 入力イベント ---
function getMousePos(evt) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    let clientX = evt.clientX; let clientY = evt.clientY;
    if(evt.touches && evt.touches.length > 0) {
        clientX = evt.touches[0].clientX; clientY = evt.touches[0].clientY;
    }
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
}

function handleDown(e) {
    e.preventDefault(); input.isDown = true;
    const pos = getMousePos(e); input.x = pos.x; input.y = pos.y;

    // SCENE Sleep: SETUP (家具のドラッグと開始ボタン)
    if (gameState === 'setup_sleep') {
        // 家具のドラッグ
        const distFurn = Math.hypot(input.x - (furnitureObj.x + furnitureObj.width/2), input.y - (furnitureObj.y + furnitureObj.height/2));
        if (distFurn < furnitureObj.width/2) {
            furnitureObj.isDragging = true;
            return;
        }
        // 「就寝する」ボタン
        if (pos.y > 500) { startSleepPlaying(); return; }
    }

    // Phase 1: DROP (クリック)
    if (gameState === 'playing' && currentPhase === 1) {
        if (Math.hypot(input.x - targetDrop.x, input.y - targetDrop.y) < targetDrop.radius) {
            advancePhase();
        }
    }
    // Phase 2: COVER (ドラッグ開始)
    if (gameState === 'playing' && currentPhase === 2) {
        if (Math.hypot(input.x - itemCover.x, input.y - itemCover.y) < itemCover.radius * 1.5) {
            input.isDragging = true;
        }
    }
}

function handleMove(e) {
    e.preventDefault();
    const pos = getMousePos(e); input.x = pos.x; input.y = pos.y;
    
    // SCENE Sleep: SETUP (家具の移動)
    if (gameState === 'setup_sleep' && furnitureObj.isDragging) {
        furnitureObj.x = pos.x - furnitureObj.width/2;
        furnitureObj.y = pos.y - furnitureObj.height/2;
    }
    // Phase 2: COVER (防具の移動)
    if (gameState === 'playing' && currentPhase === 2 && input.isDragging) {
        itemCover.x = input.x; itemCover.y = input.y;
        if (Math.hypot(itemCover.x - targetCover.x, itemCover.y - targetCover.y) < targetCover.radius) {
            input.isDragging = false; advancePhase();
        }
    }
}

function handleUp(e) {
    e.preventDefault(); input.isDown = false; input.isDragging = false; furnitureObj.isDragging = false;
    // Phase 3: HOLD ON (途中で指を離したら失敗)
    if (gameState === 'playing' && currentPhase === 3 && holdProgress > 0 && holdProgress < 100) {
        gameOver("【失敗】揺れが収まる前に動いてしまいました。");
    }
}

canvas.addEventListener('mousedown', handleDown); canvas.addEventListener('mousemove', handleMove);
canvas.addEventListener('mouseup', handleUp); canvas.addEventListener('mouseleave', handleUp);
canvas.addEventListener('touchstart', handleDown, {passive: false}); canvas.addEventListener('touchmove', handleMove, {passive: false});
canvas.addEventListener('touchend', handleUp, {passive: false});

// --- シーン制御 ---
function startScene(sceneType) {
    currentScene = sceneType;
    menuScreen.style.display = 'none'; canvas.style.display = 'block';
    
    // DCHターゲットの初期位置（フェーズごとに調整）
    targetDrop = { x: 400, y: 300, radius: 70 };
    targetCover = { x: 400, y: 150, radius: 70 }; 
    targetHold = { x: 400, y: 300, radius: 80 }; 
    itemCover = { x: 400, y: 500, radius: 45 };
    holdProgress = 0; fallingAnim = 0;
    
    if (sceneType === 'sleep') {
        startSleepSetup();
    } else {
        startArenaPlaying();
    }
}

// ==========================================
// SCENE Sleep: 就寝中（マイ・ルーム・マッピング）
// ==========================================
function startSleepSetup() {
    gameState = 'setup_sleep';
    uiOverlay.style.display = 'none';
    // 家具の初期位置
    furnitureObj.x = 100; furnitureObj.y = 100; furnitureObj.width = 150; furnitureObj.height = 150; // マッピング用に少し大きく
    mainContainer.classList.remove('pulse-red');
    gameLoop();
}

function startSleepPlaying() {
    // 家具の配置を保存（衝突判定とアニメーションの起点）
    furnitureObj.initialX = furnitureObj.x;
    furnitureObj.initialY = furnitureObj.y;
    
    gameState = 'playing'; currentPhase = 1;
    uiOverlay.style.display = 'flex';
    mainContainer.classList.add('pulse-red');
    setPhaseData();
}

// ==========================================
// SCENE Arena: アリーナ
// ==========================================
function startArenaPlaying() {
    gameState = 'playing'; currentPhase = 1;
    uiOverlay.style.display = 'flex';
    mainContainer.classList.add('pulse-red');
    setPhaseData();
}

// ==========================================
// Phase管理 (Drop, Cover, Hold on)
// ==========================================
function setPhaseData() {
    phaseStartTime = performance.now();
    if (currentPhase === 1) {
        phaseTimeLimit = 2500; // 2.5秒
        alertBar.innerText = currentScene === 'sleep' ? "🚨 起き上がるな！ DROP をタップ！" : "🚨 その場にしゃがめ！ DROP をタップ！";
        shakeIntensity = 5;
    } else if (currentPhase === 2) {
        phaseTimeLimit = 2500; // 2.5秒
        alertBar.innerText = currentScene === 'sleep' ? "🚨 布団を被れ！ [COVER] (ドラッグ)" : "🚨 カバンで頭を覆え！ [COVER] (ドラッグ)";
        shakeIntensity = 10;
        // アイテムの位置を調整
        itemCover.x = currentScene === 'sleep' ? 400 : 400; 
        itemCover.y = currentScene === 'sleep' ? 520 : 520;
    } else if (currentPhase === 3) {
        phaseTimeLimit = 5000; // 5秒
        alertBar.innerText = "🚨 揺れが収まるまで長押ししろ！ [HOLD ON]";
        shakeIntensity = 25; // 最大の揺れ
    }
}

function advancePhase() {
    currentPhase++;
    if (currentPhase > 3) {
        gameClear();
    } else {
        setPhaseData();
    }
}

// --- メインループ ---
function gameLoop(timestamp) {
    if (gameState === 'setup_sleep') {
        updateSetup(); drawSetup();
    } else if (gameState === 'playing' || gameState === 'gameover' || gameState === 'clear') {
        update(timestamp); draw();
    }
    
    if (gameState !== 'gameover' && gameState !== 'clear') {
        animationId = requestAnimationFrame(gameLoop);
    }
}

function updateSetup() {
    // セットアップ時は更新ロジックなし（ドラッグのみ）
}

function update(timestamp) {
    if (gameState !== 'playing') return;

    // タイムリミットの計算
    const elapsedTime = timestamp - phaseStartTime;
    const remainingRatio = Math.max(0, 1 - (elapsedTime / phaseTimeLimit));
    timerBar.style.transform = `scaleX(${remainingRatio})`;

    if (remainingRatio <= 0 && currentPhase !== 3) {
        // Phase 1, 2 で時間切れ
        if (currentPhase === 1) gameOver("【被災】反射的なDrop（姿勢を低くする）が遅れ、転倒しました。");
        if (currentPhase === 2) gameOver("【被災】Cover（頭を守る）が間に合わず、落下物の直撃を受けました。");
        return;
    }

    // SCENE Sleep: 家具倒壊アニメーション（トータルタイムで進行）
    if (currentScene === 'sleep') {
        // 揺れが始まってからトータルで進む
        if (currentPhase >= 2 && fallingAnim < 1) {
            fallingAnim = Math.min(fallingAnim + 0.005, 1); // ゆっくり倒れてくる
        }
        
        // 衝突判定（家具が倒れてきたフェーズ3で、布団を被っていなかったらアウト）
        if (currentPhase === 3 && fallingAnim > 0.8) {
            // 家具の衝突範囲（ベッドエリアに重なっているか）
            // マイルームマッピングの肝：プレイヤー自身が置いた家具の初期位置に基づいて倒れてくる
            gameOver("【被災】先ほどあなたが配置した家具が倒れてきました。");
            return;
        }
    }

    // Phase 3: Hold On の進行処理
    if (currentPhase === 3) {
        const distToHold = Math.hypot(input.x - targetHold.x, input.y - targetHold.y);
        if (input.isDown && distToHold < targetHold.radius * 2) {
            // 長押し成功中
            holdProgress += 100 / (60 * (phaseTimeLimit/1000));
            if (holdProgress >= 100) advancePhase();
        }
        if (remainingRatio <= 0 && holdProgress < 100) {
             gameOver("【被災】長押し（Hold on）が足りず、揺れに吹き飛ばされました。");
        }
    }
}

// --- 描画処理 ---

// 1. SETUP SLEEP (マイ・ルーム・マッピング)
function drawSetup() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawSleepBackground(false); // プレーン背景
    
    // ベッド（あなた）の位置を示す枠
    ctx.strokeStyle = '#00B400'; ctx.lineWidth = 4; ctx.strokeRect(bedArea.x, bedArea.y, bedArea.width, bedArea.height);
    ctx.fillStyle = 'rgba(0, 180, 0, 0.1)'; ctx.fillRect(bedArea.x, bedArea.y, bedArea.width, bedArea.height);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center'; ctx.fillText("あなた（ベッド/布団）", bedArea.x + bedArea.width/2, bedArea.y + bedArea.height/2 + 7);

    // ドラッグする家具（本棚/タンス）
    if (assets.furniture.loaded) {
        ctx.drawImage(assets.furniture.img, furnitureObj.x, furnitureObj.y, furnitureObj.width, furnitureObj.height);
    } else {
        ctx.fillStyle = '#8B0000'; ctx.fillRect(furnitureObj.x, furnitureObj.y, furnitureObj.width, furnitureObj.height);
        ctx.fillStyle = '#fff'; ctx.font = '30px sans-serif'; ctx.fillText("🗄️", furnitureObj.x + furnitureObj.width/2, furnitureObj.y + furnitureObj.height/2 + 10);
    }
    // ガイドテキスト
    ctx.strokeStyle = '#FFBE00'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.strokeRect(furnitureObj.x - 5, furnitureObj.y - 5, furnitureObj.width + 10, furnitureObj.height + 10); ctx.setLineDash([]);
    ctx.fillStyle = '#fff'; ctx.font = '16px sans-serif'; ctx.fillText("あなたの部屋の、一番背の高い家具の配置にドラッグせよ", 400, 50);

    // 「就寝する」ボタン（押しやすく巨大に）
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'; ctx.fillRect(0, 500, canvas.width, 100);
    ctx.fillStyle = '#FFBE00'; ctx.beginPath(); ctx.roundRect(btnRect.x, btnRect.y, btnRect.width, btnRect.height, 8); ctx.fill();
    ctx.fillStyle = '#000'; ctx.font = 'bold 22px sans-serif'; ctx.fillText("配置完了：就寝する", btnRect.x + btnRect.width/2, btnRect.y + 33);
}

// 2. PLAYING (Disaster)
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    
    // 画面の揺れ
    if (shakeIntensity > 0 && gameState === 'playing') {
        ctx.translate((Math.random() - 0.5) * shakeIntensity, (Math.random() - 0.5) * shakeIntensity);
    }

    // 背景描画
    if (currentScene === 'sleep') drawSleepBackground(true); // 揺れあり
    else drawArenaBackground();

    // DCHアクション描画（Phase 1〜3）
    if (gameState === 'playing') {
        if (currentPhase === 1) drawDropPhase();
        if (currentPhase === 2) drawCoverPhase();
        if (currentPhase === 3) drawHoldOnPhase();
    }

    ctx.restore();
}

// --- シーン別 背景・オブジェクト描画 ---

function drawSleepBackground(disasterMode) {
    if (assets.sleep_bg.loaded) {
        ctx.drawImage(assets.sleep_bg.img, 0, 0, canvas.width, canvas.height);
    } else {
        // フォールバックグラデーション（暗闇の寝室）
        const grad = ctx.createRadialGradient(400, 300, 50, 400, 300, 500);
        grad.addColorStop(0, '#1a1a1a'); grad.addColorStop(1, '#000000');
        ctx.fillStyle = grad; ctx.fillRect(0, 0, canvas.width, canvas.height);
        // 床の線（遠近感）
        ctx.strokeStyle = '#111'; ctx.lineWidth = 1;
        for (let i = 0; i < canvas.width; i += 50) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(400, 300); ctx.stroke(); }
    }

    // SCENE Sleep: 家具倒壊アニメーション（★マイルームマッピングの肝）
    if (disasterMode && fallingAnim > 0) {
        ctx.save();
        
        // マイルームマッピングの教訓：あなたが配置した場所から倒れてくる
        // 疑似3D倒壊：初期位置から画面中央（プレイヤーの顔）に向かって拡大・回転
        const fallX = furnitureObj.initialX + furnitureObj.width/2;
        const fallY = furnitureObj.initialY + furnitureObj.height/2;
        
        ctx.translate(fallX + (400 - fallX) * fallingAnim, fallY + (300 - fallY) * fallingAnim);
        ctx.scale(1 + fallingAnim * 4, 1 + fallingAnim * 4); // 画面に向かって巨大化
        
        // 衝突判定時の赤い脈動
        const pulse = (currentPhase === 3 && fallingAnim > 0.8) ? Math.sin(timer * 0.1) * 0.2 + 0.8 : 1;
        
        if (assets.furniture.loaded) {
            // 写実的な画像
            ctx.drawImage(assets.furniture.img, -furnitureObj.width/2, -furnitureObj.height/2, furnitureObj.width, furnitureObj.height);
            // 赤い衝突ノイズ（衝突寸前）
            if (pulse > 1) { ctx.fillStyle = 'rgba(255, 0, 0, 0.2)'; ctx.fillRect(-furnitureObj.width/2, -furnitureObj.height/2, furnitureObj.width, furnitureObj.height); }
        } else {
            // フォールバック（図形）
            ctx.fillStyle = `rgba(139, 69, 19, ${pulse})`; ctx.fillRect(-furnitureObj.width/2, -furnitureObj.height/2, furnitureObj.width, furnitureObj.height);
        }
        
        ctx.restore();
    }
}

function drawArenaBackground() {
    if (assets.arena_bg.loaded) {
        ctx.drawImage(assets.arena_bg.img, 0, 0, canvas.width, canvas.height);
    } else {
        // フォールバックグラデーション（暗転したアリーナ）
        ctx.fillStyle = '#050510'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        // 遠くの非常灯のサーチライト
        ctx.translate(canvas.width/2, 0); ctx.rotate(Math.sin(performance.now() * 0.001) * 0.5);
        const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        grad.addColorStop(0, 'rgba(255, 40, 0, 0.4)'); grad.addColorStop(1, 'rgba(255, 40, 0, 0)');
        ctx.fillStyle = grad; ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(30, 0); ctx.lineTo(100, 600); ctx.lineTo(-100, 600); ctx.fill();
        ctx.rotate(-Math.sin(performance.now() * 0.001) * 0.5); ctx.translate(-canvas.width/2, 0); // 戻す
    }

    // SCENE Arena: 群衆パニックのノイズ（透过シルエット）
    ctx.fillStyle = 'rgba(30, 30, 30, 0.7)';
    for(let i=0; i<15; i++) {
        const x = (Math.random() - 0.5) * canvas.width * 0.2 + canvas.width * 0.2 * i;
        ctx.fillRect(x, 200, 80, 400); // 押し寄せる群衆の濁流
    }
}

// --- DCHフェーズ別アクション描画 ---

function drawDropPhase() {
    // DROPターゲット（赤い丸）
    ctx.beginPath(); ctx.arc(targetDrop.x, targetDrop.y, targetDrop.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 40, 0, 0.8)'; ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 28px sans-serif'; ctx.textAlign = 'center'; ctx.fillText("DROP", targetDrop.x, targetDrop.y + 10);
    ctx.fillStyle = '#fff'; ctx.font = '16px sans-serif'; ctx.fillText("姿勢を低く！", targetDrop.x, targetDrop.y - 30);
}

function drawCoverPhase() {
    // ターゲット（頭）
    ctx.beginPath(); ctx.arc(targetCover.x, targetCover.y, targetCover.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 255, 0, 0.2)'; ctx.fill();
    ctx.strokeStyle = '#00FF00'; ctx.lineWidth = 3; ctx.setLineDash([8, 8]); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center'; ctx.fillText("ここにドラッグしろ！", targetCover.x, targetCover.y + 8);

    // 防具（枕またはカバン）
    ctx.save();
    ctx.beginPath(); ctx.arc(itemCover.x, itemCover.y, itemCover.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(86, 180, 233, 0.9)'; ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
    // 影（没入感）
    ctx.shadowBlur = 15; ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.fill();
    
    ctx.fillStyle = '#fff'; ctx.font = '40px sans-serif'; ctx.fillText(currentScene === 'sleep' ? "🛌" : "👜", itemCover.x, itemCover.y + 15);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 16px sans-serif'; ctx.fillText("頭を守れ！", itemCover.x, itemCover.y - 35);
    ctx.restore();
}

function drawHoldOnPhase() {
    // 長押しターゲット
    ctx.save();
    ctx.beginPath(); ctx.arc(targetHold.x, targetHold.y, targetHold.radius, 0, Math.PI * 2);
    ctx.fillStyle = input.isDown ? 'rgba(0, 200, 0, 0.85)' : 'rgba(255, 40, 0, 0.8)'; ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.stroke();
    // 発光（没入感）
    if(input.isDown) { ctx.shadowBlur = 20; ctx.shadowColor = '#00FF00'; ctx.fill(); ctx.shadowBlur = 0; }

    ctx.fillStyle = '#fff'; ctx.font = 'bold 30px sans-serif'; ctx.textAlign = 'center'; ctx.fillText("HOLD ON", targetHold.x, targetHold.y - 12);
    ctx.fillStyle = '#fff'; ctx.font = '16px sans-serif'; ctx.fillText("長押ししろ！", targetHold.x, targetHold.y + 35);
    
    // 進行度バー（円形）
    ctx.beginPath(); ctx.arc(targetHold.x, targetHold.y, targetHold.radius - 12, -Math.PI/2, (-Math.PI/2) + (Math.PI*2 * (holdProgress/100)));
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 10; ctx.stroke();
    ctx.restore();

    // 妨害演出（瓦礫や群衆の濁流）
    // アリーナなら群衆が殺到する透過シルエット
    // 寝室なら瓦礫の透過オブジェクト
    ctx.fillStyle = currentScene === 'sleep' ? 'rgba(139, 69, 19, 0.5)' : 'rgba(80, 80, 80, 0.5)';
    ctx.fillRect(Math.sin(performance.now() * 0.005) * 100 + 400, 100, 200, 600);
}

// ==========================================
// 共通処理
// ==========================================
function gameOver(reason) {
    gameState = 'gameover'; mainContainer.classList.remove('pulse-red');
    showResult(false, "生存失敗 (CRITICAL)", reason);
}

function gameClear() {
    gameState = 'clear'; mainContainer.classList.remove('pulse-red');
    let desc = ""; let medalId = ""; let medalName = ""; let medalIcon = "";
    
    if (currentScene === 'sleep') {
        desc = "【生存成功】<br>暗闇と恐怖の中、布団を被り、揺れが収まるまで耐え抜きました。<br><br>就寝時の最大の脅威は「落下物」と「家具倒壊」です。しかし、最高のシェイクアウトは、揺れる前の『家具の固定と配置』で決まります。<br>先ほど倒れてきた、あの家具の配置は、現実のあなたの部屋で本当に安全ですか？";
        medalId = "dch_sleep"; medalName = "暗闇の防衛者"; medalIcon = "🛏️";
    } else {
        desc = "【生存成功】<br>群衆パニックの濁流に抗い、安全な座席に留まり続けました。<br><br>非常時に「みんなが逃げているから」と同調圧力に流されることは、群集事故（将棋倒し）の最大のトリガーとなります。その場でアナウンスを待つ『留まる勇気』が命を救いました。";
        medalId = "dch_arena"; medalName = "同調圧力への抵抗者"; medalIcon = "🏟️";
    }
    showResult(true, "生存成功 (SURVIVAL)", desc, medalId, medalName, medalIcon);
}

function showResult(isClear, title, desc, medalId = null, medalName = null, medalIcon = null) {
    canvas.style.display = 'none'; resultScreen.style.display = 'flex';
    document.getElementById('result-title').innerText = title;
    document.getElementById('result-title').style.color = isClear ? '#00B400' : '#FF2800';
    document.getElementById('result-desc').innerHTML = desc;
    document.getElementById('result-desc').style.borderLeftColor = isClear ? '#00B400' : '#FF2800';

    const medalDiv = document.getElementById('medal-notification');
    if (isClear && medalId) {
        medalDiv.innerHTML = `<div style="font-size: 3rem; margin-bottom: 10px;">${medalIcon}</div><h3 style="color: #FFBE00; margin: 0;">メダル獲得：${medalName}</h3>`;
        let earnedMedals = JSON.parse(localStorage.getItem('quake_medals')) || [];
        if (!earnedMedals.includes(medalId)) {
            earnedMedals.push(medalId); localStorage.setItem('quake_medals', JSON.stringify(earnedMedals));
        }
    } else { medalDiv.innerHTML = ""; }
}