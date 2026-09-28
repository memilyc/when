/**
 * js/cities.js — City → IANA timezone data loader and search.
 *
 * Responsibilities (sub-task 5):
 *   - loadCities()          — fetch data/cities.json once, cache in memory.
 *   - searchCities(query)   — case-insensitive substring match on city or country,
 *                             returns top 8 results.
 *   - Each entry shape: { city: string, country: string, tz: string }.
 */

(function () {
  'use strict';

  /** @type {Array<{city: string, country: string, tz: string}>|null} */
  var _cache  = null;
  /** @type {Promise|null} */
  var _loading = null;

  /**
   * Loads cities from data/cities.json (fetched once, then cached).
   * Concurrent calls while the first fetch is in-flight share the same Promise.
   * @returns {Promise<Array<{city: string, country: string, tz: string}>>}
   */
  function loadCities() {
    if (_cache !== null) return Promise.resolve(_cache);
    if (_loading !== null) return _loading;
    _loading = fetch('data/cities.json')
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load cities.json: ' + res.status);
        return res.json();
      })
      .then(function (data) {
        _cache   = data;
        _loading = null;
        return _cache;
      });
    return _loading;
  }

  /**
   * Searches the cached city list for entries matching the query string.
   * Matches against city name or country code (case-insensitive substring).
   * Returns up to 8 results.
   * @param {string} query
   * @returns {Array<{city: string, country: string, tz: string}>}
   */
  function searchCities(query) {
    if (!_cache || !query || query.trim().length < 1) return [];
    var q = query.trim().toLowerCase();
    return _cache
      .filter(function (entry) {
        return (
          entry.city.toLowerCase().indexOf(q) !== -1 ||
          entry.country.toLowerCase().indexOf(q) !== -1
        );
      })
      .slice(0, 8);
  }

  /**
   * Returns the first city entry whose `tz` field matches the given IANA string,
   * or null if the cache is not loaded or no match is found.
   * @param {string} tz  IANA timezone identifier (e.g. "America/New_York")
   * @returns {{city: string, country: string, tz: string}|null}
   */
  function getCityByTz(tz) {
    if (!_cache) return null;
    for (var i = 0; i < _cache.length; i++) {
      if (_cache[i].tz === tz) return _cache[i];
    }
    return null;
  }

  // Expose on window for access by app.js and timezones.js.
  window.WhenCities = {
    loadCities:   loadCities,
    searchCities: searchCities,
    getCityByTz:  getCityByTz,
  };
}());
