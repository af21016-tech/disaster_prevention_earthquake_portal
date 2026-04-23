let contentBox;
let currentSceneId = null;
let currentPhase = 0; 
let timerAnimation;
let startTime;
let timeLimit;
let isAnswered = false;
let questionStartTime = 0; 
let playerConfig = {};

let isRhythmGameActive = false;
let rhythmStartTime = 0;
let combo = 0;
let rhythmAnimFrame = null;
let bgmAudio = null; 
let targetEarthquakeTime = 5000; 

// ★全ボタン共通のデザインスタイル
const MENU_BTN_STYLE = "display:flex; align-items:center; justify-content:center; gap:15px; width:100%; max-width:400px; margin:0 auto 15px; padding:20px; font-size:1.2rem; font-weight:bold; background:#1a1a1a; color:#fff; border:2px solid #555; border-radius:10px; cursor:pointer;";
const SETUP_BTN_STYLE = "flex: 1 1 40%; padding: 15px; background: #111; border: 2px solid #444; border-radius: 8px; color: #fff; font-size: 1.1rem; font-weight: bold; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 10px; min-width: 150px;";
const ACTION_BTN_STYLE = "display:flex; align-items:center; text-align:left; gap:15px; width:100%; padding:15px 20px; margin-bottom:12px; font-size:1.2rem; font-weight:bold; background:#111; color:#fff; border:2px solid #444; border-radius:8px; cursor:pointer;";

