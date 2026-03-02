// --- グローバル変数 ---
let intensityData = [];
let map = null;
let geojsonLayer = null; // ポリゴンレイヤーを保持
let jmaRegionData = null; // 予報区のGeoJSONデータ

// --- 気象庁震度階級のCUDカラー判定関数 ---
function getIntensityColor(intensity) {
    if (intensity >= 7) return '#960096';   // 紫 (震度7)
    if (intensity >= 6.5) return '#640000'; // 濃赤 (震度6強)
    if (intensity >= 6.0) return '#A50021'; // 赤 (震度6弱)
    if (intensity >= 5.5) return '#FF2800'; // 朱色 (震度5強)
    if (intensity >= 5.0) return '#FFBE00'; // 黄土色 (震度5弱)
    if (intensity >= 4.0) return '#FAE600'; // 黄 (震度4)
    return null;                            // 震度3以下は塗らない（透明）
}

function getIntensityString(val) {
    if (val === 7) return '7';
    if (val === 6.5) return '6強';
    if (val === 6.0) return '6弱';
    if (val === 5.5) return '5強';
    if (val === 5.0) return '5弱';
    if (val >= 4.0) return Math.floor(val).toString();
    return '3以下';
}

// --- 初期化処理 ---
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    loadAllData();
});

// --- マップの初期化 ---
function initMap() {
    map = L.map('intensity-map', {
        zoomControl: false,
        minZoom: 4
    }).setView([38.0, 137.0], 5);

    // ズームコントロール
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
        btn.style.color = '#333'; // ダークテーマでもアイコンが見えるように黒文字指定
        btn.style.border = 'none';
        btn.style.display = 'flex';
        btn.style.alignItems = 'center';
        btn.style.justifyContent = 'center';

        // クリックでフルスクリーンAPIを呼び出す
        btn.onclick = function (e) {
            e.preventDefault();
            const mapEl = document.getElementById('intensity-map');
            
            if (!document.fullscreenElement) {
                if (mapEl.requestFullscreen) {
                    mapEl.requestFullscreen();
                } else if (mapEl.webkitRequestFullscreen) { // Safari対応
                    mapEl.webkitRequestFullscreen();
                }
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                }
            }
        };
        return btn;
    };
    fullscreenControl.addTo(map);

    // ダークテーマのベースマップ
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OSM',
        subdomains: 'abcd',
        maxZoom: 10
    }).addTo(map);

    // 凡例の追加
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = function () {
        const div = L.DomUtil.create('div', 'intensity-legend');
        div.innerHTML = `
            <h4>気象庁 震度階級 (面表示)</h4>
            <div class="legend-row"><span class="legend-color" style="background:#960096;"></span> 震度 7</div>
            <div class="legend-row"><span class="legend-color" style="background:#640000;"></span> 震度 6強</div>
            <div class="legend-row"><span class="legend-color" style="background:#A50021;"></span> 震度 6弱</div>
            <div class="legend-row"><span class="legend-color" style="background:#FF2800;"></span> 震度 5強</div>
            <div class="legend-row"><span class="legend-color" style="background:#FFBE00;"></span> 震度 5弱</div>
            <div class="legend-row"><span class="legend-color" style="background:#FAE600;"></span> 震度 4</div>
        `;
        return div;
    };
    legend.addTo(map);
}

// --- データの一括読み込み ---
function loadAllData() {
    // 震度データ(JSON)と予報区ポリゴン(GeoJSON)を同時に読み込む
    Promise.all([
        fetch('./assets/intensity_data.json').then(r => r.json()),
        fetch('./assets/jma_region.geojson').then(r => r.json())
    ])
    .then(([eqData, geoData]) => {
        intensityData = eqData;
        jmaRegionData = geoData;
        
        renderList();
        
        if (intensityData.length > 0) {
            selectEarthquake(intensityData[intensityData.length - 1].id);
        }
    })
    .catch(err => {
        console.error('Data load error:', err);
        document.getElementById('eq-list-container').innerHTML = 
            '<p style="color:#D55E00; padding:1rem;">データの読み込みに失敗しました。<br>assetsフォルダ内に「intensity_data.json」と「jma_region.geojson」が正しく配置されているか確認してください。</p>';
    });
}

