let fakeQuestions = [];
let fIndex = 0;
let fCorrect = 0;
let fStartTime = 0;
let fAnswered = false;

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btn-start').addEventListener('click', () => {
        document.getElementById('start-screen').style.display = 'none';
        document.getElementById('quiz-screen').style.display = 'block';
        startFakeNews();
    });
    
    document.getElementById('btn-share').addEventListener('click', () => checkFakeAnswer(true));
    document.getElementById('btn-ignore').addEventListener('click', () => checkFakeAnswer(false));
    document.getElementById('btn-next').addEventListener('click', nextFakeNews);
    document.getElementById('btn-finish').addEventListener('click', showFakeNewsResult);
    
    document.getElementById('btn-retry').addEventListener('click', () => {
        document.getElementById('result-screen').style.display = 'none';
        document.getElementById('start-screen').style.display = 'block';
    });
});

function startFakeNews() {
    const defaultData = [
        { name: "一般人A", id: "@user_a", q: "動物園からライオンが逃げ出したらしい！気を付けて！", a: false, exp: "災害時の典型的なデマです。真偽不明な情報は絶対に拡散してはいけません。" },
        { name: "市役所公式", id: "@city_official", q: "【避難情報】〇〇川が氾濫危険水位に達しました。速やかに避難してください。", a: true, exp: "公式機関からの情報は信頼性が高いです。速やかに拡散し、周囲に知らせましょう。" },
        { name: "匿名", id: "@unknown99", q: "〇〇病院で物資が不足しています！今すぐ毛布を送ってください！", a: false, exp: "善意の拡散が、現場の混乱を招く「善意のデマ」です。公式の要請があるまで個別の支援は控えましょう。" }
    ];

    fetch('./assets/fake_news_data.json')
        .then(res => res.json())
        .then(data => {
            fakeQuestions = data.sort(() => Math.random() - 0.5).slice(0, 5);
            if(fakeQuestions.length === 0) fakeQuestions = defaultData;
            resetFakeLoad();
        })
        .catch(() => {
            fakeQuestions = defaultData.sort(() => Math.random() - 0.5).slice(0, 5);
            resetFakeLoad();
        });
}

function resetFakeLoad() {
    fIndex = 0;
    fCorrect = 0;
    loadFakeNews();
}

function loadFakeNews() {
    fAnswered = false;
    document.getElementById('feedback').style.display = 'none';
    document.getElementById('action-btns').style.display = 'flex';
    
    const qData = fakeQuestions[fIndex];
    document.getElementById('q-counter').innerText = `Q. ${fIndex + 1} / ${fakeQuestions.length}`;
    document.getElementById('p-name').innerText = qData.name || "匿名ユーザー";
    document.getElementById('p-id').innerText = qData.id || "@user";
    document.getElementById('p-text').innerText = qData.q;
    
    const progress = document.getElementById('progress');
    if (progress) progress.style.width = `${((fIndex) / fakeQuestions.length) * 100}%`;
    
    fStartTime = Date.now();
}

function checkFakeAnswer(userShare) {
    if (fAnswered) return;
    fAnswered = true;
    
    const qData = fakeQuestions[fIndex];
    const isCorrect = (userShare === qData.a);
    if (isCorrect) fCorrect++;
    
    // ★ログ送信
    const timeTaken = (Date.now() - fStartTime) / 1000;
    const ansText = userShare ? "拡散する" : "拡散しない";
    const resultLabel = isCorrect ? "⭕正解" : "❌不正解";
    if (typeof logUserAction === 'function') {
        logUserAction('fake_news_answer', `【${resultLabel}】 Q: ${qData.q.substring(0,15)}... / 選択: ${ansText} (タイム: ${timeTaken.toFixed(2)}秒)`);
    }

    document.getElementById('action-btns').style.display = 'none';
    
    const fb = document.getElementById('feedback');
    fb.style.display = 'block';
    fb.className = isCorrect ? 'feedback-area correct' : 'feedback-area incorrect';
    document.getElementById('fb-title').innerText = isCorrect ? '⭕ 正しい判断です！' : '❌ デマに加担しました...';
    document.getElementById('fb-desc').innerText = qData.exp;
    
    const btnNext = document.getElementById('btn-next');
    const btnFinish = document.getElementById('btn-finish');
    
    if (fIndex < fakeQuestions.length - 1) {
        btnNext.style.display = 'inline-block';
        btnFinish.style.display = 'none';
    } else {
        btnNext.style.display = 'none';
        btnFinish.style.display = 'inline-block';
    }
}

function nextFakeNews() {
    fIndex++;
    loadFakeNews();
}

function showFakeNewsResult() {
    document.getElementById('quiz-screen').style.display = 'none';
    document.getElementById('result-screen').style.display = 'block';
    document.getElementById('final-score').innerText = `${fCorrect} / ${fakeQuestions.length}`;
    
    // ★ここから追加：正答率を計算してGASに送信！
    const accuracy = Math.round((fCorrect / fakeQuestions.length) * 100);
    if (typeof logUserAction === 'function') {
        logUserAction('fake_news_result', `【最終結果】正答率: ${accuracy}% (${fCorrect}問正解 / 全${fakeQuestions.length}問)`);
    }
    // ★ここまで追加
    
    const resultMsg = document.getElementById('result-message');
    if (fCorrect === fakeQuestions.length) {
        resultMsg.innerText = "素晴らしい！あなたは情報を見極め、インフォデミックを防ぐことができました。";
        let earnedMedals = JSON.parse(localStorage.getItem('quake_medals')) || [];
        if (!earnedMedals.includes("fakemediabuster")) {
            earnedMedals.push("fakemediabuster");
            localStorage.setItem('quake_medals', JSON.stringify(earnedMedals));
        }
    } else {
        resultMsg.innerText = "間違った情報の拡散は、人命に関わる混乱を招きます。もう一度訓練しましょう。";
    }
}