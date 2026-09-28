/**
 * js/timezones.js — Timezone row manager + city search UI.
 *
 * Sub-task 5:
 *   - Injects the city-search autocomplete into #city-search-container.
 *   - TimezoneRows manages an ordered list of rows in <ul id="tz-rows">.
 *   - First row is always the browser's local zone (pinned but user-replaceable).
 *   - addRow(cityObj)       — create and append a DOM row for {city, country, tz}.
 *   - removeRow(ianaName)   — remove the row matching the given IANA tz string.
 *   - updateAll(utcMillis)  — re-render all row times from a UTC millisecond value.
 *   - getTimezones()        — returns IANA strings for all rows (local first).
 *   - setTimezones(arr)     — hydrates rows from an array of IANA strings or cityObjs.
 *   - getLocalZone()        — returns the IANA tz of the pinned local row.
 */

(function () {
  'use strict';

  var DAY_START_H = 6;   // 06:00
  var DAY_END_H   = 19;  // 19:59 (up to but not including 20:00)

  /* ── Helpers ──────────────────────────────────────────────────────────────── */

  function isRowDay(hour) {
    return hour >= DAY_START_H && hour <= DAY_END_H;
  }

  /**
   * Returns a formatted time string for the given Luxon DateTime using the
   * browser locale (12h or 24h depending on locale).
   */
  function fmtTime(dt) {
    try {
      return dt.toJSDate().toLocaleTimeString(navigator.language, {
        hour:   'numeric',
        minute: '2-digit',
        hour12: undefined,
      });
    } catch (e) {
      return dt.toFormat('HH:mm');
    }
  }

  /** Returns "Mon, 14 Jul" style date string. */
  function fmtDate(dt) {
    try {
      return dt.toJSDate().toLocaleDateString(navigator.language, {
        weekday: 'short',
        day:     'numeric',
        month:   'short',
      });
    } catch (e) {
      return dt.toFormat('ccc, d LLL');
    }
  }

  /**
   * Computes the integer day offset between two Luxon DateTimes.
   * refDt is the pinned local row; rowDt is the row being compared.
   */
  function dayOffset(refDt, rowDt) {
    var refDay = refDt.startOf('day');
    var rowDay = rowDt.startOf('day');
    return Math.round(rowDay.diff(refDay, 'days').days);
  }


  /* ── City Search Autocomplete ─────────────────────────────────────────────── */

  /**
   * Builds and mounts the city-search autocomplete into the given container.
   * Calls onSelect(cityObj) when the user picks a city.
   *
   * @param {HTMLElement} container
   * @param {function({city:string, country:string, tz:string}):void} onSelect
   * @returns {{ destroy: function }} — cleanup handle
   */
  function buildCitySearch(container, onSelect) {
    // ── DOM scaffold ──
    var wrapper = document.createElement('div');
    wrapper.className = 'city-search-wrapper';
    wrapper.setAttribute('role', 'combobox');
    wrapper.setAttribute('aria-haspopup', 'listbox');
    wrapper.setAttribute('aria-expanded', 'false');

    var label = document.createElement('label');
    label.setAttribute('for', 'city-search');
    label.className = 'visually-hidden';
    label.textContent = 'Add a timezone — search by city';

    var input = document.createElement('input');
    input.type = 'text';
    input.id   = 'city-search';
    input.className = 'city-search-input';
    input.placeholder = 'Add city… (e.g. Lagos, Seoul, Berlin)';
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('autocorrect',  'off');
    input.setAttribute('spellcheck',   'false');
    input.setAttribute('role',         'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-controls', 'city-search-listbox');
    input.setAttribute('aria-activedescendant', '');

    var listbox = document.createElement('ul');
    listbox.id        = 'city-search-listbox';
    listbox.className = 'city-search-dropdown';
    listbox.setAttribute('role',       'listbox');
    listbox.setAttribute('aria-label', 'City suggestions');
    listbox.hidden = true;

    wrapper.appendChild(label);
    wrapper.appendChild(input);
    wrapper.appendChild(listbox);
    container.appendChild(wrapper);

    // ── State ──
    var _results      = [];
    var _activeIndex  = -1;
    var _debounceTimer = null;

    function openDropdown() {
      listbox.hidden = false;
      wrapper.setAttribute('aria-expanded', 'true');
    }

    function closeDropdown() {
      listbox.hidden = true;
      wrapper.setAttribute('aria-expanded', 'false');
      _activeIndex = -1;
      input.setAttribute('aria-activedescendant', '');
    }

    function renderResults(results) {
      listbox.innerHTML = '';
      _results    = results;
      _activeIndex = -1;
      input.setAttribute('aria-activedescendant', '');

      if (results.length === 0) {
        closeDropdown();
        return;
      }

      results.forEach(function (city, i) {
        var li = document.createElement('li');
        li.id   = 'city-opt-' + i;
        li.setAttribute('role', 'option');
        li.setAttribute('aria-selected', 'false');

        var nameEl = document.createElement('span');
        nameEl.className = 'city-opt-name';
        nameEl.textContent = city.city;

        var metaEl = document.createElement('span');
        metaEl.className = 'city-opt-meta';
        metaEl.textContent = city.country + ' · ' + city.tz;

        li.appendChild(nameEl);
        li.appendChild(metaEl);

        li.addEventListener('mousedown', function (e) {
          // mousedown fires before blur — prevent the blur from closing the list first
          e.preventDefault();
        });
        li.addEventListener('click', function () {
          selectResult(i);
        });

        listbox.appendChild(li);
      });

      openDropdown();
    }

    function setActive(index) {
      var items = listbox.querySelectorAll('[role="option"]');
      items.forEach(function (el, i) {
        var active = (i === index);
        el.setAttribute('aria-selected', active ? 'true' : 'false');
        if (active) el.classList.add('is-active');
        else        el.classList.remove('is-active');
      });
      _activeIndex = index;
      var activeId = index >= 0 ? 'city-opt-' + index : '';
      input.setAttribute('aria-activedescendant', activeId);
    }

    function selectResult(index) {
      var city = _results[index];
      if (!city) return;
      onSelect(city);
      input.value = '';
      closeDropdown();
    }

    function doSearch(q) {
      var results = window.WhenCities.searchCities(q);
      renderResults(results);
    }

    // ── Event listeners ──
    input.addEventListener('input', function () {
      clearTimeout(_debounceTimer);
      var q = input.value;
      if (!q || q.trim().length < 1) { closeDropdown(); return; }
      _debounceTimer = setTimeout(function () { doSearch(q); }, 200);
    });

    input.addEventListener('keydown', function (e) {
      if (listbox.hidden) return;
      var count = _results.length;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive((_activeIndex + 1) % count);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive((_activeIndex - 1 + count) % count);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (_activeIndex >= 0) selectResult(_activeIndex);
        else if (count === 1)  selectResult(0);
      } else if (e.key === 'Escape') {
        closeDropdown();
        input.value = '';
      }
    });

    input.addEventListener('blur', function () {
      // Short delay so click on list item can fire first
      setTimeout(closeDropdown, 150);
    });

    return {
      destroy: function () {
        clearTimeout(_debounceTimer);
        container.removeChild(wrapper);
      },
      focus: function () { input.focus(); },
    };
  }

  /**
   * Builds a "change zone" mini-search popup that appears in-place on the local row.
   * Calls onSelect(cityObj) and removes itself when a selection is made or cancelled.
   *
   * @param {HTMLElement} rowEl  — the <li> of the local row
   * @param {function} onSelect
   */
  function buildInlineSearch(rowEl, onSelect) {
    var existing = rowEl.querySelector('.tz-inline-search');
    if (existing) { existing.querySelector('input').focus(); return; }

    var wrap = document.createElement('div');
    wrap.className = 'tz-inline-search';

    var inp = document.createElement('input');
    inp.type = 'text';
    inp.className = 'city-search-input tz-inline-search-input';
    inp.placeholder = 'Search city…';
    inp.setAttribute('autocomplete', 'off');
    inp.setAttribute('autocorrect',  'off');
    inp.setAttribute('spellcheck',   'false');

    var drop = document.createElement('ul');
    drop.className = 'city-search-dropdown tz-inline-dropdown';
    drop.setAttribute('role', 'listbox');
    drop.hidden = true;

    wrap.appendChild(inp);
    wrap.appendChild(drop);
    rowEl.appendChild(wrap);
    inp.focus();

    var _results     = [];
    var _activeIndex = -1;
    var _timer       = null;

    function close() {
      clearTimeout(_timer);
      if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
    }

    function setActive(index) {
      var items = drop.querySelectorAll('li');
      items.forEach(function (el, i) {
        var a = (i === index);
        el.setAttribute('aria-selected', a ? 'true' : 'false');
        if (a) el.classList.add('is-active');
        else   el.classList.remove('is-active');
      });
      _activeIndex = index;
    }

    function renderDrop(results) {
      drop.innerHTML = '';
      _results     = results;
      _activeIndex = -1;
      if (!results.length) { drop.hidden = true; return; }
      results.forEach(function (city, i) {
        var li = document.createElement('li');
        li.setAttribute('role', 'option');
        li.setAttribute('aria-selected', 'false');
        li.innerHTML =
          '<span class="city-opt-name">' + city.city + '</span>' +
          '<span class="city-opt-meta">' + city.country + ' · ' + city.tz + '</span>';
        li.addEventListener('mousedown', function (e) { e.preventDefault(); });
        li.addEventListener('click', function () { pick(i); });
        drop.appendChild(li);
      });
      drop.hidden = false;
    }

    function pick(i) {
      var city = _results[i];
      if (!city) return;
      close();
      onSelect(city);
    }

    inp.addEventListener('input', function () {
      clearTimeout(_timer);
      var q = inp.value;
      if (!q || q.trim().length < 1) { drop.hidden = true; return; }
      _timer = setTimeout(function () {
        renderDrop(window.WhenCities.searchCities(q));
      }, 200);
    });

    inp.addEventListener('keydown', function (e) {
      var count = _results.length;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!drop.hidden) setActive((_activeIndex + 1) % count);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (!drop.hidden) setActive((_activeIndex - 1 + count) % count);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (_activeIndex >= 0)    pick(_activeIndex);
        else if (count === 1)     pick(0);
      } else if (e.key === 'Escape') {
        close();
      }
    });

    inp.addEventListener('blur', function () {
      setTimeout(close, 150);
    });
  }


  /* ── TimezoneRows ─────────────────────────────────────────────────────────── */

  /**
   * @param {HTMLUListElement} listEl         — <ul id="tz-rows">
   * @param {HTMLElement}      searchContainer — #city-search-container
   */
  function TimezoneRows(listEl, searchContainer) {
    this.listEl = listEl;
    /** @type {Array<{city:string, country:string, tz:string, el:HTMLLIElement, isLocal:boolean}>} */
    this.rows   = [];
    this._lastUtcMillis = Date.now();

    var self = this;

    // ── City search UI ──
    buildCitySearch(searchContainer, function (cityObj) {
      self.addRow(cityObj);
    });

    // ── Pinned local row ──
    var localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    this._localZone = localTz;
    this._addLocalRow({ city: this._labelForZone(localTz), country: '', tz: localTz });
  }

  /**
   * Returns a human-friendly label for a bare IANA timezone string
   * (used when we only know the tz, not the city name).
   */
  TimezoneRows.prototype._labelForZone = function (tz) {
    // "America/New_York" → "New York"
    var parts = tz.split('/');
    return parts[parts.length - 1].replace(/_/g, ' ');
  };

  /** Adds the pinned local row (non-removable, has ✏ Change button). */
  TimezoneRows.prototype._addLocalRow = function (cityObj) {
    var li = this._buildRowEl(cityObj, true);
    this.listEl.appendChild(li);
    this.rows.unshift({ city: cityObj.city, country: cityObj.country, tz: cityObj.tz, el: li, isLocal: true });
  };

  /**
   * Replaces the local row's city info in-place (does NOT change the UTC moment).
   * @param {{ city:string, country:string, tz:string }} cityObj
   */
  TimezoneRows.prototype._changeLocalRow = function (cityObj) {
    var localRow = this.rows[0];
    if (!localRow || !localRow.isLocal) return;

    this._localZone = cityObj.tz;
    localRow.city    = cityObj.city;
    localRow.country = cityObj.country;
    localRow.tz      = cityObj.tz;

    // Rebuild the DOM element
    var newEl = this._buildRowEl(cityObj, true);
    this.listEl.replaceChild(newEl, localRow.el);
    localRow.el = newEl;

    // Re-render time with last known UTC value
    this._renderRowTime(localRow, this._lastUtcMillis, null);
  };

  /**
   * Adds a new (non-local) timezone row, skipping duplicates.
   * @param {{ city:string, country:string, tz:string }} cityObj
   */
  TimezoneRows.prototype.addRow = function (cityObj) {
    // Reject duplicate tz strings
    var already = this.rows.some(function (r) { return r.tz === cityObj.tz; });
    if (already) return;

    var li = this._buildRowEl(cityObj, false);
    this.listEl.appendChild(li);
    var row = { city: cityObj.city, country: cityObj.country, tz: cityObj.tz, el: li, isLocal: false };
    this.rows.push(row);

    // Render current time immediately
    var refDt = this.rows[0]
      ? luxon.DateTime.fromMillis(this._lastUtcMillis).setZone(this.rows[0].tz)
      : null;
    this._renderRowTime(row, this._lastUtcMillis, refDt);
  };

  /**
   * Removes the row for the given IANA timezone name.
   * The local (pinned) row cannot be removed via this method.
   * @param {string} ianaName
   */
  TimezoneRows.prototype.removeRow = function (ianaName) {
    var idx = -1;
    for (var i = 0; i < this.rows.length; i++) {
      if (this.rows[i].tz === ianaName && !this.rows[i].isLocal) {
        idx = i;
        break;
      }
    }
    if (idx === -1) return;
    var removed = this.rows.splice(idx, 1)[0];
    if (removed.el.parentNode) removed.el.parentNode.removeChild(removed.el);
  };

  /**
   * Re-renders the time display in every row for the given UTC millisecond value.
   * @param {number} utcMillis
   */
  TimezoneRows.prototype.updateAll = function (utcMillis) {
    this._lastUtcMillis = utcMillis;
    var refDt = this.rows[0]
      ? luxon.DateTime.fromMillis(utcMillis).setZone(this.rows[0].tz)
      : null;
    for (var i = 0; i < this.rows.length; i++) {
      this._renderRowTime(this.rows[i], utcMillis, refDt);
    }
  };

  /**
   * Returns an array of IANA timezone strings (local row first, then added rows).
   * @returns {string[]}
   */
  TimezoneRows.prototype.getTimezones = function () {
    return this.rows.map(function (r) { return r.tz; });
  };

  /**
   * Returns the IANA timezone of the pinned local row.
   * @returns {string}
   */
  TimezoneRows.prototype.getLocalZone = function () {
    return this._localZone;
  };

  /**
   * Hydrates rows from an array of IANA timezone strings.
   * Skips the local zone (already present as the pinned row).
   * @param {string[]} tzArray
   */
  TimezoneRows.prototype.setTimezones = function (tzArray) {
    var self = this;
    tzArray.forEach(function (tz) {
      if (!tz || typeof tz !== 'string') return;
      if (tz === self._localZone) return;        // already present as local row
      // Prefer a full city object from the cache for a richer display name.
      var cityObj = WhenCities.getCityByTz(tz);
      if (!cityObj) {
        // Fallback: derive a readable name from the IANA string itself.
        var label = tz.split('/').pop().replace(/_/g, ' ');
        cityObj = { city: label, country: '', tz: tz };
      }
      self.addRow(cityObj);
    });
  };

  /* ── Row DOM building ──────────────────────────────────────────────────────── */

  /**
   * Builds the <li> DOM element for a row.
   * @param {{ city:string, country:string, tz:string }} cityObj
   * @param {boolean} isLocal
   * @returns {HTMLLIElement}
   */
  TimezoneRows.prototype._buildRowEl = function (cityObj, isLocal) {
    var self = this;
    var li = document.createElement('li');
    li.className = 'tz-row' + (isLocal ? ' tz-row-local' : '');
    li.setAttribute('data-tz', cityObj.tz);

    // ── Left column: city info ──
    var colCity = document.createElement('div');
    colCity.className = 'tz-row-city';

    var cityName = document.createElement('span');
    cityName.className = 'tz-row-city-name';
    cityName.textContent = cityObj.city;

    colCity.appendChild(cityName);

    if (cityObj.country) {
      var countryEl = document.createElement('span');
      countryEl.className = 'tz-row-country';
      countryEl.textContent = cityObj.country;
      colCity.appendChild(countryEl);
    }

    if (isLocal) {
      var changeBtn = document.createElement('button');
      changeBtn.type = 'button';
      changeBtn.className = 'tz-row-change';
      changeBtn.textContent = '✏ Change';
      changeBtn.setAttribute('aria-label', 'Change local timezone');
      changeBtn.addEventListener('click', function () {
        buildInlineSearch(li, function (city) {
          self._changeLocalRow(city);
        });
      });
      colCity.appendChild(changeBtn);
    }

    li.appendChild(colCity);

    // ── Right column: time info ──
    var colTime = document.createElement('div');
    colTime.className = 'tz-row-time-col';

    var timeEl = document.createElement('span');
    timeEl.className = 'tz-row-time';
    timeEl.setAttribute('aria-live', 'polite');

    var dateEl = document.createElement('span');
    dateEl.className = 'tz-row-date';

    var metaRow = document.createElement('div');
    metaRow.className = 'tz-row-meta';

    var tzAbbrEl = document.createElement('span');
    tzAbbrEl.className = 'tz-row-abbr';

    var badgeEl = document.createElement('span');
    badgeEl.className = 'tz-row-badge';
    badgeEl.hidden = true;

    var iconEl = document.createElement('span');
    iconEl.className = 'tz-row-icon';
    iconEl.setAttribute('aria-hidden', 'true');

    metaRow.appendChild(tzAbbrEl);
    metaRow.appendChild(badgeEl);
    metaRow.appendChild(iconEl);

    colTime.appendChild(timeEl);
    colTime.appendChild(dateEl);
    colTime.appendChild(metaRow);

    li.appendChild(colTime);

    // ── Remove button (non-local rows only) ──
    if (!isLocal) {
      var removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'tz-row-remove';
      removeBtn.setAttribute('aria-label', 'Remove ' + cityObj.city);
      removeBtn.textContent = '×';
      removeBtn.addEventListener('click', function () {
        self.removeRow(cityObj.tz);
      });
      li.appendChild(removeBtn);
    }

    // Store references on the element for fast re-renders
    li._tzTimeEl  = timeEl;
    li._tzDateEl  = dateEl;
    li._tzAbbrEl  = tzAbbrEl;
    li._tzBadgeEl = badgeEl;
    li._tzIconEl  = iconEl;

    return li;
  };

  /**
   * Re-renders the time portion of a single row.
   * @param {{ tz:string, el:HTMLLIElement }} row
   * @param {number} utcMillis
   * @param {luxon.DateTime|null} refDt  — the local row's DateTime (for day-offset calc)
   */
  TimezoneRows.prototype._renderRowTime = function (row, utcMillis, refDt) {
    var el = row.el;
    if (!el) return;

    var dt;
    try {
      dt = luxon.DateTime.fromMillis(utcMillis).setZone(row.tz);
    } catch (e) {
      return;
    }

    if (el._tzTimeEl)  el._tzTimeEl.textContent  = fmtTime(dt);
    if (el._tzDateEl)  el._tzDateEl.textContent  = fmtDate(dt);
    if (el._tzAbbrEl)  el._tzAbbrEl.textContent  = dt.toFormat('ZZZZ');
    if (el._tzIconEl)  el._tzIconEl.textContent  = isRowDay(dt.hour) ? '☀' : '🌙';

    // Day-offset badge
    var badgeEl = el._tzBadgeEl;
    if (badgeEl) {
      if (refDt) {
        var offset = dayOffset(refDt, dt);
        if (offset === 0) {
          badgeEl.hidden = true;
          badgeEl.textContent = '';
        } else {
          badgeEl.hidden = false;
          badgeEl.textContent = (offset > 0 ? '+' : '−') + Math.abs(offset) + ' day';
        }
      } else {
        badgeEl.hidden = true;
      }
    }
  };

  // Expose on window for access by app.js.
  window.TimezoneRows = TimezoneRows;
}());
