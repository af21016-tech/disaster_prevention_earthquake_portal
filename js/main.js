/**
 * Quake Interactive Archive - Main Application Logic
 * * [機能一覧]
 * 1. ユーザーIDの自動生成とLocalStorage保存（研究データ紐付け用）
 * 2. Leafletを用いた過去24時間の地震データ（USGS）のマッピング
 * 3. 震源の深さとマグニチュードに応じたCUD（カラーユニバーサルデザイン）対応の可視化
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Leafletマップの初期化
    initializeRecentQuakeMap('leaflet-map');      // index.html用（ダッシュボードの小マップ）
    initializeRecentQuakeMap('leaflet-map-full'); // live-map.html用（全画面マップ）
    
    // 2. 3Dアーカイブマップの初期化
    initializeArchive3DMap('map-3d-container'); // index.html用
    initializeArchive3DMap('map-3d-full');      // archive-3d.html用
});

/**
 * 震源の深さ(km)に応じてCUD推奨カラーを返す関数
 */
function getDepthColor(depth) {
    if (depth <= 33) return '#D55E00';  // 朱色 (浅い)
    if (depth <= 70) return '#E69F00';  // 黄橙
    if (depth <= 150) return '#56B4E9'; // 空色
    return '#0072B2';                   // 濃い青 (深い)
}

/**
 * Leafletマップの初期化とUSGSデータの描画を行う関数
 */
function initializeRecentQuakeMap(containerId) {
    const mapContainer = document.getElementById(containerId);
    if (!mapContainer) return; 

    const isFullScreen = containerId === 'leaflet-map-full';
    const worldBounds = L.latLngBounds(L.latLng(-90, -180), L.latLng(90, 180));

    const map = L.map(containerId, { 
        zoomControl: false,          
        maxBounds: worldBounds,      
        maxBoundsViscosity: 1.0,     
        minZoom: 2                   
    }).setView([37.5, 137.5], isFullScreen ? 5 : 4.5); 

    L.control.zoom({ position: 'topright' }).addTo(map);

    // 全画面（フルスクリーン）表示ボタン
    const fullscreenControl = L.control({ position: 'topright' });
    fullscreenControl.onAdd = function () {
        const btn = L.DomUtil.create('button', 'leaflet-bar leaflet-control');
        btn.innerHTML = '⛶'; 
        btn.title = "全画面表示の切り替え";
        btn.style.width = '34px';
        btn.style.height = '34px';
        btn.style.fontSize = '18px';
        btn.style.cursor = 'pointer';
        btn.style.backgroundColor = 'white';
        btn.style.color = '#333';
        btn.style.border = 'none';
        btn.style.display = 'flex';
        btn.style.alignItems = 'center';
        btn.style.justifyContent = 'center';

        btn.onclick = function (e) {
            e.preventDefault();
            const mapEl = document.getElementById(containerId);
            if (!document.fullscreenElement) {
                if (mapEl.requestFullscreen) mapEl.requestFullscreen();
                else if (mapEl.webkitRequestFullscreen) mapEl.webkitRequestFullscreen(); 
            } else {
                if (document.exitFullscreen) document.exitFullscreen();
                else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
            }
        };
        return btn;
    };
    fullscreenControl.addTo(map);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        // ★修正：「 | 出典：USGS (アメリカ地質調査所)」を追加（リンク付き）
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | 出典：<a href="https://earthquake.usgs.gov/" target="_blank" rel="noopener noreferrer">USGS (アメリカ地質調査所)</a>',
        subdomains: 'abcd',
        maxZoom: 10,
        bounds: worldBounds,         
        noWrap: true                 
    }).addTo(map);

    const usgsUrl = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson';

    fetch(usgsUrl)
        .then(response => response.json())
        .then(data => {
            L.geoJSON(data, {
                pointToLayer: function (feature, latlng) {
                    const mag = feature.properties.mag;
                    const depth = feature.geometry.coordinates[2]; 
                    return L.circleMarker(latlng, {
                        radius: Math.max(mag * 2.5, 3),
                        fillColor: getDepthColor(depth),
                        color: "#ffffff",
                        weight: 1.5,
                        opacity: 1,
                        fillOpacity: 0.8
                    });
                },
                onEachFeature: function (feature, layer) {
                    if (feature.properties && feature.properties.place) {
                        const time = new Date(feature.properties.time).toLocaleString('ja-JP');
                        const placeEscaped = feature.properties.place.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
                        layer.bindPopup(`
                            <strong style="font-family: var(--font-sans); font-size: 1.1rem; color: #333;">M ${feature.properties.mag.toFixed(1)}</strong><br>
                            <span style="font-size:0.8rem; color: #666;">深さ: ${feature.geometry.coordinates[2].toFixed(1)} km</span><br>
                            <span style="font-size:0.8rem; color: #666;">${placeEscaped}</span><br>
                            <span style="font-size:0.75rem; color: #666;">${time}</span>
                        `);
                    }
                }
            }).addTo(map);

            // ★ 修正点：isFullScreen（全画面のみ）の条件を外し、常に凡例を表示するように変更
            const legend = L.control({ position: 'bottomright' });
            legend.onAdd = function () {
                const div = L.DomUtil.create('div', 'info legend');
                div.innerHTML = `
                    <div style="margin-bottom: 12px; background: rgba(20,20,20,0.9); color: #fff; padding: 10px; border-radius: 6px; border: 1px solid #444;">
                        <h4 style="margin: 0 0 8px 0; font-size: 0.9rem; border-bottom: 1px solid #555; padding-bottom: 4px;">震源の深さ</h4>
                        <div style="display:flex; align-items:center; gap:8px; font-size:0.8rem; margin-bottom:4px;"><span style="width:12px; height:12px; border-radius:50%; background:#D55E00;"></span> 0 - 33 km (浅い)</div>
                        <div style="display:flex; align-items:center; gap:8px; font-size:0.8rem; margin-bottom:4px;"><span style="width:12px; height:12px; border-radius:50%; background:#E69F00;"></span> 33 - 70 km</div>
                        <div style="display:flex; align-items:center; gap:8px; font-size:0.8rem; margin-bottom:4px;"><span style="width:12px; height:12px; border-radius:50%; background:#56B4E9;"></span> 70 - 150 km</div>
                        <div style="display:flex; align-items:center; gap:8px; font-size:0.8rem;"><span style="width:12px; height:12px; border-radius:50%; background:#0072B2;"></span> 150 km以上 (深い)</div>
                    </div>
                `;
                return div;
            };
            legend.addTo(map);

            // ※もし以前あった「リスト表示機能」を live-map.html で使用する場合は
            // この下に if (isFullScreen) { ... リスト描画処理 ... } を追加してください。
        })
        .catch(err => console.error('USGS Data fetch error:', err));
}

