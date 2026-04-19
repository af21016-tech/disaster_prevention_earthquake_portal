// ==========================================
// Quake Interactive Archive - 共通ログシステム
// ==========================================

function logUserAction(actionType, detailInfo = "", scoreVal = "") {
    const userId = localStorage.getItem('research_user_id');
    if (!userId) return;

    let pagePath = window.location.pathname.split('/').pop();
    if (!pagePath || pagePath === "") pagePath = "index.html";

    const logData = {
        timestamp: new Date().toISOString(),
        userId: userId,
        page: pagePath,
        action: actionType,
        detail: detailInfo,
        score: scoreVal
    };

    // ★あなたのGASのURLに書き換えてください
    const GAS_URL = "https://script.google.com/macros/s/AKfycbwzGc1KJhEruVkcyxPFGkaQQIaXNlE5ird3Gl7GW5p_NnAVa2-gx90iNlCmc2lM_SJNUw/exec";

    fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(logData)
    }).catch(err => console.error("Log send error:", err));
}

// どのページでも読み込まれた瞬間にページビューを記録
document.addEventListener('DOMContentLoaded', () => {
    // ページタイトルが確定するのを待ってから送信
    setTimeout(() => {
        logUserAction('page_view', document.title);
    }, 500);
});

// ==========================================
// ★追加：クリックイベントの自動トラッキング
// ==========================================
// 画面内のどこかがクリックされたときに発動
document.addEventListener('click', (e) => {
    // クリックされた場所（またはその親要素）に data-log 属性があるかを探す
    const target = e.target.closest('[data-log]');
    
    // もし data-log 属性がついていれば、その中身をログとして送信する
    if (target) {
        const detailMessage = target.getAttribute('data-log');
        logUserAction('click', detailMessage);
    }
});