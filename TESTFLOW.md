# Testflöde: Multi-Program Architecture

## Förutsättningar

- Railway-deployen är uppe (kolla dashboarden)
- URL till appen: `https://imlseminars-form-production.up.railway.app`

## Roller

| Roll | Inloggning | Åtkomst |
|------|-----------|---------|
| **Admin** | Lösenord via `https://imlseminars-form-production.up.railway.app/admin/login` | Alla program, full kontroll |
| **Organisatör (extern)** | Magic link från admin | Bara sitt tilldelade programs schema |
| **Speaker (extern)** | Ingen inloggning krävs | Publik registreringsformulär |

---

## Person 1 — Admin

### Steg 1 — Logga in

- Gå till `https://imlseminars-form-production.up.railway.app/admin/login`
- Logga in med admin-lösenordet
- Du bör hamna på `https://imlseminars-form-production.up.railway.app/admin/programs` — programlisting

### Steg 2 — Synka program

- Klicka "Sync from Booking App"
- Programkort bör dyka upp från IML Booking App
- Verifiera att namn, datum, status och färg syns korrekt

### Steg 3 — Utforska ett program

- Klicka "Dashboard" på ett program → `https://imlseminars-form-production.up.railway.app/admin/p/<programId>/dashboard`
- Verifiera: programnamn i headern, "Back to Programs"-länk, tom submissions-tabell
- Gå tillbaka, klicka "Schedule" → `https://imlseminars-form-production.up.railway.app/admin/p/<programId>/scheduling`
- Verifiera: programnamn syns, tomt schema
- Testa vyväxling: List View, Daily View, Week View

### Steg 4 — Skapa magic link

- Gå till Dashboard för ett program
- I magic links-sektionen: skapa en ny länk med label "Test Organizer"
- Klicka "Copy Link" på den genererade länken
- Skicka denna URL till Person 2

---

## Person 3 — Speaker (extern)

### Steg 5 — Registrera talk (publik sida)

- Öppna ett nytt incognito-fönster
- Gå till `https://imlseminars-form-production.up.railway.app/` — du bör se programlisting med aktiva program
- Klicka "Register for Talk" på ett program
- Fyll i formuläret (namn, titel, abstract, affiliation) och skicka
- Verifiera success-sidan
- Om programmet har workshops: testa även registrering via workshop-länk
- Verifiera att workshop-registreringen visar workshopens egna datum (inte programmets)

### Steg 5b — Verifiera submission hos admin

- Gå tillbaka till admin-dashboarden (Person 1:s inloggade fönster)
- Submissionen bör synas i programmets dashboard
- Verifiera att den hamnade under rätt program (inte i andra program)

---

## Person 2 — Organisatör (extern)

### Steg 6 — Logga in via magic link

- Öppna URL:en du fick från Person 1
- Du bör hamna på `https://imlseminars-form-production.up.railway.app/admin/p/<programId>/scheduling`
- Verifiera: du ser programnamnet, tomt schema
- "Back to Programs"-länken ska **inte** synas

### Steg 7 — Schemalägg

- Skapa ett nytt event (klicka "+ Event")
- Skapa ett block (klicka "+ Block")
- Om Person 3 redan skickat in en submission — dra den till schemat
- Verifiera att allt sparas och syns
- Om workshoppar finns: klicka på workshop-flikarna för att byta schema

### Steg 8 — Verifiera begränsningar

Kontrollera att organisatörsvyn är korrekt begränsad:

- [ ] Export-knappar ska **inte** synas
- [ ] Publish/lock-toggles ska **inte** synas
- [ ] Manuellt ändra URL till annat program: `https://imlseminars-form-production.up.railway.app/admin/p/<ANNAT_PROGRAM>/scheduling` → bör ge "Access Denied"
- [ ] Manuellt ändra URL till `https://imlseminars-form-production.up.railway.app/admin/programs` → bör ge "Access Denied"

> Åtkomstbegränsningen är kritisk — organisatören ska aldrig kunna nå ett annat programs data via URL-manipulation.

---

## Person 1 — Admin (avslutande verifiering)

### Steg 9 — Kolla korsvis

- Gå till scheduling för samma program — du bör se allt Person 2 skapade
- Testa publish och lock (admin-only features)
- Testa Excel-export — bör bara innehålla detta programs data

### Steg 10 — Kolla isolation

- Gå till ett annat programs dashboard — bör vara tomt (inga submissions från det första programmet)
- Gå till det andra programmets scheduling — bör vara tomt

---

## Saker att hålla utkik efter

| Kontrollpunkt | Vad ska hända |
|---------------|---------------|
| Startup-synk | Kolla Railway-loggar: "Startup sync: X programs loaded" |
| Rätt program visas | Programnamn syns korrekt i header på alla sidor |
| Navigeringslänk | "Back to Programs" visas bara för admin |
| Åtkomstkontroll | Organisatör får 403 vid försök att nå fel program |
| Workshop-datum | Registreringsformulär visar workshopens datum, inte programmets |
| Vyväxling | Daily/Weekly/List views fungerar i scheduling |
