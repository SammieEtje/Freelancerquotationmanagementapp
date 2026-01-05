# Troubleshooting Guide - Offerte App

## 404 Error bij het aanmaken van offertes

Als je een **404 error** krijgt wanneer je een offerte probeert aan te maken, volg dan deze stappen:

### Stap 1: Check de Browser Console
1. Open de browser console (druk F12)
2. Ga naar het "Console" tabblad
3. Probeer een offerte aan te maken
4. Zoek naar deze logs:
   - `Sending quotation request to: ...`
   - `Response status: ...`
   - `Response data: ...`

### Stap 2: Check de Backend Logs
De backend zou deze logs moeten tonen:
```
=== Server Starting ===
SUPABASE_URL present: true
SUPABASE_ANON_KEY present: true
Using SUPABASE_URL: https://xnxespizqorrfxtvukkz.supabase.co
SUPABASE_ANON_KEY configured: eyJhbGciOiJIUzI1NiIsInR5...
```

Als je een offerte aanmaakt, zou je moeten zien:
```
POST /quotations - Request received
POST /quotations - Access token present: true
POST /quotations - Verifying user...
POST /quotations - Auth result: { hasUser: true, userId: '...' }
POST /quotations - Quotation created successfully!
```

### Stap 3: Mogelijke Oorzaken

#### A) Backend server is niet gestart
**Symptoom**: De URL is niet bereikbaar, je ziet geen backend logs
**Oplossing**: De server wordt automatisch gestart wanneer je de eerste request maakt

#### B) JWT Token is verlopen
**Symptoom**: Je ziet "Invalid JWT" of 401 errors
**Oplossing**: 
1. Log uit
2. Log opnieuw in
3. Probeer opnieuw

#### C) Access Token ontbreekt
**Symptoom**: `Access token present: false`
**Oplossing**:
1. Check de console voor auth logs
2. Ververs de pagina (F5)
3. Als het probleem blijft bestaan, log opnieuw in

#### D) CORS Error
**Symptoom**: "CORS policy" error in console
**Oplossing**: Dit zou niet moeten gebeuren omdat CORS is geconfigureerd

### Stap 4: Hard Refresh
Soms helpt het om de pagina volledig te verversen:
- **Windows/Linux**: Ctrl + Shift + R
- **Mac**: Cmd + Shift + R

Dit zorgt dat:
1. De frontend opnieuw wordt geladen
2. De backend server opnieuw start
3. Alle caches worden geleegd

### Stap 5: Test de Health Endpoint
Test of de backend bereikbaar is:

1. Open een nieuwe browser tab
2. Ga naar: `https://xnxespizqorrfxtvukkz.supabase.co/functions/v1/make-server-82bafaab/health`
3. Je zou moeten zien: `{"status":"ok"}`

Als dit niet werkt, dan is de backend server niet bereikbaar.

### Stap 6: Check Network Tab
1. Open browser DevTools (F12)
2. Ga naar "Network" tab
3. Maak een offerte aan
4. Zoek naar de POST request naar `/quotations`
5. Klik erop en check:
   - Status code (zou 200 moeten zijn, niet 404)
   - Request Headers (moet Authorization header hebben)
   - Response body (toont de error details)

### Veelvoorkomende Foutcodes

- **401 Unauthorized**: JWT token is verlopen of ongeldig → Log opnieuw in
- **404 Not Found**: Backend route bestaat niet of server is niet gestart → Hard refresh
- **500 Server Error**: Er is iets mis gegaan in de backend → Check backend logs
- **CORS Error**: CORS configuratie probleem → Zou niet moeten gebeuren

## Contact
Als bovenstaande stappen niet helpen, deel dan:
1. Browser console logs (F12 → Console tab)
2. Network tab screenshot (F12 → Network tab)
3. Exacte foutmelding