const scenarios = {
    sleep: {
        title: "SCENE 1：就寝中の寝室",
        setupSteps: [
            {
                id: "direction", text: "あなたの現実の寝室を思い浮かべてください。<br>一番背の高い家具（本棚やタンス）、または窓は、ベッドから見てどの方向にありますか？",
                options: [
                    { id: "top", icon: "⬆️", text: "頭の方向", nextStep: "fixed" },
                    { id: "bottom", icon: "⬇️", text: "足の方向", nextStep: "fixed" },
                    { id: "side", icon: "⬅️", text: "横の方向", nextStep: "fixed" },
                    { id: "none", icon: "✅", text: "家具も窓もない", nextStep: "done" }
                ]
            },
            {
                id: "fixed", text: "その家具（または窓ガラス）は、L字金具や飛散防止フィルムなどで、しっかりと【固定・対策】されていますか？",
                options: [
                    { id: "yes", icon: "🛡️", text: "はい（対策している）", nextStep: "done" },
                    { id: "no", icon: "⚠️", text: "いいえ（対策していない）", nextStep: "done" }
                ]
            }
        ],
        phases: [
            {   
                time: 3500, getText: () => `<span class="alert-text">激しい揺れで目が覚めました！</span><br>【Phase 1: DROP】<br>まずどう行動しますか！？`,
                options: [
                    { icon: "💡", text: "電気をつける", isCorrect: false, feedback: "暗闇での移動は、飛散したガラス等で足を切り、動けなくなる危険性が極めて高いです。" },
                    { icon: "🚪", text: "ドアを開ける", isCorrect: false, feedback: "揺れている最中に立ち上がるのは不可能です。転倒して大けがをします。" },
                    { icon: "🛌", text: "起き上がらない", isCorrect: true, feedback: "就寝中の最大の脅威は「転倒」です。絶対に起き上がらず、布団に留まるのが鉄則です。" }
                ]
            },
            {   
                time: 3500,
                getText: () => {
                    if (playerConfig.directionId === 'none') return `<span class="alert-text">【Phase 2: COVER】</span><br>家具はありませんが、天井の照明が激しく揺れています！<br>どうやって頭を守りますか！？`;
                    if (playerConfig.fixedId === 'yes') return `<span class="alert-text">【Phase 2: COVER】</span><br><strong>${playerConfig.direction}</strong>の家具が激しく揺れていますが、固定されているため倒れてきません！<br>しかし、天井の照明の落下には注意が必要です。どうやって頭を守りますか！？`;
                    return `<span class="alert-text">【Phase 2: COVER】</span><br>激しい揺れの中、<strong>${playerConfig.direction}</strong>から、固定されていない家具が倒れてきました！<br>どうやって頭を守りますか！？`;
                },
                options: [
                    { icon: "📱", text: "スマホでライトを照らす", isCorrect: false, feedback: "頭が無防備なままでは落下物の直撃を受けます。" },
                    { icon: "👐", text: "両手で頭を覆う", isCorrect: false, feedback: "手だけでは防具として不十分です。重量物の落下には耐えられません。" },
                    { icon: "枕", text: "布団や枕を深く被る", isCorrect: true, feedback: "暗闇では身近にある寝具が最高の盾（ヘルメット代わり）になります。" }
                ]
            }
        ],
        hold: { 
            time: 4000, text: `<span class="alert-text">【Phase 3: HOLD ON】</span><br>本震が襲ってきました！<br>下のボタンを「長押し」して、揺れが収まるまで布団の中で耐え抜いてください！`,
            failText: "指が離れてしまいました。恐怖に耐えきれず暗闇へ逃げ出し、飛散したガラスを踏んで負傷しました。「揺れが収まるまでその場から動かない」という強い意志が必要です。",
            getClearText: () => {
                if (playerConfig.directionId === 'none') return "布団の中で頭を守り抜きました。<br><br>家具のない寝室は、地震において非常に安全な空間です。今後もその環境を維持してください。";
                if (playerConfig.fixedId === 'yes') return "布団の中で頭を守り抜きました。<br><br>素晴らしいです。あなたが家具を【固定】していたおかげで、倒壊による圧死やガラス飛散のリスクを最小限に抑えることができました。日頃の備えが命を救う最大の防御です。";
                return "布団の中で頭を守り抜きました。<br><br>今回はなんとか助かりましたが、先ほどあなたが選んだ「固定されていない背の高い家具」。現実の地震では、これが凶器となって命を奪います。このシミュレーションを機に、どうか家具の固定をお願いします。";
            }
        }
    },
    arena: {
        title: "SCENE 2：アリーナ会場", setupSteps: [], 
        phases: [
            {
                time: 3500, getText: () => `<span class="alert-text">けたたましい警報音が鳴り、照明が落ちました！</span><br>【Phase 1: DROP】<br>強い揺れが来ます！`,
                options: [
                    { icon: "🏃", text: "出口へ走る", isCorrect: false, feedback: "出口付近で将棋倒し（群集事故）が発生し、圧死する危険性が極めて高くなります。" },
                    { icon: "🚶", text: "広い通路に出る", isCorrect: false, feedback: "暗闇の中で通路に出ると、逃げ惑う他の観客に踏みつぶされる危険があります。" },
                    { icon: "🧎", text: "その場にしゃがむ", isCorrect: true, feedback: "アリーナ席で最も恐ろしいのは「群衆雪崩」です。絶対に移動せず、その場で小さくなるのが正解です。" }
                ]
            },
            {
                time: 3500, getText: () => `<span class="alert-text">【Phase 2: COVER】</span><br>暗闇の中、天井の照明器具が不気味にきしむ音が聞こえます。<br>どうやって身を守りますか！？`,
                options: [
                    { icon: "🪑", text: "座席の下に潜る", isCorrect: false, feedback: "アリーナの椅子は狭く、下に潜り込むことは物理的に困難で、かえって身動きが取れなくなります。" },
                    { icon: "📱", text: "スマホで情報を探す", isCorrect: false, feedback: "情報収集は揺れが収まってからです。今は頭を守るのが最優先です。" },
                    { icon: "👜", text: "カバンで頭を覆う", isCorrect: true, feedback: "机がない場所では、自分の持っているカバンや上着で頭を保護します。" }
                ]
            }
        ],
        hold: { 
            time: 5000, text: `<span class="alert-text">【Phase 3: HOLD ON】</span><br>本震が襲ってきました！激しい揺れと暗闇の中、パニックになった一部の観客が立ち上がり、逃げ惑う悲鳴と足音が聞こえます。<br>下のボタンを「長押し」して、揺れが完全に収まるまで、絶対に防御姿勢を崩さずに耐え抜いてください！`,
            failText: "指が離れてしまいました。恐怖から防御姿勢を解いて立ち上がってしまい、暗闇の中で転倒し、逃げ惑う他の観客に踏みつぶされました。「揺れている最中の移動」は自殺行為です。",
            getClearText: () => "激しい揺れを耐え抜き、その後のパニックにも巻き込まれずに冷静に行動できました。<br><br>アリーナのような巨大空間では、揺れの最中や直後に一斉に出口へ走る「同調圧力」が群集事故（将棋倒し）の最大のトリガーとなります。周囲のパニックに流されず、自らの判断で座席に留まり、係員の指示を待つ『落ち着いた行動』があなたの命を救いました。"
        },
        afterHold: { 
            time: 7000, getText: () => `<span class="alert-text">【Phase 4: WAIT & FOLLOW】</span><br>激しい揺れが収まりました。しかし、停電した薄暗い会場内で「早く逃げろ！」という怒号が響き、一部の観客が出口に殺到しています。<br>あなたはどう行動しますか？`,
            options: [
                { icon: "🏃", text: "人の波に乗って出口へ急ぐ", isCorrect: false, feedback: "出口付近は最も将棋倒し（群集事故）が起きやすい危険地帯です。パニックになった群衆の流れに乗るのは自殺行為です。" },
                { icon: "🔦", text: "スマホのライトで非常口を探す", isCorrect: false, feedback: "暗闇での単独行動は危険です。勝手な方向に動くことで他の観客と衝突し、パニックをさらに助長してしまいます。" },
                { icon: "🧘", text: "その場に留まり、係員の指示を待つ", isCorrect: true, feedback: "大正解です。巨大施設では、安全が確認されるまで『動かない』ことが最大の防御になります。出口に殺到せず、落ち着いて公式の誘導を待つのが鉄則です。" }
            ]
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const btnStart = document.getElementById('btn-start');
    if (btnStart) {
        btnStart.addEventListener('click', () => {
            document.getElementById('start-screen').style.display = 'none';
            document.getElementById('training-screen').style.display = 'none';
            
            const mainEl = document.querySelector('main');
            let mainContainer = document.getElementById('main-container');
            if (!mainContainer) {
                mainContainer = document.createElement('div');
                mainContainer.id = 'main-container';
                mainContainer.className = 'main-container';
                mainEl.appendChild(mainContainer);
                
                const contentBox = document.createElement('div');
                contentBox.id = 'content-box';
                contentBox.style.width = '100%';
                contentBox.style.padding = '0 20px';
                mainContainer.appendChild(contentBox);
            }
            showMenu();
        });
    }
});

function showMenu() {
    contentBox = document.getElementById('content-box');
    contentBox.innerHTML = `
        <h2 style="color: #FFBE00; margin-bottom: 2rem;">シミュレーション環境の選択</h2>
        <div style="display:flex; flex-direction:column;">
            <button style="${MENU_BTN_STYLE}" onmouseover="this.style.borderColor='#FFBE00'" onmouseout="this.style.borderColor='#555'" onclick="startScenario('sleep')"><span style="font-size:2rem;">🛏️</span><span>就寝中（自室マッピング）</span></button>
            <button style="${MENU_BTN_STYLE}" onmouseover="this.style.borderColor='#FFBE00'" onmouseout="this.style.borderColor='#555'" onclick="startScenario('arena')"><span style="font-size:2rem;">🏟️</span><span>ライブ会場（アリーナ）</span></button>
        </div>
    `;
}

function startScenario(sceneId) {
    currentSceneId = sceneId;
    currentPhase = 0;
    playerConfig = {};
    if (scenarios[sceneId].setupSteps && scenarios[sceneId].setupSteps.length > 0) showSetupStep(0);
    else startArenaRhythmGame();
}

function showSetupStep(stepIndex) {
    const setupData = scenarios[currentSceneId].setupSteps[stepIndex];
    let html = `<h2 class="scene-title" style="margin-bottom:1.5rem;">${scenarios[currentSceneId].title}</h2><p class="situation-text" style="font-size:1.1rem; line-height:1.6; margin-bottom:2rem;">${setupData.text}</p><div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 15px;">`;
    setupData.options.forEach(opt => {
        html += `<button style="${SETUP_BTN_STYLE}" onmouseover="this.style.borderColor='#FFBE00'" onmouseout="this.style.borderColor='#444'" onclick="saveSetup('${setupData.id}', '${opt.text}', '${opt.id}', '${opt.nextStep}')">
                    <span style="font-size:3rem;">${opt.icon}</span><span>${opt.text}</span>
                 </button>`;
    });
    html += `</div>`;
    document.getElementById('content-box').innerHTML = html;
}

function saveSetup(setupId, text, valueId, nextStep) {
    playerConfig[setupId] = text;
    playerConfig[setupId + "Id"] = valueId;
    if (nextStep === "fixed") showSetupStep(1);
    else if (nextStep === "done") startCountdown();
}

function startCountdown() {
    let count = 3;
    document.getElementById('main-container').className = 'main-container bg-alert';
    const interval = setInterval(() => {
        if (count > 0) { document.getElementById('content-box').innerHTML = `<h2 style="font-size: 8rem; color: #FF2800; margin:0; text-shadow: 0 0 20px rgba(255,0,0,0.5);">${count}</h2>`; count--; } 
        else { clearInterval(interval); playPhase(); }
    }, 1000);
}

function startArenaRhythmGame() {
    document.getElementById('main-container').className = 'main-container';
    document.getElementById('main-container').style.background = 'radial-gradient(circle at center, #1a0033 0%, #000 100%)';
    combo = 0;
    targetEarthquakeTime = Math.floor(Math.random() * (15000 - 5000 + 1)) + 5000;
    
    bgmAudio = new Audio('./audio/arena_bgm.mp3'); 
    bgmAudio.volume = 0.6; 
    bgmAudio.play().catch(e => console.log("BGM再生不可: ", e));
    
    document.getElementById('content-box').innerHTML = `
        <h2 class="scene-title" style="color: #FF69B4; font-size: 2rem; text-shadow: 0 0 10px #FF69B4;">💖 ARENA LIVE START! 💖</h2>
        <p style="font-size: 1.2rem; margin-bottom: 2rem; color: #fff;">音楽に合わせてペンライト（キー）を振れ！<br><span style="color:#aaa; font-size:0.9rem;">PC: [F] と [J] キー / スマホ: 画面の左右をタップ</span></p>
        
        <div style="display: flex; justify-content: space-around; width: 100%; max-width: 400px; margin: 0 auto; height: 150px; position: relative;">
            <div id="lane-left" style="width: 80px; height: 80px; border: 4px solid #56B4E9; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: bold; position: absolute; bottom: 0; left: 10%; cursor: pointer; color: #56B4E9;">F</div>
            <div id="lane-right" style="width: 80px; height: 80px; border: 4px solid #FFBE00; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: bold; position: absolute; bottom: 0; right: 10%; cursor: pointer; color: #FFBE00;">J</div>
        </div>
        <div id="combo-text" style="font-size: 3rem; font-weight: bold; color: #fff; margin-top: 2rem; opacity: 0; text-shadow: 0 0 15px rgba(255,255,255,0.5);">1 COMBO!</div>
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
    const originalColor = lane.style.background;
    lane.style.background = 'rgba(255,255,255,0.5)';
    setTimeout(() => { if (lane) lane.style.background = originalColor; }, 100);
}

function rhythmGameLoop(currentTime) {
    if (!isRhythmGameActive) return;
    if (currentTime - rhythmStartTime > targetEarthquakeTime) return triggerEarthquake();
    rhythmAnimFrame = requestAnimationFrame(rhythmGameLoop);
}

function triggerEarthquake() {
    isRhythmGameActive = false;
    window.removeEventListener('keydown', handleRhythmKey);
    cancelAnimationFrame(rhythmAnimFrame);
    if (bgmAudio) bgmAudio.pause();
    
    document.getElementById('content-box').innerHTML = '<h2 style="color:red; font-size:5rem; text-shadow: 0 0 30px red;">地震発生！！</h2>'; 
    setTimeout(() => {
        document.getElementById('main-container').style.background = '';
        document.getElementById('main-container').className = 'main-container bg-alert';
        currentPhase = 0; 
        playPhase(); 
    }, 1000);
}

function playPhase() {
    isAnswered = false;
    const phaseData = scenarios[currentSceneId].phases[currentPhase];
    timeLimit = phaseData.time;

    let shuffledOptions = [...phaseData.options].sort(() => Math.random() - 0.5);
    
    // ★修正：残り時間のテキストを追加！
    let html = `<h2 class="scene-title" style="margin-bottom:1rem;">${scenarios[currentSceneId].title}</h2>
                <div style="display:flex; justify-content:space-between; font-family:monospace; font-size:1.1rem; color:#aaa; margin-bottom:5px;">
                    <span>残り時間</span><span id="timer-text" style="color:#fff; font-weight:bold;">${(timeLimit/1000).toFixed(1)}秒</span>
                </div>
                <div class="timer-container" style="display: block; margin-bottom:2rem;">
                    <div class="timer-bar" id="timer-bar"></div>
                </div>
                <div class="situation-text" style="font-size:1.2rem; line-height:1.6; margin-bottom:2rem;">${phaseData.getText()}</div>
                <div style="display:flex; flex-direction:column; gap:10px;">`;
                
    shuffledOptions.forEach(opt => {
        html += `<button style="${ACTION_BTN_STYLE}" onmouseover="this.style.borderColor='#FFBE00'" onmouseout="this.style.borderColor='#444'" onclick="selectAnswer(${opt.isCorrect}, '${opt.feedback}')"><span style="font-size:2.5rem;">${opt.icon}</span><span>${opt.text}</span></button>`;
    });
    html += `</div>`;
    document.getElementById('content-box').innerHTML = html;
    
    questionStartTime = Date.now(); 
    startTime = performance.now();
    requestAnimationFrame(updateTimer);
}

function updateTimer(currentTime) {
    if (isAnswered) return;
    const remainingRatio = Math.max(0, 1 - ((currentTime - startTime) / timeLimit));
    document.getElementById('timer-bar').style.transform = `scaleX(${remainingRatio})`;
    
    // ★追加：数字のカウントダウン処理
    const timerTextEl = document.getElementById('timer-text');
    if (timerTextEl) {
        const sec = (timeLimit / 1000) * remainingRatio;
        timerTextEl.innerText = `${sec.toFixed(1)}秒`;
        if (sec <= 1.5) timerTextEl.style.color = '#FF2800'; // 1.5秒以下で赤く警告
    }

    if (remainingRatio > 0) timerAnimation = requestAnimationFrame(updateTimer);
    else { 
        if(typeof logUserAction === 'function') logUserAction('shakeout_phase_answer', `時間切れ (タイム: ${((Date.now() - questionStartTime) / 1000).toFixed(2)}秒)`);
        isAnswered = true; showFeedback(false, "【時間切れ】現実の地震は待ってくれません。迷っている数秒の間に、落下物の直撃を受ける可能性が極めて高いです。"); 
    }
}

function selectAnswer(isCorrect, feedbackText) {
    if (isAnswered) return;
    if(typeof logUserAction === 'function') logUserAction('shakeout_phase_answer', `【${isCorrect ? "⭕生存" : "❌致命的ミス"}】 フェーズ: ${currentPhase===0?'DROP':'COVER'} (タイム: ${((Date.now() - questionStartTime) / 1000).toFixed(2)}秒)`);

    isAnswered = true; cancelAnimationFrame(timerAnimation);
    showFeedback(isCorrect, feedbackText);
}

function showFeedback(isCorrect, feedbackText) {
    document.getElementById('content-box').innerHTML = `
        <div class="feedback-box ${isCorrect ? "feedback-correct" : "feedback-incorrect"}" style="font-size:1.1rem;">
            <h3 style="color: ${isCorrect ? '#00B400' : '#FF2800'}; margin-top:0; font-size:1.5rem;">${isCorrect ? "正しい判断です！" : "【致命的な判断ミス】"}</h3>
            <p style="line-height: 1.6; margin-bottom:0;">${feedbackText}</p>
        </div>
        <button class="btn primary" style="font-size:1.2rem; padding:15px 30px;" onclick="${isCorrect ? "nextPhase()" : "showMenu()"}">${isCorrect ? "次の状況へ" : "メニューへ戻る"}</button>
    `;
}

function nextPhase() {
    currentPhase++;
    document.getElementById('main-container').className = 'main-container bg-alert';
    if (currentPhase < scenarios[currentSceneId].phases.length) playPhase();
    else playHoldPhase();
}

let holdStartTime = 0, holdTimerAnim = null, isHolding = false;

function playHoldPhase() {
    const holdData = scenarios[currentSceneId].hold;
    timeLimit = holdData.time;
    isHolding = false; isAnswered = false;

    // ★修正：HOLD ON画面にも数字のタイマーを追加
    document.getElementById('content-box').innerHTML = `
        <h2 class="scene-title">${scenarios[currentSceneId].title}</h2>
        <div style="display:flex; justify-content:space-between; font-family:monospace; font-size:1.1rem; color:#aaa; margin-bottom:5px;">
            <span>耐える時間</span><span id="hold-timer-text" style="color:#00B400; font-weight:bold;">${(timeLimit/1000).toFixed(1)}秒</span>
        </div>
        <div class="timer-container" style="display: block; margin-bottom:2rem;">
            <div class="timer-bar" id="hold-timer-bar" style="background: #00B400; transform: scaleX(0);"></div>
        </div>
        <div class="situation-text" style="font-size:1.2rem; line-height:1.6; margin-bottom:3rem;">${holdData.text}</div>
        <div class="btn-hold" id="btn-hold" style="background: #8B0000; border: 6px solid #FF2800; color: #fff; width: 250px; height: 250px; border-radius: 50%; font-size: 1.5rem; font-weight: bold; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; margin: 0 auto; user-select: none; box-shadow: 0 0 30px rgba(255,0,0,0.5); transition: 0.1s;">
            <span style="font-size: 4rem; pointer-events: none;">✊</span><span id="hold-text" style="font-size: 2rem; pointer-events: none;">HOLD ON</span><span style="font-size: 1rem; font-weight: normal; pointer-events: none;">(押し続けろ)</span>
        </div>
    `;

    const btnHold = document.getElementById('btn-hold');
    const startHold = (e) => { 
        e.preventDefault(); if (isAnswered) return;
        isHolding = true; 
        btnHold.style.background = '#008B00'; btnHold.style.borderColor = '#00FF00'; btnHold.style.transform = 'scale(0.95)'; btnHold.style.boxShadow = '0 0 40px rgba(0,255,0,0.8)';
        document.getElementById('hold-text').innerText = "耐えろ！"; 
        holdStartTime = performance.now(); holdTimerAnim = requestAnimationFrame(updateHoldProgress);
    };
    const endHold = (e) => { 
        e.preventDefault(); if (!isHolding || isAnswered) return; 
        isHolding = false; 
        btnHold.style.background = '#8B0000'; btnHold.style.borderColor = '#FF2800'; btnHold.style.transform = 'scale(1)'; btnHold.style.boxShadow = '0 0 30px rgba(255,0,0,0.5)';
        cancelAnimationFrame(holdTimerAnim);
        isAnswered = true; showFeedback(false, scenarios[currentSceneId].hold.failText);
    };

    btnHold.addEventListener('pointerdown', startHold);
    btnHold.addEventListener('pointerup', endHold);
    btnHold.addEventListener('pointerleave', endHold);
}

function updateHoldProgress(currentTime) {
    if (!isHolding || isAnswered) return;
    const holdRatio = Math.min(1, (currentTime - holdStartTime) / timeLimit);
    document.getElementById('hold-timer-bar').style.transform = `scaleX(${holdRatio})`;
    
    // ★追加：数字のカウントダウン処理
    const holdTimerTextEl = document.getElementById('hold-timer-text');
    if(holdTimerTextEl) {
        const sec = (timeLimit / 1000) * (1 - holdRatio);
        holdTimerTextEl.innerText = `${sec.toFixed(1)}秒`;
    }

    if (holdRatio < 1) holdTimerAnim = requestAnimationFrame(updateHoldProgress);
    else {
        isAnswered = true; isHolding = false;
        if (scenarios[currentSceneId].afterHold) playAfterHoldPhase();
        else showClear(scenarios[currentSceneId].hold.getClearText());
    }
}

function playAfterHoldPhase() {
    isAnswered = false;
    const phaseData = scenarios[currentSceneId].afterHold;
    timeLimit = phaseData.time;

    let shuffledOptions = [...phaseData.options].sort(() => Math.random() - 0.5);
    
    // ★修正：最後のフェーズにも数字のタイマーを追加
    let html = `<h2 class="scene-title" style="margin-bottom:1rem;">${scenarios[currentSceneId].title}</h2>
                <div style="display:flex; justify-content:space-between; font-family:monospace; font-size:1.1rem; color:#aaa; margin-bottom:5px;">
                    <span>残り時間</span><span id="timer-text" style="color:#fff; font-weight:bold;">${(timeLimit/1000).toFixed(1)}秒</span>
                </div>
                <div class="timer-container" style="display: block; margin-bottom:2rem;">
                    <div class="timer-bar" id="timer-bar"></div>
                </div>
                <div class="situation-text" style="font-size:1.2rem; line-height:1.6; margin-bottom:2rem;">${phaseData.getText()}</div>
                <div style="display:flex; flex-direction:column; gap:10px;">`;
                
    shuffledOptions.forEach(opt => {
        html += `<button style="${ACTION_BTN_STYLE}" onmouseover="this.style.borderColor='#FFBE00'" onmouseout="this.style.borderColor='#444'" onclick="selectAfterHoldAnswer(${opt.isCorrect}, '${opt.feedback}')"><span style="font-size:2.5rem;">${opt.icon}</span><span>${opt.text}</span></button>`;
    });
    html += `</div>`;
    document.getElementById('content-box').innerHTML = html;
    
    questionStartTime = Date.now(); startTime = performance.now();
    requestAnimationFrame(updateAfterHoldTimer);
}

function updateAfterHoldTimer(currentTime) {
    if (isAnswered) return;
    const remainingRatio = Math.max(0, 1 - ((currentTime - startTime) / timeLimit));
    document.getElementById('timer-bar').style.transform = `scaleX(${remainingRatio})`;

    // ★追加：数字のカウントダウン処理
    const timerTextEl = document.getElementById('timer-text');
    if (timerTextEl) {
        const sec = (timeLimit / 1000) * remainingRatio;
        timerTextEl.innerText = `${sec.toFixed(1)}秒`;
        if (sec <= 2.0) timerTextEl.style.color = '#FF2800';
    }

    if (remainingRatio > 0) requestAnimationFrame(updateAfterHoldTimer);
    else { 
        if(typeof logUserAction === 'function') logUserAction('shakeout_afterhold_answer', `時間切れ`);
        isAnswered = true; showFeedback(false, "【時間切れ】パニックになった群衆に巻き込まれてしまいました。"); 
    }
}

function selectAfterHoldAnswer(isCorrect, feedbackText) {
    if (isAnswered) return;
    if(typeof logUserAction === 'function') logUserAction('shakeout_afterhold_answer', `【${isCorrect ? "⭕冷静" : "❌パニック"}】 事後判断`);
    isAnswered = true; showFeedback(isCorrect, feedbackText);
}

function showClear(clearText) {
    document.getElementById('content-box').innerHTML = `
        <h2 style="color: #00B400; font-size: 2.5rem; margin-bottom: 1rem;">SURVIVAL SUCCESS</h2>
        <div class="feedback-box feedback-correct" style="margin-bottom: 2rem; font-size:1.1rem;"><p style="line-height: 1.6; margin: 0;">${clearText}</p></div>
        <div style="margin-bottom: 2rem; text-align: center;">
            <div style="font-size: 4rem;">${currentSceneId === 'sleep' ? "🛏️" : "🏟️"}</div>
            <h3 style="color: #FFBE00; margin: 0; font-size: 1.5rem;">メダル獲得：${currentSceneId === 'sleep' ? "暗闇の防衛者" : "同調圧力への抵抗者"}</h3>
        </div>
        <a href="index.html" class="btn primary" style="font-size:1.2rem; padding:15px 30px;">ダッシュボードへ帰還</a>
    `;
    let earnedMedals = JSON.parse(localStorage.getItem('quake_medals')) || [];
    if (!earnedMedals.includes("shakeout_sleep")) {
        earnedMedals.push("shakeout_sleep");
        localStorage.setItem('quake_medals', JSON.stringify(earnedMedals));
    }
}