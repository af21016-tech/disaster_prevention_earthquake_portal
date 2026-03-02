// --- グローバル変数 ---
let quizData = []; 
let currentStageIndex = 0;
let currentStageQuestions = []; // 選ばれた10問の配列
let currentQuestionIndex = 0;
let correctCount = 0; // 正解数
let userReviewData = []; // 振り返り用のデータ保存配列

const QUESTIONS_PER_PLAY = 10; // 1プレイあたりの出題数
const TIME_LIMIT = 10.0;
let timeLeft = TIME_LIMIT;
let timerInterval = null;

// --- DOM要素の取得 ---
const playScreen = document.getElementById('play-screen');
const resultScreen = document.getElementById('result-screen');
const stageText = document.getElementById('stage-text');
const questionText = document.getElementById('question-text');
const answerButtons = document.getElementById('answer-buttons');
const explanationArea = document.getElementById('explanation-area');
const resultMark = document.getElementById('result-mark');
const explanationText = document.getElementById('explanation-text');
const timerBar = document.getElementById('timer-bar');
const timerText = document.getElementById('timer-text');

// リザルト画面用
const scoreText = document.getElementById('score-text');
const medalNotification = document.getElementById('medal-notification');
const reviewList = document.getElementById('review-list');
const btnNextStage = document.getElementById('btn-next-stage');

// --- 初期化 ---
document.addEventListener('DOMContentLoaded', () => {
    fetch('./assets/quiz_data.json')
        .then(res => {
            if (!res.ok) throw new Error('Network error');
            return res.json();
        })
        .then(data => {
            quizData = data;
            startStage(0); // JSON読み込み完了後、最初のステージを開始
        })
        .catch(err => {
            console.error(err);
            questionText.innerText = "データの読み込みに失敗しました。";
        });
});

// --- 配列のシャッフル関数（Fisher-Yates） ---
function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// --- ステージの開始（ランダム10問の抽出） ---
function startStage(stageIndex) {
    currentStageIndex = stageIndex;
    const stage = quizData[currentStageIndex];
    
    // 30問のプールからシャッフルして10問を抽出
    currentStageQuestions = shuffleArray(stage.questions).slice(0, QUESTIONS_PER_PLAY);
    
    currentQuestionIndex = 0;
    correctCount = 0;
    userReviewData = []; // 履歴をリセット

    playScreen.style.display = 'block';
    resultScreen.style.display = 'none';

    loadQuestion();
}

// --- 問題の読み込みと表示 ---
function loadQuestion() {
    const stage = quizData[currentStageIndex];
    const qData = currentStageQuestions[currentQuestionIndex];
    
    stageText.innerText = `Stage ${stage.stage}: ${stage.stageName} (第 ${currentQuestionIndex + 1} / ${QUESTIONS_PER_PLAY} 問)`;
    questionText.innerText = qData.q;
    
    answerButtons.style.display = 'flex';
    explanationArea.style.display = 'none';

    startTimer();
}

// --- タイマー処理 ---
function startTimer() {
    clearInterval(timerInterval);
    timeLeft = TIME_LIMIT;
    updateTimerUI();

    timerInterval = setInterval(() => {
        timeLeft -= 0.1;
        if (timeLeft <= 0) {
            timeLeft = 0;
            clearInterval(timerInterval);
            processAnswer(null); // 時間切れは「null」として処理
        }
        updateTimerUI();
    }, 100);
}

function updateTimerUI() {
    timerText.innerText = `残り: ${Math.max(0, timeLeft).toFixed(1)}秒`;
    const percentage = (timeLeft / TIME_LIMIT) * 100;
    timerBar.style.width = `${percentage}%`;

    if (timeLeft > 5) timerBar.style.backgroundColor = '#009E73';
    else if (timeLeft > 2) timerBar.style.backgroundColor = '#F0E442';
    else timerBar.style.backgroundColor = '#D55E00';
}

// --- 解答のチェック（ボタンから呼ばれる関数） ---
function checkAnswer(userAnswer) {
    clearInterval(timerInterval);
    processAnswer(userAnswer);
}

