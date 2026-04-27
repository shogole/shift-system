# Kitchen Lab シフト管理 Plan 1: Foundation + Staff Features

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** スタッフがシフトテンプレを登録し、希望日をカレンダーで提出・確認できる状態を構築する

**Architecture:** Next.js App Router + Supabase (PostgreSQL)。スタッフ画面はパスワードなし・名前選択のみ。全データはSupabaseに保存。計算ロジックはTDDで実装する純粋関数として分離。

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Supabase (supabase-js + ssr), Jest

---

## File Structure

```
kitchenlab-shift/
├── app/
│   ├── layout.tsx                        # Root layout (font, meta)
│   ├── page.tsx                          # トップ: スタッフ名選択
│   ├── staff/
│   │   └── [staffId]/
│   │       ├── layout.tsx               # スタッフ共通レイアウト (BottomNav)
│   │       ├── page.tsx                 # ホーム (提出数・ポイント・通知)
│   │       ├── templates/page.tsx       # テンプレ管理
│   │       ├── calendar/page.tsx        # シフト希望提出カレンダー
│   │       └── schedule/page.tsx        # 確定シフト閲覧
│   └── admin/                           # Plan 2 で実装
├── components/
│   ├── MonthCalendar.tsx                # 汎用月カレンダーコンポーネント
│   ├── BottomNav.tsx                    # スタッフ用ボトムナビ
│   └── TemplateSelectPopup.tsx         # テンプレ選択ポップアップ
├── lib/
│   ├── supabase/
│   │   ├── client.ts                    # ブラウザ用 Supabase クライアント
│   │   └── server.ts                    # サーバー用 Supabase クライアント
│   ├── types.ts                         # 全型定義
│   └── calculations.ts                  # 人件費・時間計算 (純粋関数)
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql       # DB スキーマ
├── __tests__/
│   └── calculations.test.ts             # 計算ロジックのテスト
└── .env.local                           # Supabase 接続情報 (git 管理外)
```

---

## Task 1: プロジェクトセットアップ

**Files:**
- Create: `package.json` (Next.js scaffold)
- Create: `.env.local`
- Create: `jest.config.ts`
- Modify: `.gitignore`

- [ ] **Step 1: Next.js アプリを既存ディレクトリに初期化**

```bash
cd /Users/shogole/Documents/iCloud/kitchenlab-shift
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*" --skip-git
```

`既存のファイルを上書きしますか？` と聞かれた場合は `y` で進む。`docs/` は上書きされない。

- [ ] **Step 2: 依存パッケージをインストール**

```bash
npm install @supabase/supabase-js @supabase/ssr
npm install -D jest @types/jest ts-jest jest-environment-node
```

- [ ] **Step 3: Jest 設定を追加**

`jest.config.ts` を作成:

```typescript
import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
}

export default config
```

- [ ] **Step 4: `.gitignore` に `.env.local` が含まれているか確認**

```bash
grep ".env.local" .gitignore
```

含まれていない場合は追加:
```bash
echo ".env.local" >> .gitignore
```

- [ ] **Step 5: 開発サーバーが起動するか確認**

```bash
npm run dev
```

ブラウザで `http://localhost:3000` を開き、Next.js のデフォルト画面が表示されれば OK。`Ctrl+C` で停止。

- [ ] **Step 6: コミット**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: initialize Next.js project for Kitchen Lab shift management

Next.js 14 (App Router) + TypeScript + Tailwind CSS + Supabase のスタック確定。
スタッフ15-20名向けシフト管理システムの基盤。
認証なし（スタッフは名前選択のみ）、管理者はパスワード保護（Plan 2 で実装）。

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Supabase プロジェクト作成 + DB スキーマ

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`
- Create: `.env.local`

- [ ] **Step 1: Supabase プロジェクト作成**

1. https://supabase.com にアクセスしてサインアップ（GitHub アカウントで OK）
2. `New Project` → プロジェクト名: `kitchenlab-shift` → リージョン: `Northeast Asia (Tokyo)` → パスワードを設定してメモ → `Create new project`
3. 作成完了まで約2分待つ

- [ ] **Step 2: 接続情報を取得**

Supabase ダッシュボード → `Settings` → `API` → 以下をコピー:
- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

- [ ] **Step 3: `.env.local` を作成**

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxxxxx
ADMIN_PASSWORD=任意のパスワード（管理者が使う）
```

- [ ] **Step 4: マイグレーションファイルを作成**

`supabase/migrations/001_initial_schema.sql`:

```sql
-- スタッフ
create table staffs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  employment_type text not null check (employment_type in ('part_time', 'full_time')),
  hourly_rate integer,
  monthly_salary integer,
  working_days_per_month integer not null default 22,
  created_at timestamptz not null default now()
);

-- シフトテンプレ（翌月も継続使用）
create table shift_templates (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staffs(id) on delete cascade,
  slot integer not null check (slot in (1, 2, 3)),
  label text,
  start_time time not null,
  end_time time not null,
  days_of_week integer[],  -- [1,3,5] = 月水金 (1=月 ... 7=日)
  updated_at timestamptz not null default now(),
  unique (staff_id, slot)
);

-- シフト希望・確定
create table shift_requests (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staffs(id) on delete cascade,
  date date not null,
  start_time time not null,
  end_time time not null,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'rejected', 'added')),
  -- added: 管理者がスタッフ希望なしで追加したシフト
  created_at timestamptz not null default now(),
  unique (staff_id, date)
);

-- アプリ内通知
create table notifications (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid references staffs(id) on delete cascade,  -- null = 全員向け
  message text not null,
  type text not null check (type in ('deadline', 'offer', 'confirmed')),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ポイント（Plan 3 で機能実装、テーブルは今作る）
create table points (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staffs(id) on delete cascade,
  date date not null,
  amount integer not null,
  reason text,
  approved boolean not null default false,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

-- 日報（Plan 3 で機能実装、テーブルは今作る）
create table daily_reports (
  id uuid primary key default gen_random_uuid(),
  date date unique not null,
  revenue integer,
  total_labor_cost integer,
  labor_rate numeric(5,2),
  overtime_logs jsonb default '[]',
  created_at timestamptz not null default now()
);

-- システム設定
create table settings (
  key text primary key,
  value jsonb not null
);

-- デフォルト設定を挿入
insert into settings (key, value) values
  ('budget', '{"weekday": 45000, "weekend": 55000}'),
  ('deadline', '{"first_half": 5, "second_half": 20}'),
  ('salary_formula', '{"working_days_per_month": 22}');

-- RLS を無効化（認証なしのため）
alter table staffs disable row level security;
alter table shift_templates disable row level security;
alter table shift_requests disable row level security;
alter table notifications disable row level security;
alter table points disable row level security;
alter table daily_reports disable row level security;
alter table settings disable row level security;
```

