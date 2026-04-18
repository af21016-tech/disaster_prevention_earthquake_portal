/**
 * Quake Interactive Archive - Main Application Logic
 * * [機能一覧]
 * 1. ユーザーIDの自動生成とLocalStorage保存（研究データ紐付け用）
 * 2. Leafletを用いた過去24時間の地震データ（USGS）のマッピング
 * 3. 震源の深さとマグニチュードに応じたCUD（カラーユニバーサルデザイン）対応の可視化
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. ユーザーIDの初期化と表示
    initializeUser();

    // 2. Leafletマップの初期化
    initializeRecentQuakeMap('leaflet-map');      // index.html用（ダッシュボードの小マップ）
    initializeRecentQuakeMap('leaflet-map-full'); // live-map.html用（全画面マップ）
    
    // 3. 3Dアーカイブマップの初期化
    initializeArchive3DMap('map-3d-container'); // index.html用
    initializeArchive3DMap('map-3d-full');      // archive-3d.html用
});

/**
 * ユーザーIDを生成・管理する関数
 */
function initializeUser() {
    const STORAGE_KEY = 'research_user_id';
    let userId = localStorage.getItem(STORAGE_KEY);
    
    if (!userId) {
        userId = crypto.randomUUID();
        localStorage.setItem(STORAGE_KEY, userId);
    }
    
    const displayEl = document.getElementById('user-display');
    if (displayEl) {
        displayEl.innerHTML = `ID: <span class="user-id-badge">${userId.substring(0, 8)}...</span>`;
        displayEl.title = userId;
    }
}

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
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
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
                        layer.bindPopup(`
                            <strong style="font-family: var(--font-sans); font-size: 1.1rem; color: #333;">M ${feature.properties.mag.toFixed(1)}</strong><br>
                            <span style="font-size:0.8rem; color: #666;">深さ: ${feature.geometry.coordinates[2].toFixed(1)} km</span><br>
                            <span style="font-size:0.8rem; color: #666;">${feature.properties.place}</span><br>
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
// SFJ Tutorial Spotlight Logic (修正版)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const btnTutorial = document.getElementById('btn-tutorial'); // indexには存在しない
    const overlay = document.getElementById('tut-overlay');
    const tooltip = document.getElementById('tut-tooltip');
    const btnClose = document.getElementById('tut-close');
    const btnNext = document.getElementById('tut-next');
    const btnPrev = document.getElementById('tut-prev');
    
    // チュートリアル用のUI（overlay等）自体がないページでは終了
    if (!overlay || !tooltip) return;

    const targets = Array.from(document.querySelectorAll('.tut-target'))
                         .sort((a, b) => parseInt(a.dataset.step) - parseInt(b.dataset.step));

    let currentStep = 0;

    // チュートリアルを開始する関数
    function startTutorial() {
        currentStep = 0;
        overlay.style.display = 'block';
        tooltip.style.display = 'block';
        setTimeout(() => {
            overlay.style.opacity = '1';
            tooltip.style.opacity = '1';
        }, 10);
        showStep(currentStep);
    }

    // インデックスにボタンがある場合（もし復活させた際）のイベント
    if (btnTutorial) {
        btnTutorial.addEventListener('click', startTutorial);
    }

    // ---------------------------------------------------------
    // ★マイページからの「強制スタート」チェック
    // ---------------------------------------------------------
    if (localStorage.getItem('start_tutorial_now') === 'true') {
        localStorage.removeItem('start_tutorial_now');
        startTutorial(); // ボタンがなくてもここから開始される
    }

    // --- 以下、showStep関数やクローズ処理などは前回と同じ ---
    function closeTutorial() {
        overlay.style.opacity = '0';
        tooltip.style.opacity = '0';
        clearHighlight();
        setTimeout(() => {
            overlay.style.display = 'none';
            tooltip.style.display = 'none';
        }, 300);
    }

    btnClose.addEventListener('click', closeTutorial);
    overlay.addEventListener('click', closeTutorial);

    btnNext.addEventListener('click', () => {
        if (currentStep < targets.length - 1) {
            currentStep++;
            showStep(currentStep);
        } else {
            closeTutorial();
        }
    });

    btnPrev.addEventListener('click', () => {
        if (currentStep > 0) {
            currentStep--;
            showStep(currentStep);
        }
    });

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
            if (leftPos < 10) leftPos = 10;
            tooltip.style.top = `${topPos}px`;
            tooltip.style.left = `${leftPos}px`;
        }, 350);
    }

    function clearHighlight() {
        targets.forEach(el => el.classList.remove('tut-highlight'));
    }
});

// ==========================================
// ★改修：GASを用いた自動ログ送信システム
// ==========================================
function logUserAction(actionType, detailInfo = "") {
    const userId = localStorage.getItem('research_user_id');
    if (!userId) return;

    let pagePath = window.location.pathname.split('/').pop();
    if (!pagePath || pagePath === "") pagePath = "index.html";

    // 送信するデータ
    const logData = {
        timestamp: new Date().toISOString(),
        userId: userId,
        page: pagePath,
        action: actionType,
        detail: detailInfo
    };

    // ★重要：ここに先ほどコピーしたGASの「ウェブアプリのURL」を貼り付けてください
    const GAS_URL = "https://script.google.com/macros/s/AKfycbwzGc1KJhEruVkcyxPFGkaQQIaXNlE5ird3Gl7GW5p_NnAVa2-gx90iNlCmc2lM_SJNUw/exec";

    // fetchAPIを使って、裏側でこっそりGASにデータを送る
    fetch(GAS_URL, {
        method: 'POST',
        // ※GASの仕様上、CORSエラーを回避するために text/plain で送るのが鉄則です
        headers: {
            'Content-Type': 'text/plain'
        },
        body: JSON.stringify(logData)
    })
    .then(response => {
        // 送信成功（ユーザーには何も見えません）
        console.log("Log sent successfully.");
    })
    .catch(error => {
        // オフラインなどで送信失敗した場合のエラー処理
        console.error("Log send error:", error);
    });
}

// ページが読み込まれた瞬間に「ページビュー」のログを自動送信する
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        logUserAction('page_view', document.title);
    }, 500);
});