# bs-datepicker

A jQuery-based datepicker plugin with a Bootstrap look & feel.

![preview](/demo/Bootstrap-Datepicker-Demo.png)

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

| Option | Type | Default | Description |
|---|---|---:|---|
| `locale` | string | `de-DE` | Intl locale for month/weekday names and formatting |
| `range` | boolean | `false` | Enable range selection (start/end) |
| `inline` | boolean | `false` | Render inline (no dropdown) |
| `startOnSunday` | boolean | `false` | Start week on Sunday (else Monday) |
| `autoClose` | boolean | `true` | Close dropdown after pick (single) or after end (range) |
| `format` | `'locale' &#124; 'iso' &#124; function` | `'locale'` | Output formatter for legacy/direct input mode |
| `separator` | string | ` – ` | Separator used for range text |
| `zIndex` | number | `1080` | z-index for dropdown panel |
| `months` | number | `1` | Number of months to render side by side |
| `placeholder` | string | `Select period` | Placeholder for visible display/inline output |
| `icons.prevYear` | string | `bi bi-chevron-double-left` | Icon (previous year) |
| `icons.prev` | string | `bi bi-chevron-left` | Icon (previous month) |
| `icons.today` | string | `bi bi-record-circle` | Icon (jump to today) |
| `icons.next` | string | `bi bi-chevron-right` | Icon (next month) |
| `icons.nextYear` | string | `bi bi-chevron-double-right` | Icon (next year) |
| `icons.clear` | string | `bi bi-x-lg` | Icon (clear selection) |
| `classes.display` | string | `form-control d-flex align-items-center justify-content-between` | Classes on the visible display wrapper (dropdown mode) |
| `classes.displayText` | string | `''` | Classes on the text span |
| `classes.displayIcon` | string | `bi bi-calendar-event` | Classes on the icon |
| `disabled.before` | Date|string | – | Disable all days <= date |
| `disabled.after` | Date|string | – | Disable all days >= date |
| `disabled.min` | Date|string | – | First allowed day |
| `disabled.max` | Date|string | – | Last allowed day |
| `disabled.dates` | (Date|string)[] | – | Individual disabled dates |

Methods

| Method | Signature | Returns | Description |
|---|---|---|---|
| `val` | `val()` | `string` or `[string,string]` | Getter: Single → ISO `YYYY-MM-DD` or `''`; Range → `[startISO, endISO]` (empty strings when unset) |
| `val` | `val(date)` | `jQuery` | Setter (Single): accepts `Date|string|null` (ISO `YYYY-MM-DD` for strings). Disabled dates are ignored. |
| `val` | `val(start, end)` / `val([start, end])` | `jQuery` | Setter (Range): accepts `Date|string|null`. Disabled dates are ignored independently. |
| `getDate` | `getDate()` | `Date|null` or `[Date,Date]` | Current selection (Range: only present edges) |
| `setDate` | `setDate(Date|string|null)` | `jQuery` | Set single date (disabled dates are purged) |
| `setDate` | `setDate([start,end])` | `jQuery` | Set range (disabled dates are purged) |
| `destroy` | `destroy()` | `jQuery` | Destroy instance and remove DOM/listeners |
| `setDisableDates` | `setDisableDates(config)` | `jQuery` | Set disabled configuration at runtime; purges invalid selection |
| `getDisableDates` | `getDisableDates()` | `object|null` | Get current disabled config |
| `setMin` | `setMin(date)` | `jQuery` | Set `min` boundary; purges invalid selection |
| `setMax` | `setMax(date)` | `jQuery` | Set `max` boundary; purges invalid selection |
| `clearDisableDates` | `clearDisableDates()` | `jQuery` | Remove all disabled rules |
| `setLocale` | `setLocale(locale)` | `jQuery` | Switch locale at runtime and re-render immediately |

Events (Namespace: `bs.datepicker`)

| Event | When | detail payload |
|---|---|---|
| `init.bs.datepicker` | After initialization | `{ range:boolean, inline:boolean, months:number }` |
| `show.bs.datepicker` | Dropdown shown | `{}` |
| `hide.bs.datepicker` | Dropdown hidden | `{}` |
| `render.bs.datepicker` | After each render | `{ current:Date, range:boolean }` |
| `navigate.bs.datepicker` | On nav buttons | `{ action:'prev'|'next'|'prevYear'|'nextYear'|'today', current:Date }` |
| `changeDate.bs.datepicker` | Any selection change | Single: `{ value:Date|null }`; Range: `{ value:[Date|null, Date|null] }` |
| `clear.bs.datepicker` | On clear | `{}` (plus a `changeDate` with nulls) |
| `setLocale.bs.datepicker` | After `setLocale` | `{ locale:string }` |
| `setDisableDates.bs.datepicker` | After `setDisableDates` | `{ disabled:object }` |
| `setMin.bs.datepicker` | After `setMin` | `{ min:Date|null }` |
| `setMax.bs.datepicker` | After `setMax` | `{ max:Date|null }` |
| `clearDisableDates.bs.datepicker` | After `clearDisableDates` | `{}` |

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

// Locale wechseln (UI wird neu gerendert)
$('#dp').bsDatepicker('setLocale', 'de-DE');
```

Notes
- To display the icons you must include the Bootstrap Icons CSS, e.g.:
  ```html
  <link href="/path/to/bootstrap-icons.css" rel="stylesheet">
  ```
- The “Clear” button in the header clears the selection (single date or range). Hidden inputs are set to empty strings.
- In container mode, hidden inputs are always filled in ISO format `YYYY-MM-DD`. The visible display shows localized, formatted values.
- Disabled days are visually disabled and cannot be clicked. Navigation remains possible.
- Events are triggered on the container element (container mode) or on the input/anchor (legacy). You can access data via `e.detail` or the 2nd handler argument.