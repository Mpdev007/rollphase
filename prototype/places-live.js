/**
 * Live venue discovery — real places near the user.
 * Priority: Google Places (New) → Geoapify → OpenStreetMap Overpass.
 * Optional keys via window.ROLLPHASE_CONFIG (see config.example.js).
 */

const PlacesLive = (() => {
  const OVERPASS_URLS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
  ];

  const SPORT_OSM = {
    bjj: [
      '["leisure"="fitness_centre"]',
      '["leisure"="sports_centre"]',
      '["leisure"="dojo"]',
      '["sport"="martial_arts"]',
      '["sport"="jiu_jitsu"]',
      '["sport"="brazilian_jiu_jitsu"]',
      '["sport"="judo"]',
      '["name"~"jiu|jitsu|bjj|grappling|dojo",i]',
    ],
    mma: [
      '["leisure"="fitness_centre"]',
      '["leisure"="sports_centre"]',
      '["sport"="mma"]',
      '["sport"="martial_arts"]',
      '["name"~"mma|mixed martial|ufc",i]',
    ],
    boxing: [
      '["leisure"="fitness_centre"]',
      '["sport"="boxing"]',
      '["name"~"box|boxing|pugil",i]',
    ],
    wrestling: [
      '["leisure"="sports_centre"]',
      '["sport"="wrestling"]',
      '["name"~"wrestl",i]',
    ],
    muaythai: [
      '["leisure"="fitness_centre"]',
      '["sport"="muay_thai"]',
      '["sport"="thai_boxing"]',
      '["name"~"muay|thai box",i]',
    ],
    kickboxing: [
      '["leisure"="fitness_centre"]',
      '["sport"="kickboxing"]',
      '["name"~"kickbox",i]',
    ],
    judo: ['["leisure"="dojo"]', '["sport"="judo"]', '["name"~"judo",i]'],
    weightlifting: [
      '["leisure"="fitness_centre"]',
      '["sport"="weightlifting"]',
      '["sport"="powerlifting"]',
      '["name"~"crossfit|iron|strength|powerlift|weight|gym",i]',
    ],
    crossfit: [
      '["leisure"="fitness_centre"]',
      '["name"~"crossfit|cross fit",i]',
    ],
    hyrox: [
      '["leisure"="fitness_centre"]',
      '["leisure"="sports_centre"]',
      '["name"~"hyrox|functional|performance",i]',
    ],
    pickleball: [
      '["leisure"="pitch"]',
      '["sport"="pickleball"]',
      '["name"~"pickle",i]',
      '["leisure"="sports_centre"]',
    ],
    tennis: ['["leisure"="pitch"]', '["sport"="tennis"]', '["leisure"="sports_centre"]'],
    basketball: ['["leisure"="pitch"]', '["sport"="basketball"]', '["leisure"="sports_centre"]'],
    soccer: ['["leisure"="pitch"]', '["sport"="soccer"]', '["leisure"="sports_centre"]'],
    volleyball: ['["leisure"="pitch"]', '["sport"="volleyball"]'],
    pilates: [
      '["leisure"="fitness_centre"]',
      '["sport"="pilates"]',
      '["name"~"pilates",i]',
    ],
    yoga: [
      '["leisure"="fitness_centre"]',
      '["sport"="yoga"]',
      '["name"~"yoga",i]',
    ],
    running: [
      '["leisure"="track"]',
      '["leisure"="sports_centre"]',
      '["name"~"run club|running|track",i]',
    ],
    cycling: [
      '["shop"="bicycle"]',
      '["amenity"="bicycle_rental"]',
      '["name"~"cycle|bike|bicycle",i]',
    ],
    climbing: [
      '["sport"="climbing"]',
      '["leisure"="sports_centre"]',
      '["name"~"climb|bouldering|crag",i]',
    ],
    swimming: [
      '["leisure"="swimming_pool"]',
      '["sport"="swimming"]',
      '["name"~"aquatic|swim|pool",i]',
    ],
  };

  const DEFAULT_OSM = [
    '["leisure"="fitness_centre"]',
    '["leisure"="sports_centre"]',
    '["leisure"="dojo"]',
    '["leisure"="swimming_pool"]',
    '["sport"="martial_arts"]',
    '["sport"="climbing"]',
    '["sport"="yoga"]',
    '["shop"="bicycle"]',
  ];

  /** Sport → Google Text Search query (better recall than type alone) */
  const SPORT_TEXT = {
    bjj: "brazilian jiu jitsu gym",
    mma: "mma gym",
    boxing: "boxing gym",
    wrestling: "wrestling club",
    muaythai: "muay thai gym",
    kickboxing: "kickboxing gym",
    judo: "judo dojo",
    weightlifting: "gym weightlifting",
    crossfit: "crossfit gym",
    hyrox: "hyrox gym functional fitness",
    pickleball: "pickleball courts",
    tennis: "tennis club courts",
    basketball: "basketball gym courts",
    soccer: "soccer field futsal",
    volleyball: "volleyball courts",
    pilates: "pilates studio",
    yoga: "yoga studio",
    running: "running track club",
    cycling: "bike shop cycling",
    climbing: "climbing gym bouldering",
    swimming: "swimming pool",
  };

  const SPORT_GOOGLE_TYPE = {
    bjj: "gym",
    mma: "gym",
    boxing: "gym",
    wrestling: "gym",
    muaythai: "gym",
    kickboxing: "gym",
    judo: "gym",
    weightlifting: "gym",
    crossfit: "gym",
    hyrox: "gym",
    pilates: "gym",
    yoga: "yoga_studio",
    swimming: "swimming_pool",
    climbing: "gym",
    tennis: "athletic_field",
    pickleball: "athletic_field",
    basketball: "athletic_field",
    soccer: "athletic_field",
    cycling: "bicycle_store",
    running: "gym",
    volleyball: "athletic_field",
  };

  /** Geoapify categories by sport */
  const SPORT_GEOAPIFY = {
    bjj: "sport.fitness,sport.sports_centre",
    mma: "sport.fitness,sport.sports_centre",
    boxing: "sport.fitness",
    weightlifting: "sport.fitness",
    crossfit: "sport.fitness",
    hyrox: "sport.fitness",
    yoga: "sport.fitness",
    pilates: "sport.fitness",
    swimming: "sport.swimming_pool,sport.sports_centre",
    climbing: "sport.sports_centre",
    tennis: "sport.tennis,sport.sports_centre",
    pickleball: "sport.sports_centre",
    basketball: "sport.sports_centre",
    soccer: "sport.sports_centre",
    cycling: "service.bicycle,commercial.outdoor_and_sport",
    running: "sport.sports_centre",
  };

  function haversineMi(lat1, lon1, lat2, lon2) {
    const R = 3958.8;
    const toR = (d) => (d * Math.PI) / 180;
    const dLat = toR(lat2 - lat1);
    const dLon = toR(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function config() {
    return (typeof window !== "undefined" && window.ROLLPHASE_CONFIG) || {};
  }

  function mapsSearchUrl(name, address, lat, lng) {
    const q =
      name || address
        ? [name, address].filter(Boolean).join(" ")
        : lat != null && lng != null
          ? `${lat},${lng}`
          : "";
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  }

  function buildOverpassQuery(lat, lng, radiusM, sportId) {
    const filters = (sportId && SPORT_OSM[sportId]) || DEFAULT_OSM;
    const around = `(around:${Math.round(radiusM)},${lat},${lng})`;
    const body = filters.map((f) => `  nwr${f}${around};`).join("\n");
    return `[out:json][timeout:45];\n(\n${body}\n);\nout center tags;`;
  }

  async function overpassFetch(query) {
    let lastErr;
    for (const base of OVERPASS_URLS) {
      try {
        const res = await fetch(base, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
            // Public Overpass instances ask apps to identify themselves
            "User-Agent": "RollPhase/1.0 (athlete venue discovery; https://github.com/Mpdev007/rollphase)",
          },
          body: `data=${encodeURIComponent(query)}`,
        });
        if (!res.ok) throw new Error(`Overpass ${res.status}`);
        return await res.json();
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error("Overpass failed");
  }

  function elementToPlace(el, userLat, userLng) {
    const tags = el.tags || {};
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (lat == null || lng == null) return null;
    const name = tags.name || tags["name:en"] || "Unnamed venue";
    const phone = tags.phone || tags["contact:phone"] || tags["contact:mobile"] || "";
    const website =
      tags.website || tags["contact:website"] || tags.url || tags["contact:facebook"] || "";
    const hours = tags.opening_hours || "";
    const address = [tags["addr:housenumber"], tags["addr:street"], tags["addr:city"]]
      .filter(Boolean)
      .join(" ");
    const mi = haversineMi(userLat, userLng, lat, lng);
    const osmType = el.type || "node";
    const osmId = el.id;
    const mapsUrl = mapsSearchUrl(name, address, lat, lng);
    const osmUrl = `https://www.openstreetmap.org/${osmType}/${osmId}`;
    const sports = inferSports(tags, name);
    return {
      id: `osm-${osmType}-${osmId}`,
      source: "osm",
      name,
      mi: Math.round(mi * 10) / 10,
      open: true,
      hours: hours || "",
      phone: normalizePhone(phone),
      website: normalizeUrl(website),
      address: address || "",
      lat,
      lng,
      mapsUrl,
      osmUrl,
      sports: sports.length ? sports : ["weightlifting"],
      tags: buildTags(tags, sports),
      next: {},
      here: {},
      promo: {},
      social: {},
      amenities: inferAmenities(tags),
      live: true,
    };
  }

  function normalizePhone(p) {
    if (!p) return "";
    return String(p).trim();
  }

  function normalizeUrl(u) {
    if (!u) return "";
    const s = String(u).trim();
    if (!s) return "";
    if (/^https?:\/\//i.test(s)) return s;
    if (s.startsWith("www.")) return `https://${s}`;
    if (/^[\w.-]+\.[a-z]{2,}/i.test(s)) return `https://${s}`;
    return s;
  }

  function inferSports(tags, name) {
    const s = new Set();
    const sport = (tags.sport || "").toLowerCase();
    const n = (name || "").toLowerCase();
    const add = (id) => s.add(id);
    if (/jiu|jitsu|bjj|grappling/.test(n) || /jiu_jitsu|brazilian/.test(sport)) add("bjj");
    if (/mma|mixed martial/.test(n) || sport === "mma") add("mma");
    if (/box/.test(n) || sport === "boxing") add("boxing");
    if (/wrestl/.test(n) || sport === "wrestling") add("wrestling");
    if (/muay|thai box/.test(n) || /muay/.test(sport)) add("muaythai");
    if (/kickbox/.test(n) || sport === "kickboxing") add("kickboxing");
    if (/judo/.test(n) || sport === "judo") add("judo");
    if (/crossfit|cross fit/.test(n)) add("crossfit");
    if (/hyrox|functional/.test(n)) add("hyrox");
    if (/pickle/.test(n) || sport === "pickleball") add("pickleball");
    if (/tennis/.test(n) || sport === "tennis") add("tennis");
    if (/basket|hoop/.test(n) || sport === "basketball") add("basketball");
    if (/soccer|football|futsal/.test(n) || sport === "soccer") add("soccer");
    if (/volley/.test(n) || sport === "volleyball") add("volleyball");
    if (/pilates/.test(n) || sport === "pilates") add("pilates");
    if (/yoga/.test(n) || sport === "yoga") add("yoga");
    if (/climb|boulder/.test(n) || sport === "climbing") add("climbing");
    if (/swim|aquatic|pool/.test(n) || sport === "swimming" || tags.leisure === "swimming_pool")
      add("swimming");
    if (/bike|cycle|bicycle/.test(n) || tags.shop === "bicycle") add("cycling");
    if (/run|track/.test(n)) add("running");
    if (
      tags.leisure === "fitness_centre" ||
      tags.leisure === "sports_centre" ||
      /gym|fitness|iron|strength|power/.test(n)
    ) {
      add("weightlifting");
    }
    if (tags.leisure === "dojo" || sport === "martial_arts") {
      if (![...s].some((x) => ["bjj", "judo", "mma"].includes(x))) add("bjj");
    }
    return [...s];
  }

  function buildTags(tags, sports) {
    const out = {};
    const label = [];
    if (tags.leisure) label.push(tags.leisure.replace(/_/g, " "));
    if (tags.sport) label.push(tags.sport.replace(/_/g, " "));
    if (tags.opening_hours) label.push("Hours listed");
    if (tags.phone || tags["contact:phone"]) label.push("Phone");
    if (tags.website || tags["contact:website"]) label.push("Website");
    if (!label.length) label.push("Live listing");
    const base = label.slice(0, 4);
    (sports.length ? sports : ["weightlifting"]).forEach((sid) => {
      out[sid] = base;
    });
    return out;
  }

  function inferAmenities(tags) {
    const a = [];
    if (tags.leisure === "swimming_pool" || tags.sport === "swimming") a.push("pool");
    if (tags.leisure === "dojo" || /martial|jiu|judo|box/.test(JSON.stringify(tags))) a.push("mats");
    if (tags.leisure === "fitness_centre") a.push("racks");
    return a;
  }

  async function fetchOsmNearby({ lat, lng, radiusM = 10000, sportId = null }) {
    const q = buildOverpassQuery(lat, lng, radiusM, sportId);
    const data = await overpassFetch(q);
    const places = (data.elements || [])
      .map((el) => elementToPlace(el, lat, lng))
      .filter(Boolean);
    return dedupePlaces(places);
  }

  function dedupePlaces(places) {
    const seen = new Set();
    const unique = [];
    places
      .sort((a, b) => a.mi - b.mi)
      .forEach((p) => {
        const key = `${p.name.toLowerCase()}|${Number(p.lat).toFixed(3)}|${Number(p.lng).toFixed(3)}`;
        if (seen.has(key)) return;
        seen.add(key);
        unique.push(p);
      });
    return unique;
  }

  function googlePlaceToVenue(p, userLat, userLng, sportId) {
    const plat = p.location?.latitude;
    const plng = p.location?.longitude;
    const mi = plat != null ? Math.round(haversineMi(userLat, userLng, plat, plng) * 10) / 10 : 0;
    const name = p.displayName?.text || "Venue";
    const openNow = p.regularOpeningHours?.openNow;
    const hoursText = (p.regularOpeningHours?.weekdayDescriptions || []).join(" · ");
    const sports = sportId ? [sportId] : inferSports({ sport: (p.types || []).join(" ") }, name);
    const sportList = sports.length ? sports : ["weightlifting"];
    return {
      id: `ggl-${p.id || p.name || name}`,
      source: "google",
      placeId: p.id,
      name,
      mi,
      open: openNow !== false,
      hours: hoursText || "",
      phone: p.nationalPhoneNumber || p.internationalPhoneNumber || "",
      website: normalizeUrl(p.websiteUri || ""),
      address: p.formattedAddress || "",
      lat: plat,
      lng: plng,
      mapsUrl: p.googleMapsUri || mapsSearchUrl(name, p.formattedAddress, plat, plng),
      googleRating: p.rating,
      googleRatingCount: p.userRatingCount,
      sports: sportList,
      tags: Object.fromEntries(
        sportList.map((sid) => [
          sid,
          [
            p.rating ? `★ ${p.rating}` : null,
            p.userRatingCount ? `${p.userRatingCount} ratings` : null,
            p.nationalPhoneNumber || p.internationalPhoneNumber ? "Phone" : null,
            p.websiteUri ? "Website" : null,
          ].filter(Boolean),
        ])
      ),
      next: {},
      here: {},
      promo: {},
      social: {},
      amenities: [],
      live: true,
    };
  }

  const GOOGLE_FIELD_MASK =
    "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.googleMapsUri,places.websiteUri,places.nationalPhoneNumber,places.internationalPhoneNumber,places.regularOpeningHours,places.businessStatus,places.types";

  async function fetchGoogleNearby({ lat, lng, radiusM = 10000, sportId = null }) {
    const key = config().googlePlacesApiKey;
    if (!key) throw new Error("No Google Places API key");

    const includedType = SPORT_GOOGLE_TYPE[sportId] || "gym";
    const res = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": GOOGLE_FIELD_MASK,
      },
      body: JSON.stringify({
        includedTypes: [includedType],
        maxResultCount: 20,
        rankPreference: "DISTANCE",
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: radiusM,
          },
        },
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Google Nearby ${res.status}: ${t.slice(0, 200)}`);
    }
    const data = await res.json();
    return (data.places || []).map((p) => googlePlaceToVenue(p, lat, lng, sportId));
  }

  /** Text Search — better for BJJ / Muay Thai / sport-specific names */
  async function fetchGoogleText({ lat, lng, radiusM = 10000, sportId = null }) {
    const key = config().googlePlacesApiKey;
    if (!key) throw new Error("No Google Places API key");
    const textQuery = SPORT_TEXT[sportId] || "gym fitness center";
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": GOOGLE_FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery,
        maxResultCount: 20,
        locationBias: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: radiusM,
          },
        },
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Google Text ${res.status}: ${t.slice(0, 200)}`);
    }
    const data = await res.json();
    return (data.places || []).map((p) => googlePlaceToVenue(p, lat, lng, sportId));
  }

  async function fetchGoogleCombined(opts) {
    const [nearby, text] = await Promise.allSettled([
      fetchGoogleNearby(opts),
      opts.sportId ? fetchGoogleText(opts) : Promise.resolve([]),
    ]);
    const a = nearby.status === "fulfilled" ? nearby.value : [];
    const b = text.status === "fulfilled" ? text.value : [];
    if (!a.length && !b.length) {
      const err = nearby.status === "rejected" ? nearby.reason : text.reason;
      throw err || new Error("Google Places returned no results");
    }
    return dedupePlaces([...a, ...b]);
  }

  async function fetchGeoapifyNearby({ lat, lng, radiusM = 10000, sportId = null }) {
    const key = config().geoapifyApiKey;
    if (!key) throw new Error("No Geoapify API key");
    const categories = SPORT_GEOAPIFY[sportId] || "sport.fitness,sport.sports_centre,sport.swimming_pool";
    const url = new URL("https://api.geoapify.com/v2/places");
    url.searchParams.set("categories", categories);
    url.searchParams.set("filter", `circle:${lng},${lat},${Math.round(radiusM)}`);
    url.searchParams.set("bias", `proximity:${lng},${lat}`);
    url.searchParams.set("limit", "40");
    url.searchParams.set("apiKey", key);
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Geoapify ${res.status}`);
    const data = await res.json();
    const places = (data.features || []).map((f) => {
      const props = f.properties || {};
      const [plng, plat] = f.geometry?.coordinates || [];
      const mi =
        plat != null ? Math.round(haversineMi(lat, lng, plat, plng) * 10) / 10 : 0;
      const name = props.name || props.address_line1 || "Venue";
      const phone = props.contact?.phone || props.datasource?.raw?.phone || "";
      const website = props.website || props.contact?.website || props.datasource?.raw?.website || "";
      const hours = props.opening_hours || props.datasource?.raw?.opening_hours || "";
      const address = props.formatted || props.address_line1 || "";
      const sports = sportId ? [sportId] : inferSports({}, name);
      const sportList = sports.length ? sports : ["weightlifting"];
      return {
        id: `geo-${props.place_id || props.osm_id || name}`,
        source: "geoapify",
        name,
        mi,
        open: true,
        hours: hours || "",
        phone: normalizePhone(phone),
        website: normalizeUrl(website),
        address,
        lat: plat,
        lng: plng,
        mapsUrl: mapsSearchUrl(name, address, plat, plng),
        sports: sportList,
        tags: Object.fromEntries(
          sportList.map((sid) => [
            sid,
            [phone ? "Phone" : null, website ? "Website" : null, "Live"].filter(Boolean),
          ])
        ),
        next: {},
        here: {},
        promo: {},
        social: {},
        amenities: [],
        live: true,
      };
    });
    return dedupePlaces(places);
  }

  /**
   * Main entry: Google → Geoapify → OSM. Always live when network works.
   */
  async function fetchNearby(opts) {
    const cfg = config();
    const radiusM = opts.radiusM || cfg.defaultRadiusM || 10000;

    if (cfg.googlePlacesApiKey) {
      try {
        const places = await fetchGoogleCombined({ ...opts, radiusM });
        if (places.length) return { provider: "google", places };
      } catch (e) {
        console.warn("Google Places failed, trying next provider", e);
      }
    }

    if (cfg.geoapifyApiKey) {
      try {
        const places = await fetchGeoapifyNearby({ ...opts, radiusM });
        if (places.length) return { provider: "geoapify", places };
      } catch (e) {
        console.warn("Geoapify failed, falling back to OSM", e);
      }
    }

    const places = await fetchOsmNearby({ ...opts, radiusM });
    return { provider: "osm", places };
  }

  function getCurrentPosition(options = {}) {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Location not available on this device"));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          }),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000, ...options }
      );
    });
  }

  return {
    fetchNearby,
    fetchOsmNearby,
    fetchGoogleNearby,
    fetchGoogleText,
    fetchGeoapifyNearby,
    getCurrentPosition,
    haversineMi,
    mapsSearchUrl,
    config,
  };
})();
