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
    // ※ 該当するIDの要素（箱）が存在するページでのみ実行されます
    initializeRecentQuakeMap('leaflet-map');      // index.html用（ダッシュボードの小マップ）
    initializeRecentQuakeMap('leaflet-map-full'); // live-map.html用（全画面マップ）
    initializeArchive3DMap('map-3d-full');      // archive-3d.html用

    // 3Dアーカイブマップの初期化
    initializeArchive3DMap('map-3d-container');
});

/**
 * ユーザーIDを生成・管理する関数
 */
function initializeUser() {
    const STORAGE_KEY = 'research_user_id';
    let userId = localStorage.getItem(STORAGE_KEY);
    
    // IDが存在しなければ新規作成（UUID v4 を使用）
    if (!userId) {
        userId = crypto.randomUUID();
        localStorage.setItem(STORAGE_KEY, userId);
    }
    
    // 画面のヘッダー部分にIDを表示（メタデータとして）
    const displayEl = document.getElementById('user-display');
    if (displayEl) {
        // セキュリティとデザインの観点から先頭8文字だけを表示
        displayEl.innerHTML = `ID: <span class="user-id-badge">${userId.substring(0, 8)}...</span>`;
        displayEl.title = userId; // マウスホバーでフルIDを確認可能に
    }
}

/**
 * 震源の深さ(km)に応じてCUD推奨カラーを返す関数
 * 気象庁などの標準的な段階表現に準拠しつつ、色覚多様性に配慮
 * * @param {number} depth - 震源の深さ (km)
 * @returns {string} - HEXカラーコード
 */
function getDepthColor(depth) {
    if (depth <= 33) return '#D55E00';  // 朱色 (浅い・地表への影響大)
    if (depth <= 70) return '#E69F00';  // 黄橙
    if (depth <= 150) return '#56B4E9'; // 空色
    return '#0072B2';                   // 濃い青 (深い)
}

