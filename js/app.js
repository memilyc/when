/**
 * js/app.js — Main application controller.
 *
 * Responsibilities (implemented in sub-tasks 4, 5, 6):
 *   - Bootstrap and wire together TimeSlider, date picker, and theme toggle.
 *   - Maintain a single source of truth: { utcMillis, timezones[] }.
 *   - Decode ?t=&tz= URL params on load and hydrate all components.
 *   - Encode current state back into a shareable URL on "Copy link".
 *   - Update document.title to reflect the selected moment.
 */

(function () {
  'use strict';

  // ── Theme toggle ──────────────────────────────────────────────────────────
  // Reads system preference, allows manual override, persists to localStorage.
  function initThemeToggle() {
    var btn      = document.getElementById('theme-toggle');
    var iconEl   = btn && btn.querySelector('.theme-toggle-icon');
    var STORAGE_KEY = 'when-theme';

    // Determine initial theme: saved preference → system preference
    function getSystemTheme() {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    function applyTheme(theme) {
      document.documentElement.setAttribute('data-theme', theme);
      if (iconEl) iconEl.textContent = theme === 'dark' ? '☀️' : '🌙';
      if (btn) btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    }

    var saved = localStorage.getItem(STORAGE_KEY);
    applyTheme(saved || getSystemTheme());

    if (btn) {
      btn.addEventListener('click', function () {
        var current = document.documentElement.getAttribute('data-theme') || getSystemTheme();
        var next = current === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        localStorage.setItem(STORAGE_KEY, next);
      });
    }
  }

  document.addEventListener('DOMContentLoaded', function () {

    // ── Theme toggle ─────────────────────────────────────────────────────────
    initThemeToggle();

    // ── Time Slider ───────────────────────────────────────────────────────────
    var sliderContainer    = document.getElementById('time-slider-container');
    var timeDisplayValue   = document.getElementById('time-display-value');
    var timePeriodBadge    = document.getElementById('time-period-badge');
    var slider = new TimeSlider(sliderContainer);

    // Default to current local time rounded to nearest 15-min step
    var now  = new Date();
    var defaultMins = Math.round((now.getHours() * 60 + now.getMinutes()) / 15) * 15;
    slider.setValue(defaultMins);

    /**
     * Returns a human-readable period label for the given minutes-since-midnight.
     * @param {number} minutes
     * @returns {string}
     */
    function getDayPeriod(minutes) {
      var h = Math.floor(minutes / 60);
      if (h >= 5 && h < 12)  return 'Morning';
      if (h >= 12 && h < 17) return 'Afternoon';
      if (h >= 17 && h < 21) return 'Evening';
      return 'Night';
    }

    function updateTimeDisplay(minutes) {
      if (timeDisplayValue) {
        timeDisplayValue.textContent = formatMinutes(minutes);
      }
      if (timePeriodBadge) {
        timePeriodBadge.textContent = getDayPeriod(minutes);
      }
    }
    updateTimeDisplay(slider.getValue());

    sliderContainer.addEventListener('timechange', function (e) {
      updateTimeDisplay(e.detail.minutes);
    });

    // ── Date picker ───────────────────────────────────────────────────────────
    var datePicker = document.getElementById('date-picker');
    if (datePicker) {
      // Pre-fill with today's local date in YYYY-MM-DD format
      var today = new Date();
      var yyyy  = today.getFullYear();
      var mm    = String(today.getMonth() + 1).padStart(2, '0');
      var dd    = String(today.getDate()).padStart(2, '0');
      datePicker.value = yyyy + '-' + mm + '-' + dd;
    }

    // timezoneRows is set inside the loadCities callback so the city cache is
    // guaranteed populated before the search input accepts input.
    var timezoneRows = null;

    /** Returns the UTC millisecond value represented by the current slider + date. */
    function getCurrentUtcMillis() {
      var mins    = slider.getValue();
      var dateVal = datePicker ? datePicker.value : '';
      if (!dateVal) return Date.now();
      var parts = dateVal.split('-');
      var year  = parseInt(parts[0], 10);
      var month = parseInt(parts[1], 10);   // 1-based (Luxon convention)
      var day   = parseInt(parts[2], 10);
      var h     = Math.floor(mins / 60);
      var m     = mins % 60;
      var refZone = timezoneRows ? timezoneRows.getLocalZone() : 'system';
      var dt = luxon.DateTime.fromObject(
        { year: year, month: month, day: day, hour: h, minute: m },
        { zone: refZone }
      );
      return dt.toMillis();
    }

    // ── URL encode / decode ───────────────────────────────────────────────────

    /**
     * Builds a relative URL string that encodes the current state.
     * ?t=<unix-seconds>&tz=<IANA>...  (local row is omitted — auto-detected).
     * @returns {string}
     */
    function encodeState() {
      var utcSecs = Math.round(getCurrentUtcMillis() / 1000);
      var params  = new URLSearchParams();
      params.set('t', utcSecs);
      // getTimezones() returns [localZone, ...addedZones]; skip the first.
      if (timezoneRows) {
        timezoneRows.getTimezones().slice(1).forEach(function (tz) {
          params.append('tz', tz);
        });
      }
      return window.location.pathname + '?' + params.toString();
    }

    /**
     * Updates document.title and <meta name="description"> to reflect the
     * selected moment in the user's local timezone — aids social sharing previews.
     * @param {number} utcMillis
     */
    function updatePageTitle(utcMillis) {
      var localDt  = luxon.DateTime.fromMillis(utcMillis, { zone: 'system' });
      var timeStr  = localDt.toLocaleString(luxon.DateTime.TIME_SIMPLE); // e.g. "3:30 PM"
      var dateStr  = localDt.toFormat('ccc, d MMM');                     // e.g. "Mon, 14 Jul"
      var title    = 'When \u2014 ' + timeStr + ' \u00b7 ' + dateStr + ' your time';
      document.title = title;
      var descMeta = document.querySelector('meta[name="description"]');
      if (descMeta) descMeta.setAttribute('content', title);
    }

    /** Re-renders all timezone rows and keeps the URL bar in sync. */
    function onStateChange() {
      if (!timezoneRows) return;
      var utcMillis = getCurrentUtcMillis();
      timezoneRows.updateAll(utcMillis);
      updatePageTitle(utcMillis);
      history.replaceState(null, '', encodeState());
    }

    // Wire slider and date picker to onStateChange.
    sliderContainer.addEventListener('timechange', onStateChange);
    if (datePicker) datePicker.addEventListener('change', onStateChange);

    // ── Share / Copy link ─────────────────────────────────────────────────────
    var copyBtn     = document.getElementById('copy-link-btn');
    var copyConfirm = document.getElementById('copy-confirm');

    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        var url = window.location.origin + encodeState();
        history.replaceState(null, '', encodeState());
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(function () {
            showCopyConfirm();
          }).catch(function () {
            fallbackCopy(url);
          });
        } else {
          fallbackCopy(url);
        }
      });
    }

    function showCopyConfirm() {
      if (!copyConfirm) return;
      copyConfirm.hidden = false;
      setTimeout(function () { copyConfirm.hidden = true; }, 2500);
    }

    function fallbackCopy(url) {
      var input = document.createElement('input');
      input.value = url;
      input.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(input);
      input.select();
      try { document.execCommand('copy'); showCopyConfirm(); } catch (e) {}
      document.body.removeChild(input);
    }

    // ── localStorage helpers ──────────────────────────────────────────────────
    var LS_KEY = 'when-timezones';

    function saveTzToStorage() {
      if (!timezoneRows) return;
      // Save all rows except the local (index 0) — local is always auto-detected
      var tzList = timezoneRows.getTimezones().slice(1);
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(tzList));
      } catch (e) { /* storage full or private mode — silently ignore */ }
    }

    function loadTzFromStorage() {
      try {
        var raw = localStorage.getItem(LS_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch (e) { return []; }
    }

    // ── Bootstrap ─────────────────────────────────────────────────────────────

    // Wait for cities cache before building TimezoneRows — the search input must
    // not go live until WhenCities._cache is populated or doSearch() returns [].
    WhenCities.loadCities().then(function () {

      timezoneRows = new TimezoneRows(
        document.getElementById('tz-rows'),
        document.getElementById('city-search-container'),
        function onRowAdded() {
          // Re-render all rows with the current slider+date UTC value so the
          // newly added row immediately shows the correct converted time.
          saveTzToStorage();
          onStateChange();
        },
        function onRowRemoved() {
          saveTzToStorage();
          onStateChange();
        }
      );

      if (window.location.search && new URLSearchParams(window.location.search).get('t')) {
        // Shared URL takes priority over localStorage
        var params    = new URLSearchParams(window.location.search);
        var utcMillis = parseInt(params.get('t'), 10) * 1000;
        var localDt   = luxon.DateTime.fromMillis(utcMillis, { zone: 'system' });

        if (datePicker) datePicker.value = localDt.toFormat('yyyy-MM-dd');

        var localMins = localDt.hour * 60 + localDt.minute;
        var snapped   = Math.round(localMins / 15) * 15;
        slider.setValue(snapped);
        updateTimeDisplay(snapped);

        var tzParams = params.getAll('tz');
        if (tzParams.length > 0) timezoneRows.setTimezones(tzParams);
      } else {
        // No shared URL — restore last-used timezones from localStorage
        var saved = loadTzFromStorage();
        if (saved.length > 0) timezoneRows.setTimezones(saved);
      }

      onStateChange();
    });
  });
}());