/**
 * Three.jsを用いた1995年以降の3D震源分布マップの初期化
 */
function initializeArchive3DMap(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const placeholder = container.querySelector('.map-placeholder');
    const slicerUI = document.getElementById('time-slicer-ui'); 

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#050505'); 

    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 1, 1000);
    camera.position.set(0, 80, 140); 

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    
    const existingCanvas = container.querySelector('canvas');
    if (existingCanvas) existingCanvas.remove();
    container.appendChild(renderer.domElement);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;

    const gridHelper = new THREE.GridHelper(150, 30, 0x333333, 0x111111);
    scene.add(gridHelper);

    let rawEarthquakeData = [];
    let particlesMesh = null;
    const centerLon = 138.0;
    const centerLat = 38.0;

    Promise.all([
        fetch('./assets/japan_eq_archive.geojson').then(res => res.json()),
        fetch('https://raw.githubusercontent.com/dataofjapan/land/master/japan.geojson').then(res => res.json())
    ])
    .then(([eqData, coastlineData]) => {
        if (placeholder) placeholder.style.display = 'none';

        rawEarthquakeData = eqData.features.sort((a, b) => a.properties.time - b.properties.time);

        const lineVertices = [];
        coastlineData.features.forEach(feature => {
            if (!feature.geometry) return;
            const type = feature.geometry.type;
            const coords = feature.geometry.coordinates;

            const processRing = (ring) => {
                for (let i = 0; i < ring.length - 1; i++) {
                    const lon1 = ring[i][0]; const lat1 = ring[i][1];
                    const lon2 = ring[i+1][0]; const lat2 = ring[i+1][1];
                    if (lon1 < 120 || lon1 > 155 || lat1 < 20 || lat1 > 50) continue;
                    const x1 = (lon1 - centerLon) * 6; const z1 = -(lat1 - centerLat) * 7.5;
                    const x2 = (lon2 - centerLon) * 6; const z2 = -(lat2 - centerLat) * 7.5;
                    lineVertices.push(x1, 0, z1, x2, 0, z2);
                }
            };

            if (type === 'Polygon') coords.forEach(ring => processRing(ring));
            else if (type === 'MultiPolygon') coords.forEach(polygon => polygon.forEach(ring => processRing(ring)));
        });

        if (lineVertices.length > 0) {
            const lineGeometry = new THREE.BufferGeometry();
            lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(lineVertices, 3));
            const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.15 });
            scene.add(new THREE.LineSegments(lineGeometry, lineMaterial));
        }

        function updateParticles(maxTimestamp) {
            if (particlesMesh) scene.remove(particlesMesh); 

            const positions = [];
            const colors = [];

            const filteredData = rawEarthquakeData.filter(f => f.properties.time <= maxTimestamp);

            filteredData.forEach(f => {
                const depth = f.geometry.coordinates[2]; 
                positions.push(
                    (f.geometry.coordinates[0] - centerLon) * 6, 
                    depth * -0.2, 
                    -(f.geometry.coordinates[1] - centerLat) * 7.5
                );
                const color = new THREE.Color(getDepthColor(depth));
                colors.push(color.r, color.g, color.b);
            });

            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

            const material = new THREE.PointsMaterial({
                size: 0.8, vertexColors: true, transparent: true, opacity: 0.8, sizeAttenuation: true
            });
            particlesMesh = new THREE.Points(geometry, material);
            scene.add(particlesMesh);
        }

        updateParticles(Date.now());

        if (slicerUI) {
            slicerUI.style.display = 'block'; 
            
            const slider = document.getElementById('time-slider');
            const labelCurrent = document.getElementById('label-current');
            const labelStart = document.getElementById('label-start');
            
            const btnPlay = document.getElementById('btn-play');
            const btnPause = document.getElementById('btn-pause');
            const btnShowAll = document.getElementById('btn-show-all');

            const minTime = rawEarthquakeData[0].properties.time;
            const maxTime = rawEarthquakeData[rawEarthquakeData.length - 1].properties.time;

            slider.min = minTime;
            slider.max = maxTime;
            slider.value = maxTime;
            labelStart.innerText = new Date(minTime).getFullYear() + "年";

            function updateSliderUI(timestamp) {
                const date = new Date(timestamp);
                labelCurrent.innerText = `${date.getFullYear()}年${date.getMonth() + 1}月`;
                updateParticles(timestamp);
            }

            slider.addEventListener('input', (e) => {
                pausePlayback(); 
                controls.autoRotate = false;
                updateSliderUI(parseInt(e.target.value, 10));
            });

            let playInterval = null;
            const timeStep = 1000 * 60 * 60 * 24 * 20; 

            function startPlayback() {
                if (parseInt(slider.value, 10) >= maxTime) {
                    slider.value = minTime;
                }
                
                btnPlay.style.display = 'none';
                btnPause.style.display = 'inline-flex';
                controls.autoRotate = false;

                playInterval = setInterval(() => {
                    let nextTime = parseInt(slider.value, 10) + timeStep;
                    
                    if (nextTime >= maxTime) {
                        nextTime = maxTime;
                        pausePlayback(); 
                    }
                    
                    slider.value = nextTime;
                    updateSliderUI(nextTime);
                }, 50); 
            }

            function pausePlayback() {
                if (playInterval) {
                    clearInterval(playInterval);
                    playInterval = null;
                }
                btnPlay.style.display = 'inline-flex';
                btnPause.style.display = 'none';
            }

            btnPlay.addEventListener('click', startPlayback);
            btnPause.addEventListener('click', pausePlayback);
            
            btnShowAll.addEventListener('click', () => {
                pausePlayback();
                slider.value = maxTime;
                updateSliderUI(maxTime);
                labelCurrent.innerText = '全期間';
            });
        }

        controls.addEventListener('start', () => { controls.autoRotate = false; });
    })
    .catch(err => console.error('Data load error:', err));

    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
        if (!container) return;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });
}

