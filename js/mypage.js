document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. ユーザーIDの完全同期 ---
    // main.js で指定されているキーと完全に一致させます
    const STORAGE_KEY = 'research_user_id'; 
    let userId = localStorage.getItem(STORAGE_KEY);
    
    // 万が一IDが存在しない場合のフォールバック（通常はmain.jsで生成済）
    if (!userId) {
        userId = crypto.randomUUID ? crypto.randomUUID() : 'User-' + Math.random().toString(36).substr(2, 8).toUpperCase();
        localStorage.setItem(STORAGE_KEY, userId);
    }
    
    document.getElementById('user-id-display').innerText = userId;

    // --- 2. クリップボードへのコピー機能 ---
    const btnCopy = document.getElementById('btn-copy-id');
    btnCopy.addEventListener('click', () => {
        navigator.clipboard.writeText(userId).then(() => {
            showToast('クリップボードにコピーしました');
        }).catch(err => {
            console.error('Copy failed:', err);
            showToast('コピーに失敗しました');
        });
    });

    // --- 3. 実績（メダル）の獲得状況の反映 ---
    const earnedMedals = JSON.parse(localStorage.getItem('quake_medals')) || [];
    
    earnedMedals.forEach(medalId => {
        const medalElement = document.getElementById(`medal-${medalId}`);
        if (medalElement) {
            medalElement.classList.add('unlocked');
        }
    });

    // --- 4. 各種設定のアクション ---
    const btnTutorial = document.getElementById('btn-replay-tutorial');
    if (btnTutorial) {
        btnTutorial.addEventListener('click', () => {
            // チュートリアル完了フラグを消し、かつ「今すぐ開始」フラグを立てる
            localStorage.removeItem('quake_tutorial_done');
            localStorage.setItem('start_tutorial_now', 'true'); // ★これを目印にする
        
            // index.htmlへ移動
            window.location.href = 'index.html'; 
            }
        );
    }

    const btnReset = document.getElementById('btn-reset-data');
    btnReset.addEventListener('click', () => {
        const confirmReset = confirm("獲得した実績などの学習データがすべて消去されます。\n本当によろしいですか？\n（※ユーザーIDは維持されます）");
        
        if (confirmReset) {
            localStorage.removeItem('quake_medals');
            document.querySelectorAll('.medal-item').forEach(el => {
                el.classList.remove('unlocked');
            });
            showToast('学習データを初期化しました');
        }
    });
});

// トースト通知関数
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.innerText = message;
    toast.classList.add('show');
    setTimeout(() => { toast.classList.remove('show'); }, 2500);
}