/**
 * Leafletマップの初期化とUSGSデータの描画を行う関数
 */
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
    }).setView([36.2048, 138.2529], isFullScreen ? 4 : 2.5);

    L.control.zoom({ position: 'topright' }).addTo(map);

    // ★新規追加: 全画面（フルスクリーン）表示ボタン
    const fullscreenControl = L.control({ position: 'topright' });
    fullscreenControl.onAdd = function () {
        const btn = L.DomUtil.create('button', 'leaflet-bar leaflet-control');
        btn.innerHTML = '⛶'; // 全画面アイコン
        btn.title = "全画面表示の切り替え";
        btn.style.width = '34px';
        btn.style.height = '34px';
        btn.style.fontSize = '18px';
        btn.style.cursor = 'pointer';
        btn.style.backgroundColor = 'white';
        btn.style.border = 'none';
        btn.style.display = 'flex';
        btn.style.alignItems = 'center';
        btn.style.justifyContent = 'center';

        // クリックでフルスクリーンAPIを呼び出す
        btn.onclick = function (e) {
            e.preventDefault();
            const mapEl = document.getElementById(containerId);
            if (!document.fullscreenElement) {
                if (mapEl.requestFullscreen) mapEl.requestFullscreen();
                else if (mapEl.webkitRequestFullscreen) mapEl.webkitRequestFullscreen(); // Safari対応
            } else {
                if (document.exitFullscreen) document.exitFullscreen();
                else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
            }
        };
        return btn;
    };
    fullscreenControl.addTo(map);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors',
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
                            <strong style="font-family: var(--font-sans); font-size: 1.1rem;">M ${feature.properties.mag.toFixed(1)}</strong><br>
                            <span style="font-size:0.8rem; color: var(--text-sub);">深さ: ${feature.geometry.coordinates[2].toFixed(1)} km</span><br>
                            <span style="font-size:0.8rem; color: var(--text-sub);">${feature.properties.place}</span><br>
                            <span style="font-size:0.75rem; color: var(--text-sub);">${time}</span>
                        `);
                    }
                }
            }).addTo(map);

            if (isFullScreen) {
                // 凡例の追加
                const legend = L.control({ position: 'bottomright' });
                legend.onAdd = function () {
                    const div = L.DomUtil.create('div', 'info legend');
                    div.innerHTML = `
                        <div style="margin-bottom: 12px;">
                            <h4>震源の深さ (Depth)</h4>
                            <div class="legend-item"><span class="legend-color" style="background:#D55E00;"></span> 0 - 33 km (浅い)</div>
                            <div class="legend-item"><span class="legend-color" style="background:#E69F00;"></span> 33 - 70 km</div>
                            <div class="legend-item"><span class="legend-color" style="background:#56B4E9;"></span> 70 - 150 km</div>
                            <div class="legend-item"><span class="legend-color" style="background:#0072B2;"></span> 150 km以上 (深い)</div>
                        </div>
                    `;
                    return div;
                };
                legend.addTo(map);

                // リスト表示とソート機能
                const listContainer = document.getElementById('quake-list');
                const btnSortTime = document.getElementById('btn-sort-time');
                const btnSortMag = document.getElementById('btn-sort-mag');
                
                if (listContainer && btnSortTime && btnSortMag) {
                    const japanQuakes = data.features.filter(f => {
                        const lon = f.geometry.coordinates[0];
                        const lat = f.geometry.coordinates[1];
                        return lon >= 120 && lon <= 155 && lat >= 20 && lat <= 50;
                    });

                    let currentSort = 'time';

                    const renderList = () => {
                        if (japanQuakes.length === 0) {
                            listContainer.innerHTML = '<p style="color: var(--text-sub);">過去24時間、日本周辺でM2.5以上の地震は観測されていません。</p>';
                            return;
                        }

                        const sortedData = [...japanQuakes].sort((a, b) => {
                            return currentSort === 'time' ? b.properties.time - a.properties.time : b.properties.mag - a.properties.mag;
                        });

                        let html = '<div style="display: flex; flex-direction: column; gap: 10px;">';
                        sortedData.forEach(f => {
                            const mag = f.properties.mag.toFixed(1);
                            const time = new Date(f.properties.time).toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                            const color = getDepthColor(f.geometry.coordinates[2]);
                            html += `
                                <div style="background: var(--surface-color); padding: 12px 16px; border-radius: 8px; border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between;">
                                    <div style="display: flex; align-items: center; gap: 16px;">
                                        <div style="background: ${color}; color: white; width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">M${mag}</div>
                                        <div>
                                            <div style="font-weight: bold; font-size: 0.95rem; margin-bottom: 2px;">${f.properties.place}</div>
                                            <div style="font-size: 0.8rem; color: var(--text-sub);">深さ: ${f.geometry.coordinates[2].toFixed(1)} km</div>
                                        </div>
                                    </div>
                                    <div style="font-size: 0.85rem; color: var(--text-sub); font-family: var(--font-mono); text-align: right;">${time}</div>
                                </div>
                            `;
                        });
                        html += '</div>';
                        listContainer.innerHTML = html;
                    };

                    renderList();

                    // ★UI改善: トグルスイッチの見た目を切り替える関数
                    const updateButtonUI = (activeSort) => {
                        if (activeSort === 'time') {
                            btnSortTime.style.background = 'var(--primary-color)';
                            btnSortTime.style.color = 'white';
                            btnSortTime.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                            btnSortMag.style.background = 'transparent';
                            btnSortMag.style.color = 'var(--text-main)';
                            btnSortMag.style.boxShadow = 'none';
                        } else {
                            btnSortMag.style.background = 'var(--primary-color)';
                            btnSortMag.style.color = 'white';
                            btnSortMag.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                            btnSortTime.style.background = 'transparent';
                            btnSortTime.style.color = 'var(--text-main)';
                            btnSortTime.style.boxShadow = 'none';
                        }
                    };

                    btnSortTime.addEventListener('click', () => {
                        currentSort = 'time';
                        updateButtonUI('time');
                        renderList();
                    });

                    btnSortMag.addEventListener('click', () => {
                        currentSort = 'mag';
                        updateButtonUI('mag');
                        renderList();
                    });
                }
            }
        })
        .catch(err => console.error('USGS Data fetch error:', err));
}

/**
 * HEXカラー(例: #D55E00)をDeck.gl用のRGB配列(例: [213, 94, 0])に変換する関数
 */
function hexToRgb(hex) {
    const bigint = parseInt(hex.slice(1), 16);
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

/**
 * Three.jsを用いた1995年以降の3D震源分布マップの初期化
 * （海岸線レイヤーと著作権表示付き）
 */
function initializeArchive3DMap(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const placeholder = container.querySelector('.map-placeholder');
    const slicerUI = document.getElementById('time-slicer-ui'); // 存在するかチェック

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#111111');

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

    const gridHelper = new THREE.GridHelper(150, 30, 0x333333, 0x1a1a1a);
    scene.add(gridHelper);

    // ★グローバルにデータを保持するための変数
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

        // データを時系列順（古い順）にソートして保存
        rawEarthquakeData = eqData.features.sort((a, b) => a.properties.time - b.properties.time);

        // --- 日本地図の描画 (既存と同じ) ---
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

        // --- ★パーティクル描画関数（時間フィルタリング対応） ---
        function updateParticles(maxTimestamp) {
            if (particlesMesh) scene.remove(particlesMesh); // 古い点群を削除

            const positions = [];
            const colors = [];

            // スライダーで指定された時間「以前」のデータだけを抽出
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

        // 初期描画（全データ表示＝現在時刻）
        updateParticles(Date.now());

        // --- ★タイムスライサーUIの初期化（画面に存在する場合のみ）とコントロール ---
        if (slicerUI) {
            slicerUI.style.display = 'block'; 
            
            const slider = document.getElementById('time-slider');
            const labelCurrent = document.getElementById('label-current');
            const labelStart = document.getElementById('label-start');
            
            // コントロールボタンの取得
            const btnPlay = document.getElementById('btn-play');
            const btnPause = document.getElementById('btn-pause');
            const btnShowAll = document.getElementById('btn-show-all');

            // データの最初と最後のタイムスタンプを取得
            const minTime = rawEarthquakeData[0].properties.time;
            const maxTime = rawEarthquakeData[rawEarthquakeData.length - 1].properties.time;

            slider.min = minTime;
            slider.max = maxTime;
            slider.value = maxTime;
            labelStart.innerText = new Date(minTime).getFullYear() + "年";

            // UIと点群を更新する共通関数
            function updateSliderUI(timestamp) {
                const date = new Date(timestamp);
                labelCurrent.innerText = `${date.getFullYear()}年${date.getMonth() + 1}月`;
                updateParticles(timestamp);
            }

            // スライダーを手動で動かした時のイベント
            slider.addEventListener('input', (e) => {
                pausePlayback(); // 手動で触った時は再生を止める
                controls.autoRotate = false;
                updateSliderUI(parseInt(e.target.value, 10));
            });

            // --- 自動再生のロジック ---
            let playInterval = null;
            // 1回の再生フレームで進める時間（約20日分のミリ秒。数字を大きくすると再生が早くなります）
            const timeStep = 1000 * 60 * 60 * 24 * 20; 

            function startPlayback() {
                // スライダーが最後まで行っていたら最初に戻す
                if (parseInt(slider.value, 10) >= maxTime) {
                    slider.value = minTime;
                }
                
                btnPlay.style.display = 'none';
                btnPause.style.display = 'inline-flex';
                controls.autoRotate = false;

                // 0.05秒(50ミリ秒)ごとにスライダーを進める
                playInterval = setInterval(() => {
                    let nextTime = parseInt(slider.value, 10) + timeStep;
                    
                    if (nextTime >= maxTime) {
                        nextTime = maxTime;
                        pausePlayback(); // 最後まで到達したら停止
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

            // ボタンのクリックイベント
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