# キッチンラボ シフト管理システム 設計書

**作成日**: 2026-04-27
**ステータス**: 承認済み
**店舗名**: キッチンラボ
**対象人数**: 15〜20名

---

## 背景・目的

- 管理者のシフト作成時間を削減する
- スタッフが毎回同じ時間を入力する手間をなくす
- 予算管理・人件費率の可視化により経営判断を支援する

このシステムを作る前に決まった設計判断の理由：

- **認証をパスワードなしにした理由**: スタッフ画面は自分のシフト提出のみで他人の情報が見えないため、URL漏洩のリスクが実質ない。管理者画面のみパスワード保護。
- **前半・後半の2回締切にした理由**: 現場運用に合わせ、毎月5日（前半1〜15日分）・20日（後半16〜末日分）を締切とする。
- **ポイント制を採用した理由**: 不足シフトへの応援を強制ではなく自発的インセンティブで解決し、管理者の手間を最小化するため。
- **Supabase（PostgreSQL）を選んだ理由**: 予算集計・残業計算など数値処理が多いためSQLが得意なRDBが適切。管理画面でデータを直接確認できる利点もある。
- **Next.js + Vercelを選んだ理由**: フロント・API・DB連携を1プロジェクトで完結でき、Vercelへのデプロイが最も簡単。

---

## アーキテクチャ

**技術スタック**
- フレームワーク: Next.js (App Router)
- データベース: Supabase (PostgreSQL)
- デプロイ: Vercel（無料枠）
- 外部連携: Google Sheets API（日報・ポイント出力 / 後フェーズ）

**URL構成**
```
/                        # トップ（名前選択）
/staff/[name]/calendar   # シフト希望提出カレンダー
/staff/[name]/schedule   # 確定シフト閲覧（全員の名前・時間表示）
/staff/[name]/templates  # テンプレ管理
/admin/                  # 管理者ダッシュボード（パスワード保護）
/admin/daily/[date]      # 日報（売上・人件費・残業）
/admin/offers            # 応援シフト管理
/admin/points            # ポイント承認
/admin/settings          # スタッフ・予算・計算式設定
```

**データフロー**
1. スタッフが希望日をタップ → テンプレ選択 → Supabaseに保存
2. 管理者がカレンダーで全員の希望確認 → 予算超過・人手不足を自動検出
3. シフト確定 → スタッフの確定シフト画面に反映 + アプリ内通知
4. 不足日が出た場合 → 全員に応援通知 → 応募者を管理者が承認 → ポイント加算
5. 日報入力（売上）→ 人件費・人件費率を自動計算表示

---

## 画面設計

### スタッフ画面（スマホ想定）

**トップ（名前選択）**
- キッチンラボロゴ
- スタッフ名ボタン一覧（タップで入室）
- パスワードなし・名前選択のみ

**ホーム**
- 今月の希望提出数・確定数・ポイント残高表示
- 応援シフト募集通知（バナー表示）

**シフト提出カレンダー**
- 前半（1〜15日）/ 後半（16〜末日）タブ切り替え
- 締切まであと○日バナー表示
- 日付タップ → テンプレ1〜3から選択ポップアップ
- 希望済みの日はゴールドで表示
- 送信ボタンで確定

**テンプレ管理**
- テンプレ最大3つ
- 各テンプレ: 名前・開始時間・終了時間（必須）・曜日固定（任意）
- テンプレは翌月以降もそのまま使い回せる（リセットなし）
- 通知設定: 締切日（5日・20日）のアプリ内通知ON/OFF

**確定シフト閲覧**
- 月カレンダーで全員の名前・時間を表示
- 自分が希望したが却下された日: 赤字・取り消し線
- 管理者が追加した日: オレンジ強調
- 日付タップ → その日のメンバー一覧表示

### 管理者画面（PC想定、パスワード保護）

**ダッシュボード**
- 月カレンダー: 各日に出勤スタッフ名・人件費・予算比を表示
- 予算超過の日: 赤ハイライト
- 人手不足の日: 黄ハイライト
- 月合計予算・人件費見込み・消化率バー
- シフト確定ボタン（確定後スタッフ側に反映）

**日報 (/admin/daily/[date])**
- 売上入力欄
- 人件費: シフトから自動計算・表示（内訳付き）
- 人件費率 = 人件費 ÷ 売上 × 100%（目標値と比較表示）
- 残業記録: スタッフ選択・分数・理由入力
- ※Googleシート連携は後フェーズで追加（アプリ本体に影響なし）

