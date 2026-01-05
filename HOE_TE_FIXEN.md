# 🔧 Hoe te Fixen: 401 Error bij Offertes & Instellingen

## ✅ Wat ik heb gedaan:

1. **Service Role Key toegevoegd** - De backend heeft nu een hardcoded fallback voor de SERVICE_ROLE_KEY
2. **Uitgebreide logging toegevoegd** - De backend logt nu alles wat er gebeurt tijdens authenticatie
3. **Debug Panel gemaakt** - Je kunt nu eenvoudig testen of de backend werkt

## 📋 Stappen om te fixen:

### **Stap 1: Hard Refresh** (BELANGRIJK!)
De backend server moet opnieuw opstarten met de nieuwe code:

- **Windows/Linux**: Druk `Ctrl + Shift + R`
- **Mac**: Druk `Cmd + Shift + R`

Dit zorgt dat:
- De frontend opnieuw laadt
- De backend server opnieuw start met de nieuwe code
- Alle nieuwe fixes actief worden

---

### **Stap 2: Test met het Debug Panel**

Na de hard refresh zie je op het Dashboard een oranje "Debug Panel":

1. **Klik op "Test Health"**
   - Als dit werkt → Backend is bereikbaar ✅
   - Als dit niet werkt → Backend is niet gestart ❌

2. **Klik op "Test Profile"**
   - Als dit werkt → Je token is geldig ✅
   - Als dit 401 geeft → Token probleem ❌

3. **Klik op "Test Quotation"**
   - Als dit werkt → Offertes aanmaken zou moeten werken ✅
   - Als dit 401 geeft → Token probleem ❌

---

### **Stap 3: Als je nog steeds 401 krijgt**

**A) Log opnieuw in:**
1. Klik op "Uitloggen"
2. Log opnieuw in met je gegevens
3. Probeer het opnieuw

**B) Check de Console Logs:**
1. Druk F12 (open DevTools)
2. Ga naar "Console" tab
3. Je zou moeten zien:

```
=== Server Starting ===
Using SUPABASE_URL: https://xnxespizqorrfxtvukkz.supabase.co
SUPABASE_ANON_KEY configured: eyJhbGciOiJIUzI1NiIsInR5...
SERVICE_ROLE_KEY configured: true
```

4. Wanneer je een offerte aanmaakt, zou je moeten zien:

```
POST /quotations - Request received
POST /quotations - Access token present: true
POST /quotations - Verifying user...
POST /quotations - Auth result: { hasUser: true, userId: '...' }
POST /quotations - Quotation created successfully!
```

**C) Check voor error details:**

Als je een error ziet, kopieer de volledige error message uit de console en deel die met mij.

---

## 🎯 Wat de error betekent:

### **401 Unauthorized** kan betekenen:

1. **JWT token is verlopen**
   - Oplossing: Log opnieuw in
   
2. **Token wordt niet correct verzonden**
   - Check in Debug Panel of "Access token" aanwezig is
   
3. **Backend kan token niet valideren**
   - Check of SUPABASE_ANON_KEY correct is (zie backend logs)
   
4. **Supabase configuratie mismatch**
   - De frontend en backend moeten dezelfde keys gebruiken

---

## 🚀 Quick Fix Checklist:

- [ ] Hard refresh gedaan (Ctrl+Shift+R of Cmd+Shift+R)
- [ ] Debug Panel zichtbaar op Dashboard
- [ ] "Test Health" button werkt
- [ ] Opnieuw ingelogd als Test Profile niet werkt
- [ ] Console logs gecheckt (F12)
- [ ] Nog steeds probleem? → Deel console logs

---

## 💡 Extra Info:

Het Debug Panel is **tijdelijk** toegevoegd om het probleem te diagnosticeren. Je kunt het later verwijderen als alles werkt.

De backend logs zijn nu **zeer uitgebreid** - dit helpt om exact te zien waar het mis gaat.

---

## ❓ Nog steeds problemen?

Deel de volgende informatie:

1. **Console logs** (F12 → Console tab, kopieer alles)
2. **Debug Panel resultaat** (screenshot van wat "Test Profile" en "Test Quotation" laten zien)
3. **Exacte error message** die je ziet in het scherm

Dan kan ik het verder debuggen! 🔍
