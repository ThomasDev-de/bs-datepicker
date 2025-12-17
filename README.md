# bs-datepicker

A jQuery-based datepicker plugin with a Bootstrap look & feel.

Highlights
- Single date and range selection
- Locale support (e.g., `de-DE`) including localized month and weekday names
- Inline or dropdown rendering
- Week start Monday or Sunday
- Multi-month view (`months`)
- Visible display as a clickable wrapper (no input) with calendar icon in dropdown mode; in inline mode no separate wrapper
- Configurable navigation and clear icons (Bootstrap Icons classes)
- Optional: disabled dates (before a date, after a date, individual dates)
 - Subtle highlighting for selected days and ranges (Bootstrap 5.3 utilities)

Options
- `locale` (string): Intl locale, default `de-DE`
- `inline` (bool): Inline rendering instead of dropdown
- `startOnSunday` (bool): Week starts on Sunday instead of Monday
- `autoClose` (bool): Automatically close the dropdown
- `format` ('locale' | 'iso' | function): Formatting of the output value
- `separator` (string): Separator used for range text
- `zIndex` (number): z-index for the dropdown panel
- `months` (number): Number of months shown at once (default 1)
- `placeholder` (string): Placeholder text for the visible display or inline output when nothing is selected yet
- `icons` (object): Bootstrap Icons class names for buttons
  - `prevYear` (string): Icon for “previous year”, default `bi bi-chevron-double-left`
  - `prev` (string): Icon for “previous month”, default `bi bi-chevron-left`
  - `today` (string): Icon for “jump to today”, default `bi bi-record-circle`
  - `next` (string): Icon for “next month”, default `bi bi-chevron-right`
  - `nextYear` (string): Icon for “next year”, default `bi bi-chevron-double-right`
  - `clear` (string): Icon for “clear selection”, default `bi bi-x-lg`
- `classes` (object): Classes for the visible display (wrapper)
  - `display` (string): Classes on the wrapper (default: `form-control d-flex align-items-center justify-content-between`)
  - `displayText` (string): Classes on the text span
  - `displayIcon` (string): Classes on the icon (default: `bi bi-calendar-event`)
- `disabled` (object | null): Configure disabled days
  - `before: Date|string` → All days up to and including this date are disabled
  - `after: Date|string` → All days from and including this date are disabled
  - `min: Date|string` → First allowed day (alias: everything < `min` is disabled)
  - `max: Date|string` → Last allowed day (alias: everything > `max` is disabled)
  - `dates: (Date|string)[]` → List of individual disabled dates

Example (legacy – direct input)
```html
<input id="dp" type="text" class="form-control">
<script>
  $('#dp').bsDatepicker({
    locale: 'de-DE',
    range: true,
    inline: true,
    months: 2,
    disabled: { max: '2025-12-31', dates: ['2025-12-24', '2025-12-25'] },
    icons: {
      prev: 'bi bi-arrow-left',
      next: 'bi bi-arrow-right',
      clear: 'bi bi-x'
    }
  });
```

Example (container mode – hidden inputs inside wrapper)
```html
<div id="rangeInline" class="datepicker">
  <input type="hidden" name="range_start">
  <input type="hidden" name="range_end">
  <!-- Dropdown: the visible wrapper (no input) is created by the plugin -->
  <!-- Inline: NO separate wrapper; calendars are rendered directly inside the wrapper.
       Above the months, the current selection is shown as a small text line. -->
</div>
<script>
  $('#rangeInline').bsDatepicker({ inline: true, months: 2, classes: { displayIcon: 'bi bi-calendar3' } });
</script>
```

Disabled dates (change at runtime)
```js
// Disable all days up to today (lock the past)
$('#dp').bsDatepicker('setDisableDates', { before: new Date() });

// Disable the future only
$('#dp').bsDatepicker('setDisableDates', { after: '2026-01-01' });

// Disable individual holidays
$('#dp').bsDatepicker('setDisableDates', { dates: ['2025-12-24', '2025-12-25'] });

// Use min/max
$('#dp').bsDatepicker('setDisableDates', { min: '2025-01-01', max: '2025-12-31' });

// Convenience methods
$('#dp').bsDatepicker('setMin', '2025-01-01');
$('#dp').bsDatepicker('setMax', '2025-12-31');
$('#dp').bsDatepicker('clearDisableDates');
```

Notes
- To display the icons you must include the Bootstrap Icons CSS, e.g.:
  ```html
  <link href="/path/to/bootstrap-icons.css" rel="stylesheet">
  ```
- The “Clear” button in the header clears the selection (single date or range). Hidden inputs are set to empty strings.
- In container mode, hidden inputs are always filled in ISO format `YYYY-MM-DD`. The visible display shows localized, formatted values.
- Disabled days are visually disabled and cannot be clicked. Navigation remains possible.