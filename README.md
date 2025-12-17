# bs-datepicker

Ein jQuery‑basiertes Datepicker‑Plugin im Bootstrap‑Look.

Highlights
- Einzel- und Range‑Auswahl
- Locale (z. B. `de-DE`) inklusive lokalisierten Monatsnamen/Wochentagen
- Inline oder als Dropdown
- Wochenstart Montag oder Sonntag
- Mehrmonats‑Ansicht (`months`)
 - Sichtbare Anzeige als klickbarer Wrapper (kein Input) inkl. Kalender‑Icon (nur im Dropdown‑Modus; im Inline‑Modus kein separater Wrapper)
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
 - `classes` (object): Klassen für die sichtbare Anzeige (Wrapper)
   - `display` (string): Klassen auf dem Wrapper (Standard: `form-control d-flex align-items-center justify-content-between`)
   - `displayText` (string): Klassen auf dem Text‑Span
   - `displayIcon` (string): Klassen auf dem Icon (Standard: `bi bi-calendar-event`)

Beispiel (Legacy – direktes Input)
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

Beispiel (Container‑Modus – Hidden Inputs im Wrapper)
```html
<div id="rangeInline" class="datepicker">
  <input type="hidden" name="range_start">
  <input type="hidden" name="range_end">
  <!-- Dropdown: Sichtbarer Wrapper (kein Input) wird vom Plugin erzeugt -->
  <!-- Inline: KEIN separater Wrapper; Kalender werden direkt im Wrapper gerendert,
       oberhalb der Monate wird die aktuelle Auswahl als kleiner Text angezeigt. -->
</div>
<script>
  $('#rangeInline').bsDatepicker({ inline: true, months: 2, classes: { displayIcon: 'bi bi-calendar3' } });
</script>
```

Hinweise
- Für die Anzeige der Symbole muss das CSS von Bootstrap Icons eingebunden werden, z. B.:
  ```html
  <link href="/path/to/bootstrap-icons.css" rel="stylesheet">
  ```
- Der „Clear“-Button in der Kopfzeile leert die Auswahl (Single‑Datum oder Range). Hidden‑Inputs werden auf leere Strings gesetzt.
- Im Container‑Modus werden die Hidden‑Inputs immer im ISO‑Format `YYYY-MM-DD` befüllt. Die sichtbare Anzeige zeigt lokalisierte, formatierte Werte.