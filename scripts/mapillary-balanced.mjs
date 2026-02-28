import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { VectorTile } from '@mapbox/vector-tile';
import Pbf from 'pbf';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = parseArgs(process.argv.slice(2));

const token = args.token || process.env.VITE_MAPILLARY_ACCESS_TOKEN;
if (!token) {
  console.error('Missing Mapillary access token. Use --token or set VITE_MAPILLARY_ACCESS_TOKEN.');
  process.exit(1);
}

const zoom = toInt(args.zoom, 5);
const limit = Math.max(1, toInt(args.limit, 50000));
const outputDir = args['output-dir'] || '.';
const outputPrefix = args['output-prefix'] || 'mapillary';
const tileCacheDir = args['tile-cache'] || '.cache/mapillary-tiles';
const entitySleepMs = Math.max(0, toInt(args['entity-sleep'], 0));
const seed = args.seed ? String(args.seed) : null;

const layerName = zoom <= 5 ? 'overview' : 'image';

const rng = seed ? mulberry32(hashSeed(seed)) : Math.random;

const tileCount = 2 ** zoom;
const totalTiles = tileCount * tileCount;

console.log(`Scanning ${totalTiles} tiles at z=${zoom} (${layerName} layer)...`);

const tileStats = [];
let tilesWithCoverage = 0;
let totalWeight = 0;

for (let y = 0; y < tileCount; y++) {
  for (let x = 0; x < tileCount; x++) {
    const buffer = await loadTile(zoom, x, y, token, tileCacheDir);
    if (!buffer) {
      tileStats.push({ x, y, totalCount: 0, panoCount: 0, latCenter: 0, lngCenter: 0 });
      continue;
    }

    const counts = countTileFeatures(buffer, layerName);
    if (counts.total === 0) {
      tileStats.push({ x, y, totalCount: 0, panoCount: 0, latCenter: 0, lngCenter: 0 });
      continue;
    }

    const latCenter = tileCenterLat(zoom, y);
    const lngCenter = tileCenterLng(zoom, x);
    const weight = Math.max(0.01, Math.cos((latCenter * Math.PI) / 180));
    totalWeight += weight;
    tilesWithCoverage += 1;
    tileStats.push({
      x,
      y,
      totalCount: counts.total,
      panoCount: counts.pano,
      latCenter,
      lngCenter,
      weight,
    });
  }
}

if (tilesWithCoverage === 0) {
  console.error('No coverage found at this zoom. Try a different zoom level.');
  process.exit(1);
}

console.log(`Found coverage in ${tilesWithCoverage} tiles. Generating variants...`);

const variants = buildVariants();

for (const variant of variants) {
  const fileName = `${outputPrefix}-${variant.name}.jsonl`;
  const outputPath = path.join(outputDir, fileName);
  console.log(`\n[${variant.name}] Allocating ${limit} locations...`);

  const variantTiles = selectVariantTiles(tileStats, variant);
  const variantTotalWeight = variantTiles.reduce((sum, tile) => sum + tile.weight, 0);
  const quotas = allocateQuotas(variantTiles, limit, variantTotalWeight);

  console.log(`[${variant.name}] Sampling locations per tile...`);
  await fs.promises.mkdir(outputDir, { recursive: true });
  const outputStream = fs.createWriteStream(outputPath, { encoding: 'utf8' });
  let totalWritten = 0;

  for (const tile of quotas) {
    if (tile.quota === 0) {
      continue;
    }
    const buffer = await loadTile(zoom, tile.x, tile.y, token, tileCacheDir);
    if (!buffer) {
      continue;
    }
    const samples = sampleTileFeatures(
      buffer,
      layerName,
      tile.x,
      tile.y,
      tile.quota,
      variant.panoOnly,
      rng,
    );
    if (samples.length === 0) {
      continue;
    }
    const enriched = await enrichWithHeadings(samples, token, entitySleepMs);
    for (const row of enriched) {
      outputStream.write(`${JSON.stringify(row)}\n`);
    }
    totalWritten += enriched.length;
  }

  await new Promise((resolve) => outputStream.end(resolve));
  if (totalWritten === 0) {
    console.error(`[${variant.name}] No locations sampled.`);
  } else {
    console.log(`[${variant.name}] Wrote ${totalWritten} rows to ${outputPath}.`);
  }
}

console.log('\nDone.');

function parseArgs(argv) {
  const out = {};
  for (const arg of argv) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      out[key] = value === undefined ? true : value;
    }
  }
  return out;
}

