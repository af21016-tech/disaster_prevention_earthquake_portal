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

    // ★軽量化1：chunkedLoading を true にして、分割処理でフリーズを防ぐ
    const markersCluster = L.markerClusterGroup({
        maxClusterRadius: 50, 
        chunkedLoading: true, // ←【超重要】これを追加！
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

    fetch('./assets/shelters.geojson')
        .then(response => {
            if (!response.ok) throw new Error("避難所データが見つかりません");
            return response.json();
        })
        .then(data => {
            // ★軽量化のための工夫：マーカーを一時的に溜める「箱（配列）」を用意
            const markersArray = [];

            L.geoJSON(data, {
                pointToLayer: function (feature, latlng) {
                    return L.marker(latlng, { icon: shelterIcon });
                },
                onEachFeature: function (feature, layer) {
                    const props = feature.properties;

                    const name = props['施設・場所名'] || props.name || props.名称 || props.施設名 || props.指定緊急避難場所名 || "名称不明の避難所";

                    let typesArray = [];
                    if (props['洪水'] == 1) typesArray.push("洪水");
                    if (props['崖崩れ、土石流及び地滑り'] == 1) typesArray.push("土砂災害"); 
                    if (props['高潮'] == 1) typesArray.push("高潮");
                    if (props['地震'] == 1) typesArray.push("地震");
                    if (props['津波'] == 1) typesArray.push("津波");
                    if (props['大規模な火事'] == 1) typesArray.push("大規模火災");
                    if (props['内水氾濫'] == 1) typesArray.push("内水氾濫");
                    if (props['火山現象'] == 1) typesArray.push("火山現象");

                    if (typesArray.length === 0) {
                        const typesString = props.types || props.対応災害 || props.対象とする災害;
                        if (typesString && typeof typesString === 'string') {
                            typesArray = typesString.split(',').map(t => t.trim());
                        } else {
                            typesArray = ["詳細情報なし"];
                        }
                    }

                    // ★軽量化2：bindPopupの中に「関数」を渡し、クリックされるまでHTMLを作らない（Lazy Load）
                    layer.bindPopup(function() {
                        const tagsHtml = typesArray.map(t => `<span class="popup-tag">${t}</span>`).join('');
                        return `
                            <h4 class="popup-title">🛡️ 指定緊急避難場所</h4>
                            <div style="font-weight: bold; font-size: 1.1rem; margin-bottom: 8px;">${name}</div>
                            <div style="font-size: 0.75rem; color: #aaa; margin-bottom: 4px;">対応災害：</div>
                            <div>${tagsHtml}</div>
                        `;
                    });

                    // 処理したレイヤーを一旦配列に突っ込む
                    markersArray.push(layer);
                }
            });

            // ★軽量化3：addLayer ではなく addLayers (複数形) を使い、配列に入れた数万件を「一気に」追加する
            markersCluster.addLayers(markersArray);
            map.addLayer(markersCluster);
        })
        .catch(error => {
            console.warn("避難所データの読み込みエラー:", error);
        });

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