/**
 * Food Express — js/components/location-modal.js
 * Location selector: search by city / locality / PIN, recent locations,
 * saved addresses and honest coverage labels.
 */
(function (global) {
  'use strict';

  const FX = (global.FX = global.FX || {});
  const { h, clear, money } = FX.u;
  const store = FX.store;
  const ui = FX.ui;
  const C = FX.constants;

  let instance = null;

  function coverageBadge(coverage) {
    if (coverage === C.COVERAGE.DEMO_FULL) return h('span', { class: 'fx-badge fx-badge-success fx-cov', text: 'Full' });
    if (coverage === C.COVERAGE.DEMO_LIMITED) return h('span', { class: 'fx-badge fx-badge-warning fx-cov', text: 'Limited' });
    return h('span', { class: 'fx-badge fx-cov', text: 'Soon' });
  }

  function open(options) {
    const opts = options || {};
    if (instance) instance.close();

    let selectedCityId = store.location.current.cityId;
    let selectedLocalityId = store.location.current.localityId;

    const searchInput = h('input', {
      class: 'fx-input',
      type: 'search',
      placeholder: 'Search city, locality or 6-digit PIN code',
      'aria-label': 'Search for a city, locality or PIN code',
    });

    const results = h('div', { class: 'fx-stack', style: { gap: '10px' } });
    const cityList = h('div', { class: 'fx-loc-cities', role: 'listbox', 'aria-label': 'Cities' });
    const localityWrap = h('div', {});

    function apply() {
      store.location.set(selectedCityId, selectedLocalityId);
      const locality = store.location.locality();
      store.location.pushRecent({
        cityId: selectedCityId,
        localityId: selectedLocalityId,
        label: locality ? locality.name + ', ' + FX.locations.getCity(selectedCityId).name : FX.locations.getCity(selectedCityId).name,
      });
      const city = FX.locations.getCity(selectedCityId);
      if (city && city.coverage === C.COVERAGE.COMING_SOON) {
        ui.notify.warning(city.name + ' is not serviceable yet — browsing only, checkout is blocked.', { duration: 6000 });
      } else {
        ui.notify.success('Delivering to ' + store.location.label() + (city ? ' (' + city.name + ')' : ''));
      }
      instance.close();
      if (opts.onSelect) opts.onSelect(store.location.current);
      else if (document.body.dataset.reloadOnLocation === 'true') global.location.reload();
      else FX.bus.emit('location:applied', store.location.current);
    }

    function renderCities() {
      clear(cityList);
      FX.locations.CITIES.forEach((city) => {
        const button = h(
          'button',
          {
            class: 'fx-loc-city' + (city.id === selectedCityId ? ' is-active' : ''),
            type: 'button',
            role: 'option',
            'aria-selected': city.id === selectedCityId ? 'true' : 'false',
            onClick: () => {
              selectedCityId = city.id;
              selectedLocalityId = null;
              renderCities();
              renderLocalities();
            },
          },
          [
            h('span', {}, [
              h('div', { style: { fontWeight: '600' }, text: city.name }),
              h('div', { class: 'fx-xs fx-muted-2', text: city.state + ' · ' + FX.u.etaLabel(city.etaMinutes) }),
            ]),
            coverageBadge(city.coverage),
          ]
        );
        cityList.appendChild(button);
      });
    }

    function renderLocalities() {
      clear(localityWrap);
      const city = FX.locations.getCity(selectedCityId);
      if (!city) return;
      localityWrap.appendChild(
        h('div', { class: 'fx-row-between', style: { marginBottom: '10px' } }, [
          h('h4', { style: { margin: 0 }, text: 'Localities in ' + city.name }),
          h('span', { class: 'fx-xs fx-muted', text: FX.locations.COVERAGE_LABELS[city.coverage] }),
        ])
      );
      if (city.coverage === C.COVERAGE.COMING_SOON) {
        localityWrap.appendChild(
          h('div', { class: 'fx-alert fx-alert-warning' }, [
            h('span', { class: 'fx-alert-icon', 'aria-hidden': 'true', text: '⚠️' }),
            h('div', {}, [
              h('strong', { text: 'Not serviceable yet. ' }),
              document.createTextNode(
                city.name + ' is configured as “coming soon”. You can browse the catalogue, but checkout is disabled for this city. This build has no live delivery network in any city.'
              ),
            ]),
          ])
        );
      }
      const grid = h('div', { class: 'fx-loc-grid' });
      city.localities.forEach((locality) => {
        grid.appendChild(
          h('button', {
            class: 'fx-loc-item' + (locality.id === selectedLocalityId ? ' is-active' : ''),
            type: 'button',
            onClick: () => {
              selectedLocalityId = locality.id;
              renderLocalities();
            },
          }, [
            document.createTextNode(locality.name),
            h('small', { text: 'PIN ' + locality.pin }),
          ])
        );
      });
      localityWrap.appendChild(grid);
      localityWrap.appendChild(
        h('div', { class: 'fx-row fx-gap-3', style: { marginTop: '16px', flexWrap: 'wrap' } }, [
          h('button', { class: 'fx-btn fx-btn-primary', type: 'button', onClick: apply, disabled: city.coverage === C.COVERAGE.COMING_SOON && !opts.allowUnserviceable }, [
            document.createTextNode('Deliver here'),
          ]),
          city.coverage === C.COVERAGE.COMING_SOON
            ? h('button', {
                class: 'fx-btn fx-btn-ghost',
                type: 'button',
                onClick: () => {
                  store.location.set(city.id, null);
                  ui.notify.info('Browsing ' + city.name + ' — checkout stays disabled.');
                  instance.close();
                  if (opts.onSelect) opts.onSelect(store.location.current);
                  else if (document.body.dataset.reloadOnLocation === 'true') global.location.reload();
                  else FX.bus.emit('location:applied', store.location.current);
                },
              }, [document.createTextNode('Browse only')])
            : null,
        ])
      );
    }

    function renderSearchResults() {
      clear(results);
      const value = searchInput.value.trim();
      const recents = store.location.recent();
      if (!value) {
        if (recents.length) {
          results.appendChild(h('div', { class: 'fx-suggest-group', style: { padding: '0' }, text: 'Recent locations' }));
          recents.forEach((entry) => {
            results.appendChild(
              h('button', {
                class: 'fx-loc-item',
                type: 'button',
                style: { width: '100%', textAlign: 'left' },
                onClick: () => {
                  selectedCityId = entry.cityId;
                  selectedLocalityId = entry.localityId || null;
                  apply();
                },
              }, [document.createTextNode(entry.label), h('small', { text: 'Recently used' })])
            );
          });
        }
        const addresses = store.addresses.list();
        if (addresses.length) {
          results.appendChild(h('div', { class: 'fx-suggest-group', style: { padding: '0', marginTop: '8px' }, text: 'Saved addresses' }));
          addresses.forEach((address) => {
            results.appendChild(
              h('button', {
                class: 'fx-loc-item',
                type: 'button',
                style: { width: '100%', textAlign: 'left' },
                onClick: () => {
                  selectedCityId = address.cityId;
                  selectedLocalityId = address.localityId || null;
                  apply();
                },
              }, [
                document.createTextNode((address.label || 'Address') + ' · ' + address.line1),
                h('small', { text: store.addresses.format(address) }),
              ])
            );
          });
        }
        results.appendChild(h('div', { class: 'fx-suggest-group', style: { padding: '8px 0 0' }, text: 'Popular cities' }));
        return;
      }

      const pinHit = FX.locations.findByPin(value);
      const hits = FX.locations.searchLocations(value);
      if (!hits.length && !pinHit) {
        results.appendChild(
          h('div', { class: 'fx-alert fx-alert-info' }, [
            h('span', { class: 'fx-alert-icon', 'aria-hidden': 'true', text: 'ℹ️' }),
            h('div', { text: 'No configured location matches “' + value + '”. This build only serves the listed demo cities.' }),
          ])
        );
        return;
      }
      hits.forEach((hit) => {
        results.appendChild(
          h('button', {
            class: 'fx-loc-item',
            type: 'button',
            style: { width: '100%', textAlign: 'left' },
            onClick: () => {
              selectedCityId = hit.city.id;
              selectedLocalityId = hit.locality ? hit.locality.id : null;
              apply();
            },
          }, [
            document.createTextNode(hit.label),
            h('small', { text: hit.sub + ' · ' + FX.locations.COVERAGE_LABELS[hit.city.coverage] }),
          ])
        );
      });
    }

    searchInput.addEventListener('input', FX.u.debounce(renderSearchResults, 160));

    const detectButton = h('button', {
      class: 'fx-btn fx-btn-outline fx-btn-sm',
      type: 'button',
      onClick: async (event) => {
        ui.setBusy(event.currentTarget, true, 'Detecting…');
        const result = await store.location.detect();
        ui.setBusy(event.currentTarget, false);
        if (result.reason === 'denied') {
          ui.notify.warning('Location permission was denied. Choose your city manually — the app works fine without GPS.');
        } else if (result.reason === 'unsupported') {
          ui.notify.info('This browser does not expose location services. Choose your city manually.');
        } else {
          ui.notify.info('No geocoding provider is configured in this build, so GPS results cannot be mapped to a locality. Choose your city manually.');
        }
      },
    }, [document.createTextNode('📡 Use my location')]);

    const body = h('div', { class: 'fx-stack' }, [
      h('div', { class: 'fx-row fx-gap-2', style: { flexWrap: 'wrap' } }, [
        h('div', { class: 'fx-grow' }, [searchInput]),
        detectButton,
      ]),
      results,
      h('div', { class: 'fx-loc-layout' }, [cityList, localityWrap]),
      h('div', { class: 'fx-alert fx-alert-info', style: { marginTop: '8px' } }, [
        h('span', { class: 'fx-alert-icon', 'aria-hidden': 'true', text: 'ℹ️' }),
        h('div', { text: 'Coverage here is configured demo coverage, not live service. City choice changes assortment, delivery estimates and whether checkout is allowed.' }),
      ]),
    ]);

    renderCities();
    renderLocalities();
    renderSearchResults();

    instance = ui.modal({
      title: 'Choose delivery location',
      size: 'wide',
      content: body,
      focus: '.fx-input',
      onClose: () => {
        instance = null;
      },
    });
    return instance;
  }

  FX.components = FX.components || {};
  FX.components.locationModal = { open, coverageBadge };
})(typeof globalThis !== 'undefined' ? globalThis : this);