// ==========================================
// SFJ Tutorial Spotlight Logic & Onboarding (完全修正版)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const btnTutorial = document.getElementById('btn-tutorial'); 
    const overlay = document.getElementById('tut-overlay');
    const tooltip = document.getElementById('tut-tooltip');
    const btnClose = document.getElementById('tut-close');
    const btnNext = document.getElementById('tut-next');
    const btnPrev = document.getElementById('tut-prev');
    
    if (!overlay || !tooltip) return;

    const targets = Array.from(document.querySelectorAll('.tut-target'))
                         .sort((a, b) => parseInt(a.dataset.step) - parseInt(b.dataset.step));

    let currentStep = 0;

    // チュートリアルを開始する関数
    function startTutorial() {
        console.log("--- チュートリアルを開始します ---");
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

    // チュートリアルを閉じる関数
    function closeTutorial() {
        overlay.style.opacity = '0';
        tooltip.style.opacity = '0';
        clearHighlight();
        setTimeout(() => {
            overlay.style.display = 'none';
            tooltip.style.display = 'none';
        }, 300);
        
        localStorage.setItem('tutorialCompleted', 'true');
        localStorage.removeItem('is_replaying_tutorial'); // リプレイフラグを消去
        console.log("チュートリアル完了フラグを保存しました。");
    }

    // オンボーディング・チュートリアル制御
    const isTutorialDone = localStorage.getItem('tutorialCompleted');

    if (!isTutorialDone || isTutorialDone !== 'true') {
        startTutorial();
    } else if (localStorage.getItem('start_tutorial_now') === 'true') {
        localStorage.removeItem('start_tutorial_now');
        startTutorial();
    }

    // ボタンのイベントリスナー設定
    if (btnTutorial) btnTutorial.addEventListener('click', startTutorial);
    btnClose.addEventListener('click', closeTutorial);
    // overlay.addEventListener('click', closeTutorial); // 背景クリックでの終了を無効化

    btnNext.addEventListener('click', () => {
        const totalSteps = targets.length + 3;
        if (currentStep < totalSteps - 1) {
            currentStep++;
            showStep(currentStep);
        } else {
            // 最後のステップでNEXTを押した時、マイページに遷移する
            const currentTarget = targets[currentStep - 3];
            if (currentTarget && currentTarget.getAttribute('href') === 'mypage.html') {
                // マイページ遷移時はリプレイフラグを削除せず、非表示化のみ行う
                overlay.style.opacity = '0';
                tooltip.style.opacity = '0';
                clearHighlight();
                setTimeout(() => {
                    overlay.style.display = 'none';
                    tooltip.style.display = 'none';
                }, 300);
                
                localStorage.setItem('tutorialCompleted', 'true');
                localStorage.setItem('start_mypage_tutorial', 'true');
                window.location.href = 'mypage.html';
            } else {
                closeTutorial();
            }
        }
    });

    btnPrev.addEventListener('click', () => {
        if (currentStep > 0) {
            currentStep--;
            showStep(currentStep);
        }
    });

    // ★ 座標計算および吹き出し表示を行う関数
    function showStep(index) {
        clearHighlight();
        
        // 幅指定のリセット（第0、1、2ステップでの横幅変更を他のステップに引き継がないため）
        tooltip.style.width = '';
        
        const totalSteps = targets.length + 3;
        document.querySelector('.tut-step-counter').innerText = `STEP ${index + 1} / ${totalSteps}`;
        btnPrev.style.visibility = index === 0 ? 'hidden' : 'visible';
        btnNext.innerText = index === totalSteps - 1 ? 'FINISH ✔' : 'NEXT ▶';

        if (index === 0) {
            // ステップ0: ようこそメッセージと実験概要
            tooltip.style.width = '480px'; // 横幅を広げて縦長による見切れを防ぐ
            document.getElementById('tut-title').innerText = "🌐 実験へようこそ";
            document.getElementById('tut-desc').innerHTML = `
                このシステムは、過去の巨大地震データや防災行動についてインタラクティブに学ぶためのシミュレーターです。<br><br>
                まずはシステムの基本的な使い方と、実験の進め方についてご案内します。
            `;

            // ツールチップを画面中央に固定表示
            setTimeout(() => {
                tooltip.style.position = 'fixed';
                tooltip.style.top = '50%';
                tooltip.style.left = '50%';
                tooltip.style.transform = 'translate(-50%, -50%)';
            }, 50);
            return;
        }

        if (index === 1) {
            // ステップ1: 実験の進め方とタイマー
            tooltip.style.width = '480px';
            document.getElementById('tut-title').innerText = "⏱️ 実験の進め方とタイマー";
            document.getElementById('tut-desc').innerHTML = `
                ・画面右上には学習タイマーが表示されています。<br>
                ・<strong>30秒間操作がないとタイマーは一時停止</strong>しますのでご注意ください。<br>
                ・あなたが直感的に「面白そう」「役に立ちそう」と思うものを中心に、<strong>10分間</strong>自由にサイト内を探索・プレイしてください。
            `;

            // ツールチップを画面中央に固定表示
            setTimeout(() => {
                tooltip.style.position = 'fixed';
                tooltip.style.top = '50%';
                tooltip.style.left = '50%';
                tooltip.style.transform = 'translate(-50%, -50%)';
            }, 50);
            return;
        }

        if (index === 2) {
            // ステップ2: 実験の終了手順
            tooltip.style.width = '480px';
            document.getElementById('tut-title').innerText = "🎉 実験の終了手順";
            document.getElementById('tut-desc').innerHTML = `
                ・10分経過すると、右上のボタンが「<strong>実験を終了して完了コードを発行する</strong>」に変わります。<br>
                ・ボタンをクリックすると、学習ログが一括送信され、ランサーズに入力するための<strong>完了コード（ユーザーID）</strong>が発行されます。<br><br>
                ・このチュートリアルをもう一度見たい場合は、画面右上の「<strong>MY PAGE</strong>」にある「<strong>再生する</strong>」ボタンからいつでもやり直すことができます。
            `;

            // ツールチップを画面中央に固定表示
            setTimeout(() => {
                tooltip.style.position = 'fixed';
                tooltip.style.top = '50%';
                tooltip.style.left = '50%';
                tooltip.style.transform = 'translate(-50%, -50%)';
            }, 50);
            return;
        }

        // 通常のターゲットが存在するステップ (index >= 3)
        const target = targets[index - 3];
        if (!target) return;

        target.classList.add('tut-highlight');

        const rect = target.getBoundingClientRect();
        window.scrollTo({
            top: window.scrollY + rect.top - 100,
            behavior: 'smooth'
        });

        document.getElementById('tut-title').innerText = target.dataset.title;
        document.getElementById('tut-desc').innerText = target.dataset.desc;

        setTimeout(() => {
            // ツールチップの位置設定を absolute に戻し、中央配置の transform を解除する
            tooltip.style.position = 'absolute';
            tooltip.style.transform = 'none';

            const updatedRect = target.getBoundingClientRect();
            let topPos = updatedRect.bottom + window.scrollY + 15;
            let leftPos = updatedRect.left + window.scrollX;
            
            // ① 画面の下にはみ出さない処理（下にスペースがない場合は上へ移動）
            if (topPos + tooltip.offsetHeight > window.scrollY + window.innerHeight) {
                topPos = updatedRect.top + window.scrollY - tooltip.offsetHeight - 15;
            }
            
            // ★ ④上に移動した結果、画面外やヘッダーの裏に消えてしまう場合
            const safeTopMargin = 100;
            if (topPos < window.scrollY + safeTopMargin) {
                topPos = window.scrollY + safeTopMargin;
            }
            
            // ② 画面の左にはみ出さない処理
            if (leftPos < 10) {
                leftPos = 10;
            }
            
            // ③ 画面の右にはみ出さない処理（文字切れ防止）
            if (leftPos + tooltip.offsetWidth > window.innerWidth - 10) {
                leftPos = window.innerWidth - tooltip.offsetWidth - 10;
            }

            tooltip.style.top = `${topPos}px`;
            tooltip.style.left = `${leftPos}px`;
        }, 350);
    }

    function clearHighlight() {
        targets.forEach(el => el.classList.remove('tut-highlight'));
    }
});

