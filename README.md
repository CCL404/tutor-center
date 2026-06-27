# 📚 補習社管理系統 (Tutor Center)

三層角色管理系統：管理員 / 老師 / 學生

## 技術棧

- **Next.js 16** (App Router + Turbopack)
- **Supabase** (PostgreSQL + Auth + RLS)
- **Tailwind CSS** + **shadcn/ui**
- **Vercel** 部署

## 快速開始

### 1. 建立 Supabase 專案

1. 前往 [supabase.com](https://supabase.com) 建立新專案
2. 在 SQL Editor 中執行 `supabase/migrations/001_schema.sql`
3. 在 Authentication → Settings 中啟用 **Email/Password** 登入方式
4. 複製專案的 **Project URL** 和 **anon key**

### 2. 設定環境變數

```bash
cp .env.local .env.local
# 編輯 .env.local，填入你的 Supabase 憑證
```

### 3. 啟動開發伺服器

```bash
npm install
npm run dev
```

### 4. 建立管理員帳號

1. 前往 `/login` 註冊第一個帳號
2. 在 Supabase Table Editor 中，將該用戶的 `profiles.role` 改為 `admin`
3. 在 Supabase Authentication → Users 中找到該用戶，修改 `raw_user_meta_data`：
   ```json
   { "name": "你的名字" }
   ```

### 5. 新增老師/學生

1. 管理員登入後到「老師管理」和「學生管理」
2. 先在 Supabase Auth 中為老師/學生建立帳號
3. 再到後台管理頁面編輯他們的詳細資料

## 角色權限

### 管理員
- 儀表板：今日概覽、出席率、欠費統計
- 課表管理：週曆視圖、新增/編輯/刪除課堂
- 老師管理：編輯科目、顏色標示
- 學生管理：搜尋、編輯備註
- 財務報表：總覽、明細、標記繳費
- 通知中心：記錄發送訊息

### 老師
- 我的課表：週曆視圖
- 出席標記：今日課堂學生出席/缺席/補課
- 學生列表：查看自己教的學生

### 學生
- 我的課表：即將上課的卡片列表
- 出席記錄：歷史出席記錄
- 繳費狀況：應繳/已繳/欠費查詢

## 部署到 Vercel

```bash
npm run build    # 確保建置成功
npx vercel --prod  # 部署
```

需要在 Vercel 專案設定中填入 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY`。

## 後續開發

- [ ] WhatsApp/Email 通知自動發送（Resend / Twilio）
- [ ] 匯出課表 PDF/CSV
- [ ] 自動建立循環課堂（按 is_recurring）
