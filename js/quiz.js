// --- グローバル変数 ---
let quizData = []; 
let currentStageIndex = 0;
let currentStageQuestions = []; 
let currentQuestionIndex = 0;
let correctCount = 0; 
let userReviewData = []; 
let questionStartTime = 0; 

const QUESTIONS_PER_PLAY = 10; 
const TIME_LIMIT = 10.0;
let timeLeft = TIME_LIMIT;
let timerInterval = null;

document.addEventListener('DOMContentLoaded', () => {
    // ★修正：3つのボタンそれぞれのイベントリスナー
    const btnStage0 = document.getElementById('btn-start-stage0');
    if (btnStage0) btnStage0.addEventListener('click', () => {
        document.getElementById('start-screen').style.display = 'none';
        document.getElementById('quiz-screen').style.display = 'block';
        initQuiz(0); // 初級
    });

    const btnStage1 = document.getElementById('btn-start-stage1');
    if (btnStage1) btnStage1.addEventListener('click', () => {
        document.getElementById('start-screen').style.display = 'none';
        document.getElementById('quiz-screen').style.display = 'block';
        initQuiz(1); // 中級
    });

    const btnStage2 = document.getElementById('btn-start-stage2');
    if (btnStage2) btnStage2.addEventListener('click', () => {
        document.getElementById('start-screen').style.display = 'none';
        document.getElementById('quiz-screen').style.display = 'block';
        initQuiz(2); // 上級
    });
    
    const btnNext = document.getElementById('btn-next');
    if (btnNext) btnNext.addEventListener('click', nextQuestion);
    
    const btnFinish = document.getElementById('btn-finish');
    if (btnFinish) btnFinish.addEventListener('click', showResultScreen);
    
    const btnRetry = document.getElementById('btn-retry');
    if (btnRetry) btnRetry.addEventListener('click', () => {
        // もう一度挑戦する場合は、スタート画面（レベル選択）に戻す
        document.getElementById('result-screen').style.display = 'none';
        document.getElementById('start-screen').style.display = 'block';
    });
});

// 引数で選ばれたステージ番号を受け取る
function initQuiz(stageIndex) {
    fetch('./assets/quiz_data.json')
        .then(res => res.json())
        .then(data => {
            quizData = data;
            startStage(stageIndex);
        })
        .catch(err => {
            console.error(err);
            const qText = document.getElementById('q-text');
            if (qText) qText.innerText = "JSONデータの読み込みに失敗しました。";
        });
}

function startStage(stageIndex) {
    currentStageIndex = stageIndex;
    
    let pool = [];
    if (Array.isArray(quizData)) {
        if (quizData.length > 0 && quizData[currentStageIndex].questions) {
            pool = quizData[currentStageIndex].questions;
        } else {
            pool = quizData;
        }
    } else if (quizData.questions) {
        pool = quizData.questions;
    }
    
    if (!pool || pool.length === 0) return;
    
    let arr = [...pool];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    
    currentStageQuestions = arr.slice(0, QUESTIONS_PER_PLAY);
    currentQuestionIndex = 0;
    correctCount = 0;
    userReviewData = []; 
    loadQuestion();
}