function toInt(value, fallback) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function loadTile(z, x, y, token, cacheDir) {
  const tilePath = path.join(cacheDir, String(z), String(x));
  const filePath = path.join(tilePath, `${y}.mvt`);
  try {
    const cached = await fs.promises.readFile(filePath);
    return new Uint8Array(cached);
  } catch (err) {
    // Cache miss
  }

  await fs.promises.mkdir(tilePath, { recursive: true });
  const buffer = await fetchTile(z, x, y, token);
  if (buffer) {
    await fs.promises.writeFile(filePath, buffer);
  }
  return buffer;
}

async function fetchTile(z, x, y, token) {
  const url = `https://tiles.mapillary.com/maps/vtp/mly1_computed_public/2/${z}/${x}/${y}?access_token=${token}`;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'nmpz-map-generator' } });
      if (!res.ok) {
        if (res.status >= 500 && attempt < 3) {
          await sleep(250 * (attempt + 1));
          continue;
        }
        return null;
      }
        const arrayBuffer = await res.arrayBuffer();
        return new Uint8Array(arrayBuffer);
    } catch (err) {
      if (attempt >= 3) {
        return null;
      }
      await sleep(250 * (attempt + 1));
    }
  }
  return null;
}

function countTileFeatures(buffer, layerName) {
  const tile = new VectorTile(new Pbf(buffer));
  const layer = tile.layers[layerName];
  if (!layer) {
    return { total: 0, pano: 0 };
  }
  let total = 0;
  let pano = 0;
  for (let i = 0; i < layer.length; i++) {
    const feature = layer.feature(i);
    const props = feature.properties || {};
    if (!props.id) {
      continue;
    }
    total += 1;
    if (props.is_pano) {
      pano += 1;
    }
  }
  return { total, pano };
}

function sampleTileFeatures(buffer, layerName, tileX, tileY, quota, panoOnly, rng) {
  const tile = new VectorTile(new Pbf(buffer));
  const layer = tile.layers[layerName];
  if (!layer) {
    return [];
  }
  const reservoir = [];
  let seen = 0;
  for (let i = 0; i < layer.length; i++) {
    const feature = layer.feature(i);
    const props = feature.properties || {};
    if (!props.id) {
      continue;
    }
    if (panoOnly && !props.is_pano) {
      continue;
    }
    const geo = feature.toGeoJSON(tileX, tileY, zoom);
    if (!geo || !geo.geometry || !Array.isArray(geo.geometry.coordinates)) {
      continue;
    }
    const [lng, lat] = geo.geometry.coordinates;
    const row = {
      image_id: String(props.id),
      lat,
      lng,
      is_pano: Boolean(props.is_pano),
    };
    seen += 1;
    if (reservoir.length < quota) {
      reservoir.push(row);
    } else {
      const j = Math.floor(rng() * seen);
      if (j < quota) {
        reservoir[j] = row;
      }
    }
  }
  return reservoir;
}

function allocateQuotas(tiles, limit, totalWeight) {
  const allocations = [];
  let allocated = 0;
  for (const tile of tiles) {
    if (tile.count === 0 || tile.weight <= 0) {
      allocations.push({ ...tile, quota: 0, remainder: 0 });
      continue;
    }
    const raw = (limit * tile.weight) / totalWeight;
    const quota = Math.min(tile.count, Math.floor(raw));
    const remainder = raw - quota;
    allocations.push({ ...tile, quota, remainder });
    allocated += quota;
  }

  let remaining = limit - allocated;
  if (remaining <= 0) {
    return allocations;
  }

  const candidates = allocations
    .filter((tile) => tile.count > tile.quota)
    .sort((a, b) => b.remainder - a.remainder);

  while (remaining > 0 && candidates.length > 0) {
    for (const tile of candidates) {
      if (remaining <= 0) {
        break;
      }
      if (tile.quota < tile.count) {
        tile.quota += 1;
        remaining -= 1;
      }
    }
    if (remaining > 0 && candidates.every((tile) => tile.quota >= tile.count)) {
      break;
    }
  }

  return allocations;
}

function tileCenterLat(z, y) {
  const n = Math.PI - (2 * Math.PI * (y + 0.5)) / (2 ** z);
  return (180 / Math.PI) * Math.atan(Math.sinh(n));
}

function tileCenterLng(z, x) {
  return (x + 0.5) * (360 / (2 ** z)) - 180;
}

