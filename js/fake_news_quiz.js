let fakeNewsData = []; 
let currentQuestions = []; 
let currentQuestionIndex = 0;
let correctCount = 0;
let userReviewData = [];
let questionStartTime = 0; 

const QUESTIONS_PER_PLAY = 10; 
const TIME_LIMIT = 10.0;
let timeLeft = TIME_LIMIT;
let timerInterval = null;

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

document.addEventListener('DOMContentLoaded', () => {
    if (questionText) questionText.innerText = "データを読み込み中...";
    if (answerButtons) answerButtons.style.display = 'none';

    fetch('./assets/fake_news_data.json')
        .then(response => {
            if (!response.ok) throw new Error('Network error');
            return response.json();
        })
        .then(data => {
            fakeNewsData = data;
            startQuiz(); 
        })
        .catch(error => {
            console.error('Data load error:', error);
            if (questionText) questionText.innerText = "データの読み込みに失敗しました。ページをリロードしてください。";
        });
        
    // 各ボタンのホバー時の色変化（CUD対応）
    const btnShare = document.getElementById('btn-share');
    if (btnShare) {
        btnShare.addEventListener('click', () => checkAnswer(true));
        btnShare.onmouseover = () => { btnShare.style.background = 'rgba(255, 40, 0, 0.1)'; };
        btnShare.onmouseout = () => { btnShare.style.background = '#111'; };
    }

    const btnIgnore = document.getElementById('btn-ignore');
    if (btnIgnore) {
        btnIgnore.addEventListener('click', () => checkAnswer(false));
        btnIgnore.onmouseover = () => { btnIgnore.style.background = 'rgba(86, 180, 233, 0.1)'; };
        btnIgnore.onmouseout = () => { btnIgnore.style.background = '#111'; };
    }
});



function startQuiz() {
    currentQuestions = shuffleArray(fakeNewsData).slice(0, QUESTIONS_PER_PLAY);
    currentQuestionIndex = 0;
    correctCount = 0;
    userReviewData = []; 

    const quizScreen = document.getElementById('quiz-screen');
    const startScreen = document.getElementById('start-screen');
    if (startScreen) startScreen.style.display = 'none';
    if (quizScreen) quizScreen.style.display = 'block';
    
    if(resultScreen) resultScreen.style.display = 'none';
    loadQuestion();
}

function loadQuestion() {
    const qData = currentQuestions[currentQuestionIndex];
    const qCounter = document.getElementById('q-counter');
    if(qCounter) qCounter.innerText = `Q. ${currentQuestionIndex + 1} / ${currentQuestions.length}`;
    
    const pName = document.getElementById('p-name');
    const pId = document.getElementById('p-id');
    const pText = document.getElementById('p-text');
    
    if(pName) pName.innerText = qData.name || "匿名ユーザー";
    if(pId) pId.innerText = qData.id || "@user";
    if(pText) pText.innerText = qData.q;
    
    const actionBtns = document.getElementById('action-btns');
    if(actionBtns) actionBtns.style.display = 'flex';
    
    const feedback = document.getElementById('feedback');
    if(feedback) feedback.style.display = 'none';

    const progress = document.getElementById('progress');
    if(progress) progress.style.width = `${((currentQuestionIndex + 1) / currentQuestions.length) * 100}%`;

    questionStartTime = Date.now(); 
    startTimer();
}

function startTimer() {
    clearInterval(timerInterval);
    timeLeft = TIME_LIMIT;
    updateTimerUI();

    timerInterval = setInterval(() => {
        timeLeft -= 0.1;
        if (timeLeft <= 0) {
            timeLeft = 0;
            clearInterval(timerInterval);
            processAnswer(null); 
        }
        updateTimerUI();
    }, 100);
}

function updateTimerUI() {
    const timerDisplay = document.getElementById('timer-display');
    if (timerDisplay) {
        timerDisplay.innerText = `${Math.max(0, timeLeft).toFixed(1)}秒`;
        if (timeLeft > 5) {
            timerDisplay.style.color = '#b366ff'; 
            timerDisplay.style.textShadow = '0 0 20px rgba(179,102,255,0.6)';
        } else if (timeLeft > 2.5) {
            timerDisplay.style.color = '#F0E442'; 
            timerDisplay.style.textShadow = '0 0 20px rgba(240,228,66,0.6)';
        } else {
            timerDisplay.style.color = '#FF2800'; 
            timerDisplay.style.textShadow = '0 0 25px rgba(255,40,0,0.8)';
        }
    }
}

function checkAnswer(userAnswer) {
    clearInterval(timerInterval);
    processAnswer(userAnswer);
}

