/**
 * Food Express — cities, localities and delivery zones.
 *
 * IMPORTANT: this is *configured demo coverage*. No city in this build has a
 * live delivery network. `coverage` makes that explicit so the UI can never
 * claim service that does not exist.
 */
(function (global) {
  'use strict';

  const COVERAGE = {
    DEMO_FULL: 'demo-full',
    DEMO_LIMITED: 'demo-limited',
    COMING_SOON: 'coming-soon',
  };

  const COVERAGE_LABELS = {
    [COVERAGE.DEMO_FULL]: 'Demo coverage — full assortment',
    [COVERAGE.DEMO_LIMITED]: 'Demo coverage — limited assortment',
    [COVERAGE.COMING_SOON]: 'Not serviceable yet',
  };

  /** etaMinutes = simulated base delivery window for the city. */
  const RAW_CITIES = [
    {
      id: 'vijayawada',
      name: 'Vijayawada',
      state: 'Andhra Pradesh',
      etaMinutes: 18,
      coverage: COVERAGE.DEMO_FULL,
      deliveryFee: 29,
      localities: [
        { id: 'vja-benzcircle', name: 'Benz Circle', pin: '520010' },
        { id: 'vja-governorpet', name: 'Governorpet', pin: '520002' },
        { id: 'vja-moghalrajpuram', name: 'Moghalrajpuram', pin: '520010' },
        { id: 'vja-kanuru', name: 'Kanuru', pin: '520007' },
        { id: 'vja-patamata', name: 'Patamata', pin: '520010' },
        { id: 'vja-ayodhya-nagar', name: 'Ayodhya Nagar', pin: '520003' },
      ],
    },
    {
      id: 'guntur',
      name: 'Guntur',
      state: 'Andhra Pradesh',
      etaMinutes: 22,
      coverage: COVERAGE.DEMO_FULL,
      deliveryFee: 25,
      localities: [
        { id: 'gtr-arundelpet', name: 'Arundelpet', pin: '522006' },
        { id: 'gtr-brocchipuram', name: 'Brochipuram', pin: '522007' },
        { id: 'gtr-kothapeta', name: 'Kothapeta', pin: '522001' },
        { id: 'gtr-pattabhipuram', name: 'Pattabhipuram', pin: '522006' },
        { id: 'gtr-chandranagar', name: 'Chandranagar', pin: '522007' },
      ],
    },
    {
      id: 'hyderabad',
      name: 'Hyderabad',
      state: 'Telangana',
      etaMinutes: 16,
      coverage: COVERAGE.DEMO_FULL,
      deliveryFee: 32,
      localities: [
        { id: 'hyd-gachibowli', name: 'Gachibowli', pin: '500032' },
        { id: 'hyd-kondapur', name: 'Kondapur', pin: '500081' },
        { id: 'hyd-madhapur', name: 'Madhapur', pin: '500081' },
        { id: 'hyd-kukatpally', name: 'Kukatpally', pin: '500072' },
        { id: 'hyd-banjara-hills', name: 'Banjara Hills', pin: '500034' },
        { id: 'hyd-uppal', name: 'Uppal', pin: '500039' },
      ],
    },
    {
      id: 'visakhapatnam',
      name: 'Visakhapatnam',
      state: 'Andhra Pradesh',
      etaMinutes: 24,
      coverage: COVERAGE.DEMO_LIMITED,
      deliveryFee: 27,
      localities: [
        { id: 'vsp-siripuram', name: 'Siripuram', pin: '530003' },
        { id: 'vsp-madhurawada', name: 'Madhurawada', pin: '530041' },
        { id: 'vsp-dwaraka-nagar', name: 'Dwaraka Nagar', pin: '530016' },
        { id: 'vsp-gajuwaka', name: 'Gajuwaka', pin: '530026' },
      ],
    },
    {
      id: 'bengaluru',
      name: 'Bengaluru',
      state: 'Karnataka',
      etaMinutes: 17,
      coverage: COVERAGE.DEMO_LIMITED,
      deliveryFee: 35,
      localities: [
        { id: 'blr-indiranagar', name: 'Indiranagar', pin: '560038' },
        { id: 'blr-koramangala', name: 'Koramangala', pin: '560034' },
        { id: 'blr-whitefield', name: 'Whitefield', pin: '560066' },
        { id: 'blr-jayanagar', name: 'Jayanagar', pin: '560041' },
        { id: 'blr-hebbal', name: 'Hebbal', pin: '560024' },
      ],
    },
    {
      id: 'chennai',
      name: 'Chennai',
      state: 'Tamil Nadu',
      etaMinutes: 19,
      coverage: COVERAGE.DEMO_LIMITED,
      deliveryFee: 30,
      localities: [
        { id: 'maa-anna-nagar', name: 'Anna Nagar', pin: '600040' },
        { id: 'maa-t-nagar', name: 'T. Nagar', pin: '600017' },
        { id: 'maa-velachery', name: 'Velachery', pin: '600042' },
        { id: 'maa-adyar', name: 'Adyar', pin: '600020' },
      ],
    },
    {
      id: 'delhi',
      name: 'Delhi NCR',
      state: 'Delhi',
      etaMinutes: 21,
      coverage: COVERAGE.DEMO_LIMITED,
      deliveryFee: 39,
      localities: [
        { id: 'del-saket', name: 'Saket', pin: '110017' },
        { id: 'del-dwarka', name: 'Dwarka', pin: '110075' },
        { id: 'del-rohini', name: 'Rohini', pin: '110085' },
        { id: 'del-lajpat-nagar', name: 'Lajpat Nagar', pin: '110024' },
      ],
    },
    {
      id: 'mumbai',
      name: 'Mumbai',
      state: 'Maharashtra',
      etaMinutes: 23,
      coverage: COVERAGE.DEMO_LIMITED,
      deliveryFee: 39,
      localities: [
        { id: 'bom-andheri-west', name: 'Andheri West', pin: '400053' },
        { id: 'bom-bandra', name: 'Bandra West', pin: '400050' },
        { id: 'bom-powai', name: 'Powai', pin: '400076' },
        { id: 'bom-borivali', name: 'Borivali East', pin: '400066' },
      ],
    },
    {
      id: 'pune',
      name: 'Pune',
      state: 'Maharashtra',
      etaMinutes: 20,
      coverage: COVERAGE.DEMO_LIMITED,
      deliveryFee: 33,
      localities: [
        { id: 'pnq-kothrud', name: 'Kothrud', pin: '411038' },
        { id: 'pnq-hinjewadi', name: 'Hinjewadi', pin: '411057' },
        { id: 'pnq-baner', name: 'Baner', pin: '411045' },
        { id: 'pnq-kalyani-nagar', name: 'Kalyani Nagar', pin: '411006' },
      ],
    },
    {
      id: 'kolkata',
      name: 'Kolkata',
      state: 'West Bengal',
      etaMinutes: 26,
      coverage: COVERAGE.COMING_SOON,
      deliveryFee: 35,
      localities: [
        { id: 'ccu-salt-lake', name: 'Salt Lake', pin: '700064' },
        { id: 'ccu-gariahat', name: 'Gariahat', pin: '700019' },
        { id: 'ccu-new-town', name: 'New Town', pin: '700156' },
      ],
    },
    {
      id: 'patna',
      name: 'Patna',
      state: 'Bihar',
      etaMinutes: 28,
      coverage: COVERAGE.COMING_SOON,
      deliveryFee: 31,
      localities: [
        { id: 'pat-boring-road', name: 'Boring Road', pin: '800001' },
        { id: 'pat-kankarbagh', name: 'Kankarbagh', pin: '800020' },
        { id: 'pat-bailey-road', name: 'Bailey Road', pin: '800014' },
      ],
    },
  ];

  const CITIES = RAW_CITIES.map((city) => Object.freeze(city));

  function getCity(id) {
    return CITIES.find((c) => c.id === id) || null;
  }

  function getLocality(cityId, localityId) {
    const city = getCity(cityId);
    if (!city) return null;
    const locality = city.localities.find((l) => l.id === localityId) || null;
    return locality ? Object.assign({ cityId, cityName: city.name }, locality) : null;
  }

  function findByPin(pin) {
    const needle = String(pin || '').trim();
    if (!/^\d{4,6}$/.test(needle)) return null;
    for (const city of CITIES) {
      const hit = city.localities.find((l) => l.pin === needle);
      if (hit) return { city, locality: hit };
    }
    return null;
  }

  /** Flat search index used by the location selector. */
  function searchLocations(query) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return [];
    const out = [];
    for (const city of CITIES) {
      if (city.name.toLowerCase().includes(q) || city.state.toLowerCase().includes(q)) {
        out.push({ kind: 'city', city, label: city.name, sub: city.state });
      }
      for (const loc of city.localities) {
        if (loc.name.toLowerCase().includes(q) || loc.pin.includes(q)) {
          out.push({
            kind: 'locality',
            city,
            locality: loc,
            label: loc.name,
            sub: `${city.name} · ${loc.pin}`,
          });
        }
      }
    }
    return out.slice(0, 12);
  }

  function isServiceable(cityId) {
    const city = getCity(cityId);
    return Boolean(city && city.coverage !== COVERAGE.COMING_SOON);
  }

  /** Simulated ETA in minutes for a city + product handling class. */
  function estimateEtaMinutes(cityId, handlingMinutes, options) {
    const city = getCity(cityId);
    if (!city) return null;
    const coverage = (options && options.coverage) || city.coverage;
    // Honesty rule: a city that is not serviceable yet has no delivery ETA.
    if (coverage === COVERAGE.COMING_SOON) return null;
    const base = city.etaMinutes || 20;
    const extra = Number(handlingMinutes) || 0;
    return base + extra;
  }

  const api = {
    CITIES,
    COVERAGE,
    COVERAGE_LABELS,
    getCity,
    getLocality,
    findByPin,
    searchLocations,
    isServiceable,
    estimateEtaMinutes,
    defaultCityId: 'vijayawada',
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.FX = global.FX || {};
  global.FX.locations = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
