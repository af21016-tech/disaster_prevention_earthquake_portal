const mainContainer = document.getElementById('main-container');
const contentBox = document.getElementById('content-box');

let currentSceneId = null;
let currentPhase = 0; // 配列インデックス（0: Drop, 1: Cover）
let timerAnimation;
let startTime;
let timeLimit;
let isAnswered = false;

// プレイヤーの事前回答保存用
let playerConfig = {};

// リズムゲーム・BGM用変数
let isRhythmGameActive = false;
let rhythmStartTime = 0;
let combo = 0;
let rhythmAnimFrame = null;
let bgmAudio = null; 
let targetEarthquakeTime = 5000; 

// --- シナリオデータ ---
const scenarios = {
    sleep: {
        title: "SCENE 1：就寝中の寝室",
        setupSteps: [
            {
                id: "direction",
                text: "あなたの現実の寝室を思い浮かべてください。<br>一番背の高い家具（本棚やタンス）、または窓は、ベッドから見てどの方向にありますか？",
                options: [
                    { id: "top", icon: "⬆️", text: "頭の方向", nextStep: "fixed" },
                    { id: "bottom", icon: "⬇️", text: "足の方向", nextStep: "fixed" },
                    { id: "side", icon: "⬅️", text: "横の方向", nextStep: "fixed" },
                    { id: "none", icon: "✅", text: "家具も窓もない", nextStep: "done" }
                ]
            },
            {
                id: "fixed",
                text: "その家具（または窓ガラス）は、L字金具や飛散防止フィルムなどで、しっかりと【固定・対策】されていますか？",
                options: [
                    { id: "yes", icon: "🛡️", text: "はい（対策している）", nextStep: "done" },
                    { id: "no", icon: "⚠️", text: "いいえ（対策していない）", nextStep: "done" }
                ]
            }
        ],
        phases: [
            {   // Phase 1: DROP
                time: 3500,
                getText: () => `<span class="alert-text">激しい揺れで目が覚めました！</span><br>【Phase 1: DROP】<br>まずどう行動しますか！？`,
                options: [
                    { icon: "💡", text: "電気をつける", isCorrect: false, feedback: "暗闇での移動は、飛散したガラス等で足を切り、動けなくなる危険性が極めて高いです。" },
                    { icon: "🚪", text: "ドアを開ける", isCorrect: false, feedback: "揺れている最中に立ち上がるのは不可能です。転倒して大けがをします。" },
                    { icon: "🛌", text: "起き上がらない", isCorrect: true, feedback: "就寝中の最大の脅威は「転倒」です。絶対に起き上がらず、布団に留まるのが鉄則です。" }
                ]
            },
            {   // Phase 2: COVER
                time: 3500,
                getText: () => {
                    if (playerConfig.directionId === 'none') {
                        return `<span class="alert-text">【Phase 2: COVER】</span><br>家具はありませんが、天井の照明が激しく揺れています！<br>どうやって頭を守りますか！？`;
                    } else if (playerConfig.fixedId === 'yes') {
                        return `<span class="alert-text">【Phase 2: COVER】</span><br><strong>${playerConfig.direction}</strong>の家具が激しく揺れていますが、固定されているため倒れてきません！<br>しかし、天井の照明の落下には注意が必要です。どうやって頭を守りますか！？`;
                    } else {
                        return `<span class="alert-text">【Phase 2: COVER】</span><br>激しい揺れの中、<strong>${playerConfig.direction}</strong>から、固定されていない家具が倒れてきました！<br>どうやって頭を守りますか！？`;
                    }
                },
                options: [
                    { icon: "📱", text: "スマホでライトを照らす", isCorrect: false, feedback: "頭が無防備なままでは落下物の直撃を受けます。" },
                    { icon: "👐", text: "両手で頭を覆う", isCorrect: false, feedback: "手だけでは防具として不十分です。重量物の落下には耐えられません。" },
                    { icon: "枕", text: "布団や枕を深く被る", isCorrect: true, feedback: "暗闇では身近にある寝具が最高の盾（ヘルメット代わり）になります。" }
                ]
            }
        ],
        hold: { // Phase 3: HOLD ON
            time: 4000,
            text: `<span class="alert-text">【Phase 3: HOLD ON】</span><br>本震が襲ってきました！<br>下のボタンを「長押し」して、揺れが収まるまで布団の中で耐え抜いてください！`,
            failText: "指が離れてしまいました。恐怖に耐えきれず暗闇へ逃げ出し、飛散したガラスを踏んで負傷しました。「揺れが収まるまでその場から動かない」という強い意志が必要です。",
            getClearText: () => {
                if (playerConfig.directionId === 'none') return "布団の中で頭を守り抜きました。<br><br>家具のない寝室は、地震において非常に安全な空間です。今後もその環境を維持してください。";
                if (playerConfig.fixedId === 'yes') return "布団の中で頭を守り抜きました。<br><br>素晴らしいです。あなたが家具を【固定】していたおかげで、倒壊による圧死やガラス飛散のリスクを最小限に抑えることができました。日頃の備えが命を救う最大の防御です。";
                return "布団の中で頭を守り抜きました。<br><br>今回はなんとか助かりましたが、先ほどあなたが選んだ「固定されていない背の高い家具」。現実の地震では、これが凶器となって命を奪います。このシミュレーションを機に、どうか家具の固定をお願いします。";
            }
        }
    },
    arena: {
        title: "SCENE 2：アリーナ会場",
        setupSteps: [], // アリーナは事前設定なし
        phases: [
            {
                time: 3500,
                getText: () => `<span class="alert-text">けたたましい警報音が鳴り、照明が落ちました！</span><br>【Phase 1: DROP】<br>強い揺れが来ます！`,
                options: [
                    { icon: "🏃", text: "出口へ走る", isCorrect: false, feedback: "出口付近で将棋倒し（群集事故）が発生し、圧死する危険性が極めて高くなります。" },
                    { icon: "🚶", text: "広い通路に出る", isCorrect: false, feedback: "暗闇の中で通路に出ると、逃げ惑う他の観客に踏みつぶされる危険があります。" },
                    { icon: "🧎", text: "その場にしゃがむ", isCorrect: true, feedback: "アリーナ席で最も恐ろしいのは「群衆雪崩」です。絶対に移動せず、その場で小さくなるのが正解です。" }
                ]
            },
            {
                time: 3500,
                getText: () => `<span class="alert-text">【Phase 2: COVER】</span><br>暗闇の中、天井の照明器具が不気味にきしむ音が聞こえます。<br>どうやって身を守りますか！？`,
                options: [
                    { icon: "🪑", text: "座席の下に潜る", isCorrect: false, feedback: "アリーナの椅子は狭く、下に潜り込むことは物理的に困難で、かえって身動きが取れなくなります。" },
                    { icon: "📱", text: "スマホで情報を探す", isCorrect: false, feedback: "情報収集は揺れが収まってからです。今は頭を守るのが最優先です。" },
                    { icon: "👜", text: "カバンで頭を覆う", isCorrect: true, feedback: "机がない場所では、自分の持っているカバンや上着で頭を保護します。" }
                ]
            }
        ],
        hold: { // Phase 3: HOLD ON
            time: 5000,
            text: `<span class="alert-text">【Phase 3: HOLD ON】</span><br>本震が襲ってきました！激しい揺れと暗闇の中、パニックになった一部の観客が立ち上がり、逃げ惑う悲鳴と足音が聞こえます。<br>下のボタンを「長押し」して、揺れが完全に収まるまで、絶対に防御姿勢を崩さずに耐え抜いてください！`,
            failText: "指が離れてしまいました。恐怖から防御姿勢を解いて立ち上がってしまい、暗闇の中で転倒し、逃げ惑う他の観客に踏みつぶされました。「揺れている最中の移動」は自殺行為です。",
            getClearText: () => "激しい揺れを耐え抜き、その後のパニックにも巻き込まれずに冷静に行動できました。<br><br>アリーナのような巨大空間では、揺れの最中や直後に一斉に出口へ走る「同調圧力」が群集事故（将棋倒し）の最大のトリガーとなります。周囲のパニックに流されず、自らの判断で座席に留まり、係員の指示を待つ『落ち着いた行動』があなたの命を救いました。"
        },
        afterHold: { // ★追加：Phase 4: 事後の冷静な判断
            time: 7000, // 落ち着いて判断させるため、少し長めの7秒
            getText: () => `<span class="alert-text">【Phase 4: WAIT & FOLLOW】</span><br>激しい揺れが収まりました。しかし、停電した薄暗い会場内で「早く逃げろ！」という怒号が響き、一部の観客が出口に殺到しています。<br>あなたはどう行動しますか？`,
            options: [
                { icon: "🏃", text: "人の波に乗って出口へ急ぐ", isCorrect: false, feedback: "出口付近は最も将棋倒し（群集事故）が起きやすい危険地帯です。パニックになった群衆の流れに乗るのは自殺行為です。" },
                { icon: "🔦", text: "スマホのライトで非常口を探す", isCorrect: false, feedback: "暗闇での単独行動は危険です。勝手な方向に動くことで他の観客と衝突し、パニックをさらに助長してしまいます。" },
                { icon: "🧘", text: "その場に留まり、係員の指示を待つ", isCorrect: true, feedback: "大正解です。巨大施設では、安全が確認されるまで『動かない』ことが最大の防御になります。出口に殺到せず、落ち着いて公式の誘導を待つのが鉄則です。" }
            ]
        }
    }
};