function renderList() {
    const container = document.getElementById('eq-list-container');
    container.innerHTML = '';

    intensityData.forEach(eq => {
        const card = document.createElement('div');
        card.className = 'eq-card';
        card.id = `card-${eq.id}`;
        card.innerHTML = `
            <div class="eq-date">${eq.date}</div>
            <div class="eq-name">${eq.name}</div>
            <div class="eq-meta">
                <span style="color:var(--primary-color); font-weight:bold;">${eq.magnitude}</span>
                <span style="color:var(--text-sub);">深さ: ${eq.depth}</span>
            </div>
        `;
        card.addEventListener('click', () => selectEarthquake(eq.id));
        container.appendChild(card);
    });
}

// --- 地震の選択と【ポリゴン（面）】の描画 ---
function selectEarthquake(eqId) {
    document.querySelectorAll('.eq-card').forEach(c => c.classList.remove('active'));
    document.getElementById(`card-${eqId}`).classList.add('active');

    const eq = intensityData.find(d => d.id === eqId);
    if (!eq) return;

    // オーバーレイ更新
    const overlay = document.getElementById('eq-info-overlay');
    document.getElementById('info-title').innerText = eq.name;
    document.getElementById('info-desc').innerText = eq.description;
    overlay.style.display = 'block';

    // 古いポリゴンレイヤーを削除
    if (geojsonLayer) {
        map.removeLayer(geojsonLayer);
    }

    // 選択された地震の震度データを、予報区名をキーにした辞書(Map)に変換
    // 例: { "石川県能登": 7, "石川県加賀": 5.5, ... }
    const intensityMap = {};
    eq.points.forEach(pt => {
        intensityMap[pt.region] = pt.intensity;
    });

    // GeoJSONからポリゴンを描画
    geojsonLayer = L.geoJSON(jmaRegionData, {
        style: function (feature) {
            // GeoJSON内のプロパティ名（name, NAME, name_jaなど）を取得
            // ※ダウンロードしたshpデータの仕様に合わせて調整が必要な場合があります
            const regionName = feature.properties.name || feature.properties.NAME || feature.properties.Name;
            
            // この予報区の震度を取得（データがなければ0）
            const intensity = intensityMap[regionName] || 0;
            const color = getIntensityColor(intensity);

            if (color) {
                // 震度4以上は色を塗る
                return {
                    fillColor: color,
                    weight: 1,       // 境界線の太さ
                    color: '#ffffff', // 境界線の色
                    opacity: 0.5,
                    fillOpacity: 0.8 // 面の透明度
                };
            } else {
                // 震度3以下は枠線だけ薄く描くか、あるいは透明にする
                return {
                    fillColor: 'transparent',
                    weight: 0.5,
                    color: '#555555',
                    opacity: 0.3,
                    fillOpacity: 0
                };
            }
        },
        onEachFeature: function (feature, layer) {
            const regionName = feature.properties.name || feature.properties.NAME || feature.properties.Name;
            const intensity = intensityMap[regionName] || 0;
            
            if (intensity >= 4.0) {
                const color = getIntensityColor(intensity);
                const intensityStr = getIntensityString(intensity);
                
                // マウスホバーで少し明るくするなどのエフェクト
                layer.on({
                    mouseover: (e) => {
                        const l = e.target;
                        l.setStyle({ fillOpacity: 1.0, weight: 2 });
                    },
                    mouseout: (e) => {
                        geojsonLayer.resetStyle(e.target);
                    }
                });

                layer.bindPopup(`
                    <strong style="font-size:1.1rem;">${regionName}</strong><br>
                    最大震度: <span style="font-weight:bold; color:${color}; font-size:1.2rem;">${intensityStr}</span>
                `);
            }
        }
    }).addTo(map);

    // 塗られたポリゴン群全体が画面に収まるようにズーム（少し引き気味に設定）
    if (geojsonLayer.getBounds().isValid()) {
        map.flyToBounds(geojsonLayer.getBounds(), { padding: [20, 20], maxZoom: 8, duration: 1.5 });
    }
}