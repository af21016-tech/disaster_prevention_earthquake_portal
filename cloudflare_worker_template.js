/**
 * Cloudflare Workers用 ログ収集プロキシスクリプト (ES Modules 形式)
 * 
 * 役割:
 * 1. CORSプリフライトリクエスト(OPTIONS)に対応し、許可するオリジンからのアクセスを許可する。
 * 2. クライアントからのPOSTリクエストを受け取り、環境変数 GAS_URL に設定されたURLに転送する。
 * 3. 任意のセキュリティルール（IPレートリミットやOrigin制限）を追加可能。
 */

// 許可するオリジンの判定関数（ローカルテスト用、GitHub Pages、nullオリジンを自動許可）
function isAllowedOrigin(origin) {
  if (!origin) return true; // Originヘッダーがない（CORS対象外の直接リクエスト等）は許可
  if (origin === "null") return true; // iframeやローカルファイル(file://)からのリクエストを許可
  
  // localhost または 127.0.0.1 の全ポートを許可
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    return true;
  }
  
  // github.io の全サブドメイン（https）を許可
  if (/^https:\/\/[a-zA-Z0-9-]+\.github\.io$/.test(origin)) {
    return true;
  }
  
  return false;
}

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get("Origin");

    // Originが許可ルールに適合しているかチェック
    const allowed = isAllowedOrigin(origin);

    // CORS用の共通ヘッダーを設定
    const corsHeaders = {
      "Access-Control-Allow-Origin": allowed ? (origin || "*") : "null",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400", // 24時間キャッシュ
    };

    // 1. OPTIONSリクエスト（CORSプリフライト）の処理
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    // 2. POSTリクエスト以外のメソッドをブロック
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: corsHeaders
      });
    }

    // 3. 許可されていないオリジンからのPOSTリクエストを拒否
    if (!allowed) {
      return new Response("Forbidden (CORS)", {
        status: 403,
        headers: corsHeaders
      });
    }

    // 4. 環境変数にGAS_URLが設定されているか確認
    if (!env.GAS_URL) {
      return new Response(JSON.stringify({ error: "Internal Server Error: GAS_URL is not configured." }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    try {
      // フロントエンドからのリクエストデータ（テキスト/JSON）をそのまま取得
      const requestBody = await request.text();

      // GAS Web App へ転送
      // ※GASはPOSTリクエストに対して302リダイレクトを返すため、redirect: "follow" にしておく必要があります。
      const gasResponse = await fetch(env.GAS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain" // GASでdoPostを受ける際はtext/plainがシンプルで安全
        },
        body: requestBody,
        redirect: "follow"
      });

      // GASからのレスポンスをフロントエンドにそのまま返す（CORSヘッダーを付与）
      const responseText = await gasResponse.text();
      return new Response(responseText, {
        status: gasResponse.status,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: "Failed to forward log data", details: error.message }), {
        status: 502,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
  }
};