// --- 初期画面 ---
document.addEventListener('DOMContentLoaded', showMenu);

function showMenu() {
    mainContainer.className = 'main-container';
    contentBox.innerHTML = `
        <h2 style="color: #FFBE00; margin-bottom: 2rem;">シミュレーション環境の選択</h2>
        <div class="choices-grid">
            <button class="btn-choice" onclick="startScenario('sleep')"><span class="choice-icon">🛏️</span><span>就寝中（自室マッピング）</span></button>
            <button class="btn-choice" onclick="startScenario('arena')"><span class="choice-icon">🏟️</span><span>ライブ会場（アリーナ）</span></button>
        </div>
    `;
}

function startScenario(sceneId) {
    currentSceneId = sceneId;
    currentPhase = 0;
    playerConfig = {};
    const scenario = scenarios[sceneId];

    if (scenario.setupSteps && scenario.setupSteps.length > 0) {
        showSetupStep(0);
    } else {
        startArenaRhythmGame();
    }
}

// --- 就寝中：事前設定 ---
function showSetupStep(stepIndex) {
    const setupData = scenarios[currentSceneId].setupSteps[stepIndex];
    let html = `<h2 class="scene-title">${scenarios[currentSceneId].title}</h2><p class="situation-text">${setupData.text}</p><div class="choices-grid">`;
    setupData.options.forEach(opt => {
        html += `<button class="btn-choice" onclick="saveSetup('${setupData.id}', '${opt.text}', '${opt.id}', '${opt.nextStep}')">
                    <span class="choice-icon">${opt.icon}</span><span>${opt.text}</span>
                 </button>`;
    });
    html += `</div>`;
    contentBox.innerHTML = html;
}

