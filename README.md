# The Altar of Souls — Railway + Supabase v3.0

## 🚀 الخطوات (7 فقط)

### 1. أنشئ حساب Supabase
- ادخل على [supabase.com](https://supabase.com)
- New Project → اختر منطقة أقرب لك (Frankfurt للشرق الأوسط)
- انتظر 2 دقيقة حتى يجهز

### 2. أنشئ الجداول
- في لوحة التحكم ← **SQL Editor** ← **New query**
- انسخ محتوى `supabase-schema.sql` والصقه
- اضغط **Run**

### 3. احصل على المفاتيح
- **Project Settings → API**
- انسخ:
  - `URL` → سيكون `SUPABASE_URL`
  - `service_role secret` → سيكون `SUPABASE_SERVICE_KEY`

### 4. أنشئ حساب Railway
- [railway.app](https://railway.app) ← سجل بحساب GitHub

### 5. أنشئ مشروع جديد
```
Dashboard → New Project → Empty Project
```

### 6. ارفع الكود
```
في المشروع ← New → Upload Code
← اسحب وأفلت مجلد altar-railway-supabase المفكوك
```

### 7. أضف Environment Variables
```
Project → Variables → New Variable
```

| Name | Value |
|------|-------|
| `BOT_TOKEN` | من BotFather |
| `MISTRESS_CHAT_ID` | رقم الميسترس |
| `CHANNEL_ID` | `-100...` |
| `MASTER_PASSWORD` | كلمة السر |
| `SUPABASE_URL` | من خطوة 3 |
| `SUPABASE_SERVICE_KEY` | من خطوة 3 |
| `FRONTEND_URL` | رابط موقعك |

ثم اضغط **Deploy**.

### 8. اضبط Webhook
```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://your-app.railway.app/api"
```

---

## ✅ جرب
1. افتح موقعك ← اضغط "رفع إثبات"
2. افتح البوت ← أرسل صورة
3. **ستصل للقناة فوراً** ⚡
4. اضغط ✅ أو ❌ في القناة ← يصل إشعار للـ Slave

---

## 🔥 لماذا هذا أفضل من Google Sheets؟

| | Google Sheets | Supabase |
|---|---|---|
| **السرعة** | 2-5 ثوانٍ | **<50ms** |
| **الثبات** | يتعطل | **99.9%** |
| **السعة** | 5 مليون خلية | **500MB مجاناً** |
| **Relations** | ❌ | **✅ Foreign Keys** |
| **Realtime** | ❌ | **✅ WebSockets** |
| **Backup** | يدوي | **تلقائي** |
