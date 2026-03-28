// Worker Secrets の型定義
// worker-configuration.d.ts は `wrangler types` で自動生成されるため、別ファイルで宣言マージする
interface Env {
  API_KEY: string | undefined;
}
