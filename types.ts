export interface ProblemPayload {
  problem: string;
  image?: {
    mimeType: string;
    data: string;
  } | null;
}

export interface ExplanationResponse {
  explanation: string[];
  finalAnswer: string;
}