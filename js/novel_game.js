// --- プレイヤーの行動データ（愛他性のスコア記録） ---
let altruismScores = {
    family: 0,     // 家族への愛他性（1.5章）
    individual: 0, // 個人への愛他性（1章）
    group: 0,      // 集団への愛他性（2章）
    resource: 0,   // 資源の愛他性（3章・毛布）
    labor: 0       // 労力の愛他性（3章・トイレ）
};

// --- ゲームエンジンの状態 ---
let currentSceneId = "intro1";
let textIndex = 0;
let isTyping = false;
let typeInterval;

// --- DOM要素 ---
const textWindow = document.getElementById('text-window');
const messageText = document.getElementById('message-text');
const clickIndicator = document.getElementById('click-indicator');
const choicesContainer = document.getElementById('choices-container');
const gameContainer = document.getElementById('game-container');
const resultScreen = document.getElementById('result-screen');

// --- シナリオデータ ---
const scenario = {
    "intro1": {
        bg: "#050505",
        texts: [
            "2011年3月11日、金曜日。14時46分。",
            "あなたがあの瞬間、どこで何をしていたか。それは、あなた自身が一番よく覚えているはずです。",
            "学校の教室だったかもしれないし、職場のデスクだったかもしれない。",
            "では、想像してください。\nもしあの時、あなたが「見知らぬ海沿いの街」にいたら——。"
        ],
        next: "intro2"
    },
    "intro2": {
        bg: "#2a2a2a", // 少し明るく（駅の構内）
        texts: [
            "あなたは今、海から歩いて数分の場所にある駅にいます。",
            "周りには、旅行客や下校中の学生など、「全く見知らぬ他者」が混在しています。",
            "その時でした。\nポケットのスマートフォンが、けたたましく鳴り響きました。",
            "『——緊急地震速報です。強い揺れに警戒してください』",
            "直後、立っていられないほどの激しい揺れが襲いかかってきました。\n地鳴りのような重低音。物が落ちる音や悲鳴。",
            "……永遠に続くかのように長く感じられた揺れが、ようやく収まりました。"
        ],
        next: "ch1_5_dilemma"
    },
    "ch1_5_dilemma": {
        bg: "#1a1a1a",
        texts: [
            "ここで一つ、あなたの心の中に思い浮かべてほしい人がいます。\n同居している家族。離れて暮らす親。恋人。大切な友人。",
            "その大切な人が今、あなたよりもさらに「海の近く」にいると想像してください。",
            "『大津波警報が発表されました。直ちに高台へ避難してください！』",
            "防災無線を聞いた瞬間、強烈な不安がよぎります。\n海側へ走って探しに行けば間に合うかもしれない。しかし、それは自ら津波に向かうことを意味します。"
        ],
        choices: [
            { text: "自分の命の危険を冒してでも、大切な人を助けるために海側へ走り出す", next: "ch1_5_A", score: { family: 2 } },
            { text: "大切な人の生き抜く力を信じ、引き裂かれる思いを抱えながら自分だけ高台へ走る", next: "ch1_5_B", score: { family: 0 } },
            { text: "連絡がつくまで、公衆電話の列に並ぶなどしてその場に留まる", next: "ch1_5_C", score: { family: 1 } }
        ]
    },
    "ch1_5_A": {
        bg: "#220000",
        texts: [
            "あなたは海に向かって走り出しました。\nしかし、数百メートル進んだところで、避難してくる人々の波に逆らえなくなりました。",
            "「ダメだ、もう波が来てる！ 引き返せ！」\n見知らぬ男性に突き飛ばされるように制止され、あなたは我に返りました。",
            "これ以上進めば、確実に死ぬ。\nあなたは涙を拭い、高台への道へと引き返しました。"
        ],
        next: "ch1_dilemma"
    },
    "ch1_5_B": {
        bg: "#111",
        texts: [
            "「絶対に生きていてくれ」\nあなたは心の中で祈りながら、高台への避難経路に向かって走り出しました。"
        ],
        next: "ch1_dilemma"
    },
    "ch1_5_C": {
        bg: "#111",
        texts: [
            "あなたは駅の公衆電話に並びましたが、全く繋がりません。\n周囲の慌ただしい空気に急き立てられ、あなたもついに避難を始めました。"
        ],
        next: "ch1_dilemma"
    },
    "ch1_dilemma": {
        bg: "#2a2a2a",
        texts: [
            "あなたが駅の出口に向かって走り出そうとした、その時です。",
            "目の前で、杖をついた見知らぬ高齢の女性が転倒してしまいました。\n自力で立ち上がれず苦しそうにしています。",
            "周りにいる大人は、パニックになり女性を避けるようにして外へ向かっています。\n津波が来るまで、あと何分あるかわかりません。"
        ],
        choices: [
            { text: "女性に駆け寄り、肩を貸して一緒に高台へ向かう", next: "ch1_A", score: { individual: 2 } },
            { text: "「誰か手伝ってください！」と大声で周囲を巻き込みつつ、自分は避難を急ぐ", next: "ch1_B", score: { individual: 1 } },
            { text: "目を逸らし、自分だけで一目散に高台へ走る", next: "ch1_C", score: { individual: 0 } }
        ]
    },
    "ch1_A": {
        bg: "#1a1a2e",
        texts: [
            "激痛からか女性の足取りは絶望的に遅く、歩みは平時の半分以下になりました。\n（このままでは共倒れになるかもしれない……）",
            "恐怖で足がすくみそうになったその時。\n「代わります！」\n後ろから走ってきた若者が、女性のもう片方の腕を支えてくれました。",
            "偶然の助けによって歩みが速まり、間一髪で高台の神社へとたどり着くことができました。"
        ],
        next: "ch2_dilemma"
    },
    "ch1_B": {
        bg: "#1a1a2e",
        texts: [
            "あなたの異常を知らせる大声と、本気で逃げる姿が周囲の空気を引き裂きました。",
            "「やばい、本当に来るぞ！」\n我に返った数人の大人が女性を背負い、あなたの後を追うように走り始めました。",
            "あなたの「率先して逃げる姿」が、結果的に人々を動かし、全員が高台の神社へたどり着きました。"
        ],
        next: "ch2_dilemma"
    },
    "ch1_C": {
        bg: "#1a1a2e",
        texts: [
            "自分の命が最優先だ。\nあなたは目を逸らして全力で駆け出し、誰よりも早く安全な高台の神社へたどり着きました。",
            "確実に生き延びたものの、心の中に「あれで良かったのか」という鉛のように重いしこりが残りました。"
        ],
        next: "ch2_dilemma"
    },
    "ch2_dilemma": {
        bg: "#1a1a2e",
        texts: [
            "高台の神社の境内には、逃げてきた人々が身を寄せていました。\n「ここは市の指定避難所だから大丈夫だよ」\n大人たちが互いに安心させるように言葉を交わしています。",
            "しかし、ふと眼下の海を見たあなたは背筋が凍りました。\n水平線の彼方から、巨大な「黒い壁」が迫ってきていたのです。",
            "（……ダメだ。ここも危ない）\n境内の奥には、さらに高い裏山へ続く石段があります。",
            "しかし周囲の大人たちは変化に気づいておらず、座り込んだまま動こうとしません。"
        ],
        choices: [
            { text: "空気を読まず「ここは危ない！裏山まで走って！」と叫び、全員を立たせようとする", next: "ch2_A", score: { group: 2 } },
            { text: "隣にいる数人にだけ「上に行きましょう」と小声で促し、少人数で静かに裏山へ移動する", next: "ch2_B", score: { group: 1 } },
            { text: "大人が大丈夫と言っているのだから過剰に怖がるのはやめようと、自分を納得させる", next: "ch2_C", score: { group: 0 } }
        ]
    },
    "ch2_A": {
        bg: "#000",
        texts: [
            "あなたの必死な形相につられて海を見た若者が、「本当だ、逃げろ！」と叫び返しました。",
            "その一言でパニックと狂騒が広がり、人々は一斉に裏山の石段へ駆け上がり始めました。",
            "全員が裏山に到達した直後。轟音と共に、さっきまで皆が座っていた境内に、黒い濁流が雪崩れ込んできました。\nあなたの勇気が、数十人の命を救ったのです。"
        ],
        next: "ch3_intro"
    },
    "ch2_B": {
        bg: "#000",
        texts: [
            "あなたは数人にだけ声をかけ、足早に石段を登りました。",
            "裏山の中腹から見下ろすと、直後に黒い濁流が神社の境内へと這い上がってきました。\n逃げ遅れた人々がパニックになり、石段に殺到します。",
            "（もっと強く、全員に警告していれば……！）\nあなたは冷たい後悔に胸を締め付けられました。"
        ],
        next: "ch3_intro"
    },
    "ch2_C": {
        bg: "#000",
        texts: [
            "『ゴゴゴゴゴゴゴ……！！』\nただの波の音ではないと気づいた時には、遅すぎました。",
            "真っ黒な濁流が木々をなぎ倒しながら境内に雪崩れ込みます。\n狂乱状態の中、あなたも泥にまみれながら必死に裏山へよじ登りました。",
            "間一髪で助かりましたが、判断の甘さがもう少しで命を奪うところでした。"
        ],
        next: "ch3_intro"
    },
    "ch3_intro": {
        bg: "#0a1128", // 冷たい青
        texts: [
            "街は完全に水没し、夜が訪れました。\n生き残った人々は、さらに高台にある中学校の体育館へ避難しました。",
            "電気も暖房もなく、気温は氷点下近く。外には雪が舞っています。\n備蓄は圧倒的に足りず、毛布は数人に1枚配られるかどうかという絶望的な状況です。"
        ],
        next: "ch3_dilemma1"
    },
    "ch3_dilemma1": {
        bg: "#0a1128",
        texts: [
            "あなたは運良く1枚の毛布を受け取ることができました。\nしかしふと横を見ると、薄着の高齢者が紫色になった唇で激しく震えています。",
            "このままでは低体温症で命に関わるかもしれません。\nしかし、この毛布を手放せば、自分がどうなるかわかりません。"
        ],
        choices: [
            { text: "「一緒に使いましょう」と声をかけ、毛布を広げて肩を寄せ合う", next: "ch3_d1_A", score: { resource: 1 } },
            { text: "無言で自分の毛布を相手に被せ、自分は寒さに耐える", next: "ch3_d1_B", score: { resource: 2 } },
            { text: "申し訳なさを押し殺して、自分だけで毛布に包まる", next: "ch3_d1_C", score: { resource: 0 } }
        ]
    },
    "ch3_d1_A": {
        bg: "#0a1128",
        texts: [ "互いの体温を分け合いながら、長くて過酷な夜を耐え凌ぎました。" ],
        next: "ch3_dilemma2"
    },
    "ch3_d1_B": {
        bg: "#0a1128",
        texts: [ "あなたは凍えるような寒さに耐え抜きました。あなたの自己犠牲が、一つの命を繋ぎ留めました。" ],
        next: "ch3_dilemma2"
    },
    "ch3_d1_C": {
        bg: "#0a1128",
        texts: [ "まずは自分が生き延びなければならない。あなたは目を閉じ、震える夜を越えました。" ],
        next: "ch3_dilemma2"
    },
    "ch3_dilemma2": {
        bg: "#111",
        texts: [
            "翌朝。断水により水洗トイレは使えず、すでに汚物が溢れかえる地獄のような有様になっていました。",
            "避難所のまとめ役が大声で呼びかけます。\n「トイレの状況が限界です。水運びと掃除をしてくれる方はいませんか……！」",
            "誰もが目を伏せました。\nもちろん、あなた自身も極限まで疲れ切っており、泥水と汚物にまみれる作業など絶対にやりたくありません。"
        ],
        choices: [
            { text: "無言で立ち上がり、「やります」と名乗り出る", next: "ch3_d2_A", score: { labor: 2 } },
            { text: "「誰か一緒に行きませんか！」と周囲に声をかけ、数人を巻き込んでから立ち上がる", next: "ch3_d2_B", score: { labor: 1 } },
            { text: "疲労が限界に達しており、他の誰かがやってくれることを願って目を伏せる", next: "ch3_d2_C", score: { labor: 0 } }
        ]
    },
    "ch3_d2_A": {
        bg: "#111",
        texts: [
            "あなたがバケツを手に取り汚れを洗い流し始めた背中を、多くの大人が見ていました。",
            "気づけば、一人、また一人と手伝いに来てくれました。\nあなたの行動が、絶望に沈んでいた避難所の空気を変えたのです。"
        ],
        next: "ending"
    },
    "ch3_d2_B": {
        bg: "#111",
        texts: [
            "あなたの声掛けにハッとした数人の大人が、重い腰を上げました。\n協力して作業にあたることで、避難所に少しだけ「共助」の空気が生まれました。"
        ],
        next: "ending"
    },
    "ch3_d2_C": {
        bg: "#111",
        texts: [
            "結局、数人の疲れ果てた大人たちが無言で掃除に向かいました。\n避難所には「自分たちだけで生き抜くしかない」という刺々しい空気が蔓延し始めました。"
        ],
        next: "ending"
    },
    "ending": {
        bg: "#223344", // 夜明けの空
        texts: [
            "震災から3日目の朝。\nヘリコプターの音が響き、自衛隊員たちが救援物資を抱えて駆け込んできました。",
            "「もう大丈夫です！ 助けに来ました！」\nあちこちで安堵の涙が上がります。",
            "生き延びるための選択。他人を思いやる選択。\nあなたは様々な決断を下し、この過酷な時間を生き抜きました。",
            "「津波てんでんこ」——それは自分だけが助かればいいという言葉ではありません。\n互いの無事を信じ、率先して逃げることで全員の命を救う、究極の思いやりの言葉です。",
            "あの日の疑似体験は、ここで終わります。\nしかし、本当の備えは、ここから始まります。"
        ],
        next: "show_result"
    }
};

