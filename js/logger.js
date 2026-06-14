// ==========================================
// Quake Interactive Archive - 共通ログシステム
// ==========================================

/**
 * ユーザーIDを取得または生成するヘルパー関数
 */
function getUserIdForLog() {
    let userId = localStorage.getItem('research_user_id');
    if (!userId) {
        userId = (typeof crypto !== 'undefined' && crypto.randomUUID)
            ? crypto.randomUUID()
            : 'User-' + Math.random().toString(36).substring(2, 10).toUpperCase();
        localStorage.setItem('research_user_id', userId);
    }
    return userId;
}

/**
 * ログをローカルの localStorage (system_logs) に蓄積する共通関数
 */
function addSystemLog(actionType, detailInfo = "", scoreVal = "") {
    const userId = getUserIdForLog();
    let pagePath = window.location.pathname.split('/').pop();
    if (!pagePath || pagePath === "") pagePath = "index.html";

    const logEntry = {
        timestamp: new Date().toISOString(),
        userId: userId,
        page: pagePath,
        action: actionType,
        detail: detailInfo,
        score: scoreVal
    };

    let logs = [];
    try {
        const storedLogs = localStorage.getItem('system_logs');
        if (storedLogs) {
            logs = JSON.parse(storedLogs);
        }
    } catch (e) {
        console.error("Failed to parse system_logs:", e);
    }

    logs.push(logEntry);
    localStorage.setItem('system_logs', JSON.stringify(logs));
}

/**
 * 既存のアクションログ関数（下位互換性およびリアルタイム送信維持のため）
 */
function logUserAction(actionType, detailInfo = "", scoreVal = "") {
    // ローカルにログを蓄積（一括送信されるまでLocalStorageに保持）
    addSystemLog(actionType, detailInfo, scoreVal);

    // 【一括送信化のためコメントアウト】
    // 同時アクセス過多によるGASの制限エラーを防ぐため、リアルタイム送信は廃止し一括送信に統合します。
    /*
    const userId = getUserIdForLog();
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

    const GAS_URL = "https://script.google.com/macros/s/AKfycbzyCTHJf_sRkgJJle0p08ZpuvSt7DZQHa6FpkLCf6xoZLpsCy9MEteGogyH1yzUce-c/exec";

    fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(logData)
    }).catch(err => console.error("Log send error:", err));
    */
}

/**
 * 蓄積されたすべてのログをGASへ送信する関数
 */
function sendAllLogsToGAS() {
    const GAS_URL = "https://script.google.com/macros/s/AKfycbzyCTHJf_sRkgJJle0p08ZpuvSt7DZQHa6FpkLCf6xoZLpsCy9MEteGogyH1yzUce-c/exec";
    const userId = getUserIdForLog();
    const logs = localStorage.getItem('system_logs') || "[]";

    let parsedLogs = [];
    try {
        parsedLogs = JSON.parse(logs);
    } catch (e) {
        console.error("Failed to parse logs for GAS transmission:", e);
    }

    const payload = {
        userId: userId,
        logs: parsedLogs
    };

    return fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
    });
}

// 滞在時間計測用の開始時刻
const pageLoadTime = Date.now();

// ==========================================
// タイマーの一時停止および累積時間の管理ロジック
// ==========================================

// ユーザー操作の記録
let lastRecordedTime = 0;
function recordInteraction() {
    const now = Date.now();
    if (now - lastRecordedTime < 200) return; // スロットリング (200ms)
    lastRecordedTime = now;

    const lastInteraction = parseInt(localStorage.getItem('last_interaction_time') || now, 10);
    const wasInactive = (now - lastInteraction) >= 30000; // 30秒以上操作がなければ非アクティブと判定

    localStorage.setItem('last_interaction_time', now.toString());
    if (wasInactive) {
        // 放置状態から復帰した時は、前回の更新時刻を現時刻にリセットして差分が過大になるのを防ぐ
        localStorage.setItem('last_timer_update_time', now.toString());
    }
}

// ユーザーのアクティビティを監視するイベントリスナー
document.addEventListener('click', recordInteraction, { passive: true });
document.addEventListener('mousemove', recordInteraction, { passive: true });
document.addEventListener('keydown', recordInteraction, { passive: true });
document.addEventListener('touchstart', recordInteraction, { passive: true });
document.addEventListener('scroll', recordInteraction, { passive: true });

// タブ表示状態の変更時に時間を補正する
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        const now = Date.now();
        localStorage.setItem('last_timer_update_time', now.toString());
        localStorage.setItem('last_interaction_time', now.toString());
    }
});

// タイマー加算処理 (1秒ごとにバックグラウンドで実行)
function tickTimer() {
    if (document.hidden) return; // バックグラウンド時は処理しない

    const now = Date.now();
    const lastInteraction = parseInt(localStorage.getItem('last_interaction_time') || now, 10);
    const isInactive = (now - lastInteraction) >= 30000; // 30秒以上操作がなければ非アクティブと判定

    if (!isInactive) {
        const lastUpdate = parseInt(localStorage.getItem('last_timer_update_time') || now, 10);
        const diff = now - lastUpdate;

        // PCスリープ復帰時などの異常値を防ぐため上限を2秒に制限
        if (diff > 0 && diff < 2000) {
            let elapsed = parseInt(localStorage.getItem('accumulated_elapsed_time') || '0', 10);
            elapsed += diff;
            localStorage.setItem('accumulated_elapsed_time', elapsed.toString());
        }
    }
    localStorage.setItem('last_timer_update_time', now.toString());
}

// どのページでも読み込まれた瞬間にページビューを記録 & セッション開始時刻設定 & タイマー初期化
document.addEventListener('DOMContentLoaded', () => {
    // セッション開始時刻が未記録なら記録
    if (!localStorage.getItem('session_start_time')) {
        localStorage.setItem('session_start_time', Date.now().toString());
    }

    // 累積経過時間の初期化
    if (localStorage.getItem('accumulated_elapsed_time') === null) {
        const sessionStartTime = localStorage.getItem('session_start_time');
        if (sessionStartTime) {
            const initialElapsed = Date.now() - parseInt(sessionStartTime, 10);
            localStorage.setItem('accumulated_elapsed_time', initialElapsed.toString());
        } else {
            localStorage.setItem('accumulated_elapsed_time', '0');
        }
    }

    // 現在の更新時刻と最終操作時刻を現時刻に初期化
    const now = Date.now();
    localStorage.setItem('last_timer_update_time', now.toString());
    localStorage.setItem('last_interaction_time', now.toString());

    // 1秒ごとの監視タイマーを起動
    setInterval(tickTimer, 1000);

    // ページタイトルが確定するのを待ってから送信
    setTimeout(() => {
        logUserAction('page_view', document.title);
    }, 500);
});

// ページ離脱時に滞在時間をログに記録
window.addEventListener('pagehide', () => {
    const stayTimeMs = Date.now() - pageLoadTime;
    const stayTimeSeconds = Math.round(stayTimeMs / 1000);
    // pagehideの中では同期的なlocalStorageへの保存を使用（非同期のfetchは途切れるため）
    addSystemLog('stay_time', `滞在時間: ${stayTimeSeconds}秒`, stayTimeSeconds);
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