function saveSetup(setupId, text, valueId, nextStep) {
    playerConfig[setupId] = text;
    playerConfig[setupId + "Id"] = valueId;

    if (nextStep === "fixed") showSetupStep(1);
    else if (nextStep === "done") startCountdown();
}

function startCountdown() {
    let count = 3;
    mainContainer.className = 'main-container bg-alert';
    const interval = setInterval(() => {
        if (count > 0) { contentBox.innerHTML = `<h2 style="font-size: 4rem; color: #FF2800; margin:0;">${count}</h2>`; count--; } 
        else { clearInterval(interval); playPhase(); }
    }, 1000);
}

// --- アリーナ：リズムゲームの罠（急転直下ギミック） ---
function startArenaRhythmGame() {
    mainContainer.className = 'main-container';
    mainContainer.style.background = 'radial-gradient(circle at center, #1a0033 0%, #000 100%)';
    combo = 0;
    
    // ★5秒〜20秒の間でランダムに地震発生タイミングを設定
    targetEarthquakeTime = Math.floor(Math.random() * (20000 - 5000 + 1)) + 5000;
    
    bgmAudio = new Audio('./audio/arena_bgm.mp3'); 
    bgmAudio.volume = 0.6; 
    bgmAudio.play().catch(e => console.log("BGMの再生がブロックされました: ", e));
    
    contentBox.innerHTML = `
        <h2 class="scene-title" style="color: #FF69B4; font-size: 2rem; text-shadow: 0 0 10px #FF69B4;">💖 ARENA LIVE START! 💖</h2>
        <p style="font-size: 1.2rem; margin-bottom: 2rem; color: #fff;">音楽に合わせてペンライト（キー）を振れ！<br><span style="color:#aaa; font-size:0.9rem;">PC: [F] と [J] キー / スマホ: 画面の左右をタップ</span></p>
        
        <div style="display: flex; justify-content: space-around; width: 100%; max-width: 400px; margin: 0 auto; height: 150px; position: relative;">
            <div id="lane-left" style="width: 80px; height: 80px; border: 4px solid #56B4E9; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: bold; position: absolute; bottom: 0; left: 10%; touch-action: none; cursor: pointer; color: #56B4E9; background: rgba(86,180,233,0.1); box-shadow: 0 0 15px rgba(86,180,233,0.5);">F</div>
            <div id="lane-right" style="width: 80px; height: 80px; border: 4px solid #FFBE00; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: bold; position: absolute; bottom: 0; right: 10%; touch-action: none; cursor: pointer; color: #FFBE00; background: rgba(255,190,0,0.1); box-shadow: 0 0 15px rgba(255,190,0,0.5);">J</div>
        </div>
        <div id="combo-text" style="font-size: 2.5rem; font-weight: bold; color: #fff; margin-top: 2rem; opacity: 0; text-shadow: 0 0 10px #fff;">1 COMBO!</div>
    `;

    isRhythmGameActive = true;
    rhythmStartTime = performance.now();
    
    window.addEventListener('keydown', handleRhythmKey);
    document.getElementById('lane-left').addEventListener('pointerdown', () => triggerRhythmAction('lane-left'));
    document.getElementById('lane-right').addEventListener('pointerdown', () => triggerRhythmAction('lane-right'));
    
    rhythmAnimFrame = requestAnimationFrame(rhythmGameLoop);
}

