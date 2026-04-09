const fs = require("fs");
const path = require("path");

/*
  STEP 2: QR CODE BULK GENERATOR

  WHAT THIS DOES:
  - Creates public short codes like: 000001
  - Creates internal tracking codes like: NC-DUR-GAS-MEN-000001
  - Builds redirect URLs like: https://secretscanclub.com/q/000001
  - Exports everything to a CSV file

  HOW TO RUN:
  node scripts/generate-qr-codes.js
*/

const CONFIG = {
  domain: "https://secretscanclub.com",
  batchName: "launch_batch_1",

  state: "NC",
  city: "DUR",
  venueType: "GAS",         // examples: GAS, APT, DAY, CHR, REST
  placementType: "MEN",     // examples: MEN, WOM, PUMP, DOOR, LOBBY

  startNumber: 1,
  count: 3000,
  padLength: 8,

  outputDir: "exports",
  outputFileName: "qr_codes_batch_1.csv",
};

function padNumber(num, length) {
  return String(num).padStart(length, "0");
}

function sanitizeToken(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-")
    .replace(/[^A-Z0-9-]/g, "");
}

function buildShortCode(sequence, padLength) {
  return padNumber(sequence, padLength);
}

function buildInternalCode({ state, city, venueType, placementType, shortCode }) {
  return [
    sanitizeToken(state),
    sanitizeToken(city),
    sanitizeToken(venueType),
    sanitizeToken(placementType),
    shortCode,
  ].join("-");
}

function buildQrUrl(domain, shortCode) {
  return `${domain}/q/${shortCode}`;
}

function buildRows(config) {
  const rows = [];

  for (
    let sequence = config.startNumber;
    sequence < config.startNumber + config.count;
    sequence += 1
  ) {
    const shortCode = buildShortCode(sequence, config.padLength);
    const internalCode = buildInternalCode({
      state: config.state,
      city: config.city,
      venueType: config.venueType,
      placementType: config.placementType,
      shortCode,
    });
    const qrUrl = buildQrUrl(config.domain, shortCode);

    rows.push({
      short_code: shortCode,
      internal_code: internalCode,
      status: "planned",
      campaign: config.batchName,
      state: config.state,
      city: config.city,
      venue_type: config.venueType,
      placement_type: config.placementType,
      location_name: "",
      address: "",
      latitude: "",
      longitude: "",
      placed_at: "",
      notes: "",
      qr_url: qrUrl,
    });
  }

  return rows;
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

function main() {
  const rows = buildRows(CONFIG);
  const csv = toCsv(rows);

  const outputDir = path.join(process.cwd(), CONFIG.outputDir);
  ensureDir(outputDir);

  const outputPath = path.join(outputDir, CONFIG.outputFileName);
  fs.writeFileSync(outputPath, csv, "utf8");

  console.log(`Created ${rows.length} QR code records.`);
  console.log(`Saved CSV to: ${outputPath}`);
  console.log(`Example short code: ${rows[0]?.short_code}`);
  console.log(`Example internal code: ${rows[0]?.internal_code}`);
  console.log(`Example QR URL: ${rows[0]?.qr_url}`);
}

main();