- [ ] **Step 5: Supabase ダッシュボードでスキーマを実行**

Supabase ダッシュボード → `SQL Editor` → 上記 SQL を貼り付け → `Run`

エラーなく完了すれば OK。`Table Editor` でテーブルが作成されているか確認。

- [ ] **Step 6: テストデータを挿入（動作確認用）**

SQL Editor で実行:

```sql
insert into staffs (name, employment_type, hourly_rate) values
  ('田中 翔', 'part_time', 1200),
  ('佐藤 花', 'full_time', null),
  ('鈴木 大輝', 'part_time', 1100),
  ('山田 美咲', 'part_time', 1050),
  ('伊藤 健', 'part_time', 1150);

update staffs set monthly_salary = 220000 where name = '佐藤 花';
```

- [ ] **Step 7: コミット**

```bash
git add supabase/ .gitignore
git commit -m "$(cat <<'EOF'
feat: add database schema and test data

全テーブル（staffs, shift_templates, shift_requests, notifications, points, daily_reports, settings）を作成。
RLS は認証なし設計のため無効化。
ポイント・日報テーブルは Plan 3 実装予定だが今スキーマを確定しておく（後から変えるとデータが壊れるため）。

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: 型定義 + 計算ユーティリティ (TDD)

**Files:**
- Create: `lib/types.ts`
- Create: `lib/calculations.ts`
- Create: `__tests__/calculations.test.ts`

- [ ] **Step 1: 型定義を作成**

`lib/types.ts`:

```typescript
export type EmploymentType = 'part_time' | 'full_time'
export type ShiftStatus = 'pending' | 'confirmed' | 'rejected' | 'added'
export type NotificationType = 'deadline' | 'offer' | 'confirmed'

export interface Staff {
  id: string
  name: string
  employment_type: EmploymentType
  hourly_rate?: number
  monthly_salary?: number
  working_days_per_month: number
  created_at: string
}

export interface ShiftTemplate {
  id: string
  staff_id: string
  slot: 1 | 2 | 3
  label?: string
  start_time: string  // "10:00:00"
  end_time: string    // "15:00:00"
  days_of_week?: number[]  // [1,3,5] = 月水金
  updated_at: string
}

export interface ShiftRequest {
  id: string
  staff_id: string
  date: string        // "2025-05-01"
  start_time: string  // "10:00:00"
  end_time: string    // "15:00:00"
  status: ShiftStatus
  created_at: string
}

export interface Notification {
  id: string
  staff_id?: string
  message: string
  type: NotificationType
  is_read: boolean
  created_at: string
}

export interface Point {
  id: string
  staff_id: string
  date: string
  amount: number
  reason?: string
  approved: boolean
  approved_at?: string
  created_at: string
}

export interface DailyReport {
  id: string
  date: string
  revenue?: number
  total_labor_cost?: number
  labor_rate?: number
  overtime_logs: Array<{ staff_id: string; minutes: number; reason: string }>
  created_at: string
}

export interface Settings {
  budget: { weekday: number; weekend: number }
  deadline: { first_half: number; second_half: number }
  salary_formula: { working_days_per_month: number }
}
```

- [ ] **Step 2: テストを先に書く（TDD）**

`__tests__/calculations.test.ts`:

```typescript
import {
  calculateHours,
  calculateShiftCost,
  calculateDailyLaborCost,
  calculateLaborRate,
  formatTime,
  getShiftPeriod,
} from '@/lib/calculations'
import { Staff, ShiftRequest } from '@/lib/types'

describe('calculateHours', () => {
  it('5時間のシフトを正しく計算する', () => {
    expect(calculateHours('10:00:00', '15:00:00')).toBe(5)
  })
  it('7時間30分のシフトを正しく計算する', () => {
    expect(calculateHours('10:00:00', '17:30:00')).toBe(7.5)
  })
  it('深夜をまたがないシフトで正しく計算する', () => {
    expect(calculateHours('17:00:00', '22:00:00')).toBe(5)
  })
})

describe('calculateShiftCost', () => {
  const partTimeStaff: Staff = {
    id: '1', name: '田中', employment_type: 'part_time',
    hourly_rate: 1200, working_days_per_month: 22, created_at: ''
  }
  const fullTimeStaff: Staff = {
    id: '2', name: '佐藤', employment_type: 'full_time',
    monthly_salary: 220000, working_days_per_month: 22, created_at: ''
  }

  it('アルバイト: 時給×時間を計算する', () => {
    expect(calculateShiftCost(partTimeStaff, '10:00:00', '15:00:00')).toBe(6000)
  })
  it('社員: 月給÷稼働日数を計算する', () => {
    expect(calculateShiftCost(fullTimeStaff, '09:00:00', '18:00:00')).toBe(10000)
    // 220000 / 22 = 10000
  })
  it('時給なしのアルバイトは0を返す', () => {
    const noRate: Staff = { ...partTimeStaff, hourly_rate: undefined }
    expect(calculateShiftCost(noRate, '10:00:00', '15:00:00')).toBe(0)
  })
})

