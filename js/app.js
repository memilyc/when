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
    var sliderContainer = document.getElementById('time-slider-container');
    var timeDisplay     = document.getElementById('time-display');
    var slider = new TimeSlider(sliderContainer);

    // Default to current local time rounded to nearest 15-min step
    var now  = new Date();
    var defaultMins = Math.round((now.getHours() * 60 + now.getMinutes()) / 15) * 15;
    slider.setValue(defaultMins);

    function updateTimeDisplay(minutes) {
      if (timeDisplay) {
        timeDisplay.textContent = formatMinutes(minutes);
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

    // ── Share / Copy link ─────────────────────────────────────────────────────
    var copyBtn     = document.getElementById('copy-link-btn');
    var copyConfirm = document.getElementById('copy-confirm');

    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        var url = window.location.href;
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

    // ── Timezone rows + city search (sub-task 5) ──────────────────────────────
    WhenCities.loadCities();

    var timezoneRows = new TimezoneRows(
      document.getElementById('tz-rows'),
      document.getElementById('city-search-container')
    );

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
      var refZone = timezoneRows.getLocalZone();
      var dt = luxon.DateTime.fromObject(
        { year: year, month: month, day: day, hour: h, minute: m },
        { zone: refZone }
      );
      return dt.toMillis();
    }

    /** Re-renders all timezone rows for the current slider + date state. */
    function onStateChange() {
      timezoneRows.updateAll(getCurrentUtcMillis());
    }

    // Wire slider and date picker to onStateChange
    sliderContainer.addEventListener('timechange', onStateChange);
    if (datePicker) datePicker.addEventListener('change', onStateChange);

    // Initial render — populate rows with the default time
    onStateChange();

    // TODO (sub-task 6): decode URL params and hydrate state.
  });
}());
