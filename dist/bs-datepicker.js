(function ($) {

    // Defaults
    $.bsDatepicker = {
        default: {
            locale: 'de-DE',           // Intl locale, e.g. 'de-DE', 'en-US'
            range: false,               // select a date range
            inline: false,              // render inline instead of dropdown
            startOnSunday: false,       // week starts on Sunday (else Monday)
            autoClose: true,            // close dropdown after selection (single) or after end (range)
            format: 'locale',           // 'locale' | 'iso' | custom function(date|[start,end]) -> string
            separator: ' – ',           // range separator for text output
            zIndex: 1080,               // for dropdown panel
            months: 1,                  // number of months to render side by side
            // Visual Theme: previously configurable; now always uses a subtle Bootstrap-based highlighting
            icons: {                    // Bootstrap Icons class names
                prevYear: 'bi bi-chevron-double-left',
                prev: 'bi bi-chevron-left',
                today: 'bi bi-record-circle',
                next: 'bi bi-chevron-right',
                nextYear: 'bi bi-chevron-double-right',
                clear: 'bi bi-x-lg'
            },
            // CSS-Klassen für die sichtbare Anzeige (kein Input mehr)
            classes: {
                display: 'form-control d-flex align-items-center justify-content-between',
                displayText: '',
                displayIcon: 'bi bi-calendar-event'
            },
            placeholder: 'Select period',
            // Disabled dates configuration
            // Forms:
            // - disabled: { before?: Date|string, after?: Date|string, min?: Date|string, max?: Date|string, dates?: (Date|string)[] }
            // Note: before => disables <= before, after => disables >= after
            disabled: null
        }
    };

    const NS = 'bs.datepicker';

    // Utilities
    function startOfDay(d) {
        const x = new Date(d.getTime());
        x.setHours(0, 0, 0, 0);
        return x;
    }
    function isSameDay(a, b) {
        if (!a || !b) return false;
        return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    }
    function addMonths(date, n) {
        const d = new Date(date.getFullYear(), date.getMonth() + n, 1);
        return d;
    }
    function daysInMonth(year, month) {
        return new Date(year, month + 1, 0).getDate();
    }
    function clampRange(a, b) {
        if (!a || !b) return [a, b];
        return (a <= b) ? [a, b] : [b, a];
    }
    function inRange(d, a, b) {
        if (!a || !b) return false;
        const [s, e] = clampRange(a, b);
        return d >= startOfDay(s) && d <= startOfDay(e);
    }

    function toDateOrNull(v) {
        if (!v) return null;
        if (v instanceof Date) return startOfDay(v);
        if (typeof v === 'number') return startOfDay(new Date(v));
        if (typeof v === 'string') {
            // Expect ISO YYYY-MM-DD; fallback to Date parse
            const parts = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
            let d = parts ? new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])) : new Date(v);
            if (isNaN(d.getTime())) return null;
            return startOfDay(d);
        }
        return null;
    }

    function normalizeDisabled(cfg) {
        if (!cfg) return { before: null, after: null, min: null, max: null, datesSet: new Set() };
        const out = { before: null, after: null, min: null, max: null, datesSet: new Set() };
        if (cfg.before) out.before = toDateOrNull(cfg.before);
        if (cfg.after) out.after = toDateOrNull(cfg.after);
        if (cfg.min) out.min = toDateOrNull(cfg.min);
        if (cfg.max) out.max = toDateOrNull(cfg.max);
        if (Array.isArray(cfg.dates)) {
            cfg.dates.forEach(function (x) {
                const d = toDateOrNull(x);
                if (d) out.datesSet.add(d.getTime());
            });
        }
        return out;
    }

    function isDisabledDate(d, state) {
        if (!state || !state.disabled) return false;
        const dd = startOfDay(d);
        const t = dd.getTime();
        const dis = state.disabled;
        if (dis.min && dd < dis.min) return true;
        if (dis.max && dd > dis.max) return true;
        if (dis.before && dd <= dis.before) return true;
        if (dis.after && dd >= dis.after) return true;
        if (dis.datesSet && dis.datesSet.has(t)) return true;
        return false;
    }
    function getWeekdayNames(locale, startOnSunday) {
        const fmt = new Intl.DateTimeFormat(locale, { weekday: 'short' });
        const base = new Date(2021, 7, 1); // arbitrary Sunday
        const days = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
            days.push(fmt.format(d));
        }
        // base was Sunday → order is Sun..Sat
        if (startOnSunday) return days;
        // move Sunday to end for Monday as first day
        return days.slice(1).concat(days.slice(0, 1));
    }
    function getMonthYearTitle(date, locale) {
        const fmt = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' });
        return fmt.format(date);
    }
    function formatDateValue(value, opts) {
        const { format, locale, separator } = opts;
        if (typeof format === 'function') return format(value);
        const fmt = new Intl.DateTimeFormat(locale, { year: 'numeric', month: '2-digit', day: '2-digit' });
        const toLocalISO = (d) => {
            if (!d) return '';
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return y + '-' + m + '-' + day;
        };
        if (Array.isArray(value)) {
            const [a, b] = value;
            if (!a && !b) return '';
            if (format === 'iso') {
                return [toLocalISO(a), toLocalISO(b)].filter(Boolean).join(separator);
            }
            return [a ? fmt.format(a) : '', b ? fmt.format(b) : ''].filter(Boolean).join(separator);
        } else if (value instanceof Date) {
            if (format === 'iso') return toLocalISO(value);
            return fmt.format(value);
        }
        return '';
    }

    function buildCalendarGrid(current, opts) {
        const year = current.getFullYear();
        const month = current.getMonth();
        const firstOfMonth = new Date(year, month, 1);
        const firstWeekday = firstOfMonth.getDay(); // 0=Sun..6=Sat
        const shift = opts.startOnSunday ? 0 : 1; // Monday start shifts
        // index of the first cell (0..6) that belongs to current month
        const startIdx = (firstWeekday - shift + 7) % 7;
        const dim = daysInMonth(year, month);
        const prevDim = daysInMonth(year, month - 1 < 0 ? 11 : month - 1);
        const cells = [];
        // 6 rows x 7 columns = 42 cells
        for (let i = 0; i < 42; i++) {
            const cell = { inMonth: false, date: null };
            if (i < startIdx) {
                const day = prevDim - (startIdx - 1 - i);
                const d = new Date(year, month, 1);
                d.setDate(d.getDate() - (startIdx - i));
                cell.inMonth = false;
                cell.date = startOfDay(d);
            } else if (i >= startIdx && i < startIdx + dim) {
                const day = i - startIdx + 1;
                cell.inMonth = true;
                cell.date = startOfDay(new Date(year, month, day));
            } else {
                const d = new Date(year, month, dim);
                d.setDate(d.getDate() + (i - (startIdx + dim)) + 1);
                cell.inMonth = false;
                cell.date = startOfDay(d);
            }
            cells.push(cell);
        }
        return cells;
    }

    function renderOneMonthBlock(currMonthDate, state) {
        const { opts, selected, rangeStart } = state;
        const weekdays = getWeekdayNames(opts.locale, opts.startOnSunday);
        const title = getMonthYearTitle(currMonthDate, opts.locale);
        const cells = buildCalendarGrid(currMonthDate, opts);
        const today = startOfDay(new Date());
        const isRange = !!opts.range;
        // Theme is fixed to 'subtle' (option removed to keep options compact)
        const theme = 'subtle';

        let html = '';
        html += '<div class="mb-2">';
        html += '  <div class="fw-semibold text-capitalize text-center mb-0">' + title + '</div>';
        html += '  <div class="table-responsive">';
        // Kompakte, inhaltsbasierte Tabellenbreite, Zellen bleiben gleichmäßig (Buttons füllen die Zellen)
        html += '    <table class="table table-sm table-borderless mb-0 text-center align-middle user-select-none w-auto">';
        html += '      <thead><tr>';
        weekdays.forEach(w => { html += '<th class="text-muted small">' + w + '</th>'; });
        html += '      </tr></thead>';
        html += '      <tbody>';
        // dynamische Zeilenzahl: nur so viele Zeilen, wie der Monat benötigt
        const year = currMonthDate.getFullYear();
        const month = currMonthDate.getMonth();
        const firstOfMonth = new Date(year, month, 1);
        const firstWeekday = firstOfMonth.getDay(); // 0..6
        const shift = opts.startOnSunday ? 0 : 1;
        const startIdx = (firstWeekday - shift + 7) % 7;
        const dim = daysInMonth(year, month);
        const neededCells = startIdx + dim;
        const rows = Math.ceil(neededCells / 7);
        for (let r = 0; r < rows; r++) {
            html += '<tr>';
            for (let c = 0; c < 7; c++) {
                const idx = r * 7 + c;
                const dayIndex = idx - startIdx; // 0-basiert relativ zum Monat (kann <0 / >= dim sein)
                // Datum auch für Vor-/Nachmonat ermitteln
                const d = startOfDay(new Date(year, month, dayIndex + 1));
                const inMonth = dayIndex >= 0 && dayIndex < dim;
                const isToday = isSameDay(d, today);
                const isSelected = !isRange && selected && isSameDay(d, selected);
                const isStart = isRange && rangeStart && isSameDay(d, rangeStart);
                const isEnd = isRange && selected && !isStart && isSameDay(d, selected);
                const isBetween = isRange && rangeStart && selected && inRange(d, rangeStart, selected) && !isStart && !isEnd;
                const muted = !inMonth; // Vor-/Nachmonat abgedunkelt anzeigen

                // TD-Klassen: nur Padding entfernen, keine Farben/Rundungen auf TD
                let tdCls = 'p-0'; // kein Space zwischen den Tagen

                // Button-Klassen: Basis ohne Rundung; breite Buttons füllen die Zelle
                // Subtle highlighting (Bootstrap 5.3 Utilities)
                let btnCls = 'btn btn-sm w-100 border-0 rounded-0 ';
                const inRangeAny = isStart || isEnd || isBetween;

                // Subtle Theme (always on)
                if (isRange) {
                    if (inRangeAny) {
                        // Zwischenbereich und Ränder: dezente Füllung
                        btnCls += ' bg-primary-subtle text-primary-emphasis ';
                    }
                    if (isStart || isEnd) {
                        // Ränder zusätzlich visuell markieren
                        btnCls += ' border border-primary fw-semibold ';
                    }
                } else {
                    if (isSelected) {
                        // Single-Auswahl dezent mit Outline
                        btnCls += ' btn-outline-primary text-primary-emphasis fw-semibold border ';
                    }
                }
                if (muted) btnCls += ' text-muted ';
                // Heute dezent, sofern nicht Teil der Auswahl
                if (isToday && !(isSelected || inRangeAny)) btnCls += ' text-primary fw-semibold ';

                const disabled = isDisabledDate(d, state);
                html += '<td class="' + tdCls.trim() + '">';
                // data-date als Millisekunden-Zeitstempel ablegen, um TZ-Parsing-Probleme zu vermeiden
                const actionAttr = disabled ? '' : ' data-action="pick"';
                const disAttr = disabled ? ' disabled aria-disabled="true"' : '';
                const clsFinal = (btnCls + (disabled ? ' disabled ' : '')).trim();
                html += '<button type="button" class="' + clsFinal + '"' + actionAttr + disAttr + ' data-date="' + d.getTime() + '">';
                html += d.getDate();
                html += '</button>';
                html += '</td>';
            }
            html += '</tr>';
        }
        html += '      </tbody>';
        html += '    </table>';
        html += '  </div>';
        html += '</div>';
        return html;
    }

    function renderTemplate(state) {
        const { opts, current } = state;
        const months = Math.max(1, parseInt(opts.months || 1, 10));

        let html = '';
        // Moderner, neutraler Panel‑Look (keine Card)
        // Inline: noch reduzierter (keine Border/Shadow)
        var panelCls = opts.inline ? 'bg-transparent p-2' : 'bg-body border rounded-3 shadow p-2';
        html += '<div class="' + panelCls + '">';
        // Kompakter Header: einzeilig mit drei Zonen
        html += '  <div class="d-flex align-items-center justify-content-between gap-2 pb-2' + (opts.inline ? '' : ' border-bottom') + '">';
        // Links: PrevYear / Prev
        html += '    <div class="d-flex align-items-center gap-1">';
        html += '      <button type="button" class="btn btn-sm border-0 p-1" data-action="prevYear" title="Previous year" aria-label="Previous year"><i class="' + (opts.icons && (opts.icons.prevYear || opts.icons.prev) || $.bsDatepicker.default.icons.prevYear) + '"></i></button>';
        html += '      <button type="button" class="btn btn-sm border-0 p-1" data-action="prev" title="Previous month" aria-label="Previous month"><i class="' + (opts.icons && opts.icons.prev || $.bsDatepicker.default.icons.prev) + '"></i></button>';
        html += '    </div>';
        // Mitte: Titel
        html += '    <div class="text-center flex-grow-1">';
        html += '      <div class="small fw-semibold text-capitalize">' + getMonthYearTitle(current, opts.locale) + (months > 1 ? ' … ' + getMonthYearTitle(addMonths(current, months - 1), opts.locale) : '') + '</div>';
        html += '    </div>';
        // Rechts: Next / NextYear / Today / Clear als Icons
        html += '    <div class="d-flex align-items-center gap-1">';
        html += '      <button type="button" class="btn btn-sm border-0 p-1" data-action="next" title="Next month" aria-label="Next month"><i class="' + (opts.icons && opts.icons.next || $.bsDatepicker.default.icons.next) + '"></i></button>';
        html += '      <button type="button" class="btn btn-sm border-0 p-1" data-action="nextYear" title="Next year" aria-label="Next year"><i class="' + (opts.icons && (opts.icons.nextYear || opts.icons.next) || $.bsDatepicker.default.icons.nextYear) + '"></i></button>';
        html += '      <button type="button" class="btn btn-sm border-0 p-1" data-action="today" title="Today" aria-label="Today"><i class="' + (opts.icons && opts.icons.today || $.bsDatepicker.default.icons.today) + '"></i></button>';
        html += '      <button type="button" class="btn btn-sm border-0 p-1" data-action="clear" title="Clear" aria-label="Clear"><i class="' + (opts.icons && opts.icons.clear || $.bsDatepicker.default.icons.clear) + '"></i></button>';
        html += '    </div>';
        html += '  </div>';
        html += '  <div class="pt-2">';
        // Inline: kleine Textausgabe der aktuellen Auswahl innerhalb des Panels
        if (opts.inline) {
            const isRange = !!opts.range;
            const dispOpts = $.extend({}, opts, { format: 'locale' });
            let text = '';
            if (isRange) {
                const pair = clampRange(state.rangeStart, state.selected);
                text = formatDateValue(pair, dispOpts);
            } else {
                text = formatDateValue(state.selected, dispOpts);
            }
            const placeholder = opts.placeholder;
            const clsMuted = text ? '' : ' text-muted';
            // Inline: dezente Auswahlzeile
            html += '    <div class="mb-2 small text-center dp-inline-output' + clsMuted + '">' + (text || placeholder) + '</div>';
        }
        // Maximal 2 Monate pro Zeile: engeres Spacing
        html += '    <div class="row g-2">';
        for (let i = 0; i < months; i++) {
            html += '      <div class="col-auto">';
            html += renderOneMonthBlock(addMonths(current, i), state);
            html += '      </div>';
            // Umbruch nach jedem zweiten Monat (2 Spalten pro Zeile)
            if (i % 2 === 1 && i < months - 1) {
                html += '      <div class="w-100"></div>';
            }
        }
        html += '    </div>';
        html += '  </div>';
        html += '</div>';
        return html;
    }

    function attachEvents(state) {
        const { $panel, opts } = state;
        $panel.off('.' + NS);
        $panel.on('click.' + NS, '[data-action="prev"]', function (e) {
            e.preventDefault();
            state.current = addMonths(state.current, -1);
            updatePanel(state);
        });
        $panel.on('click.' + NS, '[data-action="prevYear"]', function (e) {
            e.preventDefault();
            state.current = addMonths(state.current, -12);
            updatePanel(state);
        });
        $panel.on('click.' + NS, '[data-action="next"]', function (e) {
            e.preventDefault();
            state.current = addMonths(state.current, +1);
            updatePanel(state);
        });
        $panel.on('click.' + NS, '[data-action="nextYear"]', function (e) {
            e.preventDefault();
            state.current = addMonths(state.current, +12);
            updatePanel(state);
        });
        $panel.on('click.' + NS, '[data-action="today"]', function (e) {
            e.preventDefault();
            const t = new Date();
            state.current = new Date(t.getFullYear(), t.getMonth(), 1);
            updatePanel(state);
        });
        $panel.on('click.' + NS, '[data-action="clear"]', function (e) {
            e.preventDefault();
            // Auswahl löschen
            state.rangeStart = null;
            state.selected = null;
            // Anzeige/Hidden-Inputs leeren
            if (state.$display) updateDisplay(state);
            if (state.$inStart) state.$inStart.val('').trigger('change');
            if (state.$inEnd) state.$inEnd.val('').trigger('change');
            if (state.$input && !state.$display) state.$input.val('').trigger('change');
            updatePanel(state);
        });
        $panel.on('click.' + NS, '[data-action="pick"]', function (e) {
            e.preventDefault();
            const stamp = $(this).data('date');
            const d = startOfDay(new Date(typeof stamp === 'number' ? stamp : Number(stamp)));
            if (isDisabledDate(d, state)) return; // ignore disabled
            if (opts.range) {
                const S = state.rangeStart;
                const E = state.selected;

                if (!S && !E) {
                    // noch keine Auswahl → Start setzen
                    state.rangeStart = d;
                    state.selected = null;
                    updatePanel(state);
                } else if (S && !E) {
                    // Start gewählt, Ende offen
                    if (d < S) {
                        // vor Start → Start verschieben
                        state.rangeStart = d;
                        updatePanel(state);
                    } else {
                        // gleich oder nach Start → Ende setzen (aber Dropdown offen lassen für Feintuning)
                        state.selected = d;
                        // Werte aktualisieren (Anzeige + Hidden)
                        // Panel bleibt offen für Feintuning
                        // Kein Auto-Close beim erstmaligen Setzen des Endes, um direktes Nachjustieren zu erlauben
                        updatePanel(state);
                    }
                } else if (S && E) {
                    // kompletter Bereich vorhanden → immer den näheren Rand verschieben (Variante B)
                    if (d <= S) {
                        // Klick links/gleich Start → Start wird D
                        state.rangeStart = d;
                    } else if (d >= E) {
                        // Klick rechts/gleich Ende → Ende wird D
                        state.selected = d;
                    } else {
                        // Klick innerhalb (S < D < E): näheren Rand verschieben
                        const distToStart = d - S;
                        const distToEnd = E - d;
                        if (distToStart <= distToEnd) {
                            state.rangeStart = d;
                        } else {
                            state.selected = d;
                        }
                    }
                    // Werte aktualisieren (Anzeige + Hidden)
                    // Hinweis: Bei bestehender Range (Anpassung) NICHT automatisch schließen,
                    // damit feines Justieren möglich bleibt. Nur bei erstmaligem Setzen des Endes (oben) wird geschlossen.
                    updatePanel(state);
                }
            } else {
                state.selected = d;
                // Werte aktualisieren (Anzeige + Hidden)
                if (state.$display || state.$inStart) {
                    const toLocalISO = (x) => x ? (function(d){ const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const day=String(d.getDate()).padStart(2,'0'); return y+'-'+m+'-'+day; })(x) : '';
                    if (state.$inStart) state.$inStart.val(toLocalISO(state.selected)).trigger('change');
                    if (state.$display) updateDisplay(state);
                } else if (state.$input) {
                    state.$input.val(formatDateValue(state.selected, state.opts)).trigger('change');
                }
                if (!opts.inline && opts.autoClose) hideDropdown(state);
                updatePanel(state);
            }
        });
    }

    function updatePanel(state) {
        const html = renderTemplate(state);
        state.$panel.html(html);
        // Nach jedem Render die aktuellen Werte in Anzeige/Hidden spiegeln
        // (z. B. nach Clear oder externer setDate-Nutzung)
        (function syncOutputs() {
            const isRange = !!state.opts.range;
            const dispOpts = $.extend({}, state.opts, { format: 'locale' });
            const toLocalISO = (d) => d ? (function(x){ const y=x.getFullYear(); const m=String(x.getMonth()+1).padStart(2,'0'); const day=String(x.getDate()).padStart(2,'0'); return y+'-'+m+'-'+day; })(d) : '';
            if (isRange) {
                const [a, b] = clampRange(state.rangeStart, state.selected);
                if (state.$display) updateDisplay(state);
                if (state.$inStart) state.$inStart.val(toLocalISO(a));
                if (state.$inEnd) state.$inEnd.val(toLocalISO(b));
                if (state.$input && !state.$display) state.$input.val(formatDateValue([a, b], state.opts));
            } else {
                const d = state.selected;
                if (state.$display) updateDisplay(state);
                if (state.$inStart) state.$inStart.val(toLocalISO(d));
                if (state.$input && !state.$display) state.$input.val(formatDateValue(d, state.opts));
            }
        })();
        attachEvents(state);
        // Wenn als Dropdown sichtbar: Breite exakt an den Inhalt bzw. an gewünschte Maximalbreite anpassen
        if (!state.opts.inline && state.$container && state.$container.is(':visible')) {
            applyCalculatedWidth(state);
        }
    }

    function showDropdown(state) {
        if (state.opts.inline) return; // no-op
        const $anchor = state.$anchor || state.$input;
        const off = $anchor.offset();
        const h = $anchor.outerHeight();
        state.$container
            .css({ position: 'absolute', top: off.top + h + 4, left: off.left, zIndex: state.opts.zIndex, width: 'auto' })
            .addClass('show')
            .show();
        // Nach dem Anzeigen Breite berechnen und setzen
        applyCalculatedWidth(state);
        $(document).on('mousedown.' + NS, function (ev) {
            const $t = $(ev.target);
            if ($t.closest(state.$container).length === 0 && $t.closest($anchor).length === 0) {
                hideDropdown(state);
            }
        });
    }

    // Berechnet eine sinnvolle maximale Breite anhand der Monatsblöcke:
    // - Bei 1 Monat: Breite = Breite dieses Monats + horizontaler Innenabstand
    // - Bei >=2 Monaten: Breite = Summe der ersten beiden Monatsbreiten + Gap zwischen ihnen + Innenabstände
    function applyCalculatedWidth(state) {
        const $card = state.$panel.children('.card');
        if ($card.length === 0) return;
        const $body = $card.children('.card-body');
        // Padding der Card-Body (hält Monats-Wrapper)
        let bodyPaddingX = 0;
        if ($body.length) {
            const bs = getComputedStyle($body[0]);
            bodyPaddingX = (parseFloat(bs.paddingLeft) || 0) + (parseFloat(bs.paddingRight) || 0);
        }
        // Monats-Wrapper (erste Ebene im Body)
        const $wrap = $body.children().first();
        if ($wrap.length === 0) return;
        // Ermittele Monats-Elemente je nach Layout (Grid: .col-auto, Flex: .d-inline-block)
        let $months = $wrap.children('.col-auto');
        if ($months.length === 0) {
            $months = $wrap.children('.d-inline-block');
        }
        if ($months.length === 0) return;
        const m0 = $months.eq(0).outerWidth(true);
        let monthsWidth = m0;
        if ($months.length >= 2) {
            const m1 = $months.eq(1).outerWidth(true);
            // Bei Bootstrap Grid ist der Abstand bereits in den Spaltenbreiten (Padding) enthalten,
            // daher keine zusätzliche Gap‑Addition notwendig.
            monthsWidth = m0 + m1;
        }
        // Zielbreite: strikt Monats-Summe + Body-Padding (Header darf umbrechen)
        const targetWidth = monthsWidth + bodyPaddingX;
        // Card selbst auf die Zielbreite setzen, damit keine innere 100%-Weite sie aufzieht
        $card.css('width', Math.ceil(targetWidth + 1) + 'px');
        // Container exakt an die Card anpassen
        state.$container.css({ width: Math.ceil(targetWidth + 1) + 'px' });
    }
    function hideDropdown(state) {
        if (state.opts.inline) return; // no-op
        state.$container.removeClass('show').hide();
        // Input-Blur verhindert, dass ein Focus-Event das Dropdown sofort erneut öffnet
        const $anchor = state.$anchor || state.$input;
        if ($anchor && $anchor.length) {
            $anchor.trigger('blur');
        }
        // kurze Unterdrückung des erneuten Öffnens (z. B. durch Click-/Focus-Sequenzen)
        state.suppressOpenUntil = Date.now() + 150;
        $(document).off('mousedown.' + NS);
    }

    function create(state) {
        const { opts } = state;

        state.current = startOfDay(new Date());
        state.selected = null;      // single date or range end
        state.rangeStart = null;    // range start

        if (opts.inline) {
            // Inline direkt IM Wrapper rendern
            state.$container = $('<div class="bs-datepicker inline"></div>').appendTo(state.$root);
        } else {
            // --bs-dropdown-min-width standardmäßig 10rem → für inhaltsbreite Dropdowns auf auto setzen
            state.$container = $('<div class="bs-datepicker dropdown-menu p-0" style="display:none; --bs-dropdown-min-width:auto;"></div>').appendTo('body');
        }
        state.$panel = $('<div></div>').appendTo(state.$container);
        updatePanel(state);
        // Defensiv: sicherstellen, dass das Dropdown initial geschlossen ist
        if (!opts.inline) {
            state.$container.removeClass('show').hide();
        }

        if (!opts.inline) {
            // Öffnen nur auf Click, nicht auf Focus (verhindert Re-Open direkt nach Blur)
            const $anchor = state.$anchor || state.$input;
            if ($anchor && $anchor.length) {
                $anchor.on('click.' + NS, function () {
                    if (state.$container.is(':visible')) return;
                    if (state.suppressOpenUntil && Date.now() < state.suppressOpenUntil) return;
                    showDropdown(state);
                });
                // Tastatur-Support: Enter/Leertaste öffnet Dropdown
                $anchor.on('keydown.' + NS, function (ev) {
                    const key = ev.key || ev.code;
                    if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
                        ev.preventDefault();
                        if (state.$container.is(':visible')) return;
                        if (state.suppressOpenUntil && Date.now() < state.suppressOpenUntil) return;
                        showDropdown(state);
                    }
                });
            }
        }
    }

    function destroy(state) {
        hideDropdown(state);
        if (state.$container) state.$container.remove();
        if (state.$anchor) state.$anchor.off('.' + NS);
        if (state.$input) state.$input.off('.' + NS);
        const $dataEl = state.containerMode ? state.$root : state.$input;
        if ($dataEl) $dataEl.removeData(NS);
        $(document).off('.' + NS);
    }

    const methods = {
        getDate() {
            const state = this.data(NS);
            if (!state) return null;
            if (state.opts.range) {
                return [state.rangeStart, state.selected].filter(Boolean);
            }
            return state.selected;
        },
        // jQuery-like val():
        // - Getter (no args):
        //     single -> returns ISO string 'YYYY-MM-DD' or ''
        //     range  -> returns [startISO, endISO] ('' when empty)
        // - Setter:
        //     single -> val(date)
        //     range  -> val(start, end) or val([start, end])
        // Accepts Date|string|null; strings should be ISO 'YYYY-MM-DD'.
        val(a, b) {
            const state = this.data(NS);
            if (!state) return (arguments.length === 0 ? '' : this);

            function toIso(d) {
                if (!d) return '';
                const y = d.getFullYear();
                const m = ('0' + (d.getMonth() + 1)).slice(-2);
                const dd = ('0' + d.getDate()).slice(-2);
                return y + '-' + m + '-' + dd;
            }

            // Getter
            if (arguments.length === 0) {
                if (state.opts.range) {
                    // Prefer hidden inputs if vorhanden (Container-Modus)
                    if (state.$inStart || state.$inEnd) {
                        const s = state.$inStart ? state.$inStart.val() : '';
                        const e = state.$inEnd ? state.$inEnd.val() : '';
                        return [s, e];
                    }
                    // Legacy/Direct: aus internem State als ISO ableiten
                    return [toIso(state.rangeStart), toIso(state.selected)];
                }
                // Single
                if (state.$inStart) {
                    return state.$inStart.val();
                }
                return toIso(state.selected);
            }

            // Setter
            if (state.opts.range) {
                let a1 = a, b1 = b;
                if (Array.isArray(a)) {
                    a1 = a[0];
                    b1 = a[1];
                }
                state.rangeStart = a1 ? toDateOrNull(a1) : null;
                state.selected = b1 ? toDateOrNull(b1) : null;
            } else {
                state.selected = a ? toDateOrNull(a) : null;
            }
            updatePanel(state);
            return this;
        },
        setDate(dateOrRange) {
            const state = this.data(NS);
            if (!state) return this;
            if (Array.isArray(dateOrRange)) {
                state.rangeStart = dateOrRange[0] ? startOfDay(new Date(dateOrRange[0])) : null;
                state.selected = dateOrRange[1] ? startOfDay(new Date(dateOrRange[1])) : null;
            } else if (dateOrRange) {
                state.selected = startOfDay(new Date(dateOrRange));
            } else {
                state.selected = null; state.rangeStart = null;
            }
            updatePanel(state);
            return this;
        },
        destroy() {
            const state = this.data(NS);
            if (state) destroy(state);
            return this;
        }
    };

    $.fn.bsDatepicker = function (optionsOrMethod) {
        if (this.length === 0) return this;
        if (this.length > 1) {
            return this.each(function () {
                $(this).bsDatepicker(optionsOrMethod);
            });
        }
        const $element = this;
        if (typeof optionsOrMethod === 'string') {
            const method = optionsOrMethod;
            if (methods[method]) {
                return methods[method].apply($element, Array.prototype.slice.call(arguments, 1));
            }
            return $element;
        }
        const opts = $.extend({}, $.bsDatepicker.default, optionsOrMethod || {});

        // Unterstütze zwei Modi:
        // 1) Legacy: Direkt auf einem sichtbaren <input> initialisiert
        // 2) Container: Auf einem Wrapper (z. B. <div class="datepicker">) mit 1–2 hidden Inputs initialisiert
        const isDirectInput = $element.is('input, textarea');

        // State-Grundstruktur
        const state = {
            $input: null,             // Legacy sichtbares Eingabefeld (Direkt-Input)
            $root: $element,          // Ursprüngliches Initialisierungs-Element
            $anchor: null,            // Element, an dem Dropdown verankert wird (Input oder Anzeige-Input)
            $display: null,           // Sichtbarer Anzeige-Wrapper (Container-Modus)
            $displayText: null,       // Text-Span innerhalb der Anzeige
            $inStart: null,           // Hidden Start (Range) oder Single
            $inEnd: null,             // Hidden Ende (Range)
            containerMode: false,     // true wenn auf Wrapper mit hidden Inputs
            opts,
            $container: null,
            $panel: null,
            current: null,
            selected: null,
            rangeStart: null,
            suppressOpenUntil: 0
        };

        function initBindings() {
            if (isDirectInput) {
                // Legacy-Verwendung: alles wie bisher
                state.$input = $element;
                state.$anchor = state.$input;
                state.containerMode = false;
            } else {
                // Container-Modus: suche Inputs im Wrapper
                const $inputs = state.$root.find('input');
                // Bevorzugt hidden, sonst beliebige
                const $hidden = $inputs.filter('[type="hidden"]');
                const list = $hidden.length ? $hidden : $inputs;
                if (list.length >= 1) state.$inStart = $(list[0]);
                if (list.length >= 2) state.$inEnd = $(list[1]);

                // Range automatisch aus Anzahl Inputs ableiten
                if (list.length >= 2) state.opts.range = true; else state.opts.range = false;

                // Inline hat KEINEN sichtbaren Ausgabe-Wrapper, da die Kalender inline sind
                if (state.opts.inline) {
                    state.$display = null;
                    state.$displayText = null;
                    state.$anchor = null; // kein Dropdown-Anker nötig
                    state.containerMode = true;
                } else {
                    // Sichtbarer Anzeige-Wrapper (kein Input) mit Text + Icon erzeugen (nur Dropdown)
                    const cls = state.opts.classes || {};
                    const dispCls = (cls.display || $.bsDatepicker.default.classes.display || '').trim();
                    const textCls = (cls.displayText || $.bsDatepicker.default.classes.displayText || '').trim();
                    const iconCls = (cls.displayIcon || $.bsDatepicker.default.classes.displayIcon || '').trim();
                    state.$display = $('<div role="button" tabindex="0" class="dp-display ' + dispCls + '"></div>');
                    state.$displayText = $('<span class="dp-display-text ' + textCls + '"></span>');
                    const $icon = $('<i class="dp-display-icon ' + iconCls + '"></i>');
                    state.$display.append(state.$displayText).append($icon);
                    state.$root.append(state.$display);
                    state.$anchor = state.$display;
                    state.containerMode = true;
                }
            }
        }

        // keine separate setOutputs mehr nötig, Synchronisierung erfolgt in updatePanel()

        initBindings();

        // State im Element speichern (auf dem Anker, damit Methoden-Aufrufe weiterhin funktionieren)
        (state.containerMode ? state.$root : state.$input).data(NS, state);

        // create() erwartet state.$input (für Legacy) – für Container spielt nur $anchor eine Rolle
        if (!state.containerMode) {
            state.$input = state.$anchor;
        }

        // Erstellen mit den angepassten globalen Funktionen
        // Disabled-Konfiguration vorbereiten
        state.disabled = normalizeDisabled(state.opts.disabled);
        create(state);

        return (state.containerMode ? state.$root : state.$input);
    };

    // Hilfsfunktion: Anzeige-Text im Wrapper aktualisieren
    function updateDisplay(state) {
        if (!state.$display) return;
        const isRange = !!state.opts.range;
        const dispOpts = $.extend({}, state.opts, { format: 'locale' });
        let text = '';
        if (isRange) {
            const [a, b] = clampRange(state.rangeStart, state.selected);
            text = formatDateValue([a, b], dispOpts);
        } else {
            text = formatDateValue(state.selected, dispOpts);
        }
        const placeholder = state.opts.placeholder;
        // Falls kein spezielles Text-Element vorhanden (Legacy-Fall), setze Titel als Fallback
        if (state.$displayText && state.$displayText.length) {
            state.$displayText.text(text || placeholder);
            state.$display.toggleClass('text-muted', !text);
        } else {
            state.$display.text(text || placeholder);
        }
    }

    // Methoden erweitern: setDisableDates / getDisableDates / setMin / setMax / clearDisableDates
    const _old = $.fn.bsDatepicker;
    $.fn.bsDatepicker = function (optionsOrMethod) {
        if (typeof optionsOrMethod === 'string') {
            const args = Array.prototype.slice.call(arguments, 1);
            if (optionsOrMethod === 'setDisableDates') {
                return this.each(function () {
                    const $el = $(this);
                    const state = $el.data(NS) || $el.find('.dp-display').data(NS) || $el.data(NS);
                    if (!state) return;
                    state.disabled = normalizeDisabled(args[0] || null);
                    // Auswahl bereinigen, wenn nötig
                    const purge = function (d) { return d && isDisabledDate(d, state) ? null : d; };
                    state.selected = purge(state.selected);
                    state.rangeStart = purge(state.rangeStart);
                    updatePanel(state);
                });
            }
            if (optionsOrMethod === 'getDisableDates') {
                const $el = this.eq(0);
                const state = $el.data(NS) || $el.find('.dp-display').data(NS) || $el.data(NS);
                return state ? state.disabled : null;
            }
            if (optionsOrMethod === 'setMin') {
                return this.each(function () {
                    const state = $(this).data(NS);
                    if (!state) return;
                    const cfg = $.extend({}, state.disabled, { min: toDateOrNull(arguments.length > 1 ? arguments[1] : args[0]) });
                    state.disabled = normalizeDisabled(cfg);
                    state.selected = (state.selected && isDisabledDate(state.selected, state)) ? null : state.selected;
                    state.rangeStart = (state.rangeStart && isDisabledDate(state.rangeStart, state)) ? null : state.rangeStart;
                    updatePanel(state);
                });
            }
            if (optionsOrMethod === 'setMax') {
                return this.each(function () {
                    const state = $(this).data(NS);
                    if (!state) return;
                    const cfg = $.extend({}, state.disabled, { max: toDateOrNull(arguments.length > 1 ? arguments[1] : args[0]) });
                    state.disabled = normalizeDisabled(cfg);
                    state.selected = (state.selected && isDisabledDate(state.selected, state)) ? null : state.selected;
                    state.rangeStart = (state.rangeStart && isDisabledDate(state.rangeStart, state)) ? null : state.rangeStart;
                    updatePanel(state);
                });
            }
            if (optionsOrMethod === 'clearDisableDates') {
                return this.each(function () {
                    const state = $(this).data(NS);
                    if (!state) return;
                    state.disabled = normalizeDisabled(null);
                    updatePanel(state);
                });
            }
        }
        // Fallback: normale Initialisierung
        return _old.apply(this, arguments);
    };

}(jQuery));