**応援シフト管理**
- 不足日一覧
- 「全員に通知」ボタン → 全スタッフにアプリ内通知送信
- 応募者一覧 → 承認するとシフト確定 + ポイント付与

**ポイント管理**
- スタッフ別ポイント一覧
- 管理者承認フロー
- Googleシートへの月締め出力ボタン（後フェーズ）

**設定**
- スタッフ登録: 名前・雇用種別（アルバイト/社員）・時給 or 月給
- 社員日給計算式: 月給 ÷ 稼働日数（稼働日数は変更可）
- 1日の予算設定: 平日・土日祝の別
- シフト締切日設定（現在: 5日・20日）

---

## データ構造（Supabase）

```sql
-- スタッフ
staffs (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  employment_type text NOT NULL, -- 'part_time' | 'full_time'
  hourly_rate integer,           -- アルバイトの場合
  monthly_salary integer,        -- 社員の場合
  working_days_per_month integer DEFAULT 22, -- 社員の稼働日数
  created_at timestamptz DEFAULT now()
)

-- テンプレ（翌月も継続使用）
shift_templates (
  id uuid PRIMARY KEY,
  staff_id uuid REFERENCES staffs,
  slot integer NOT NULL,         -- 1, 2, 3
  label text,                    -- テンプレ名（例: ランチ）
  start_time time NOT NULL,
  end_time time NOT NULL,
  days_of_week integer[],        -- 任意: [1,3,5] = 月水金
  updated_at timestamptz DEFAULT now()
)

-- シフト希望・確定
shift_requests (
  id uuid PRIMARY KEY,
  staff_id uuid REFERENCES staffs,
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  status text DEFAULT 'pending',  -- 'pending' | 'confirmed' | 'rejected' | 'added'
  -- added: 管理者がスタッフ希望なしで追加したケース
  created_at timestamptz DEFAULT now()
)

-- アプリ内通知
notifications (
  id uuid PRIMARY KEY,
  staff_id uuid REFERENCES staffs, -- NULLなら全員向け
  message text NOT NULL,
  type text,                        -- 'deadline' | 'offer' | 'confirmed'
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
)

-- ポイント
points (
  id uuid PRIMARY KEY,
  staff_id uuid REFERENCES staffs,
  date date NOT NULL,
  amount integer NOT NULL,
  reason text,
  approved boolean DEFAULT false,
  approved_at timestamptz,
  created_at timestamptz DEFAULT now()
)

-- 日報
daily_reports (
  id uuid PRIMARY KEY,
  date date UNIQUE NOT NULL,
  revenue integer,               -- 売上
  total_labor_cost integer,      -- 人件費合計（自動計算）
  labor_rate numeric,            -- 人件費率（%）
  overtime_logs jsonb,           -- [{staff_id, minutes, reason}]
  created_at timestamptz DEFAULT now()
)

-- 設定
settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL
  -- 例: {weekday_budget: 45000, holiday_budget: 55000}
  -- 例: {salary_formula: "monthly / working_days"}
  -- 例: {deadline_first_half: 5, deadline_second_half: 20}
)
```

---

## 人件費計算ロジック

```
アルバイト: 時給 × 勤務時間（時間）
社員:       月給 ÷ settings.working_days_per_month
1日の合計:  その日の確定シフト全員分を合算
人件費率:   合計人件費 ÷ 売上 × 100
```

---

## セキュリティ方針

- スタッフ画面: 認証なし（名前選択のみ）/ 自分のシフト提出・閲覧のみ
- 確定シフト: 全員の名前・時間は見えるが時給・人件費は非表示
- 管理者画面: サーバーサイドでパスワード検証（環境変数で管理）
- URL: 推測されにくいランダムパスは不要（スタッフ画面の情報漏洩リスクが低いため）

---

## フェーズ分け

**フェーズ1（本実装）**
- スタッフ画面全機能
- 管理者ダッシュボード・日報・応援・ポイント・設定
- アプリ内通知

**フェーズ2（後日追加）**
- Googleシート連携（日報の人件費・売上・ポイント出力）
- 日報フォーマット確定後に実装
- アプリ本体への影響なし（外部API呼び出しのみ追加）

---

## 未決定事項

- 管理者パスワードの運用方法（環境変数 or Supabase Auth）
- ポイント1ptあたりの給与換算レート（運用開始後に決定）
- 人件費率の目標値（現在のモックでは25%以下を仮設定）