function handleRhythmKey(e) {
    if (!isRhythmGameActive) return;
    if (e.key.toLowerCase() === 'f') triggerRhythmAction('lane-left');
    if (e.key.toLowerCase() === 'j') triggerRhythmAction('lane-right');
}

function triggerRhythmAction(laneId) {
    if (!isRhythmGameActive) return;
    combo++;
    const comboEl = document.getElementById('combo-text');
    comboEl.innerText = `${combo} COMBO!`;
    comboEl.style.opacity = 1;
    
    const lane = document.getElementById(laneId);
    const originalColor = laneId === 'lane-left' ? 'rgba(86,180,233,0.1)' : 'rgba(255,190,0,0.1)';
    const flashColor = laneId === 'lane-left' ? 'rgba(86,180,233,0.8)' : 'rgba(255,190,0,0.8)';
    
    lane.style.background = flashColor;
    setTimeout(() => { if (lane) lane.style.background = originalColor; }, 100);
}

function rhythmGameLoop(currentTime) {
    if (!isRhythmGameActive) return;
    const elapsedTime = currentTime - rhythmStartTime;
    if (elapsedTime > targetEarthquakeTime) {
        triggerEarthquake();
        return;
    }
    rhythmAnimFrame = requestAnimationFrame(rhythmGameLoop);
}

function triggerEarthquake() {
    isRhythmGameActive = false;
    window.removeEventListener('keydown', handleRhythmKey);
    cancelAnimationFrame(rhythmAnimFrame);
    
    if (bgmAudio) {
        bgmAudio.pause();
        bgmAudio.currentTime = 0;
    }
    
    mainContainer.style.background = '#000';
    contentBox.innerHTML = ''; 

    setTimeout(() => {
        mainContainer.style.background = ''; 
        mainContainer.className = 'main-container bg-alert';
        currentPhase = 0; 
        playPhase(); 
    }, 800);
}

// --- フェーズ進行 (Drop / Cover) ---
function playPhase() {
    isAnswered = false;
    const scenario = scenarios[currentSceneId];
    const phaseData = scenario.phases[currentPhase];
    timeLimit = phaseData.time;

    let shuffledOptions = [...phaseData.options].sort(() => Math.random() - 0.5);
    
    let html = `<h2 class="scene-title">${scenario.title}</h2><div class="timer-container" style="display: block;"><div class="timer-bar" id="timer-bar"></div></div><div class="situation-text">${phaseData.getText()}</div><div class="choices-grid">`;
    shuffledOptions.forEach(opt => {
        html += `<button class="btn-choice" onclick="selectAnswer(${opt.isCorrect}, '${opt.feedback}')"><span class="choice-icon">${opt.icon}</span><span>${opt.text}</span></button>`;
    });
    html += `</div>`;
    contentBox.innerHTML = html;
    
    startTime = performance.now();
    requestAnimationFrame(updateTimer);
}

