import { createBrowserSupabaseClient } from "../supabase/client";

export async function submitPuzzleAnswer(
  puzzleDate: string,
  answer: string,
  acceptedAnswers: string[]
) {
  const supabase = createBrowserSupabaseClient();

  const { data, error } = await supabase.rpc("submit_puzzle_answer", {
    p_puzzle_date: puzzleDate,
    p_answer: answer,
    p_accepted_answers: acceptedAnswers,
  });

  if (error) {
    throw error;
  }

  return data?.[0] ?? null;
}