function loadQuestion() {
    const qData = currentStageQuestions[currentQuestionIndex];
    if(!qData) return;
    
    const stageInfo = quizData[currentStageIndex];
    const stageNameDisplay = stageInfo ? `【${stageInfo.stageName}】 ` : '';

    const qCounter = document.getElementById('q-counter');
    if(qCounter) qCounter.innerText = `${stageNameDisplay}Q. ${currentQuestionIndex + 1} / ${currentStageQuestions.length}`;
    
    const qText = document.getElementById('q-text');
    if(qText) qText.innerText = qData.q || qData.question || "問題文がありません";
    
    const feedback = document.getElementById('feedback');
    if(feedback) feedback.style.display = 'none';
    
    const choicesDiv = document.getElementById('choices');
    if(choicesDiv) choicesDiv.style.display = 'flex';
    
    const progress = document.getElementById('progress');
    if(progress) progress.style.width = `${((currentQuestionIndex + 1) / currentStageQuestions.length) * 100}%`;

    let choicesArr = [];
    if (Array.isArray(qData.choices)) choicesArr = qData.choices;
    else if (Array.isArray(qData.options)) choicesArr = qData.options;
    
    if (choicesArr.length === 0) {
        choicesArr = ["〇", "✖"]; 
    }

    const choicesContainer = document.getElementById('choices');
    choicesContainer.innerHTML = ''; 
    choicesContainer.style.display = 'flex';

    choicesArr.forEach((text, index) => {
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        
        let textColor = "#eaeaea"; 
        let hoverColor = "#ff7b00"; 
        
        if (text === "〇") {
            textColor = "#FF2800"; 
            hoverColor = "#FF2800";
        } else if (text === "✖") {
            textColor = "#56B4E9"; 
            hoverColor = "#56B4E9";
        }
        
        btn.style.cssText = `text-align: left; padding: 1.2rem 2rem; font-size: 1.3rem; font-weight: bold; border-radius: 8px; background: #111; border: 2px solid #444; color: ${textColor}; cursor: pointer; transition: 0.2s; width: 100%; margin-bottom: 12px;`;
        
        btn.onmouseover = () => { btn.style.background = '#222'; btn.style.borderColor = hoverColor; };
        btn.onmouseout = () => { btn.style.background = '#111'; btn.style.borderColor = '#444'; };

        btn.innerText = text;
        btn.onclick = () => checkAnswer(index, text, btn);
        choicesContainer.appendChild(btn);
    });
    
    const scoreCounter = document.getElementById('score-counter');
    if (scoreCounter) {
        scoreCounter.style.color = '#888';
        scoreCounter.style.fontWeight = 'normal';
    }

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
            processAnswer(null, "時間切れ", null); 
        }
        updateTimerUI();
    }, 100);
}

function updateTimerUI() {
    const scoreCounter = document.getElementById('score-counter');
    if (scoreCounter) {
        scoreCounter.innerText = `残り: ${Math.max(0, timeLeft).toFixed(1)}秒`;
        if (timeLeft <= 3.0) {
            scoreCounter.style.color = '#D55E00'; 
            scoreCounter.style.fontWeight = 'bold';
        }
    }
}

function checkAnswer(userIndex, choiceText, btnElement) {
    clearInterval(timerInterval);
    processAnswer(userIndex, choiceText, btnElement);
}

