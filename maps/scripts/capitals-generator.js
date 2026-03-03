import fs from "fs";
import path from "node:path";
import process from 'node:process';
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_ENV_PATH = path.resolve(SCRIPT_DIR, "../../.env");
const DEFAULT_CAPITALS_CSV_PATH = path.resolve(SCRIPT_DIR, "capitals.csv");
const OUTPUT_PATH = path.resolve(SCRIPT_DIR, "mapillary_images.json");

dotenv.config({ path: ROOT_ENV_PATH, quiet: true });

const MAPILLARY_TOKEN = process.env.VITE_MAPILLARY_ACCESS_TOKEN;
if (!MAPILLARY_TOKEN) {
    throw new Error(`Set VITE_MAPILLARY_ACCESS_TOKEN in ${ROOT_ENV_PATH}.`);
}

const MAPILLARY_API = "https://graph.mapillary.com/images";

// --- CONFIG ---
const RADIUS_METERS = 1500;   // adjust radius
const MAX_IMAGES = 100;       // per capital
// ---------------

// Convert radius (meters) to bbox around lat/lon
function buildBoundingBox(lat, lon, radiusMeters) {
    const earthRadius = 6378137;
    const dLat = (radiusMeters / earthRadius) * (180 / Math.PI);
    const dLon =
        (radiusMeters / earthRadius) *
        (180 / Math.PI) /
        Math.cos((lat * Math.PI) / 180);

    const minLat = lat - dLat;
    const maxLat = lat + dLat;
    const minLon = lon - dLon;
    const maxLon = lon + dLon;

    return `${minLon},${minLat},${maxLon},${maxLat}`;
}

async function fetchImagesForCapital(capital) {
    const bbox = buildBoundingBox(capital.lat, capital.lon, RADIUS_METERS);

    const fields = [
        "id",
        "geometry",
        "thumb_2048_url",
        "thumb_1024_url",
        "computed_compass_angle"
    ].join(",");

    const url = new URL(MAPILLARY_API);
    url.searchParams.set("access_token", MAPILLARY_TOKEN);
    url.searchParams.set("fields", fields);
    url.searchParams.set("bbox", bbox);
    url.searchParams.set("limit", "200"); // request more, filter down to 100

    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Mapillary error ${res.status}`);
    }

    const data = await res.json();

    const validImages = (data.data || [])
        .filter(img =>
            img.geometry &&
            img.geometry.coordinates &&
            (img.thumb_2048_url || img.thumb_1024_url)
        )
        .slice(0, MAX_IMAGES);

    return validImages.map(img => ({
        capital: capital.capital,
        country: capital.country,
        lat: img.geometry.coordinates[1],
        lon: img.geometry.coordinates[0],
        image_id: img.id,
        thumb: img.thumb_2048_url || img.thumb_1024_url,
        heading: img.computed_compass_angle ?? null
    }));
}

async function processCapitals(capitals) {
    const results = [];

    for (const capital of capitals) {
        console.log(`Fetching ${capital.capital}...`);
        try {
            const images = await fetchImagesForCapital(capital);
            results.push(...images);
        } catch (err) {
            console.error(`Failed for ${capital.capital}`, err.message);
        }
    }

    return results;
}

// Example: load capitals.csv generated earlier
function loadCapitalsCsv(csvPath = DEFAULT_CAPITALS_CSV_PATH) {
    const text = fs.readFileSync(csvPath, "utf8");
    const lines = text.trim().split("\n").slice(1);

    return lines.map(line => {
        const [country, capital, lat, lon] = line
            .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
            .map(v => v.replace(/^"|"$/g, ""));

        return {
            country,
            capital,
            lat: parseFloat(lat),
            lon: parseFloat(lon)
        };
    });
}

async function main() {
    const capitals = loadCapitalsCsv();
    const images = await processCapitals(capitals);

    fs.writeFileSync(
        OUTPUT_PATH,
        JSON.stringify(images, null, 2),
        "utf8"
    );

    console.log(`Saved ${OUTPUT_PATH}`);
}

main().catch(err => {
    console.error(err);

    process.exit(1);
});
