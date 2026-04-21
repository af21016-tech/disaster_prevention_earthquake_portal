// --- グローバル変数 ---
let fakeNewsData = []; // 初期値を空の配列に（JSONから読み込む）
let currentQuestions = []; 
let currentQuestionIndex = 0;
let correctCount = 0;
let userReviewData = [];
let questionStartTime = 0; // ★追加：タイム計測用変数

const QUESTIONS_PER_PLAY = 10; 
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
const scoreText = document.getElementById('score-text');
const medalNotification = document.getElementById('medal-notification');
const reviewList = document.getElementById('review-list');

// --- 初期化（JSONデータのフェッチ） ---
document.addEventListener('DOMContentLoaded', () => {
    // 読み込み中のUI表示
    questionText.innerText = "データを読み込み中...";
    answerButtons.style.display = 'none';

    // JSONファイルの読み込み
    fetch('./assets/fake_news_data.json')
        .then(response => {
            if (!response.ok) throw new Error('Network error');
            return response.json();
        })
        .then(data => {
            fakeNewsData = data;
            startQuiz(); // 読み込み完了後にクイズを開始
        })
        .catch(error => {
            console.error('Data load error:', error);
            questionText.innerText = "データの読み込みに失敗しました。ページをリロードしてください。";
        });
});

// --- 配列のシャッフル関数 ---
function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// --- クイズの開始 ---
function startQuiz() {
    currentQuestions = shuffleArray(fakeNewsData).slice(0, QUESTIONS_PER_PLAY);
    currentQuestionIndex = 0;
    correctCount = 0;
    userReviewData = []; 

    playScreen.style.display = 'block';
    resultScreen.style.display = 'none';

    loadQuestion();
}

function loadQuestion() {
    const qData = currentQuestions[currentQuestionIndex];
    stageText.innerText = `第 ${currentQuestionIndex + 1} 問 / 全 ${QUESTIONS_PER_PLAY} 問`;
    questionText.innerText = qData.q;
    
    answerButtons.style.display = 'flex';
    explanationArea.style.display = 'none';

    questionStartTime = Date.now(); // ★追加：問題が表示された時間を記録

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
            processAnswer(null); // 時間切れ
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

function checkAnswer(userAnswer) {
    clearInterval(timerInterval);
    processAnswer(userAnswer);
}

function processAnswer(userAnswer) {
    const qData = currentQuestions[currentQuestionIndex];
    
    // 正解判定
    const isCorrect = (userAnswer !== null && userAnswer === qData.a);
    if (isCorrect) correctCount++;

    // ★追加：正誤結果、問題文、かかった時間をログ送信
    const timeTaken = (Date.now() - questionStartTime) / 1000;
    let answerLabel = userAnswer === null ? "時間切れ" : (userAnswer ? "拡散する" : "拡散しない");
    let resultLabel = isCorrect ? "⭕正解" : "❌不正解";
    
    logUserAction('fake_news_answer', `【${resultLabel}】 Q: ${qData.q.substring(0, 15)}... / 選択: ${answerLabel} (タイム: ${timeTaken.toFixed(2)}秒)`);

    userReviewData.push({
        q: qData.q,
        correctAnswer: qData.a,
        userAnswer: userAnswer,
        isCorrect: isCorrect,
        exp: qData.exp
    });

    answerButtons.style.display = 'none';
    explanationArea.style.display = 'block';

    if (userAnswer === null) {
        resultMark.innerText = "⏳ 思考停止（時間切れ）";
        resultMark.className = "result-mark result-incorrect";
        explanationText.innerHTML = `<strong style="color:#D55E00;">【迷いが命取りになります】</strong><br>${qData.exp}`;
    } else if (isCorrect) {
        resultMark.innerText = `⭕ 見破りました！`;
        resultMark.className = "result-mark result-correct";
        explanationText.innerHTML = qData.exp;
    } else {
        resultMark.innerText = "❌ デマに騙されています...";
        resultMark.className = "result-mark result-incorrect";
        explanationText.innerHTML = qData.exp;
    }
}

function nextQuestion() {
    currentQuestionIndex++;
    if (currentQuestionIndex < QUESTIONS_PER_PLAY) {
        loadQuestion();
    } else {
        showResultScreen();
    }
}

// --- 結果発表とメダル付与 ---
function showResultScreen() {
    playScreen.style.display = 'none';
    resultScreen.style.display = 'block';

    const isPerfect = (correctCount === QUESTIONS_PER_PLAY);
    scoreText.innerText = `${correctCount} / ${QUESTIONS_PER_PLAY}`;

    if (isPerfect) {
        const medalId = "fakemediabuster";
        medalNotification.innerHTML = `
            <div class="medal-icon">🎖️</div>
            <h3 style="color: #b366ff; margin-bottom: 0;">フェイクバスター達成！</h3>
            <p style="color: #ccc;">見事な情報リテラシーです。インフォデミックから身を守る力を証明しました。</p>
        `;
        
        let earnedMedals = JSON.parse(localStorage.getItem('quake_medals')) || [];
        if (!earnedMedals.includes(medalId)) {
            earnedMedals.push(medalId);
            localStorage.setItem('quake_medals', JSON.stringify(earnedMedals));
        }
    } else {
        medalNotification.innerHTML = `
            <h3 style="color: #fff; margin-bottom: 0;">あと少し！</h3>
            <p style="color: #aaa;">全問正解でのみ「フェイクバスター」メダルが授与されます。</p>
        `;
    }

    let html = '';
    userReviewData.forEach((item, index) => {
        let userAnsText = '時間切れ';
        if (item.userAnswer === true) userAnsText = '〇 (正しい)';
        if (item.userAnswer === false) userAnsText = '✖ (間違っている)';
        const statusClass = item.isCorrect ? 'correct' : 'incorrect';
        const statusText = item.isCorrect ? '正解' : '騙された';

        html += `
            <div class="review-item">
                <div class="review-q">Q${index + 1}. ${item.q}</div>
                <div class="review-ans ${statusClass}">あなたの判断: ${userAnsText} (${statusText})</div>
                <div class="review-exp">${item.exp}</div>
            </div>
        `;
    });
    reviewList.innerHTML = html;
}