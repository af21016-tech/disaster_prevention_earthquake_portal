/**
 * Quake Interactive Archive - Common Utilities
 * 
 * [機能一覧]
 * 1. ユーザーIDの管理 (LocalStorage保存・取得・同期)
 * 2. ID表示要素 (id="user-display", id="user-id-display") の自動DOM書き込み
 * 3. 汎用配列シャッフル関数 (Fisher-Yates)
 * 4. クイズ/ゲーム結果画面への「マイページ誘導共通カード」の安全な差し込み
 */

const STORAGE_KEY = 'research_user_id';

/**
 * ユーザーIDをLocalStorageから取得、存在しない場合は新規生成して保存する関数
 * @returns {string} ユーザーID
 */
function getOrCreateUserId() {
    let userId = localStorage.getItem(STORAGE_KEY);
    
    if (!userId) {
        userId = (typeof crypto !== 'undefined' && crypto.randomUUID) 
            ? crypto.randomUUID() 
            : 'User-' + Math.random().toString(36).substring(2, 10).toUpperCase();
        localStorage.setItem(STORAGE_KEY, userId);
    }
    
    return userId;
}

/**
 * 配列をランダムにシャッフルする関数 (Fisher-Yatesアルゴリズム)
 * @param {Array} array シャッフルしたい配列
 * @returns {Array} シャッフルされた新しい配列
 */
function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/**
 * 結果画面に「マイページ誘導カード」を安全に挿入する関数
 * @param {HTMLElement} container 挿入対象のコンテナ要素
 */
function appendMyPageLink(container) {
    if (!container) return;
    
    // 既に差し込まれている場合は多重追加を防止
    if (container.querySelector('.mypage-promo-card')) return;

    const promoCard = document.createElement('div');
    promoCard.className = 'mypage-promo-card';
    promoCard.innerHTML = `
        <h3>🎉 新しいバッジを獲得したかも？</h3>
        <p>マイページに戻って、あなたのコレクションを確認しましょう！</p>
        <button onclick="location.href='mypage.html'">
            マイページへ行く 👤
        </button>
    `;
    container.appendChild(promoCard);
}

// どのページでも読み込まれた瞬間にID表示エリアがあれば自動で初期化・書き込みを行う
document.addEventListener('DOMContentLoaded', () => {
    const userId = getOrCreateUserId();
    
    // index.html等のヘッダー内表示エリア用
    const displayEl = document.getElementById('user-display');
    if (displayEl) {
        displayEl.innerHTML = `ID: <span class="user-id-badge">${userId.substring(0, 8)}...</span>`;
        displayEl.title = userId;
    }
    
    // mypage.html等のメイン表示エリア用
    const myPageDisplayEl = document.getElementById('user-id-display');
    if (myPageDisplayEl) {
        myPageDisplayEl.innerText = userId;
    }
});
