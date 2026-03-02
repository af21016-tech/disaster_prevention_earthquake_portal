// fetch_data.js
const fs = require('fs');
const path = require('path');

// 1. 保存先フォルダ（assets）の自動作成
const assetsDir = path.join(__dirname, 'assets');
if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
    console.log('Created assets directory.');
}

// 2. USGS API エンドポイントとパラメータ (日本周辺 M5以上 1995年〜)
const baseUrl = 'https://earthquake.usgs.gov/fdsnws/event/1/query';
const params = new URLSearchParams({
    format: 'geojson',
    starttime: '1995-01-01',
    endtime: new Date().toISOString().split('T')[0], // 実行時の現在日付
    minmagnitude: '5',
    minlatitude: '20',  // 南端
    maxlatitude: '50',  // 北端
    minlongitude: '120', // 西端
    maxlongitude: '155'  // 東端
});

const targetUrl = `${baseUrl}?${params.toString()}`;

// 3. データ取得と保存のメイン処理
async function fetchEarthquakeData() {
    console.log('USGSからデータを取得中...');
    
    try {
        const response = await fetch(targetUrl);
        if (!response.ok) {
            throw new Error(`HTTPエラー: ${response.status}`);
        }
        
        const data = await response.json();
        const featureCount = data.features.length;
        
        // JSON形式でファイルに書き出し
        const outputPath = path.join(assetsDir, 'japan_eq_archive.geojson');
        fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
        
        console.log(`✅ 成功! ${featureCount} 件の地震データを保存しました: ${outputPath}`);
    } catch (error) {
        console.error('❌ データの取得に失敗しました:', error);
    }
}

fetchEarthquakeData();