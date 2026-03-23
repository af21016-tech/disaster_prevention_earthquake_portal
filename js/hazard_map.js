document.addEventListener('DOMContentLoaded', () => {
    initHazardMap();
});

function initHazardMap() {
    const map = L.map('hazard-map', {
        zoomControl: false, 
        minZoom: 5,
        maxZoom: 15 
    }).setView([35.6812, 139.7671], 13); // 避難所が見やすいように少しズーム(13)に変更

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // --- 背景地図レイヤー（漆黒のDarkマップ） ---
    const darkMap = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        subdomains: 'abcd',
        maxZoom: 15
    });

    darkMap.addTo(map);

    // --- 面情報：ハザードマップレイヤー（透過率を下げたもの） ---
    const tsunamiLayer = L.tileLayer('https://disaportaldata.gsi.go.jp/raster/04_tsunami_newlegend_data/{z}/{x}/{y}.png', { opacity: 0.5 });
    const floodLayer = L.tileLayer('https://disaportaldata.gsi.go.jp/raster/01_flood_l2_shinsuishin_data/{z}/{x}/{y}.png', { opacity: 0.5 });
    const debrisFlowLayer = L.tileLayer('https://disaportaldata.gsi.go.jp/raster/05_dosekiryukeikaikuiki/{z}/{x}/{y}.png', { opacity: 0.6 });
    const steepSlopeLayer = L.tileLayer('https://disaportaldata.gsi.go.jp/raster/05_kyukeishakeikaikuiki/{z}/{x}/{y}.png', { opacity: 0.6 });
    const landslideLayer = L.layerGroup([debrisFlowLayer, steepSlopeLayer]);

    // --- 点情報：避難所レイヤー（SFJカスタムマーカー） ---
    // カスタムアイコンの定義
    const shelterIcon = L.divIcon({
        className: 'sfj-shelter-marker',
        html: '🏃', // 人が走るピクトグラム
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -14]
    });

    // ダミーの避難所データ（東京駅周辺）
    const dummyShelters = [
        { name: "千代田区立 城東小学校", lat: 35.6800, lng: 139.7700, types: ["地震", "津波", "洪水"] },
        { name: "皇居外苑 避難広場", lat: 35.6825, lng: 139.7580, types: ["地震", "大規模火災"] },
        { name: "日比谷公園 広域避難場所", lat: 35.6735, lng: 139.7558, types: ["地震", "大規模火災"] },
        { name: "大手町合同防災センター", lat: 35.6870, lng: 139.7640, types: ["地震", "洪水", "土砂災害"] }
    ];

    const shelterMarkers = dummyShelters.map(data => {
        // 種類タグの生成
        const tagsHtml = data.types.map(t => `<span class="popup-tag">${t}</span>`).join('');
        
        // マーカーの生成とポップアップのバインド
        return L.marker([data.lat, data.lng], { icon: shelterIcon })
            .bindPopup(`
                <h4 class="popup-title">🛡️ 指定避難所</h4>
                <div style="font-weight: bold; font-size: 1.1rem; margin-bottom: 8px;">${data.name}</div>
                <div style="font-size: 0.75rem; color: #aaa; margin-bottom: 4px;">対応災害：</div>
                <div>${tagsHtml}</div>
            `);
    });

    // 避難所マーカーをグループ化
    const shelterLayerGroup = L.layerGroup(shelterMarkers);

    // 初期状態のオン/オフ設定（津波と避難所を表示）
    tsunamiLayer.addTo(map);
    shelterLayerGroup.addTo(map);

    // --- レイヤーコントロールの追加 ---
    const overlayMaps = {
        "🏃 指定避難所 (Point)": shelterLayerGroup,
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
        // 現在地マーカーも少し目立たせる
        L.marker(e.latlng).addTo(map)
            .bindPopup("<div style='font-weight:bold; color:#56B4E9; font-size:1.1rem; text-align:center;'>📍 あなたの現在地</div>").openPopup();
    });
}