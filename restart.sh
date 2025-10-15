#!/bin/bash
# 全プロセス終了
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:3004 | xargs kill -9 2>/dev/null
pkill -f "next dev" 2>/dev/null
sleep 1

# 全キャッシュ削除
rm -rf .next
rm -rf node_modules/.cache

# 再起動
npm run dev
