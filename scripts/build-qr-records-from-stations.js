const fs = require("fs");
const path = require("path");

/*
  BUILD QR RECORDS FROM GAS STATION CSV

  WHAT IT DOES:
  - Reads a source CSV of gas stations
  - Creates 4 QR rows per gas station:
      PUMP1, PUMP2, MENS, WOMENS
  - Builds:
      short_code
      internal_code
      station_group_id
      qr_url
  - Copies address/lat/lng fields into each QR row
  - Exports a new CSV ready for Supabase import

  HOW TO RUN:
  node scripts/build-qr-records-from-stations.js

  IMPORTANT:
  Update INPUT_FILE and COLUMN_MAP below to match your CSV.
*/

const CONFIG = {
  inputFile: "imports/gas_stations.csv",
  outputDir: "exports",
  outputFileName: "qr_codes_from_gas_stations.csv",
  domain: "https://secretscanclub.com",
  shortCodeStart: 1,
  shortCodePadLength: 8,
  stationSequencePadLength: 8,
  defaultStatus: "planned",
  campaign: "nc_gas_launch_batch_1",
};

const PLACEMENTS = [
  { placement_label: "pump_1", placement_type: "PUMP", placement_code: "PUMP1", placement_sequence: 1 },
  { placement_label: "pump_2", placement_type: "PUMP", placement_code: "PUMP2", placement_sequence: 2 },
  { placement_label: "mens_room", placement_type: "MEN", placement_code: "MENS", placement_sequence: 3 },
  { placement_label: "womens_room", placement_type: "WOM", placement_code: "WOMENS", placement_sequence: 4 },
];

/*
  MAP THESE TO YOUR SOURCE CSV HEADERS
  Left side = field used by this script
  Right side = exact column name in your CSV
*/
const COLUMN_MAP = {
  business_name: "name",
  address: "full_address",
  city: "city",
  state: "state",
  zip: "postal_code",
  latitude: "latitude",
  longitude: "longitude",
  source_station_id: "query",
};

/* =========================
   HELPERS
========================= */

function padNumber(num, length) {
  return String(num).padStart(length, "0");
}

function sanitizeToken(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/&/g, "AND")
    .replace(/\s+/g, "-")
    .replace(/[^A-Z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function toTitleSafeString(value) {
  return String(value || "").trim();
}

function slugStreet(address) {
  const raw = String(address || "").toUpperCase();

  if (!raw) return "UNKNOWN";

  const cleaned = raw
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const tokens = cleaned.split(" ").filter(Boolean);

  const ignore = new Set([
    "N", "S", "E", "W", "NE", "NW", "SE", "SW",
    "NORTH", "SOUTH", "EAST", "WEST",
    "OLD", "NEW",
    "ST", "STREET", "RD", "ROAD", "AVE", "AVENUE",
    "BLVD", "DR", "DRIVE", "LN", "LANE", "HWY", "HIGHWAY",
    "US", "NC", "FM", "SR", "JR"
  ]);

  const useful = tokens.filter((token) => {
    if (/^\d+$/.test(token)) return false;
    if (ignore.has(token)) return false;
    return true;
  });

  if (!useful.length) return "UNKNOWN";

  return sanitizeToken(useful[0]);
}

function buildStationGroupId({ state, zip, streetSlug, stationSequence }) {
  return [
    sanitizeToken(state || "NA"),
    sanitizeToken(zip || "NOZIP"),
    sanitizeToken(streetSlug || "UNKNOWN"),
    padNumber(stationSequence, CONFIG.stationSequencePadLength),
  ].join("-");
}

function buildShortCode(sequence, padLength) {
  return padNumber(sequence, padLength);
}

function buildInternalCode(stationGroupId, placementCode) {
  return `${stationGroupId}-${placementCode}`;
}

function buildQrUrl(domain, shortCode) {
  return `${domain}/q/${shortCode}`;
}

function normalizeValue(value) {
  return String(value ?? "").trim();
}

/* =========================
   CSV PARSER
   Handles quoted commas
========================= */

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}

function parseCsv(content) {
  const lines = content
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "");

  if (!lines.length) return [];

  const headers = parseCsvLine(lines[0]).map((h) => h.trim());

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row = {};

    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });

    return row;
  });
}

