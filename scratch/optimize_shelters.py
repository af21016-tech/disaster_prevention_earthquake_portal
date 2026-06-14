import json
import os

PREFECTURES = [
    "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
    "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
    "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県",
    "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県",
    "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県",
    "徳島県", "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県",
    "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県"
]

def get_pref(text):
    for p in PREFECTURES:
        if text.startswith(p):
            return p
    return None

def main():
    input_path = "assets/shelters.geojson"
    output_dir = "assets/shelters"
    os.makedirs(output_dir, exist_ok=True)
    
    print("Loading GeoJSON (this might take a few seconds)...")
    if not os.path.exists(input_path):
        print(f"Error: {input_path} not found.")
        return

    with open(input_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    print("Grouping by prefecture and optimizing...")
    pref_data = {p: [] for p in PREFECTURES}
    
    # バウンディングボックス初期化: [min_lat, min_lon, max_lat, max_lon]
    # 初期値は極端な値に設定
    pref_bounds = {p: [90.0, 180.0, -90.0, -180.0] for p in PREFECTURES}
    
    unknown_count = 0
    features = data.get("features", [])
    print(f"Total features to process: {len(features)}")
    
    for feature in features:
        props = feature.get("properties", {})
        geom = feature.get("geometry", {})
        coords = geom.get("coordinates", [])
        
        if not coords or len(coords) < 2:
            continue
            
        lon = round(coords[0], 5)
        lat = round(coords[1], 5)
        
        place_name = props.get("都道府県名及び市町村名", "") or ""
        pref = get_pref(place_name)
        
        if not pref:
            # 共通IDの先頭2桁から都道府県コードを推測する試み (例: E01 -> 北海道, E13 -> 東京都)
            # 共通ID: "E0110000001202"
            common_id = props.get("共通ID", "")
            if len(common_id) >= 3 and common_id.startswith("E"):
                try:
                    pref_code = int(common_id[1:3])
                    if 1 <= pref_code <= 47:
                        pref = PREFECTURES[pref_code - 1]
                except ValueError:
                    pass
        
        if not pref:
            unknown_count += 1
            continue
            
        # 緯度経度の最小・最大値を更新
        bounds = pref_bounds[pref]
        if lat < bounds[0]: bounds[0] = lat # min_lat
        if lon < bounds[1]: bounds[1] = lon # min_lon
        if lat > bounds[2]: bounds[2] = lat # max_lat
        if lon > bounds[3]: bounds[3] = lon # max_lon
        
        name = props.get("施設・場所名") or props.get("施設名") or props.get("指定緊急避難場所名") or "名称不明の避難所"
        
        # 災害フラグ判定 (1 または "1" の場合に True)
        disasters = []
        if str(props.get("洪水", "")).strip() == "1": disasters.append("F")
        if str(props.get("崖崩れ、土石流及び地滑り", "")).strip() == "1": disasters.append("S")
        if str(props.get("高潮", "")).strip() == "1": disasters.append("K")
        if str(props.get("地震", "")).strip() == "1": disasters.append("J")
        if str(props.get("津波", "")).strip() == "1": disasters.append("T")
        if str(props.get("大規模な火事", "")).strip() == "1": disasters.append("H")
        if str(props.get("内水氾濫", "")).strip() == "1": disasters.append("N")
        if str(props.get("火山現象", "")).strip() == "1": disasters.append("V")
        
        optimized_feature = {
            "n": name,
            "c": [lon, lat],
            "d": "".join(disasters)
        }
        
        pref_data[pref].append(optimized_feature)
            
    print(f"Optimizing completed. Unknown features ignored: {unknown_count}")
    
    # 1. 各都道府県の JSON ファイル書き出し
    print("Writing optimized JSON files...")
    for pref, features_list in pref_data.items():
        pref_code = f"{PREFECTURES.index(pref)+1:02d}"
        out_file = os.path.join(output_dir, f"shelters_{pref_code}.json")
        with open(out_file, "w", encoding="utf-8") as out_f:
            json.dump(features_list, out_f, ensure_ascii=False, separators=(',', ':'))
            
    # 2. prefectures.js (JavaScript 設定ファイル) の生成
    print("Generating prefectures.js...")
    pref_config = []
    for pref in PREFECTURES:
        pref_code = f"{PREFECTURES.index(pref)+1:02d}"
        bounds = pref_bounds[pref]
        
        # データが存在しないか無効な場合のフォールバック（日本全体が入るようにする）
        if bounds[0] > 80.0:
            bounds = [30.0, 128.0, 45.0, 145.0]
            
        pref_config.append({
            "code": pref_code,
            "name": pref,
            "bounds": [[bounds[0], bounds[1]], [bounds[2], bounds[3]]] # [[South, West], [North, East]]
        })
        
    js_content = f"// 自動生成された都道府県バウンディングボックス定義\nconst PREFECTURES_CONFIG = {json.dumps(pref_config, ensure_ascii=False, indent=2)};\n"
    
    js_out_path = "js/prefectures.js"
    with open(js_out_path, "w", encoding="utf-8") as js_f:
        js_f.write(js_content)
        
    print("All tasks completed successfully!")

if __name__ == "__main__":
    main()