// --- 正誤判定と履歴の保存 ---
function processAnswer(userAnswer) {
    const qData = currentStageQuestions[currentQuestionIndex];
    
    // 正解判定（時間切れ(null)の場合は強制的にfalse）
    const isCorrect = (userAnswer !== null && userAnswer === qData.a);
    if (isCorrect) correctCount++;

    // 振り返り用のデータを保存
    userReviewData.push({
        q: qData.q,
        correctAnswer: qData.a,
        userAnswer: userAnswer,
        isCorrect: isCorrect,
        exp: qData.exp
    });

    // 画面の更新（即時フィードバック）
    answerButtons.style.display = 'none';
    explanationArea.style.display = 'block';

    if (userAnswer === null) {
        resultMark.innerText = "⏳ 逃げ遅れ（時間切れ）";
        resultMark.className = "result-mark result-incorrect";
        explanationText.innerHTML = `<strong style="color:#D55E00;">【判断が遅れると命を落とします】</strong><br>${qData.exp}`;
    } else if (isCorrect) {
        const timeBonus = (timeLeft > 7) ? " (素早い判断です！)" : "";
        resultMark.innerText = `⭕ 正解！${timeBonus}`;
        resultMark.className = "result-mark result-correct";
        explanationText.innerHTML = qData.exp;
    } else {
        resultMark.innerText = "❌ 不正解...";
        resultMark.className = "result-mark result-incorrect";
        explanationText.innerHTML = qData.exp;
    }
}

// --- 次の問題、またはリザルト画面へ ---
function nextQuestion() {
    currentQuestionIndex++;
    if (currentQuestionIndex < QUESTIONS_PER_PLAY) {
        loadQuestion();
    } else {
        showResultScreen();
    }
}

// --- ★結果発表と振り返り画面の生成 ---
function showResultScreen() {
    playScreen.style.display = 'none';
    resultScreen.style.display = 'block';

    const stage = quizData[currentStageIndex];
    const isPerfect = (correctCount === QUESTIONS_PER_PLAY);

    // スコアの表示
    scoreText.innerText = `${correctCount} / ${QUESTIONS_PER_PLAY}`;

    // メダルの判定
    if (isPerfect) {
        medalNotification.innerHTML = `
            <div class="medal-icon">${stage.medal}</div>
            <h3 style="color: #E69F00; margin-bottom: 0;">パーフェクト達成！</h3>
            <p style="color: var(--text-sub);">見事な判断力です。${stage.medalId.toUpperCase()}メダルを獲得しました。</p>
        `;
        
        // LocalStorageにメダルを保存
        let earnedMedals = JSON.parse(localStorage.getItem('quake_medals')) || [];
        if (!earnedMedals.includes(stage.medalId)) {
            earnedMedals.push(stage.medalId);
            localStorage.setItem('quake_medals', JSON.stringify(earnedMedals));
        }

        // 最終ステージでなければ「次のステージへ」ボタンを表示
        if (currentStageIndex < quizData.length - 1) {
            btnNextStage.style.display = 'inline-block';
        } else {
            btnNextStage.style.display = 'none';
        }
    } else {
        medalNotification.innerHTML = `
            <h3 style="color: var(--text-main); margin-bottom: 0;">あと少し！</h3>
            <p style="color: var(--text-sub);">全問正解でのみメダルが授与されます。間違えた問題を復習して再挑戦しましょう。</p>
        `;
        btnNextStage.style.display = 'none'; // パーフェクトでないと次は出ない
    }

    // 振り返り（レビュー）リストのHTML生成
    let html = '';
    userReviewData.forEach((item, index) => {
        // あなたの回答のテキスト生成
        let userAnsText = '時間切れ';
        if (item.userAnswer === true) userAnsText = '〇';
        if (item.userAnswer === false) userAnsText = '✖';

        const statusClass = item.isCorrect ? 'correct' : 'incorrect';
        const statusText = item.isCorrect ? '正解' : '不正解';

        html += `
            <div class="review-item">
                <div class="review-q">Q${index + 1}. ${item.q}</div>
                <div class="review-ans ${statusClass}">あなたの回答: ${userAnsText} (${statusText})</div>
                <div class="review-exp">${item.exp}</div>
            </div>
        `;
    });
    reviewList.innerHTML = html;
}