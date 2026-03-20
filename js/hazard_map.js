document.addEventListener('DOMContentLoaded', () => {
    initHazardMap();
});

function initHazardMap() {
    // マップの初期化（東京周辺をデフォルト表示）
    const map = L.map('hazard-map', {
        zoomControl: false, // デフォルトのズームを消して後で配置し直す
        minZoom: 5,
        maxZoom: 15 // タイルの最大ズームレベルに合わせる
    }).setView([35.6812, 139.7671], 11);

    // ズームコントロールを右下に配置（レイヤーコントロールと被らないように）
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // --- 背景地図レイヤー ---
    // 国土地理院 淡色地図（上に色を重ねるため、白黒に近い淡色が見やすい）
    const paleMap = L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png', {
        attribution: "<a href='https://maps.gsi.go.jp/development/ichiran.html' target='_blank'>地理院タイル</a>"
    });

    // 国土地理院 標準地図
    const stdMap = L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png', {
        attribution: "<a href='https://maps.gsi.go.jp/development/ichiran.html' target='_blank'>地理院タイル</a>"
    });

    // デフォルトで淡色地図を追加
    paleMap.addTo(map);

    // --- ハザードマップレイヤー（オーバーレイ） ---
    // 国土地理院 ハザードマップポータルサイトのタイルデータを使用（opacityで透過率を設定）

    // 1. 津波浸水想定
    const tsunamiLayer = L.tileLayer('https://disaportaldata.gsi.go.jp/raster/04_tsunami_newlegend_data/{z}/{x}/{y}.png', {
        opacity: 0.7,
        attribution: "津波浸水想定(国交省等)"
    });

    // 2. 洪水浸水想定区域（想定最大規模）
    const floodLayer = L.tileLayer('https://disaportaldata.gsi.go.jp/raster/01_flood_l2_shinsuishin_data/{z}/{x}/{y}.png', {
        opacity: 0.6,
        attribution: "洪水浸水想定(国交省等)"
    });

    // 3. 土砂災害警戒区域（土石流）
    const debrisFlowLayer = L.tileLayer('https://disaportaldata.gsi.go.jp/raster/05_dosekiryukeikaikuiki/{z}/{x}/{y}.png', {
        opacity: 0.8,
        attribution: "土砂災害警戒区域(都道府県)"
    });

    // 4. 土砂災害警戒区域（急傾斜地の崩壊）
    const steepSlopeLayer = L.tileLayer('https://disaportaldata.gsi.go.jp/raster/05_kyukeishakeikaikuiki/{z}/{x}/{y}.png', {
        opacity: 0.8,
        attribution: "土砂災害警戒区域(都道府県)"
    });

    // 土砂災害は「土石流」と「急傾斜地」をグループ化して一つのレイヤーとして扱うと便利
    const landslideLayer = L.layerGroup([debrisFlowLayer, steepSlopeLayer]);

    // 初期状態では津波レイヤーをオンにしておく
    tsunamiLayer.addTo(map);

    // --- レイヤーコントロールの追加 ---
    // 背景地図（ラジオボタンで1つだけ選択）
    const baseMaps = {
        "地理院地図（淡色）": paleMap,
        "地理院地図（標準）": stdMap
    };

    // ハザードマップ（チェックボックスで複数選択可能）
    const overlayMaps = {
        "🌊 津波浸水想定": tsunamiLayer,
        "💧 洪水浸水想定（想定最大規模）": floodLayer,
        "⛰️ 土砂災害警戒区域": landslideLayer
    };

    // 右上にレイヤー切り替えコントロールを配置
    L.control.layers(baseMaps, overlayMaps, { collapsed: false, position: 'topright' }).addTo(map);

    // --- 現在地取得機能（おまけ） ---
    // 自分の家のリスクをすぐ見られるようにする
    const locateControl = L.control({ position: 'bottomright' });
    locateControl.onAdd = function () {
        const btn = L.DomUtil.create('button', 'leaflet-bar leaflet-control');
        btn.innerHTML = '📍現在地';
        btn.style.padding = '5px 10px';
        btn.style.cursor = 'pointer';
        btn.style.background = '#fff';
        btn.style.border = '2px solid rgba(0,0,0,0.2)';
        btn.style.borderRadius = '4px';
        btn.style.fontWeight = 'bold';
        btn.style.color = '#333';

        btn.onclick = function (e) {
            e.preventDefault();
            map.locate({ setView: true, maxZoom: 13 });
        };
        return btn;
    };
    locateControl.addTo(map);

    // 現在地取得成功時のイベント
    map.on('locationfound', function(e) {
        L.marker(e.latlng).addTo(map)
            .bindPopup("あなたの現在地").openPopup();
    });
}