// ==========================================
// 事後アンケート完了コード発行＆カウントダウン処理
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const btnPostSurvey = document.getElementById('btn-post-survey');
    if (!btnPostSurvey) return;

    // タイマー更新関数
    function updateTimer() {
        const elapsed = parseInt(localStorage.getItem('accumulated_elapsed_time') || '0', 10);
        const limit = 10 * 60 * 1000; // 10分（600,000ミリ秒）
        const remaining = limit - elapsed;

        if (remaining > 0) {
            btnPostSurvey.disabled = true;
            
            const minutes = Math.floor(remaining / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);
            const displayTime = String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
            btnPostSurvey.textContent = `完了コードが発行できるようになるまで残り ${displayTime}`;
        } else {
            btnPostSurvey.disabled = false;
            btnPostSurvey.style.backgroundColor = 'var(--cud-orange)';
            btnPostSurvey.style.borderColor = 'var(--cud-orange)';
            btnPostSurvey.style.color = '#000';
            btnPostSurvey.textContent = '実験を終了して完了コードを発行する';
            clearInterval(timerInterval);
        }
    }

    const timerInterval = setInterval(updateTimer, 1000);
    updateTimer(); // 初回実行

    // ボタンクリック時の処理
    btnPostSurvey.addEventListener('click', () => {
        btnPostSurvey.disabled = true;
        btnPostSurvey.textContent = '送信中...';

        // 共通関数 sendAllLogsToGAS を実行
        if (typeof sendAllLogsToGAS === 'function') {
            sendAllLogsToGAS()
                .then(response => {
                    if (!response.ok) {
                        throw new Error("GAS response not ok");
                    }
                    console.log("Logs successfully sent to GAS.");
                    // 送信成功時のみ完了モーダルの表示
                    const modal = document.getElementById('completion-modal');
                    const codeVal = document.getElementById('completion-code-val');
                    if (modal && codeVal) {
                        const userId = localStorage.getItem('research_user_id') || 'User-unknown';
                        codeVal.textContent = userId;
                        modal.style.display = 'flex';
                    }
                })
                .catch((err) => {
                    console.error("GAS send error:", err);
                    alert("ログの送信に失敗しました。インターネットの接続状況を確認の上、時間をおいてもう一度お試しください。");
                })
                .finally(() => {
                    btnPostSurvey.disabled = false;
                    btnPostSurvey.textContent = '実験を終了して完了コードを発行する';
                });
        } else {
            console.error("sendAllLogsToGAS is not defined.");
            alert("システムエラー：ログ送信機能が読み込まれていません。管理者にお問い合わせください。");
            btnPostSurvey.disabled = false;
            btnPostSurvey.textContent = '実験を終了して完了コードを発行する';
        }
    });

    // コピー機能の実装
    const btnCopy = document.getElementById('btn-copy-completion');
    if (btnCopy) {
        btnCopy.addEventListener('click', () => {
            const userId = localStorage.getItem('research_user_id') || 'User-unknown';
            navigator.clipboard.writeText(userId).then(() => {
                const originalText = btnCopy.textContent;
                btnCopy.textContent = '✓ コピーしました！';
                btnCopy.style.background = '#00B45A';
                setTimeout(() => {
                    btnCopy.textContent = originalText;
                    btnCopy.style.background = 'var(--cud-green)';
                }, 2000);
            }).catch(err => {
                console.error("Failed to copy:", err);
                alert('コピーに失敗しました。手動でコピーしてください: ' + userId);
            });
        });
    }

    // 閉じるボタンの実装
    const btnCloseModal = document.getElementById('btn-close-completion');
    if (btnCloseModal) {
        btnCloseModal.addEventListener('click', () => {
            const modal = document.getElementById('completion-modal');
            if (modal) modal.style.display = 'none';
        });
    }
});