# bs-datepicker

Ein jQuery‑basiertes Datepicker‑Plugin im Bootstrap‑Look.

Highlights
- Einzel- und Range‑Auswahl
- Locale (z. B. `de-DE`) inklusive lokalisierten Monatsnamen/Wochentagen
- Inline oder als Dropdown
- Wochenstart Montag oder Sonntag
- Mehrmonats‑Ansicht (`months`)

 - Konfigurierbare Navigations‑ und Clear‑Icons (Bootstrap Icons Klassen)

Optionen
- `locale` (string): Intl Locale, Standard `de-DE`
- `range` (bool): Bereichsauswahl aktivieren
- `inline` (bool): Inline‑Rendering statt Dropdown
- `startOnSunday` (bool): Wochenstart Sonntag statt Montag
- `autoClose` (bool): Dropdown automatisch schließen
- `format` ('locale' | 'iso' | function): Formatierung des Ausgabewerts
- `separator` (string): Trenner für Range‑Text
- `zIndex` (number): z‑Index des Dropdowns
- `months` (number): Anzahl gleichzeitig sichtbarer Monate (Default 1)
 - `icons` (object): Bootstrap‑Icons Klassennamen für Buttons
   - `prev` (string): Icon für „Vorheriger Monat“, Standard `bi bi-chevron-left`
   - `next` (string): Icon für „Nächster Monat“, Standard `bi bi-chevron-right`
   - `clear` (string): Icon für „Auswahl löschen“, Standard `bi bi-x-lg`

Beispiel
```html
<input id="dp" type="text" class="form-control">
<script>
  $('#dp').bsDatepicker({
    locale: 'de-DE',
    range: true,
    inline: true,
    months: 2,
    icons: {
      prev: 'bi bi-arrow-left',
      next: 'bi bi-arrow-right',
      clear: 'bi bi-x'
    }
  });
```

Hinweise
- Für die Anzeige der Symbole muss das CSS von Bootstrap Icons eingebunden werden, z. B.:
  ```html
  <link href="/path/to/bootstrap-icons.css" rel="stylesheet">
  ```
- Der „Clear“-Button in der Kopfzeile leert die Auswahl (Single‑Datum oder Range) und das Eingabefeld.