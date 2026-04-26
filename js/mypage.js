document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. ユーザーIDの完全同期 ---
    const STORAGE_KEY = 'research_user_id'; 
    let userId = localStorage.getItem(STORAGE_KEY);
    
    if (!userId) {
        userId = crypto.randomUUID ? crypto.randomUUID() : 'User-' + Math.random().toString(36).substr(2, 8).toUpperCase();
        localStorage.setItem(STORAGE_KEY, userId);
    }
    
    const displayEl = document.getElementById('user-id-display');
    if(displayEl) displayEl.innerText = userId;

    // --- 2. クリップボードへのコピー機能 ---
    const btnCopy = document.getElementById('btn-copy-id');
    if(btnCopy) {
        btnCopy.addEventListener('click', () => {
            navigator.clipboard.writeText(userId).then(() => {
                showToast('クリップボードにコピーしました');
            }).catch(err => {
                console.error('Copy failed:', err);
                showToast('コピーに失敗しました');
            });
        });
    }

    // --- 3. バッジ（メダル）の自動描画機能 ---
    // 全7種類のバッジ定義リスト
    const ALL_BADGES = [
        { id: 'bronze', icon: '🥉', name: 'サバイバル初級' },
        { id: 'silver', icon: '🥈', name: 'サバイバル中級' },
        { id: 'gold', icon: '🥇', name: 'サバイバル上級' },
        { id: 'fakemediabuster', icon: '📱', name: 'フェイクバスター' },
        { id: 'shakeout_sleep', icon: '🛏️', name: '暗闇の防衛者' },
        { id: 'shakeout_arena', icon: '🏟️', name: '同調圧力への抵抗' },
        { id: 'memory_inheritor', icon: '🕊️', name: '記憶の継承者' }
    ];

    function renderMyPageBadges() {
        const earnedMedals = JSON.parse(localStorage.getItem('quake_medals')) || [];
        const badgeContainer = document.getElementById('my-badge-list');
        
        if (!badgeContainer) return;
        
        badgeContainer.innerHTML = ''; 
        badgeContainer.style.display = 'flex';
        badgeContainer.style.flexWrap = 'wrap';
        badgeContainer.style.gap = '15px';
        
        // スマホでも見やすいように左寄せ（または中央寄せ）
        badgeContainer.style.justifyContent = 'flex-start'; 

        ALL_BADGES.forEach(badge => {
            const isEarned = earnedMedals.includes(badge.id);
            
            const iconDisplay = isEarned ? badge.icon : '🔒';
            const nameDisplay = isEarned ? badge.name : '未獲得';
            const opacityStyle = isEarned ? '1' : '0.4';
            const filterStyle = isEarned ? 'none' : 'grayscale(100%)';
            const borderStyle = isEarned ? '2px solid #FFBE00' : '2px dashed #444';
            const shadowStyle = isEarned ? '0 0 15px rgba(255, 190, 0, 0.2)' : 'none';
            const textStyle = isEarned ? '#fff' : '#666';

            const badgeHTML = `
                <div style="background: #1a1a1a; border: ${borderStyle}; border-radius: 10px; padding: 15px 10px; width: 120px; text-align: center; opacity: ${opacityStyle}; filter: ${filterStyle}; box-shadow: ${shadowStyle}; transition: 0.3s;">
                    <div style="font-size: 2.5rem; margin-bottom: 8px;">${iconDisplay}</div>
                    <div style="font-size: 0.75rem; font-weight: bold; color: ${textStyle}; line-height: 1.4;">${nameDisplay}</div>
                </div>
            `;
            badgeContainer.innerHTML += badgeHTML;
        });
    }

    // すぐに描画を実行
    renderMyPageBadges();

    // --- 4. 各種設定のアクション ---
    const btnTutorial = document.getElementById('btn-replay-tutorial');
    if (btnTutorial) {
        btnTutorial.addEventListener('click', () => {
            localStorage.removeItem('quake_tutorial_done');
            localStorage.setItem('start_tutorial_now', 'true'); 
            window.location.href = 'index.html'; 
        });
    }

    const btnReset = document.getElementById('btn-reset-data');
    if (btnReset) {
        btnReset.addEventListener('click', () => {
            const confirmReset = confirm("獲得した実績などの学習データがすべて消去されます。\n本当によろしいですか？\n（※ユーザーIDは維持されます）");
            
            if (confirmReset) {
                localStorage.removeItem('quake_medals');
                renderMyPageBadges(); // 消去後にバッジ画面を再描画してグレーに戻す
                showToast('学習データを初期化しました');
            }
        });
    }
});

// トースト通知関数
function showToast(message) {
    let toast = document.getElementById('toast');
    if(!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.style.cssText = "position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: #00E676; color: #000; padding: 10px 20px; border-radius: 4px; font-weight: bold; font-size: 0.9rem; z-index: 10000; opacity: 0; pointer-events: none; transition: opacity 0.3s;";
        document.body.appendChild(toast);
    }
    
    toast.innerText = message;
    toast.style.opacity = '1';
    
    setTimeout(() => { 
        toast.style.opacity = '0'; 
    }, 2500);
}