async function enrichWithHeadings(rows, token, sleepMs) {
  const byId = new Map();
  for (const row of rows) {
    byId.set(row.image_id, row);
  }

  const ids = Array.from(byId.keys());
  const batchSize = 100;
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const url = `https://graph.mapillary.com?ids=${batch.join(',')}&access_token=${token}&fields=id,computed_compass_angle,compass_angle,computed_geometry,geometry`;
    const payload = await fetchJsonWithRetry(url, 4);
    if (!payload) {
      continue;
    }
    const entities = normalizeEntities(payload);
    for (const entity of entities) {
      if (!entity || !entity.id) {
        continue;
      }
      const row = byId.get(String(entity.id));
      if (!row) {
        continue;
      }
      const heading = Number(entity.computed_compass_angle ?? entity.compass_angle ?? 0);
      const coords = entity.computed_geometry?.coordinates ?? entity.geometry?.coordinates ?? null;
      if (Array.isArray(coords) && coords.length === 2) {
        row.lng = coords[0];
        row.lat = coords[1];
      }
      row.heading = Math.round(heading);
    }
    if (sleepMs > 0) {
      await sleep(sleepMs);
    }
  }

  return Array.from(byId.values()).map((row) => ({
    lat: row.lat,
    lng: row.lng,
    heading: Number.isFinite(row.heading) ? row.heading : 0,
    image_id: row.image_id,
    is_pano: row.is_pano,
  }));
}

function normalizeEntities(payload) {
  if (!payload) {
    return [];
  }
  if (Array.isArray(payload.data)) {
    return payload.data;
  }
  if (Array.isArray(payload)) {
    return payload;
  }
  if (typeof payload === 'object') {
    return Object.values(payload);
  }
  return [];
}

// JSONL is streamed during sampling to avoid holding everything in memory.

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hashSeed(input) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seedValue) {
  let t = seedValue >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

async function fetchJsonWithRetry(url, attempts) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'nmpz-map-generator' } });
      if (res.ok) {
        return await res.json();
      }
      if (res.status >= 500) {
        await sleep(250 * (attempt + 1));
        continue;
      }
      return null;
    } catch (err) {
      if (attempt >= attempts - 1) {
        console.warn(`Mapillary fetch failed: ${err?.message ?? err}`);
        return null;
      }
      await sleep(500 * (attempt + 1));
    }
  }
  return null;
}

function buildVariants() {
  return [
    { name: 'global-balanced', panoOnly: false, weightMode: 'balanced' },
    { name: 'global-urban', panoOnly: false, weightMode: 'urban' },
    { name: 'global-rural', panoOnly: false, weightMode: 'rural' },
    { name: 'global-pano', panoOnly: true, weightMode: 'balanced' },
    { name: 'north-america', panoOnly: false, weightMode: 'balanced', bbox: [-170, 5, -50, 75] },
    { name: 'south-america', panoOnly: false, weightMode: 'balanced', bbox: [-85, -60, -30, 15] },
    { name: 'europe', panoOnly: false, weightMode: 'balanced', bbox: [-25, 35, 40, 72] },
    { name: 'africa', panoOnly: false, weightMode: 'balanced', bbox: [-20, -35, 55, 37] },
    { name: 'asia', panoOnly: false, weightMode: 'balanced', bbox: [40, 5, 180, 80] },
    { name: 'oceania', panoOnly: false, weightMode: 'balanced', bbox: [110, -50, 180, 5] },
  ];
}

function selectVariantTiles(tiles, variant) {
  const tilesOut = [];
  for (const tile of tiles) {
    const count = variant.panoOnly ? tile.panoCount : tile.totalCount;
    if (count === 0) {
      continue;
    }
    if (variant.bbox && !tileWithin(tile, variant.bbox)) {
      continue;
    }
    const weight = computeWeight(tile, count, variant.weightMode);
    tilesOut.push({
      x: tile.x,
      y: tile.y,
      count,
      weight,
      latCenter: tile.latCenter,
      lngCenter: tile.lngCenter,
    });
  }
  return tilesOut;
}

function tileWithin(tile, bbox) {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  return (
    tile.latCenter >= minLat &&
    tile.latCenter <= maxLat &&
    tile.lngCenter >= minLng &&
    tile.lngCenter <= maxLng
  );
}

function computeWeight(tile, count, mode) {
  const latWeight = Math.max(0.01, Math.cos((tile.latCenter * Math.PI) / 180));
  if (mode === 'urban') {
    return latWeight * Math.pow(count, 1.2);
  }
  if (mode === 'rural') {
    return latWeight * (1 / Math.sqrt(count));
  }
  return latWeight;
}