function processAnswer(userAnswer) {
    const qData = currentQuestions[currentQuestionIndex];
    const isCorrect = (userAnswer !== null && userAnswer === qData.a);
    if (isCorrect) correctCount++;

    // ★修正：ログの文字をマル・バツ形式に
    const timeTaken = (Date.now() - questionStartTime) / 1000;
    let answerLabel = userAnswer === null ? "時間切れ" : (userAnswer ? "〇 (正しい)" : "✖ (デマ・誤り)");
    let resultLabel = isCorrect ? "⭕正解" : "❌不正解";
    
    if (typeof logUserAction === 'function') {
        logUserAction('fake_news_answer', `【${resultLabel}】 Q: ${qData.q.substring(0, 15)}... / 選択: ${answerLabel} (タイム: ${timeTaken.toFixed(2)}秒)`);
    }

    userReviewData.push({
        q: qData.q,
        correctAnswer: qData.a,
        userAnswer: userAnswer,
        isCorrect: isCorrect,
        exp: qData.exp
    });

    const actionBtns = document.getElementById('action-btns');
    if(actionBtns) actionBtns.style.display = 'none';
    
    const fb = document.getElementById('feedback');
    if(fb) fb.style.display = 'block';
    
    const fbTitle = document.getElementById('fb-title');
    const fbDesc = document.getElementById('fb-desc');

    if (userAnswer === null) {
        if(fb) fb.className = "feedback-area incorrect";
        if(fbTitle) fbTitle.innerText = "⏳ 思考停止（時間切れ）";
        if(fbDesc) fbDesc.innerHTML = `<strong style="color:#D55E00;">【迷いが命取りになります】</strong><br>${qData.exp}`;
    } else if (isCorrect) {
        if(fb) fb.className = "feedback-area correct";
        if(fbTitle) fbTitle.innerText = `⭕ 見破りました！`;
        if(fbDesc) fbDesc.innerHTML = qData.exp;
    } else {
        if(fb) fb.className = "feedback-area incorrect";
        if(fbTitle) fbTitle.innerText = "❌ 誤情報に騙されています...";
        if(fbDesc) fbDesc.innerHTML = qData.exp;
    }
    
    const btnNext = document.getElementById('btn-next');
    const btnFinish = document.getElementById('btn-finish');
    
    if (currentQuestionIndex < currentQuestions.length - 1) {
        if(btnNext) btnNext.style.display = 'inline-block';
        if(btnFinish) btnFinish.style.display = 'none';
        if(btnNext) btnNext.onclick = nextQuestion;
    } else {
        if(btnNext) btnNext.style.display = 'none';
        if(btnFinish) btnFinish.style.display = 'inline-block';
        if(btnFinish) btnFinish.onclick = showResultScreen;
    }
}

function nextQuestion() {
    currentQuestionIndex++;
    loadQuestion();
}

function showResultScreen() {
    const quizScreen = document.getElementById('quiz-screen');
    const resultScreen = document.getElementById('result-screen');
    if(quizScreen) quizScreen.style.display = 'none';
    if(resultScreen) resultScreen.style.display = 'block';

    const isPerfect = (correctCount === currentQuestions.length);
    const finalScore = document.getElementById('final-score');
    if(finalScore) finalScore.innerText = `${correctCount} / ${currentQuestions.length}`;

    // ★GASへの正答率ログ送信
    const accuracy = Math.round((correctCount / currentQuestions.length) * 100);
    if (typeof logUserAction === 'function') {
        logUserAction('fake_news_result', `【最終結果】正答率: ${accuracy}% (${correctCount}問正解 / 全${currentQuestions.length}問)`);
    }

    const resultMsg = document.getElementById('result-message');

    if (isPerfect) {
        const medalId = "fakemediabuster";
        if(resultMsg) resultMsg.innerHTML = `<span style="font-size:3rem; margin-bottom:10px; display:inline-block;">📱</span><br>見事な情報リテラシーです。<br>「フェイクバスター」メダルを獲得しました。`;
        
        let earnedMedals = JSON.parse(localStorage.getItem('quake_medals')) || [];
        if (!earnedMedals.includes(medalId)) {
            earnedMedals.push(medalId);
            localStorage.setItem('quake_medals', JSON.stringify(earnedMedals));
        }
    } else {
        if(resultMsg) resultMsg.innerHTML = `全問正解でのみメダルが授与されます。<br>間違った情報の拡散は混乱を招きます。もう一度訓練しましょう。`;
    }

    // 再挑戦ボタン
    const btnRetry = document.getElementById('btn-retry');
    if (btnRetry) {
        btnRetry.onclick = () => {
            if(resultScreen) resultScreen.style.display = 'none';
            if(quizScreen) quizScreen.style.display = 'block';
            startQuiz();
        };
    }

    // クイズ結果画面のHTMLに、マイページへのデカデカとしたボタンを挿入する
    const resultContainer = document.getElementById('result-screen');
    appendMyPageLink(resultContainer);
}