// lib/puzzles/archive.ts
import fs from "fs";
import path from "path";

export type DropTierContent = {
  puzzle?: string;
  answer?: string;
  acceptedAnswers?: string[];
  explanation?: string;
  sharePrompt?: string;
  bonusHint?: string;
};

export type PuzzleDrop = {
  date: string;
  number?: number | string;
  title?: string;
  free?: DropTierContent;
  member?: DropTierContent;
  club?: DropTierContent;
  vip?: DropTierContent;
};

const dropsDir = path.join(process.cwd(), "content", "drops");

function safeReadJson(filePath: string): PuzzleDrop | null {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw) as PuzzleDrop;
  } catch {
    return null;
  }
}

export function getTodayETDateString() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function getAllArchivedDrops(): PuzzleDrop[] {
  if (!fs.existsSync(dropsDir)) return [];

  const today = getTodayETDateString();

  return fs
    .readdirSync(dropsDir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => safeReadJson(path.join(dropsDir, file)))
    .filter((drop): drop is PuzzleDrop => !!drop && !!drop.date)
    .filter((drop) => drop.date < today)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getArchivedDropByDate(date: string): PuzzleDrop | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

  const today = getTodayETDateString();
  if (date >= today) return null;

  const filePath = path.join(dropsDir, `${date}.json`);
  if (!fs.existsSync(filePath)) return null;

  return safeReadJson(filePath);
}

export function formatArchiveDate(date: string) {
  const d = new Date(`${date}T12:00:00-04:00`);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

export function getVipArchiveContent(drop: PuzzleDrop): DropTierContent {
  return (
    drop.vip ||
    drop.club ||
    drop.member ||
    drop.free || {
      puzzle: "",
      answer: "",
      acceptedAnswers: [],
      explanation: "",
    }
  );
}