// --- エンジンロジック ---
function startGame() {
    currentSceneId = "intro1";
    showScene(currentSceneId);
}

function showScene(sceneId) {
    if (sceneId === "show_result") {
        // 結果画面に行くときは雪を消す
        document.getElementById('snow-container').innerHTML = '';
        document.getElementById('snow-container').style.display = 'none';
        showResultScreen();
        return;
    }

    const scene = scenario[sceneId];
    gameContainer.style.backgroundColor = scene.bg || "#000";
    textIndex = 0;
    choicesContainer.innerHTML = ''; // 選択肢をクリア

    // 第3章（ch3_intro）に入ったら雪を降らせる
    if (sceneId === "ch3_intro") {
        createSnow();
    }
    
    showNextText();
}

function showNextText() {
    const scene = scenario[currentSceneId];
    
    if (textIndex < scene.texts.length) {
        // テキストのタイピング表示
        isTyping = true;
        clickIndicator.style.display = 'none';
        messageText.innerHTML = '';
        const currentText = scene.texts[textIndex];
        let charIndex = 0;
        
        clearInterval(typeInterval);
        typeInterval = setInterval(() => {
            messageText.innerHTML += currentText.charAt(charIndex) === '\n' ? '<br>' : currentText.charAt(charIndex);
            charIndex++;
            if (charIndex >= currentText.length) {
                clearInterval(typeInterval);
                isTyping = false;
                clickIndicator.style.display = 'block';
            }
        }, 40); // タイピング速度（ミリ秒）
        textIndex++;
    } else {
        // テキストを読み終わったら選択肢を表示、または次のシーンへ
        if (scene.choices) {
            clickIndicator.style.display = 'none';
            showChoices(scene.choices);
        } else if (scene.next) {
            currentSceneId = scene.next;
            showScene(currentSceneId);
        }
    }
}

