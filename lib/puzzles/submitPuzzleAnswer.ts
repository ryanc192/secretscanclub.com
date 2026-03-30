import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export async function submitPuzzleAnswer(puzzleDate: string, answer: string) {
  const supabase = createBrowserSupabaseClient();

  const { data, error } = await supabase.rpc("submit_puzzle_answer", {
    p_puzzle_date: puzzleDate,
    p_answer: answer,
  });

  if (error) {
    throw error;
  }

  return data?.[0] ?? null;
}
