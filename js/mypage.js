document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. ユーザーIDの取得 ---
    const userId = getOrCreateUserId();

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
            localStorage.setItem('is_replaying_tutorial', 'true'); // リプレイフラグをセット
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

    // --- 5. マイページチュートリアル機能 ---
    const overlay = document.getElementById('tut-overlay');
    const tooltip = document.getElementById('tut-tooltip');
    const btnClose = document.getElementById('tut-close');
    const btnNext = document.getElementById('tut-next');
    const btnPrev = document.getElementById('tut-prev');

    if (overlay && tooltip) {
        const targets = Array.from(document.querySelectorAll('.tut-target'))
                             .sort((a, b) => parseInt(a.dataset.step) - parseInt(b.dataset.step));

        let currentStep = 0;

        function startMyPageTutorial() {
            currentStep = 0;
            
            // リプレイ中のみ「✕」ボタンを表示し、初回オンボーディング時は非表示にする
            const isReplay = localStorage.getItem('is_replaying_tutorial') === 'true';
            if (btnClose) {
                btnClose.style.display = isReplay ? 'block' : 'none';
            }

            overlay.style.display = 'block';
            tooltip.style.display = 'block';
            setTimeout(() => {
                overlay.style.opacity = '1';
                tooltip.style.opacity = '1';
            }, 10);
            showStep(currentStep);
        }

        function closeMyPageTutorial() {
            const isReplay = localStorage.getItem('is_replaying_tutorial') === 'true';

            overlay.style.opacity = '0';
            tooltip.style.opacity = '0';
            clearHighlight();
            setTimeout(() => {
                overlay.style.display = 'none';
                tooltip.style.display = 'none';
            }, 300);
            
            localStorage.removeItem('start_mypage_tutorial');
            localStorage.removeItem('is_replaying_tutorial'); // リプレイフラグを消去

            // 初回チュートリアルの場合はホーム（index.html）に強制遷移
            if (!isReplay) {
                window.location.href = 'index.html';
            }
        }

        if (localStorage.getItem('start_mypage_tutorial') === 'true') {
            startMyPageTutorial();
        }

        if (btnClose) btnClose.addEventListener('click', closeMyPageTutorial);
        // overlay.addEventListener('click', closeMyPageTutorial); // 背景クリックでの終了を無効化

        if (btnNext) {
            btnNext.addEventListener('click', () => {
                if (currentStep < targets.length - 1) {
                    currentStep++;
                    showStep(currentStep);
                } else {
                    closeMyPageTutorial();
                }
            });
        }

        if (btnPrev) {
            btnPrev.addEventListener('click', () => {
                if (currentStep > 0) {
                    currentStep--;
                    showStep(currentStep);
                }
            });
        }

        function showStep(index) {
            clearHighlight();
            const target = targets[index];
            if (!target) return;

            target.classList.add('tut-highlight');

            const rect = target.getBoundingClientRect();
            window.scrollTo({
                top: window.scrollY + rect.top - 100,
                behavior: 'smooth'
            });

            document.querySelector('.tut-step-counter').innerText = `STEP ${index + 1} / ${targets.length}`;
            document.getElementById('tut-title').innerText = target.dataset.title;
            document.getElementById('tut-desc').innerText = target.dataset.desc;

            btnPrev.style.visibility = index === 0 ? 'hidden' : 'visible';
            btnNext.innerText = index === targets.length - 1 ? 'FINISH ✔' : 'NEXT ▶';

            setTimeout(() => {
                const updatedRect = target.getBoundingClientRect();
                let topPos = updatedRect.bottom + window.scrollY + 15;
                let leftPos = updatedRect.left + window.scrollX;
                
                if (topPos + tooltip.offsetHeight > window.scrollY + window.innerHeight) {
                    topPos = updatedRect.top + window.scrollY - tooltip.offsetHeight - 15;
                }
                
                const safeTopMargin = 100;
                if (topPos < window.scrollY + safeTopMargin) {
                    topPos = window.scrollY + safeTopMargin;
                }
                
                if (leftPos < 10) {
                    leftPos = 10;
                }
                
                if (leftPos + tooltip.offsetWidth > window.innerWidth - 10) {
                    leftPos = window.innerWidth - tooltip.offsetWidth - 10;
                }

                tooltip.style.top = `${topPos}px`;
                tooltip.style.left = `${leftPos}px`;
            }, 350);
        }

        function showStepMyPage(index) {
            // Not needed as showStep works
        }

        function clearHighlight() {
            targets.forEach(el => el.classList.remove('tut-highlight'));
        }
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