function updateTimer(currentTime) {
    if (isAnswered) return;
    const elapsedTime = currentTime - startTime;
    const remainingRatio = Math.max(0, 1 - (elapsedTime / timeLimit));
    document.getElementById('timer-bar').style.transform = `scaleX(${remainingRatio})`;

    if (remainingRatio > 0) timerAnimation = requestAnimationFrame(updateTimer);
    else { isAnswered = true; showFeedback(false, "【時間切れ】現実の地震は待ってくれません。迷っている数秒の間に、落下物の直撃を受ける可能性が極めて高いです。"); }
}

function selectAnswer(isCorrect, feedbackText) {
    if (isAnswered) return;
    isAnswered = true; cancelAnimationFrame(timerAnimation);
    showFeedback(isCorrect, feedbackText);
}

function showFeedback(isCorrect, feedbackText) {
    mainContainer.className = 'main-container';
    contentBox.innerHTML = `
        <div class="feedback-box ${isCorrect ? "feedback-correct" : "feedback-incorrect"}">
            <h3 style="color: ${isCorrect ? '#00B400' : '#FF2800'}; margin-top:0;">${isCorrect ? "正しい判断です！" : "【致命的な判断ミス】"}</h3>
            <p style="line-height: 1.6; margin-bottom:0;">${feedbackText}</p>
        </div>
        <button class="btn primary" onclick="${isCorrect ? "nextPhase()" : "showMenu()"}">${isCorrect ? "次の状況へ" : "メニューへ戻る"}</button>
    `;
}

function nextPhase() {
    currentPhase++;
    mainContainer.className = 'main-container bg-alert';
    if (currentPhase < scenarios[currentSceneId].phases.length) playPhase();
    else playHoldPhase();
}

// --- フェーズ 3: HOLD ON (長押し) ---
let holdStartTime = 0;
let holdTimerAnim = null;
let isHolding = false;

function playHoldPhase() {
    const holdData = scenarios[currentSceneId].hold;
    timeLimit = holdData.time;
    isHolding = false; isAnswered = false;

    contentBox.innerHTML = `
        <h2 class="scene-title">${scenarios[currentSceneId].title}</h2>
        <div class="timer-container" style="display: block;"><div class="timer-bar" id="hold-timer-bar" style="background: #00B400; transform: scaleX(0);"></div></div>
        <div class="situation-text">${holdData.text}</div>
        <div class="btn-hold" id="btn-hold">
            <span style="font-size: 3rem;">✊</span><span>HOLD ON</span><span style="font-size: 0.8rem; font-weight: normal;">(押し続けろ)</span>
        </div>
    `;

    const btnHold = document.getElementById('btn-hold');
    
    const startHold = (e) => { 
        e.preventDefault(); 
        if (isAnswered) return;
        isHolding = true; btnHold.classList.add('holding'); btnHold.querySelector('span:nth-child(2)').innerText = "耐えろ！"; 
        holdStartTime = performance.now();
        holdTimerAnim = requestAnimationFrame(updateHoldProgress);
    };

    const endHold = (e) => { 
        e.preventDefault(); 
        if (!isHolding || isAnswered) return; 
        isHolding = false; btnHold.classList.remove('holding'); btnHold.querySelector('span:nth-child(2)').innerText = "HOLD ON"; 
        cancelAnimationFrame(holdTimerAnim);
        
        isAnswered = true;
        showFeedback(false, scenarios[currentSceneId].hold.failText);
    };

    btnHold.addEventListener('pointerdown', startHold);
    btnHold.addEventListener('pointerup', endHold);
    btnHold.addEventListener('pointerleave', endHold);
    btnHold.addEventListener('pointercancel', endHold);
}

