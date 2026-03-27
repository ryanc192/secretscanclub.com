export type StoredSubmission = {
  dropDate: string;
  answer: string;
  isCorrect: boolean;
  submittedAt: string;
  message?: string;
};

export function getSubmissionStorageKey(dropDate: string) {
  return `ssc_submission_${dropDate}`;
}

export function saveLocalSubmission(data: StoredSubmission) {
  if (typeof window === "undefined") return;
  localStorage.setItem(getSubmissionStorageKey(data.dropDate), JSON.stringify(data));
}

export function getLocalSubmission(dropDate: string): StoredSubmission | null {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem(getSubmissionStorageKey(dropDate));
  if (!raw) return null;

  try {
    return JSON.parse(raw) as StoredSubmission;
  } catch {
    return null;
  }
}
