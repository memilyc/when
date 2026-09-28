/**
 * js/slider.js — TimeSlider component.
 *
 * Responsibilities:
 *   - Wrap a container element with an <input type="range" min=0 max=1439 step=15>
 *     representing minutes since midnight (0–1439, 96 steps at 15 min each).
 *   - Render a floating sun ☀️ / moon 🌙 icon that tracks the thumb position.
 *   - Switch icon and track colour when crossing day/night boundaries
 *     (day = minutes 360–1199, i.e. 06:00–19:59).
 *   - Expose getValue() → minutes and setValue(mins) for external control.
 *   - Emit a custom 'timechange' event on the container whenever the value changes.
 *   - All animations via CSS transitions (no JS animation libraries).
 */

(function () {
  'use strict';

  var DAY_START = 360;   // 06:00
  var DAY_END   = 1199;  // 19:59

  /**
   * Format minutes since midnight to a locale-aware time string.
   * Uses 12-hour format for en-US-like locales, 24-hour for others.
   * @param {number} mins
   * @returns {string}
   */
  function formatMinutes(mins) {
    var h = Math.floor(mins / 60);
    var m = mins % 60;
    var date = new Date(1970, 0, 1, h, m);
    try {
      return date.toLocaleTimeString(navigator.language, {
        hour: 'numeric',
        minute: '2-digit',
        hour12: undefined  // let locale decide
      });
    } catch (e) {
      // Fallback: plain HH:MM
      return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
    }
  }

  /**
   * Returns true if the given minutes value is daytime.
   * @param {number} mins
   * @returns {boolean}
   */
  function isDay(mins) {
    return mins >= DAY_START && mins <= DAY_END;
  }

  /**
   * TimeSlider
   * @param {HTMLElement} container - Element to mount the slider into.
   */
  function TimeSlider(container) {
    this.container = container;

    // Wrapper provides position:relative so the icon can be absolutely positioned.
    var wrapper = document.createElement('div');
    wrapper.className = 'slider-track-wrapper';
    container.appendChild(wrapper);

    // The range input
    var input = document.createElement('input');
    input.type  = 'range';
    input.min   = '0';
    input.max   = '1439';
    input.step  = '15';
    input.value = '720';
    input.className = 'time-slider-input';
    input.setAttribute('aria-label', 'Select meeting time');
    wrapper.appendChild(input);

    // Floating icon element
    var icon = document.createElement('span');
    icon.className = 'time-slider-icon';
    icon.setAttribute('aria-hidden', 'true');
    wrapper.appendChild(icon);

    this.input   = input;
    this.icon    = icon;
    this._lastDay = null;  // track previous day/night state to detect boundary crossing

    // Bind event handler
    var self = this;
    input.addEventListener('input', function () {
      self._update(true);
    });

    // Initialise display without firing timechange
    this._update(false);
  }

  /**
   * Update icon position, icon symbol, track fill, and optionally fire timechange.
   * @param {boolean} fireEvent
   */
  TimeSlider.prototype._update = function (fireEvent) {
    var mins  = parseInt(this.input.value, 10);
    var day   = isDay(mins);
    var pct   = (mins / 1439) * 100;

    // Update CSS custom properties on the input for track fill and colour
    this.input.style.setProperty('--slider-fill-pct', pct.toFixed(3) + '%');
    this.input.classList.toggle('is-day',   day);
    this.input.classList.toggle('is-night', !day);

    // Detect boundary crossing → animate icon
    var crossed = this._lastDay !== null && this._lastDay !== day;
    this._lastDay = day;

    if (crossed) {
      // Fade out
      this.icon.classList.add('icon-exit');
      var self = this;
      // After transition, swap symbol and fade in
      setTimeout(function () {
        self.icon.textContent = day ? '☀️' : '🌙';
        self.icon.classList.remove('icon-exit');
        self.icon.classList.add('icon-enter');
        // Remove enter class after transition ends so it doesn't block future toggles
        setTimeout(function () {
          self.icon.classList.remove('icon-enter');
        }, 350);
      }, 320);
    } else {
      // No crossing — just ensure correct symbol
      this.icon.textContent = day ? '☀️' : '🌙';
    }

    // Position the icon above the thumb.
    // The browser centres the thumb over its position value, but the thumb is
    // physically clamped at the track edges — so the effective travel is
    // (track-width - thumb-width).  We compensate with:
    //   left = pct% - (pct - 0.5) * thumb-width
    // which is equivalent to the standard range-thumb offset formula.
    // Using inline CSS calc() with the --thumb-size custom property (in rem)
    // avoids needing JS to read rendered pixel widths.
    var thumbOffsetFactor = (pct / 100 - 0.5);
    this.icon.style.left = 'calc(' + pct.toFixed(3) + '% - ' +
      thumbOffsetFactor.toFixed(6) + ' * var(--thumb-size))';

    // Update aria-valuetext
    this.input.setAttribute('aria-valuetext', formatMinutes(mins));

    if (fireEvent) {
      var event = new CustomEvent('timechange', { detail: { minutes: mins }, bubbles: true });
      this.container.dispatchEvent(event);
    }
  };

  /**
   * Returns the current value in minutes since midnight.
   * @returns {number}
   */
  TimeSlider.prototype.getValue = function () {
    return parseInt(this.input.value, 10);
  };

  /**
   * Sets the slider to the given minute value (clamped to nearest 15-min step).
   * @param {number} mins - Minutes since midnight (0–1439).
   */
  TimeSlider.prototype.setValue = function (mins) {
    var clamped = Math.max(0, Math.min(1439, Math.round(mins / 15) * 15));
    this.input.value = clamped;
    this._update(false);
  };

  // Expose formatMinutes for use in app.js
  window.formatMinutes = formatMinutes;

  // Expose on window for access by app.js (plain-script, no module bundler).
  window.TimeSlider = TimeSlider;
}());