function updateHoldProgress(currentTime) {
    if (!isHolding || isAnswered) return;
    
    const elapsedTime = currentTime - holdStartTime;
    const holdRatio = Math.min(1, elapsedTime / timeLimit);
    document.getElementById('hold-timer-bar').style.transform = `scaleX(${holdRatio})`;
    
    if (holdRatio < 1) {
        holdTimerAnim = requestAnimationFrame(updateHoldProgress);
    } else {
        isAnswered = true; isHolding = false;
        document.getElementById('btn-hold').classList.remove('holding');
        
        // ★追加: Hold On 成功後、事後のフェーズ（afterHold）があればそちらへ遷移
        const scenario = scenarios[currentSceneId];
        if (scenario.afterHold) {
            playAfterHoldPhase();
        } else {
            showClear(scenario.hold.getClearText());
        }
    }
}

// --- ★追加: フェーズ 4: 事後の冷静な判断 (WAIT & FOLLOW) ---
function playAfterHoldPhase() {
    isAnswered = false;
    const scenario = scenarios[currentSceneId];
    const phaseData = scenario.afterHold;
    timeLimit = phaseData.time;

    let shuffledOptions = [...phaseData.options].sort(() => Math.random() - 0.5);
    
    let html = `<h2 class="scene-title">${scenario.title}</h2><div class="timer-container" style="display: block;"><div class="timer-bar" id="timer-bar"></div></div><div class="situation-text">${phaseData.getText()}</div><div class="choices-grid">`;
    shuffledOptions.forEach(opt => {
        html += `<button class="btn-choice" onclick="selectAfterHoldAnswer(${opt.isCorrect}, '${opt.feedback}')"><span class="choice-icon">${opt.icon}</span><span>${opt.text}</span></button>`;
    });
    html += `</div>`;
    contentBox.innerHTML = html;
    
    startTime = performance.now();
    requestAnimationFrame(updateAfterHoldTimer);
}

function updateAfterHoldTimer(currentTime) {
    if (isAnswered) return;
    const elapsedTime = currentTime - startTime;
    const remainingRatio = Math.max(0, 1 - (elapsedTime / timeLimit));
    document.getElementById('timer-bar').style.transform = `scaleX(${remainingRatio})`;

    if (remainingRatio > 0) {
        timerAnimation = requestAnimationFrame(updateAfterHoldTimer);
    } else { 
        isAnswered = true; 
        showAfterHoldFeedback(false, "【時間切れ】パニックになった群衆に巻き込まれてしまいました。災害時は周囲に流されず、瞬時に「その場に留まる」という冷静な決断が必要です。"); 
    }
}

function selectAfterHoldAnswer(isCorrect, feedbackText) {
    if (isAnswered) return;
    isAnswered = true; cancelAnimationFrame(timerAnimation);
    showAfterHoldFeedback(isCorrect, feedbackText);
}

function showAfterHoldFeedback(isCorrect, feedbackText) {
    mainContainer.className = 'main-container';
    contentBox.innerHTML = `
        <div class="feedback-box ${isCorrect ? "feedback-correct" : "feedback-incorrect"}">
            <h3 style="color: ${isCorrect ? '#00B400' : '#FF2800'}; margin-top:0;">${isCorrect ? "正しい判断です！" : "【致命的な判断ミス】"}</h3>
            <p style="line-height: 1.6; margin-bottom:0;">${feedbackText}</p>
        </div>
        <button class="btn primary" onclick="${isCorrect ? "showFinalClear()" : "showMenu()"}">${isCorrect ? "結果を見る" : "メニューへ戻る"}</button>
    `;
}

function showFinalClear() {
    showClear(scenarios[currentSceneId].hold.getClearText());
}

// --- 最終クリア画面 ---
function showClear(clearText) {
    mainContainer.className = 'main-container';
    contentBox.innerHTML = `
        <h2 style="color: #00B400; font-size: 2rem; margin-bottom: 1rem;">SURVIVAL SUCCESS</h2>
        <div class="feedback-box feedback-correct" style="margin-bottom: 2rem;"><p style="line-height: 1.6; margin: 0;">${clearText}</p></div>
        <div style="margin-bottom: 2rem; text-align: center;">
            <div style="font-size: 3rem;">${currentSceneId === 'sleep' ? "🛏️" : "🏟️"}</div>
            <h3 style="color: #FFBE00; margin: 0;">メダル獲得：${currentSceneId === 'sleep' ? "暗闇の防衛者" : "同調圧力への抵抗者"}</h3>
        </div>
        <a href="index.html" class="btn primary">ダッシュボードへ帰還</a>
    `;
}