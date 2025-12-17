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
            icons: {                    // Bootstrap Icons class names
                prev: 'bi bi-chevron-left',
                next: 'bi bi-chevron-right',
                clear: 'bi bi-x-lg'
            },
            // CSS-Klassen für die sichtbare Anzeige (kein Input mehr)
            classes: {
                display: 'form-control d-flex align-items-center justify-content-between',
                displayText: '',
                displayIcon: 'bi bi-calendar-event'
            }
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

                // Button-Klassen: Border weg, Basis ohne Rundung; Range komplett in Primärfarbe
                // Einheitliche Tagesbreite: Button füllt Zelle (w-100), dadurch durchgehende Range ohne Lücken
                let btnCls = 'btn btn-sm w-100 border-0 rounded-0 ';
                const inRangeAny = isStart || isEnd || isBetween;
                if (isSelected || inRangeAny) btnCls += 'btn-primary ';
                else btnCls += ' ';
                if (muted) btnCls += ' text-muted ';
                // Heute-Markierung nur, wenn nicht primär, damit lesbar bleibt
                if (isToday && !(isSelected || inRangeAny)) btnCls += ' text-danger fw-semibold ';
                // Abrundung nur am linken Rand (Start) und rechten Rand (Ende) als Pill-Feeling
                if (isStart) btnCls += ' rounded-0 ';
                if (isEnd) btnCls += ' rounded-0 ';

                html += '<td class="' + tdCls.trim() + '">';
                // data-date als Millisekunden-Zeitstempel ablegen, um TZ-Parsing-Probleme zu vermeiden
                html += '<button type="button" class="' + btnCls.trim() + '" data-action="pick" data-date="' + d.getTime() + '">';
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
        // Karte: keine feste Breite; tatsächliche Dropdown-Breite wird nach Render dynamisch gesetzt
        html += '<div class="card shadow">';
        html += '  <div class="card-header py-1 d-flex justify-content-between align-items-center">';
        html += '    <div class="btn-group">';
        html += '      <button type="button" class="btn btn-sm btn-light" data-action="prev"><i class="' + (opts.icons && opts.icons.prev || $.bsDatepicker.default.icons.prev) + '"></i></button>';
        html += '    </div>';
        html += '    <div class="fw-semibold text-capitalize">' + getMonthYearTitle(current, opts.locale) + (months > 1 ? ' … ' + getMonthYearTitle(addMonths(current, months - 1), opts.locale) : '') + '</div>';
        html += '    <div class="btn-group">';
        html += '      <button type="button" class="btn btn-sm btn-light" data-action="clear"><i class="' + (opts.icons && opts.icons.clear || $.bsDatepicker.default.icons.clear) + '"></i></button>';
        html += '      <button type="button" class="btn btn-sm btn-light" data-action="next"><i class="' + (opts.icons && opts.icons.next || $.bsDatepicker.default.icons.next) + '"></i></button>';
        html += '    </div>';
        html += '  </div>';
        html += '  <div class="card-body p-3">';
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
            const placeholder = isRange ? 'Zeitraum wählen' : 'Datum auswählen';
            const clsMuted = text ? '' : ' text-muted';
            html += '    <div class="mb-2 small dp-inline-output' + clsMuted + '">' + (text || placeholder) + '</div>';
        }
        // Maximal 2 Monate pro Zeile: Grid ohne Stretch (je Zeile genau 2 Spalten)
        html += '    <div class="row g-3">';
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
        $panel.on('click.' + NS, '[data-action="next"]', function (e) {
            e.preventDefault();
            state.current = addMonths(state.current, +1);
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
        const placeholder = isRange ? 'Zeitraum wählen' : 'Datum auswählen';
        // Falls kein spezielles Text-Element vorhanden (Legacy-Fall), setze Titel als Fallback
        if (state.$displayText && state.$displayText.length) {
            state.$displayText.text(text || placeholder);
            state.$display.toggleClass('text-muted', !text);
        } else {
            state.$display.text(text || placeholder);
        }
    }

}(jQuery));