describe('calculateDailyLaborCost', () => {
  const staff1: Staff = {
    id: '1', name: '田中', employment_type: 'part_time',
    hourly_rate: 1200, working_days_per_month: 22, created_at: ''
  }
  const staff2: Staff = {
    id: '2', name: '鈴木', employment_type: 'part_time',
    hourly_rate: 1100, working_days_per_month: 22, created_at: ''
  }
  const shifts: ShiftRequest[] = [
    { id: 'a', staff_id: '1', date: '2025-05-01', start_time: '10:00:00', end_time: '15:00:00', status: 'confirmed', created_at: '' },
    { id: 'b', staff_id: '2', date: '2025-05-01', start_time: '10:00:00', end_time: '16:00:00', status: 'confirmed', created_at: '' },
  ]
  const staffMap = new Map([['1', staff1], ['2', staff2]])

  it('複数スタッフの人件費合計を計算する', () => {
    // 田中: 1200 * 5 = 6000, 鈴木: 1100 * 6 = 6600, 合計 12600
    expect(calculateDailyLaborCost(shifts, staffMap)).toBe(12600)
  })
  it('シフトが空の場合は0を返す', () => {
    expect(calculateDailyLaborCost([], staffMap)).toBe(0)
  })
})

describe('calculateLaborRate', () => {
  it('人件費率を小数点1桁で返す', () => {
    expect(calculateLaborRate(42000, 185000)).toBe(22.7)
  })
  it('売上が0の場合は0を返す', () => {
    expect(calculateLaborRate(42000, 0)).toBe(0)
  })
})

describe('formatTime', () => {
  it('HH:MM:SS を HH:MM に変換する', () => {
    expect(formatTime('10:00:00')).toBe('10:00')
  })
  it('すでに HH:MM 形式はそのまま返す', () => {
    expect(formatTime('10:00')).toBe('10:00')
  })
})

describe('getShiftPeriod', () => {
  it('1〜15日は "first" を返す', () => {
    expect(getShiftPeriod('2025-05-01')).toBe('first')
    expect(getShiftPeriod('2025-05-15')).toBe('first')
  })
  it('16〜末日は "second" を返す', () => {
    expect(getShiftPeriod('2025-05-16')).toBe('second')
    expect(getShiftPeriod('2025-05-31')).toBe('second')
  })
})
```

- [ ] **Step 3: テストが失敗することを確認**

```bash
npx jest __tests__/calculations.test.ts
```

Expected: FAIL (calculations.ts が存在しないため)

- [ ] **Step 4: 計算ロジックを実装**

`lib/calculations.ts`:

```typescript
import { Staff, ShiftRequest } from '@/lib/types'

/** "10:00:00" → 10.0, "10:30:00" → 10.5 のように時間を数値変換 */
function timeToMinutes(time: string): number {
  const parts = time.split(':')
  return parseInt(parts[0]) * 60 + parseInt(parts[1])
}

/** 開始時間〜終了時間の時間数を返す */
export function calculateHours(startTime: string, endTime: string): number {
  return (timeToMinutes(endTime) - timeToMinutes(startTime)) / 60
}

/** 1スタッフのシフト人件費を返す */
export function calculateShiftCost(
  staff: Staff,
  startTime: string,
  endTime: string
): number {
  if (staff.employment_type === 'part_time') {
    if (!staff.hourly_rate) return 0
    return staff.hourly_rate * calculateHours(startTime, endTime)
  } else {
    if (!staff.monthly_salary) return 0
    return Math.round(staff.monthly_salary / staff.working_days_per_month)
  }
}

/** 1日分の全シフトの人件費合計を返す */
export function calculateDailyLaborCost(
  shifts: ShiftRequest[],
  staffMap: Map<string, Staff>
): number {
  return shifts.reduce((total, shift) => {
    const staff = staffMap.get(shift.staff_id)
    if (!staff) return total
    return total + calculateShiftCost(staff, shift.start_time, shift.end_time)
  }, 0)
}

/** 人件費率（%）を小数点1桁で返す */
export function calculateLaborRate(laborCost: number, revenue: number): number {
  if (revenue === 0) return 0
  return Math.round((laborCost / revenue) * 1000) / 10
}

/** "10:00:00" → "10:00" に整形 */
export function formatTime(time: string): string {
  return time.slice(0, 5)
}

/** 日付が前半(1-15)か後半(16-末)かを返す */
export function getShiftPeriod(date: string): 'first' | 'second' {
  const day = parseInt(date.split('-')[2])
  return day <= 15 ? 'first' : 'second'
}
```

- [ ] **Step 5: テストが通ることを確認**

```bash
npx jest __tests__/calculations.test.ts
```

Expected: 全テスト PASS

- [ ] **Step 6: コミット**

```bash
git add lib/ __tests__/
git commit -m "$(cat <<'EOF'
feat: add type definitions and calculation utilities (TDD)

人件費計算・時間計算・人件費率計算を純粋関数として実装。
アルバイトは時給×時間、社員は月給÷稼働日数で計算。
全関数はテスト先行で実装（TDD）。

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Supabase クライアント設定

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`

- [ ] **Step 1: ブラウザ用クライアントを作成**

`lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 2: サーバー用クライアントを作成**