// テキストウィンドウクリックで進む
textWindow.addEventListener('click', () => {
    // 【追加】選択肢が表示されている間は、テキストウィンドウのクリックを無効化する
    if (choicesContainer.innerHTML !== '') return;

    if (isTyping) {
        // タイピング中なら一気に表示してスキップ
        clearInterval(typeInterval);
        const scene = scenario[currentSceneId];
        messageText.innerHTML = scene.texts[textIndex - 1].replace(/\n/g, '<br>');
        isTyping = false;
        clickIndicator.style.display = 'block';
    } else {
        // タイピング完了後なら、シンプルに次の処理（テキストor選択肢or次シーン）へ進む
        showNextText();
    }
});

function showChoices(choices) {
    choicesContainer.innerHTML = '';
    choices.forEach(choice => {
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.innerText = choice.text;
        btn.onclick = () => {
            // スコアを加算
            if (choice.score) {
                for (let key in choice.score) {
                    altruismScores[key] += choice.score[key];
                }
            }
            choicesContainer.innerHTML = '';
            currentSceneId = choice.next;
            showScene(currentSceneId);
        };
        choicesContainer.appendChild(btn);
    });
}

// --- リザルト画面の生成 ---
function showResultScreen() {
    gameContainer.style.display = 'none';
    textWindow.style.display = 'none';
    resultScreen.style.display = 'flex';

    const feedbackArea = document.getElementById('feedback-area');
    let feedbackHtml = '';

    // スコアに基づくフィードバック生成
    if (altruismScores.family >= 2) {
        feedbackHtml += `<h4>⚠️ 家族への強い愛他性</h4><p>身内を助けたいという強い愛情は尊いものですが、津波避難においては「共倒れ」を招く最も危険な行動です。事前の避難場所の共有が何より重要です。</p>`;
    } else {
        feedbackHtml += `<h4>✅ 津波てんでんこの実践</h4><p>家族の無事を信じて高台へ走った決断は、心理的に非常に苦しいものですが、災害時において最も生存率の高い合理的な選択です。</p>`;
    }

    if (altruismScores.individual >= 2) {
        feedbackHtml += `<h4>⚠️ 直接的な救助のリスク</h4><p>見知らぬ人を助けたあなたの行動は立派ですが、自らの命も危険に晒しました。周囲に助けを求め「率先避難者」になることが、全体を救う鍵になります。</p>`;
    }

    if (altruismScores.group >= 2 || altruismScores.labor >= 1) {
        feedbackHtml += `<h4>🌟 コミュニティを救う愛他性</h4><p>同調圧力を打ち破る警告や、誰もが嫌がる作業を引き受けたあなたの行動は、集団の空気を変える「リーダーシップ的愛他性」です。避難所ではあなたのような存在が不可欠です。</p>`;
    }

    feedbackArea.innerHTML = `<div class="feedback-text">${feedbackHtml}</div>`;

    // メダルの付与
    const medalId = "memory_inheritor";
    const medalNotification = document.getElementById('medal-notification');
    medalNotification.innerHTML = `
        <div style="font-size: 3rem; margin-bottom: 10px;">🎖️</div>
        <h3 style="color: #56B4E9; margin: 0;">記憶の継承者</h3>
        <p style="color: #aaa; font-size: 0.85rem;">追体験シミュレーターを完了しました。</p>
    `;

    let earnedMedals = JSON.parse(localStorage.getItem('quake_medals')) || [];
    if (!earnedMedals.includes(medalId)) {
        earnedMedals.push(medalId);
        localStorage.setItem('quake_medals', JSON.stringify(earnedMedals));
    }
}

