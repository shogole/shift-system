@AGENTS.md

# CLAUDE.md — kitchenlab-shift

## 何か
キッチンラボ（飲食店）のスタッフ15〜20名が使うシフト管理Webアプリ。

## なぜか
Excelや口頭でのシフト調整が煩雑で、希望提出・確認・確定の一連の流れをスマホで完結させたかった。

## 今どこか（更新日: 2026-04-29）
- ✅ スタッフ機能: シフト希望提出（今月後半/来月前半）・テンプレ管理（曜日一括入力）・確定シフト確認
- ✅ 管理者ダッシュボード: スプレッドシート形式グリッド（確定/却下/時間編集/ヘルプミー行）
- ✅ 管理者: 日別詳細・スタッフ管理・予算設定・日報・ポイント管理
- ✅ ヘルプミー: グリッドから枠登録 → 一斉通知
- ✅ Vercel本番デプロイ済み
- ❌ プッシュ通知（Web Push / VAPID）— 後回し

## 次は何か
1. **プッシュ通知** — ヘルプミー一斉送信時にiPhoneに届くように（VAPID設定が必要）
2. ユーザーからの追加要望に応じて

## どうやるか
- **本番URL**: https://kitchenlab-shift-git-main-shogoles-projects.vercel.app
- **GitHub**: https://github.com/shogole/kitchenlab-shift（pushで自動デプロイ）
- スタッフURL: `/staff/[staffId]`（staffsテーブルのUUID）
- 管理者URL: `/admin`（パスワード: Vercel環境変数 ADMIN_PASSWORD）
- RLS無効、Supabase anon keyで全アクセス
- コミットは必ずWHYを書く、commit → pushをセットで行う
- 仕様変更時はCLAUDE.mdを先に更新してからコミット

## シフト提出サイクル
- 今月後半（16〜末日）の締切 = 当月5日
- 来月前半（1〜15日）の締切 = 当月20日
