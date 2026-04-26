// --- グローバル変数 ---
let intensityData = [];
let map = null;
let geojsonLayer = null; 
let jmaRegionData = null; 
let intensityLegend = null; // ★凡例オブジェクトをグローバルで保持

// --- 気象庁震度階級のCUDカラー判定関数 ---
function getIntensityColor(intensity) {
    if (intensity >= 7) return '#960096';   // 紫 (震度7)
    if (intensity >= 6.5) return '#640000'; // 濃赤 (震度6強)
    if (intensity >= 6.0) return '#A50021'; // 赤 (震度6弱)
    if (intensity >= 5.5) return '#FF2800'; // 朱色 (震度5強)
    if (intensity >= 5.0) return '#FFBE00'; // 黄土色 (震度5弱)
    if (intensity >= 4.0) return '#FAE600'; // 黄 (震度4)
    return null;                            
}

// ★修正：旧震度階級（弱強なし）に対応
function getIntensityString(val, isOldScale = false) {
    if (isOldScale) {
        if (val >= 7) return '7';
        if (val >= 6.0) return '6';
        if (val >= 5.0) return '5';
        if (val >= 4.0) return '4';
        return '3以下';
    }
    // 現行の震度階級
    if (val === 7) return '7';
    if (val === 6.5) return '6強';
    if (val === 6.0) return '6弱';
    if (val === 5.5) return '5強';
    if (val === 5.0) return '5弱';
    if (val >= 4.0) return Math.floor(val).toString();
    return '3以下';
}

document.addEventListener('DOMContentLoaded', () => {
    initMap();
    loadAllData();
});

function initMap() {
    map = L.map('intensity-map', {
        zoomControl: false,
        minZoom: 4
    }).setView([38.0, 137.0], 5);

    L.control.zoom({ position: 'topright' }).addTo(map);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        subdomains: 'abcd',
        maxZoom: 10
    }).addTo(map);

    // ★修正：凡例を動的に更新できるように定義
    intensityLegend = L.control({ position: 'bottomright' });
    intensityLegend.onAdd = function () {
        this._div = L.DomUtil.create('div', 'intensity-legend');
        this.update(); // 初期表示（現行スケール）
        return this._div;
    };
    
    // 凡例の書き換え関数
    intensityLegend.update = function (isOldScale = false) {
        if (isOldScale) {
            this._div.innerHTML = `
                <h4 style="margin-top:0; margin-bottom:8px;">気象庁 震度階級 (1995年当時)</h4>
                <div class="legend-row"><span class="legend-color" style="background:#960096;"></span> 震度 7</div>
                <div class="legend-row"><span class="legend-color" style="background:#A50021;"></span> 震度 6</div>
                <div class="legend-row"><span class="legend-color" style="background:#FF2800;"></span> 震度 5</div>
                <div class="legend-row"><span class="legend-color" style="background:#FAE600;"></span> 震度 4</div>
                <p style="font-size:0.6rem; color:#888; margin:5px 0 0 0;">※当時は強弱の区分がありませんでした</p>
            `;
        } else {
            this._div.innerHTML = `
                <h4 style="margin-top:0; margin-bottom:8px;">気象庁 震度階級 (面表示)</h4>
                <div class="legend-row"><span class="legend-color" style="background:#960096;"></span> 震度 7</div>
                <div class="legend-row"><span class="legend-color" style="background:#640000;"></span> 震度 6強</div>
                <div class="legend-row"><span class="legend-color" style="background:#A50021;"></span> 震度 6弱</div>
                <div class="legend-row"><span class="legend-color" style="background:#FF2800;"></span> 震度 5強</div>
                <div class="legend-row"><span class="legend-color" style="background:#FFBE00;"></span> 震度 5弱</div>
                <div class="legend-row"><span class="legend-color" style="background:#FAE600;"></span> 震度 4</div>
            `;
        }
    };
    intensityLegend.addTo(map);
}

function loadAllData() {
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

function selectEarthquake(eqId) {
    document.querySelectorAll('.eq-card').forEach(c => c.classList.remove('active'));
    document.getElementById(`card-${eqId}`).classList.add('active');

    const eq = intensityData.find(d => d.id === eqId);
    if (!eq) return;

    // ★修正：阪神・淡路大震災かどうかを判定して凡例を更新
    const isHanshin = eq.name.includes("阪神") || eq.id.includes("hanshin");
    intensityLegend.update(isHanshin);

    const overlay = document.getElementById('eq-info-overlay');
    document.getElementById('info-title').innerText = eq.name;
    document.getElementById('info-desc').innerText = eq.description;
    overlay.style.display = 'block';

    if (geojsonLayer) {
        map.removeLayer(geojsonLayer);
    }

    const intensityMap = {};
    eq.points.forEach(pt => {
        intensityMap[pt.region] = pt.intensity;
    });

    geojsonLayer = L.geoJSON(jmaRegionData, {
        style: function (feature) {
            const regionName = feature.properties.name || feature.properties.NAME || feature.properties.Name;
            const intensity = intensityMap[regionName] || 0;
            const color = getIntensityColor(intensity);

            if (color) {
                return {
                    fillColor: color,
                    weight: 1,       
                    color: '#ffffff', 
                    opacity: 0.5,
                    fillOpacity: 0.8 
                };
            } else {
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
                // ★修正：ポップアップの震度表示も切り替え
                const intensityStr = getIntensityString(intensity, isHanshin);
                
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

    if (geojsonLayer.getBounds().isValid()) {
        map.flyToBounds(geojsonLayer.getBounds(), { padding: [20, 20], maxZoom: 8, duration: 1.5 });
    }
}