// ゲーム起動
window.onload = startGame;

// --- 追加：雪降るエフェクトの生成 ---
function createSnow() {
    const snowContainer = document.getElementById('snow-container');
    snowContainer.style.display = 'block';
    
    // 50個の雪の結晶（白い丸）を生成
    for (let i = 0; i < 50; i++) {
        const snow = document.createElement('div');
        snow.style.position = 'absolute';
        snow.style.backgroundColor = '#FFF';
        snow.style.borderRadius = '50%';
        snow.style.opacity = Math.random() * 0.5 + 0.3; // 透明度をランダムに
        
        // サイズ設定（2px 〜 5px）
        const size = Math.random() * 3 + 2;
        snow.style.width = `${size}px`;
        snow.style.height = `${size}px`;
        
        // 初期位置（X軸はランダム、Y軸は画面上部のさらに上から）
        snow.style.left = `${Math.random() * 100}%`;
        snow.style.top = `-${Math.random() * 20}%`;
        
        // アニメーション設定（落下速度と揺らぎ）
        const fallDuration = Math.random() * 5 + 5; // 5秒〜10秒かけて落ちる
        const swayAmount = Math.random() * 20 - 10; // 左右の揺れ幅
        
        snow.animate([
            { transform: `translate(0, 0)` },
            { transform: `translate(${swayAmount}vw, 120vh)` }
        ], {
            duration: fallDuration * 1000,
            iterations: Infinity,
            easing: 'linear',
            delay: Math.random() * 5000 // 降り始めをバラバラにする
        });
        
        snowContainer.appendChild(snow);
    }
}