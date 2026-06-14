document.addEventListener('DOMContentLoaded', () => {
    initHazardMap();
});

function initHazardMap() {
    const map = L.map('hazard-map', {
        zoomControl: false, 
        minZoom: 5,
        maxZoom: 18 
    }).setView([35.6812, 139.7671], 12); 

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // ★追加：地図右下に国土地理院の全体クレジットを強制表示
    map.attributionControl.addAttribution('出典: <a href="https://www.gsi.go.jp/" target="_blank">国土地理院</a>');

    // --- 背景地図レイヤー（漆黒のDarkマップ） ---
    const darkMap = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        subdomains: 'abcd',
        maxZoom: 18
    });

    darkMap.addTo(map);

    // --- 面情報：ハザードマップレイヤー ---
    const tsunamiLayer = L.tileLayer('https://disaportaldata.gsi.go.jp/raster/04_tsunami_newlegend_data/{z}/{x}/{y}.png', { opacity: 0.5 });
    const floodLayer = L.tileLayer('https://disaportaldata.gsi.go.jp/raster/01_flood_l2_shinsuishin_data/{z}/{x}/{y}.png', { opacity: 0.5 });
    const debrisFlowLayer = L.tileLayer('https://disaportaldata.gsi.go.jp/raster/05_dosekiryukeikaikuiki/{z}/{x}/{y}.png', { opacity: 0.6 });
    const steepSlopeLayer = L.tileLayer('https://disaportaldata.gsi.go.jp/raster/05_kyukeishakeikaikuiki/{z}/{x}/{y}.png', { opacity: 0.6 });
    const landslideLayer = L.layerGroup([debrisFlowLayer, steepSlopeLayer]);

    // 初期状態では津波のみオン
    tsunamiLayer.addTo(map);

    // --- 点情報：避難所の本物データ（クラスタリング対応） ---
    
    // SFJ風カスタムアイコン
    const shelterIcon = L.divIcon({
        className: 'sfj-shelter-marker',
        html: '🏃', 
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -14]
    });

    const markersCluster = L.markerClusterGroup({
        maxClusterRadius: 50, 
        chunkedLoading: true,
        iconCreateFunction: function(cluster) {
            const count = cluster.getChildCount();
            let size = count < 100 ? 35 : 45; 
            
            return L.divIcon({ 
                html: `<div>${count}</div>`, 
                className: 'sfj-cluster-marker', 
                iconSize: L.point(size, size) 
            });
        }
    });

    // キャッシュとロード済みの都道府県の追跡
    const loadedPrefectures = new Set();
    let isClusterAdded = false;

    // 災害記号の日本語マッピング
    const DISASTER_MAP = {
        "F": "洪水",
        "S": "土砂災害",
        "K": "高潮",
        "J": "地震",
        "T": "津波",
        "H": "大規模火災",
        "N": "内水氾濫",
        "V": "火山現象"
    };

    function updateVisibleShelters() {
        const currentZoom = map.getZoom();
        
        // ズームレベルが 9 未満の場合はクラスターを取り除く（負荷軽減）
        if (currentZoom < 9) {
            if (isClusterAdded) {
                map.removeLayer(markersCluster);
                isClusterAdded = false;
            }
            return;
        }

        // ズームレベルが 9 以上の場合はクラスターを追加
        if (!isClusterAdded) {
            map.addLayer(markersCluster);
            isClusterAdded = true;
        }

        const mapBounds = map.getBounds();
        const pendingLoads = [];

        // 交差し、かつ未ロードの都道府県を判定
        PREFECTURES_CONFIG.forEach(pref => {
            const southWest = L.latLng(pref.bounds[0][0], pref.bounds[0][1]);
            const northEast = L.latLng(pref.bounds[1][0], pref.bounds[1][1]);
            const prefBounds = L.latLngBounds(southWest, northEast);

            if (mapBounds.intersects(prefBounds) && !loadedPrefectures.has(pref.code)) {
                // ロード済みにマークして多重フェッチを防ぐ
                loadedPrefectures.add(pref.code);
                pendingLoads.push(fetchPrefectureShelters(pref.code));
            }
        });

        if (pendingLoads.length > 0) {
            console.log(`Loading ${pendingLoads.length} prefectures on-demand...`);
        }
    }

    function fetchPrefectureShelters(prefCode) {
        return fetch(`./assets/shelters/shelters_${prefCode}.json`)
            .then(response => {
                if (!response.ok) throw new Error(`Failed to load prefecture: ${prefCode}`);
                return response.json();
            })
            .then(shelters => {
                const markersArray = [];
                
                shelters.forEach(s => {
                    const latlng = L.latLng(s.c[1], s.c[0]);
                    const marker = L.marker(latlng, { icon: shelterIcon });

                    // ポップアップをバインド (Lazy Load: クリックされるまでHTMLを作らない)
                    marker.bindPopup(function() {
                        const typesArray = [];
                        for (let i = 0; i < s.d.length; i++) {
                            const char = s.d[i];
                            if (DISASTER_MAP[char]) {
                                typesArray.push(DISASTER_MAP[char]);
                            }
                        }
                        const tagsHtml = typesArray.map(t => `<span class="popup-tag">${t}</span>`).join('');
                        return `
                            <h4 class="popup-title">🛡️ 指定緊急避難場所</h4>
                            <div style="font-weight: bold; font-size: 1.1rem; margin-bottom: 8px;">${s.n}</div>
                            <div style="font-size: 0.75rem; color: #aaa; margin-bottom: 4px;">対応災害：</div>
                            <div>${tagsHtml}</div>
                        `;
                    });
                    
                    markersArray.push(marker);
                });

                markersCluster.addLayers(markersArray);
                console.log(`Loaded ${shelters.length} shelters for prefecture code ${prefCode}`);
            })
            .catch(error => {
                console.warn(`Error loading shelters for code ${prefCode}:`, error);
                // 失敗した場合は再読み込みできるようにロード済みから除外
                loadedPrefectures.delete(prefCode);
            });
    }

    // 地図のスクロール・ズーム終了時に自動で表示範囲の避難所を読み込む
    map.on('moveend', updateVisibleShelters);
    
    // 初期表示時に一度呼び出す
    updateVisibleShelters();

    // --- レイヤーコントロールの追加 ---
    const overlayMaps = {
        "🏃 指定緊急避難場所 (Point)": markersCluster,
        "🌊 津波浸水想定 (Area)": tsunamiLayer,
        "💧 洪水浸水想定 (Area)": floodLayer,
        "⛰️ 土砂災害警戒区域 (Area)": landslideLayer
    };

    L.control.layers(null, overlayMaps, { collapsed: false, position: 'topright' }).addTo(map);

    // --- 現在地取得機能 ---
    const locateControl = L.control({ position: 'bottomright' });
    locateControl.onAdd = function () {
        const btn = L.DomUtil.create('button', 'leaflet-bar leaflet-control');
        btn.innerHTML = '📍現在地';
        btn.style.padding = '5px 10px';
        btn.style.cursor = 'pointer';
        btn.style.background = '#151515';
        btn.style.border = '1px solid #333';
        btn.style.borderRadius = '4px';
        btn.style.fontWeight = 'bold';
        btn.style.color = '#fff';

        btn.onclick = function (e) {
            e.preventDefault();
            map.locate({ setView: true, maxZoom: 14 });
        };
        return btn;
    };
    locateControl.addTo(map);

    map.on('locationfound', function(e) {
        L.marker(e.latlng).addTo(map)
            .bindPopup("<div style='font-weight:bold; color:#56B4E9; font-size:1.1rem; text-align:center;'>📍 あなたの現在地</div>").openPopup();
    });
}