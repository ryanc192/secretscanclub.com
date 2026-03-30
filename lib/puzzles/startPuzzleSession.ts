import { createBrowserSupabaseClient } from "../supabase/client";

export async function startPuzzleSession(puzzleDate: string) {
  const supabase = createBrowserSupabaseClient();

  const { data, error } = await supabase.rpc("start_puzzle_session", {
    p_puzzle_date: puzzleDate,
  });

  if (error) {
    throw error;
  }

  return data?.[0] ?? null;
}