function processAnswer(userIndex, choiceText, btnElement) {
    const qData = currentStageQuestions[currentQuestionIndex];
    let isCorrect = false;
    
    const correctAns = qData.a ?? qData.ans ?? qData.answer;
    
    if (typeof correctAns === 'boolean') {
        const userBool = (choiceText === "〇");
        isCorrect = (correctAns === userBool);
    } else {
        if (correctAns === userIndex || correctAns === (userIndex + 1) || correctAns === choiceText) {
            isCorrect = true;
        }
    }
    
    if (isCorrect) correctCount++;
    
    if (btnElement) {
        if (choiceText === "〇") {
            btnElement.style.background = 'rgba(255, 40, 0, 0.1)'; 
            btnElement.style.borderColor = '#FF2800';
        } else if (choiceText === "✖") {
            btnElement.style.background = 'rgba(86, 180, 233, 0.1)'; 
            btnElement.style.borderColor = '#56B4E9';
        } else {
            btnElement.style.background = 'rgba(255, 123, 0, 0.1)';
            btnElement.style.borderColor = '#ff7b00';
            btnElement.style.color = '#ff7b00';
        }
    }

    const timeTaken = (Date.now() - questionStartTime) / 1000;
    let resultLabel = isCorrect ? "⭕正解" : "❌不正解";
    if (typeof logUserAction === 'function') {
        logUserAction('quiz_answer', `【${resultLabel}】 Q: ${qData.q.substring(0, 15)}... / 選択: ${choiceText} (タイム: ${timeTaken.toFixed(2)}秒)`);
    }

    userReviewData.push({ q: qData.q, userAnswer: choiceText, isCorrect: isCorrect, exp: qData.exp });

    const choicesContainer = document.getElementById('choices');
    if (choicesContainer) choicesContainer.style.display = 'none';
    
    const fb = document.getElementById('feedback');
    if (fb) {
        fb.style.display = 'block';
        fb.className = isCorrect ? "feedback-box correct" : "feedback-box incorrect";
    }
    
    const rm = document.getElementById('fb-title');
    const expText = document.getElementById('fb-desc');
    
    if (userIndex === null) {
        if(fb) fb.className = "feedback-box incorrect";
        if(rm) { rm.innerText = "⏳ 逃げ遅れ（時間切れ）"; rm.style.color = "#D55E00"; }
        if(expText) expText.innerHTML = `<strong style="color:#D55E00;">【判断が遅れると命を落とします】</strong><br>${qData.exp || "時間内に判断する訓練が必要です。"}`;
    } else if (isCorrect) {
        if(rm) { rm.innerText = "⭕ 正解！"; rm.style.color = "#00E676"; }
        if(expText) expText.innerHTML = qData.exp || "正しい判断です。";
    } else {
        if(rm) { rm.innerText = "❌ 不正解..."; rm.style.color = "#D55E00"; }
        if(expText) expText.innerHTML = qData.exp || "間違った判断は命を危険に晒します。";
    }
    
    const btnNext = document.getElementById('btn-next');
    const btnFinish = document.getElementById('btn-finish');
    if (currentQuestionIndex < currentStageQuestions.length - 1) {
        if(btnNext) btnNext.style.display = 'inline-block';
        if(btnFinish) btnFinish.style.display = 'none';
    } else {
        if(btnNext) btnNext.style.display = 'none';
        if(btnFinish) btnFinish.style.display = 'inline-block';
    }
}

function nextQuestion() {
    currentQuestionIndex++;
    loadQuestion();
}

function showResultScreen() {
    document.getElementById('quiz-screen').style.display = 'none';
    document.getElementById('result-screen').style.display = 'block';

    const stage = quizData[currentStageIndex];
    document.getElementById('final-score').innerText = `${correctCount} / ${currentStageQuestions.length}`;

    // ★GASへの正答率ログ送信
    const accuracy = Math.round((correctCount / currentStageQuestions.length) * 100);
    if (typeof logUserAction === 'function') {
        const stageName = stage ? stage.stageName : "サバイバルクイズ";
        logUserAction('quiz_result', `【最終結果:${stageName}】正答率: ${accuracy}% (${correctCount}問正解 / 全${currentStageQuestions.length}問)`);
    }

    const medalNotification = document.getElementById('medal-container');
    const resultMsg = document.getElementById('result-message');
    const resultMedalIcon = document.getElementById('result-medal-icon');

    if (correctCount === currentStageQuestions.length) {
        if(medalNotification) medalNotification.style.display = 'block';
        if(resultMsg) resultMsg.innerText = `見事な判断力です。メダルを獲得しました。`;
        
        let earnedMedals = JSON.parse(localStorage.getItem('quake_medals')) || [];
        const medalId = stage ? stage.medalId : "survival_basic";
        const medalEmoji = stage ? stage.medal : "🥇";
        
        if(resultMedalIcon) resultMedalIcon.innerText = medalEmoji;

        if (!earnedMedals.includes(medalId)) {
            earnedMedals.push(medalId);
            localStorage.setItem('quake_medals', JSON.stringify(earnedMedals));
        }
    } else {
        if(medalNotification) medalNotification.style.display = 'none';
        if(resultMsg) resultMsg.innerText = "全問正解でのみメダルが授与されます。間違えた問題を復習して再挑戦しましょう。";
    }
}