`lib/supabase/server.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

- [ ] **Step 3: 接続確認**

`app/page.tsx` を一時的に書き換えてスタッフ一覧を取得できるか確認:

```typescript
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = createClient()
  const { data: staffs, error } = await supabase.from('staffs').select('*')
  if (error) return <div>Error: {error.message}</div>
  return (
    <div>
      {staffs?.map(s => <div key={s.id}>{s.name}</div>)}
    </div>
  )
}
```

```bash
npm run dev
```

ブラウザで `http://localhost:3000` を開き、スタッフ名（田中 翔、佐藤 花…）が表示されれば OK。

- [ ] **Step 4: コミット**

```bash
git add lib/supabase/
git commit -m "$(cat <<'EOF'
feat: add Supabase client setup (browser + server)

ブラウザ用・サーバー用の Supabase クライアントを分離。
Next.js App Router の Server Components から直接 DB にアクセスできる構成。
認証なしのため RLS は無効、全操作は anon key で実行。

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: グローバルスタイル + 共通コンポーネント

**Files:**
- Modify: `app/globals.css`
- Create: `components/BottomNav.tsx`

- [ ] **Step 1: グローバルスタイルにブランドカラーを設定**

`app/globals.css` の内容を以下に置き換え:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --brand-dark: #1a1a2e;
  --brand-gold: #e8c97e;
}

body {
  background-color: #f5f5f5;
  font-family: -apple-system, BlinkMacSystemFont, 'Hiragino Kaku Gothic ProN', sans-serif;
}
```

- [ ] **Step 2: `tailwind.config.ts` にブランドカラーを追加**

`tailwind.config.ts` の `theme.extend` に追加:

```typescript
theme: {
  extend: {
    colors: {
      brand: {
        dark: '#1a1a2e',
        gold: '#e8c97e',
      },
    },
  },
},
```

- [ ] **Step 3: BottomNav コンポーネントを作成**

`components/BottomNav.tsx`:

```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface BottomNavProps {
  staffId: string
}

const navItems = [
  { label: 'ホーム', icon: '🏠', path: '' },
  { label: 'シフト提出', icon: '📅', path: '/calendar' },
  { label: '確定シフト', icon: '✅', path: '/schedule' },
  { label: 'テンプレ', icon: '⚙️', path: '/templates' },
]

export default function BottomNav({ staffId }: BottomNavProps) {
  const pathname = usePathname()
  const base = `/staff/${staffId}`

  return (
    <nav className="sticky bottom-0 bg-white border-t border-gray-200 flex pb-3">
      {navItems.map((item) => {
        const href = `${base}${item.path}`
        const isActive = item.path === ''
          ? pathname === base
          : pathname.startsWith(`${base}${item.path}`)
        return (
          <Link
            key={item.path}
            href={href}
            className={`flex-1 flex flex-col items-center gap-1 pt-2 text-xs ${
              isActive ? 'text-brand-dark font-bold' : 'text-gray-400'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
```

- [ ] **Step 4: コミット**

```bash
git add app/globals.css tailwind.config.ts components/
git commit -m "$(cat <<'EOF'
feat: add brand colors and BottomNav component

ブランドカラー (#1a1a2e, #e8c97e) を Tailwind に登録。
スタッフ画面の共通ボトムナビを実装。

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: トップページ（名前選択）

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: ルートレイアウトを更新**

`app/layout.tsx`:

```typescript
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'キッチンラボ シフト管理',
  description: 'キッチンラボ スタッフ用シフト管理システム',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className="max-w-sm mx-auto min-h-screen bg-white">
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 2: トップページを実装**

`app/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function TopPage() {
  const supabase = createClient()
  const { data: staffs } = await supabase
    .from('staffs')
    .select('id, name')
    .order('created_at')

  return (
    <div>
      <div className="bg-brand-dark text-white text-center py-12 px-4">
        <h1 className="text-3xl font-bold text-brand-gold">Kitchen Lab</h1>
        <p className="text-gray-400 text-sm mt-2">シフト管理システム</p>
      </div>

      <div className="p-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">
          名前を選んでください
        </p>
        <div className="grid grid-cols-2 gap-3">
          {staffs?.map((staff) => (
            <Link
              key={staff.id}
              href={`/staff/${staff.id}`}
              className="border-2 border-gray-200 rounded-xl p-4 text-center font-bold text-gray-700 hover:border-brand-gold hover:bg-amber-50 transition-colors"
            >
              {staff.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 動作確認**

```bash
npm run dev
```

`http://localhost:3000` でスタッフ名の一覧が表示され、クリックすると `/staff/[id]` に遷移することを確認。（まだスタッフページは未実装なので 404 でOK）

- [ ] **Step 4: コミット**

```bash
git add app/
git commit -m "$(cat <<'EOF'
feat: add top page with staff name selection

スタッフ名一覧を Supabase から取得して表示。
名前をタップすると /staff/[id] に遷移。
認証なし・パスワードなしの設計（スタッフ画面は自分のシフト提出のみで情報漏洩リスクなし）。

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: スタッフレイアウト + ホームページ

**Files:**
- Create: `app/staff/[staffId]/layout.tsx`
- Create: `app/staff/[staffId]/page.tsx`

- [ ] **Step 1: スタッフ共通レイアウトを作成**

`app/staff/[staffId]/layout.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import BottomNav from '@/components/BottomNav'

export default async function StaffLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { staffId: string }
}) {
  const supabase = createClient()
  const { data: staff } = await supabase
    .from('staffs')
    .select('id, name')
    .eq('id', params.staffId)
    .single()

  if (!staff) notFound()

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-brand-dark text-white px-4 py-3">
        <h2 className="text-brand-gold font-bold">{staff.name} さん</h2>
        <p className="text-gray-400 text-xs mt-0.5">キッチンラボ シフト管理</p>
      </header>
      <main className="flex-1 overflow-y-auto pb-16">
        {children}
      </main>
      <BottomNav staffId={params.staffId} />
    </div>
  )
}
```

- [ ] **Step 2: ホームページを作成**

`app/staff/[staffId]/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'

export default async function StaffHome({
  params,
}: {
  params: { staffId: string }
}) {
  const supabase = createClient()

  // 今月の希望提出数
  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`

  const { data: requests } = await supabase
    .from('shift_requests')
    .select('status')
    .eq('staff_id', params.staffId)
    .gte('date', monthStart)
    .lte('date', monthEnd)

  const totalRequests = requests?.length ?? 0
  const confirmedCount = requests?.filter(r => r.status === 'confirmed').length ?? 0

  // ポイント合計
  const { data: points } = await supabase
    .from('points')
    .select('amount')
    .eq('staff_id', params.staffId)
    .eq('approved', true)

  const totalPoints = points?.reduce((sum, p) => sum + p.amount, 0) ?? 0

  // 未読の応援オファー通知
  const { data: notifications } = await supabase
    .from('notifications')
    .select('id, message, type, created_at')
    .or(`staff_id.eq.${params.staffId},staff_id.is.null`)
    .eq('is_read', false)
    .eq('type', 'offer')
    .order('created_at', { ascending: false })
    .limit(3)

  return (
    <div className="p-4">
      {/* 応援オファー通知 */}
      {notifications && notifications.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 mb-4">
          <p className="text-sm font-bold text-amber-800">📢 応援シフト募集中</p>
          <p className="text-xs text-amber-700 mt-1">{notifications[0].message}</p>
          <div className="flex gap-2 mt-2">
            <button className="bg-brand-gold text-brand-dark text-xs font-bold px-3 py-1.5 rounded-lg">
              応募する
            </button>
            <button className="border border-gray-300 text-xs px-3 py-1.5 rounded-lg">
              後で見る
            </button>
          </div>
        </div>
      )}

      {/* 今月の集計 */}
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">
        今月の提出状況
      </p>
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-brand-dark">{totalRequests}</p>
          <p className="text-xs text-gray-400 mt-1">希望提出日数</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-green-500">{confirmedCount}</p>
          <p className="text-xs text-gray-400 mt-1">確定シフト数</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-brand-gold">{totalPoints}</p>
          <p className="text-xs text-gray-400 mt-1">ポイント</p>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 動作確認**

```bash
npm run dev
```

`http://localhost:3000` でスタッフ名をクリック → ホーム画面が表示されボトムナビが機能することを確認。

- [ ] **Step 4: コミット**

```bash
git add app/staff/
git commit -m "$(cat <<'EOF'
feat: add staff layout and home page

スタッフ共通レイアウト（ヘッダー + BottomNav）を実装。
ホームに今月の希望提出数・確定数・ポイント残高・応援通知を表示。
staffId が存在しない場合は 404 を返す。

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: テンプレ管理ページ

**Files:**
- Create: `app/staff/[staffId]/templates/page.tsx`

- [ ] **Step 1: テンプレ管理ページを作成**

`app/staff/[staffId]/templates/page.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ShiftTemplate } from '@/lib/types'
import { formatTime } from '@/lib/calculations'

const DAYS = ['', '月', '火', '水', '木', '金', '土', '日']
const SLOTS = [1, 2, 3] as const

export default function TemplatesPage({
  params,
}: {
  params: { staffId: string }
}) {
  const supabase = createClient()
  const [templates, setTemplates] = useState<Partial<ShiftTemplate>[]>([
    { slot: 1 }, { slot: 2 }, { slot: 3 },
  ])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    supabase
      .from('shift_templates')
      .select('*')
      .eq('staff_id', params.staffId)
      .then(({ data }) => {
        if (!data) return
        setTemplates(prev =>
          prev.map(t => data.find(d => d.slot === t.slot) ?? t)
        )
      })
  }, [params.staffId])

  function updateTemplate(slot: number, field: string, value: string | number[]) {
    setTemplates(prev =>
      prev.map(t => t.slot === slot ? { ...t, [field]: value } : t)
    )
  }

  function toggleDay(slot: number, day: number) {
    const tmpl = templates.find(t => t.slot === slot)
    const current = tmpl?.days_of_week ?? []
    const next = current.includes(day)
      ? current.filter(d => d !== day)
      : [...current, day]
    updateTemplate(slot, 'days_of_week', next)
  }

  async function handleSave() {
    setSaving(true)
    for (const tmpl of templates) {
      if (!tmpl.start_time || !tmpl.end_time) continue
      await supabase.from('shift_templates').upsert({
        staff_id: params.staffId,
        slot: tmpl.slot,
        label: tmpl.label ?? null,
        start_time: tmpl.start_time,
        end_time: tmpl.end_time,
        days_of_week: tmpl.days_of_week ?? null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'staff_id,slot' })
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="p-4">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">
        テンプレ管理（最大3つ）
      </p>
      <p className="text-xs text-gray-400 mb-4">
        一度設定したテンプレは翌月以降もそのまま使えます
      </p>

      <div className="space-y-3 mb-4">
        {SLOTS.map((slot) => {
          const tmpl = templates.find(t => t.slot === slot) ?? { slot }
          return (
            <div key={slot} className="border-2 border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-brand-gold text-brand-dark text-xs font-bold px-2 py-0.5 rounded-full">
                  テンプレ {slot}
                </span>
                <input
                  type="text"
                  placeholder="名前（例：ランチ）"
                  value={tmpl.label ?? ''}
                  onChange={e => updateTemplate(slot, 'label', e.target.value)}
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1"
                />
              </div>
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="time"
                  value={tmpl.start_time ? formatTime(tmpl.start_time) : ''}
                  onChange={e => updateTemplate(slot, 'start_time', e.target.value + ':00')}
                  className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                />
                <span className="text-gray-400">〜</span>
                <input
                  type="time"
                  value={tmpl.end_time ? formatTime(tmpl.end_time) : ''}
                  onChange={e => updateTemplate(slot, 'end_time', e.target.value + ':00')}
                  className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">曜日固定（任意）</p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5, 6, 7].map(day => {
                    const selected = tmpl.days_of_week?.includes(day)
                    return (
                      <button
                        key={day}
                        onClick={() => toggleDay(slot, day)}
                        className={`flex-1 py-1 rounded text-xs font-bold transition-colors ${
                          selected
                            ? 'bg-brand-dark text-white'
                            : 'bg-gray-100 text-gray-500'
                        } ${day === 7 ? 'text-red-400' : day === 6 ? 'text-blue-400' : ''}`}
                      >
                        {DAYS[day]}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-brand-dark text-white font-bold py-3 rounded-xl disabled:opacity-50"
      >
        {saved ? '✓ 保存しました' : saving ? '保存中...' : '保存する'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: 動作確認**

```bash
npm run dev
```

`http://localhost:3000` → スタッフ名を選択 → ボトムナビの「テンプレ」をタップ → テンプレを入力して保存 → ページを再読み込みして保存内容が復元されることを確認。

- [ ] **Step 3: コミット**

```bash
git add app/staff/[staffId]/templates/
git commit -m "$(cat <<'EOF'
feat: add template management page

スタッフがシフト時間テンプレ（最大3つ）を登録・編集できるページ。
開始〜終了時間（必須）と曜日固定（任意）を設定可能。
保存は Supabase の upsert で冪等性を保証。テンプレは翌月以降も継続使用。

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: シフト希望提出カレンダー

**Files:**
- Create: `components/MonthCalendar.tsx`
- Create: `components/TemplateSelectPopup.tsx`
- Create: `app/staff/[staffId]/calendar/page.tsx`

- [ ] **Step 1: 月カレンダーコンポーネントを作成**

`components/MonthCalendar.tsx`:

```typescript
'use client'

import { formatTime } from '@/lib/calculations'

interface DayData {
  date: string       // "2025-05-01"
  startTime?: string
  endTime?: string
  status?: 'selected' | 'confirmed' | 'rejected' | 'added'
}

interface MonthCalendarProps {
  year: number
  month: number  // 1-12
  period: 'first' | 'second' | 'all'
  days: Map<string, DayData>
  onDayClick?: (date: string) => void
  readonly?: boolean
}

const DAY_HEADERS = ['日', '月', '火', '水', '木', '金', '土']

export default function MonthCalendar({
  year, month, period, days, onDayClick, readonly = false,
}: MonthCalendarProps) {
  const firstDay = new Date(year, month - 1, 1).getDay()
  const lastDate = new Date(year, month, 0).getDate()

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: lastDate }, (_, i) => i + 1),
  ]

  function isInPeriod(day: number): boolean {
    if (period === 'all') return true
    if (period === 'first') return day <= 15
    return day >= 16
  }

  function getDateStr(day: number): string {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  return (
    <div className="grid grid-cols-7 gap-1">
      {DAY_HEADERS.map((h, i) => (
        <div
          key={h}
          className={`text-center text-xs py-1 font-bold ${
            i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'
          }`}
        >
          {h}
        </div>
      ))}
      {cells.map((day, idx) => {
        if (!day) return <div key={`empty-${idx}`} />

        const dateStr = getDateStr(day)
        const inPeriod = isInPeriod(day)
        const dayData = days.get(dateStr)
        const status = dayData?.status

        const today = new Date()
        const isToday =
          today.getFullYear() === year &&
          today.getMonth() + 1 === month &&
          today.getDate() === day

        let bgClass = 'bg-white hover:bg-gray-50'
        let textClass = 'text-gray-700'
        let borderClass = isToday ? 'border-2 border-brand-dark' : 'border border-transparent'

        if (status === 'selected') { bgClass = 'bg-brand-gold'; textClass = 'text-brand-dark font-bold' }
        else if (status === 'confirmed') { bgClass = 'bg-green-500'; textClass = 'text-white font-bold' }
        else if (status === 'rejected') { bgClass = 'bg-red-50'; textClass = 'text-red-400 line-through' }
        else if (status === 'added') { bgClass = 'bg-orange-50'; textClass = 'text-orange-500 font-bold'; borderClass = 'border border-orange-400' }

        const dimmed = !inPeriod && !readonly

        return (
          <button
            key={dateStr}
            onClick={() => !dimmed && !readonly && onDayClick?.(dateStr)}
            disabled={dimmed || readonly}
            className={`
              rounded-lg px-1 py-1.5 min-h-[48px] flex flex-col items-center justify-center
              text-sm transition-colors
              ${bgClass} ${textClass} ${borderClass}
              ${dimmed ? 'opacity-30 cursor-default' : ''}
              ${readonly ? 'cursor-default' : 'cursor-pointer'}
            `}
          >
            <span>{day}</span>
            {dayData?.startTime && (
              <span className="text-[9px] opacity-80 leading-tight">
                {formatTime(dayData.startTime)}-{formatTime(dayData.endTime ?? '')}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: テンプレ選択ポップアップを作成**

`components/TemplateSelectPopup.tsx`:

```typescript
'use client'

import { ShiftTemplate } from '@/lib/types'
import { formatTime } from '@/lib/calculations'

interface TemplateSelectPopupProps {
  templates: ShiftTemplate[]
  onSelect: (template: ShiftTemplate) => void
  onCancel: () => void
}

export default function TemplateSelectPopup({
  templates, onSelect, onCancel,
}: TemplateSelectPopupProps) {
  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-t-2xl p-5 w-full max-w-sm"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="font-bold text-base mb-4">テンプレを選択</h3>
        <div className="space-y-2 mb-3">
          {templates.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              テンプレが登録されていません。先に「テンプレ」タブで設定してください。
            </p>
          ) : (
            templates.map(t => (
              <button
                key={t.id}
                onClick={() => onSelect(t)}
                className="w-full border-2 border-gray-200 rounded-xl p-3 text-left hover:border-brand-gold transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="bg-brand-gold text-brand-dark text-xs font-bold px-2 py-0.5 rounded-full">
                    {t.slot}
                  </span>
                  {t.label && <span className="text-sm text-gray-500">{t.label}</span>}
                </div>
                <p className="text-xl font-bold mt-1">
                  {formatTime(t.start_time)} 〜 {formatTime(t.end_time)}
                </p>
              </button>
            ))
          )}
        </div>
        <button
          onClick={onCancel}
          className="w-full border border-gray-200 rounded-xl py-2.5 text-sm"
        >
          キャンセル
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: シフト希望提出ページを作成**

`app/staff/[staffId]/calendar/page.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ShiftTemplate, ShiftRequest } from '@/lib/types'
import MonthCalendar from '@/components/MonthCalendar'
import TemplateSelectPopup from '@/components/TemplateSelectPopup'

type Period = 'first' | 'second'

export default function CalendarPage({
  params,
}: {
  params: { staffId: string }
}) {
  const supabase = createClient()
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const [period, setPeriod] = useState<Period>('first')
  const [templates, setTemplates] = useState<ShiftTemplate[]>([])
  const [requests, setRequests] = useState<Map<string, ShiftRequest>>(new Map())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // 締切日の計算
  const deadlineDay = period === 'first' ? 5 : 20
  const daysUntilDeadline = deadlineDay - now.getDate()

  useEffect(() => {
    // テンプレ取得
    supabase
      .from('shift_templates')
      .select('*')
      .eq('staff_id', params.staffId)
      .then(({ data }) => setTemplates(data ?? []))

    // 既存の希望取得
    const monthStr = `${year}-${String(month).padStart(2, '0')}`
    supabase
      .from('shift_requests')
      .select('*')
      .eq('staff_id', params.staffId)
      .gte('date', `${monthStr}-01`)
      .lte('date', `${monthStr}-31`)
      .then(({ data }) => {
        const map = new Map<string, ShiftRequest>()
        data?.forEach(r => map.set(r.date, r))
        setRequests(map)
      })
  }, [params.staffId])

  // カレンダー用データ変換
  const calendarDays = new Map(
    Array.from(requests.entries()).map(([date, req]) => [
      date,
      {
        date,
        startTime: req.start_time,
        endTime: req.end_time,
        status: (req.status === 'pending' ? 'selected' : req.status) as 'selected' | 'confirmed' | 'rejected' | 'added',
      },
    ])
  )

  function handleDayClick(date: string) {
    const existing = requests.get(date)
    // 確定・却下・管理者追加済みは変更不可
    if (existing && existing.status !== 'pending') return
    // pending の日を再タップ → 削除（トグル）
    if (existing && existing.status === 'pending') {
      handleRemoveShift(date, existing.id)
      return
    }
    // 空の日をタップ → テンプレ選択ポップアップを開く
    setSelectedDate(date)
  }

  async function handleRemoveShift(date: string, shiftId: string) {
    setSaving(true)
    await supabase.from('shift_requests').delete().eq('id', shiftId)
    setRequests(prev => {
      const next = new Map(prev)
      next.delete(date)
      return next
    })
    setSaving(false)
  }

  async function handleTemplateSelect(template: ShiftTemplate) {
    if (!selectedDate) return
    setSelectedDate(null)
    setSaving(true)
    // 空の日に新しい希望を追加（selectedDate は必ず pending なしの日）
    const { data } = await supabase
      .from('shift_requests')
      .insert({
        staff_id: params.staffId,
        date: selectedDate,
        start_time: template.start_time,
        end_time: template.end_time,
        status: 'pending',
      })
      .select()
      .single()
    if (data) {
      setRequests(prev => new Map(prev).set(selectedDate, data))
    }
    setSaving(false)
  }

  async function handleSubmit() {
    setSaving(true)
    // 現状では pending のままで提出 = 管理者が確認できる状態
    // 実際の「送信」は管理者へのフラグ通知（Plan 2 で管理者側から確認）
    setSubmitted(true)
    setSaving(false)
    setTimeout(() => setSubmitted(false), 3000)
  }

  const pendingCount = Array.from(requests.values()).filter(r => r.status === 'pending').length

  return (
    <div className="p-4">
      {/* 締切バナー */}
      {daysUntilDeadline >= 0 && daysUntilDeadline <= 10 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl px-3 py-2 mb-3 text-sm text-amber-800">
          ⏰ {period === 'first' ? '前半' : '後半'}締切まであと <strong>{daysUntilDeadline}日</strong>
          （{month}月{deadlineDay}日）
        </div>
      )}

      {/* 前半/後半タブ */}
      <div className="flex bg-gray-100 rounded-lg p-0.5 mb-3">
        {(['first', 'second'] as Period[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 py-1.5 rounded-md text-sm font-bold transition-colors ${
              period === p ? 'bg-white text-brand-dark shadow-sm' : 'text-gray-400'
            }`}
          >
            {p === 'first' ? '前半（1〜15日）' : '後半（16〜末日）'}
          </button>
        ))}
      </div>

      {/* カレンダーヘッダー */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold">{year}年 {month}月</h3>
      </div>

      <MonthCalendar
        year={year}
        month={month}
        period={period}
        days={calendarDays}
        onDayClick={handleDayClick}
      />

      {/* 凡例 */}
      <div className="flex gap-3 flex-wrap mt-3 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-brand-gold inline-block" /> 希望提出済み</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500 inline-block" /> 確定</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-50 border border-red-300 inline-block" /> 却下</span>
      </div>

      <button
        onClick={handleSubmit}
        disabled={saving || pendingCount === 0}
        className="w-full mt-4 bg-brand-dark text-white font-bold py-3 rounded-xl disabled:opacity-50"
      >
        {submitted ? '✓ 送信しました' : `希望を送信する（${pendingCount}日）`}
      </button>

      {/* テンプレ選択ポップアップ */}
      {selectedDate && (
        <TemplateSelectPopup
          templates={templates}
          onSelect={handleTemplateSelect}
          onCancel={() => setSelectedDate(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 4: 動作確認**

```bash
npm run dev
```

1. スタッフ名選択 → テンプレタブでテンプレを登録・保存
2. シフト提出タブに移動
3. カレンダーで日付をタップ → テンプレ選択ポップアップが表示される
4. テンプレを選択 → カレンダーにゴールド表示される
5. 送信ボタンを押す

- [ ] **Step 5: コミット**

```bash
git add components/ app/staff/[staffId]/calendar/
git commit -m "$(cat <<'EOF'
feat: add shift submission calendar with template selection

月カレンダーコンポーネント（前半/後半タブ切替）を実装。
日付タップ → テンプレ選択ポップアップ → Supabase に保存の一連のフローを実装。
締切日バナー（5日・20日）を表示。確定・却下済みシフトは変更不可。

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: 確定シフト閲覧ページ

**Files:**
- Create: `app/staff/[staffId]/schedule/page.tsx`

- [ ] **Step 1: 確定シフト閲覧ページを作成**

`app/staff/[staffId]/schedule/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import MonthCalendar from '@/components/MonthCalendar'
import { formatTime } from '@/lib/calculations'

export default async function SchedulePage({
  params,
}: {
  params: { staffId: string }
}) {
  const supabase = createClient()
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const monthStr = `${year}-${String(month).padStart(2, '0')}`

  // 自分のシフト（全ステータス）
  const { data: myRequests } = await supabase
    .from('shift_requests')
    .select('*')
    .eq('staff_id', params.staffId)
    .gte('date', `${monthStr}-01`)
    .lte('date', `${monthStr}-31`)

  // 確定した全員のシフト
  const { data: allConfirmed } = await supabase
    .from('shift_requests')
    .select('*, staffs(name)')
    .eq('status', 'confirmed')
    .gte('date', `${monthStr}-01`)
    .lte('date', `${monthStr}-31`)

  // カレンダー用: 自分のシフトをマップ化（pending は表示上 selected として扱う）
  const calendarDays = new Map(
    myRequests?.map(r => [
      r.date,
      {
        date: r.date,
        startTime: r.start_time,
        endTime: r.end_time,
        status: (r.status === 'pending' ? 'selected' : r.status) as 'selected' | 'confirmed' | 'rejected' | 'added',
      },
    ]) ?? []
  )

  // 日付別の全員シフトをまとめる
  const shiftsByDate = new Map<string, Array<{ name: string; startTime: string; endTime: string }>>()
  allConfirmed?.forEach(r => {
    const existing = shiftsByDate.get(r.date) ?? []
    shiftsByDate.set(r.date, [
      ...existing,
      { name: (r.staffs as { name: string }).name, startTime: r.start_time, endTime: r.end_time },
    ])
  })

  // 今日の日付
  const todayStr = `${year}-${String(month).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const todayShifts = shiftsByDate.get(todayStr) ?? []

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold">{year}年 {month}月</h3>
      </div>

      <MonthCalendar
        year={year}
        month={month}
        period="all"
        days={calendarDays}
        readonly
      />

      {/* 凡例 */}
      <div className="flex gap-3 flex-wrap mt-3 mb-4 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500 inline-block" /> 確定</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-50 border border-red-300 inline-block" /> 希望却下</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-50 border border-orange-400 inline-block" /> 管理者追加</span>
      </div>

      {/* 今日のメンバー */}
      {todayShifts.length > 0 && (
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
            今日のメンバー
          </p>
          {todayShifts.map((s, i) => (
            <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
              <div className="w-8 h-8 rounded-full bg-brand-dark text-brand-gold flex items-center justify-center text-xs font-bold flex-shrink-0">
                {s.name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-bold">{s.name}</p>
                <p className="text-xs text-gray-400">{formatTime(s.startTime)} 〜 {formatTime(s.endTime)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 動作確認**

```bash
npm run dev
```

1. 確定シフトタブを開く
2. 自分のシフトがカラーコードで表示されることを確認
3. 管理者がシフトを確定した後（Plan 2 実装後）に全員のメンバーが表示されることを確認
4. 現時点では自分の pending シフトが selected として表示されていれば OK

- [ ] **Step 3: テストを実行して全て通ることを確認**

```bash
npx jest
```

Expected: 全テスト PASS

- [ ] **Step 4: 最終コミット**

```bash
git add app/staff/[staffId]/schedule/
git commit -m "$(cat <<'EOF'
feat: add confirmed schedule page (Plan 1 complete)

確定シフト閲覧ページを実装。自分のシフトステータス（確定/却下/管理者追加）を
カラーコードで表示。却下は赤取り消し線、管理者追加はオレンジ強調。
今日のメンバー一覧も表示（全員の名前・時間）。

Plan 1 完了: スタッフがシフトテンプレ登録〜希望提出〜確定確認まで一連の操作が可能。

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Plan 1 完了後の状態

- スタッフは名前を選んでシフト希望を提出できる
- テンプレは翌月も使い回せる
- 確定シフトで却下・追加を色で確認できる
- 計算ロジックは全てテスト済み

**次のステップ:** `docs/superpowers/plans/2026-04-27-plan2-admin.md` を作成・実行（管理者ダッシュボード・シフト確定・予算管理）