function escapeCsvValue(value) {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(rows) {
  if (!rows.length) return "";

  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];

  for (const row of rows) {
    lines.push(headers.map((header) => escapeCsvValue(row[header])).join(","));
  }

  return lines.join("\n");
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/* =========================
   CORE LOGIC
========================= */

function getMappedValue(row, fieldName) {
  const sourceColumn = COLUMN_MAP[fieldName];
  return normalizeValue(row[sourceColumn]);
}

function buildQrRowsFromStations(stations) {
  const qrRows = [];
  let shortCodeCounter = CONFIG.shortCodeStart;

  stations.forEach((station, index) => {
    const businessName = getMappedValue(station, "business_name");
    const address = getMappedValue(station, "address");
    const city = getMappedValue(station, "city");
    const state = getMappedValue(station, "state");
    const zip = getMappedValue(station, "zip");
    const latitude = getMappedValue(station, "latitude");
    const longitude = getMappedValue(station, "longitude");
    const sourceStationId = getMappedValue(station, "source_station_id");

    const streetSlug = slugStreet(address);
    const stationSequence = index + 1;
    const stationGroupId = buildStationGroupId({
      state,
      zip,
      streetSlug,
      stationSequence,
    });

    PLACEMENTS.forEach((placement) => {
      const shortCode = buildShortCode(shortCodeCounter, CONFIG.shortCodePadLength);
      const internalCode = buildInternalCode(stationGroupId, placement.placement_code);
      const qrUrl = buildQrUrl(CONFIG.domain, shortCode);

      qrRows.push({
        short_code: shortCode,
        internal_code: internalCode,
        qr_url: qrUrl,
        status: CONFIG.defaultStatus,
        campaign: CONFIG.campaign,
        station_group_id: stationGroupId,
        site_number: stationSequence,
        placement_label: placement.placement_label,
        placement_type: placement.placement_type,
        placement_sequence: placement.placement_sequence,
        business_name: toTitleSafeString(businessName),
        location_name: toTitleSafeString(businessName),
        address: toTitleSafeString(address),
        city: toTitleSafeString(city),
        state: toTitleSafeString(state),
        zip: toTitleSafeString(zip),
        street_slug: streetSlug,
        latitude: latitude,
        longitude: longitude,
        source_station_id: sourceStationId,
        placed_at: "",
        notes: "",
      });

      shortCodeCounter += 1;
    });
  });

  return qrRows;
}

function validateColumnMap(headers) {
  const missing = Object.values(COLUMN_MAP).filter((col) => !headers.includes(col));
  if (missing.length) {
    throw new Error(
      `Missing expected CSV columns: ${missing.join(", ")}\n` +
      `Update COLUMN_MAP in the script to match your source CSV headers.`
    );
  }
}

function main() {
  const inputPath = path.join(process.cwd(), CONFIG.inputFile);

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  const rawCsv = fs.readFileSync(inputPath, "utf8");
  const stationRows = parseCsv(rawCsv);

  if (!stationRows.length) {
    throw new Error("Source CSV is empty.");
  }

  validateColumnMap(Object.keys(stationRows[0]));

  const qrRows = buildQrRowsFromStations(stationRows);

  const outputDir = path.join(process.cwd(), CONFIG.outputDir);
  ensureDir(outputDir);

  const outputPath = path.join(outputDir, CONFIG.outputFileName);
  fs.writeFileSync(outputPath, toCsv(qrRows), "utf8");

  console.log(`Read ${stationRows.length} gas station rows.`);
  console.log(`Created ${qrRows.length} QR records.`);
  console.log(`Saved CSV to: ${outputPath}`);
  console.log(`Example station_group_id: ${qrRows[0]?.station_group_id}`);
  console.log(`Example internal_code: ${qrRows[0]?.internal_code}`);
  console.log(`Example qr_url: ${qrRows[0]?.qr_url}`);
}

main();
