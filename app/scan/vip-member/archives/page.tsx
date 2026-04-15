import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

type DropTierContent = {
  puzzle?: string;
  answer?: string;
  acceptedAnswers?: string[];
  explanation?: string;
  sharePrompt?: string;
  bonusHint?: string;
};

type PuzzleDrop = {
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
  } catch (error) {
    console.error("Failed to read drop file:", filePath, error);
    return null;
  }
}

function getTodayETDateString() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function GET() {
  try {
    if (!fs.existsSync(dropsDir)) {
      return NextResponse.json({
        drops: [],
        debug: {
          message: "Drops directory not found",
          dropsDir,
          cwd: process.cwd(),
        },
      });
    }

    const today = getTodayETDateString();
    const files = fs
      .readdirSync(dropsDir)
      .filter((file) => file.endsWith(".json"))
      .sort((a, b) => b.localeCompare(a));

    const parsedDrops = files
      .map((file) => {
        const fullPath = path.join(dropsDir, file);
        const data = safeReadJson(fullPath);
        return {
          file,
          data,
        };
      })
      .filter(
        (item): item is { file: string; data: PuzzleDrop } =>
          !!item.data && typeof item.data.date === "string"
      );

    const drops = parsedDrops
      .map((item) => item.data)
      .filter((drop) => drop.date < today)
      .sort((a, b) => b.date.localeCompare(a.date));

    return NextResponse.json({
      drops,
      debug: {
        today,
        dropsDir,
        totalFiles: files.length,
        parsedFiles: parsedDrops.length,
        returnedDrops: drops.length,
        fileNames: files,
      },
    });
  } catch (error) {
    console.error("Archives API error:", error);

    return NextResponse.json(
      {
        drops: [],
        debug: {
          message: "Archive route failed",
          error: error instanceof Error ? error.message : "Unknown error",
          dropsDir,
          cwd: process.cwd(),
        },
      },
      { status: 500 }
    );
  }
}
