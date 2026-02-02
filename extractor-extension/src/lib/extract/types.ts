import type { CapturedVtt } from "./vtt";

export interface TranscriptEntry {
  id: string;
  sourceUrl: string;
  pageUrl: string;
  pageTitle: string;
  vtts: CapturedVtt[];
  rawVtt: string;
  transcript: string;
  timestamp: number;
  status: "loading" | "complete" | "error";
  format: "vtt" | "srt";
  error?: string;
}

export interface GlobalData {
  transcripts: TranscriptEntry[];
}
