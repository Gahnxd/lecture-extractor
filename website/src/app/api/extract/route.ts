import { NextRequest, NextResponse } from "next/server";
import { extractTranscript } from "@/lib/extractor";

interface ExtractRequest {
  m3u8Url: string;
  vtt?: boolean;
  transcript?: boolean;
  filename?: string;
}

interface FileResult {
  filename: string;
  contentType: string;
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ExtractRequest = await request.json();
    const { m3u8Url, vtt = true, transcript = true, filename = "transcript" } = body;

    if (!m3u8Url) {
      return NextResponse.json(
        { error: "m3u8Url is required" },
        { status: 400 }
      );
    }

    if (!vtt && !transcript) {
      return NextResponse.json(
        { error: "At least one of 'vtt' or 'transcript' must be true" },
        { status: 400 }
      );
    }

    // Extract transcript
    const result = await extractTranscript(m3u8Url);

    const files: FileResult[] = [];

    if (vtt) {
      files.push({
        filename: `${filename}.vtt`,
        contentType: "text/vtt",
        content: result.rawVtt,
      });
    }

    if (transcript) {
      files.push({
        filename: `${filename}.txt`,
        contentType: "text/plain",
        content: result.transcript,
      });
    }

    return NextResponse.json({
      files,
      segmentCount: result.segmentCount,
    });
  } catch (error) {
    console.error("Extract error:", error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// Also support GET for simple usage
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const m3u8Url = searchParams.get("url");
  const vtt = searchParams.get("vtt") !== "false"; // default true
  const transcript = searchParams.get("transcript") !== "false"; // default true
  const filename = searchParams.get("filename") || "transcript";

  if (!m3u8Url) {
    return NextResponse.json(
      { error: "url parameter is required" },
      { status: 400 }
    );
  }

  if (!vtt && !transcript) {
    return NextResponse.json(
      { error: "At least one of 'vtt' or 'transcript' must be true" },
      { status: 400 }
    );
  }

  try {
    const result = await extractTranscript(m3u8Url);

    const files: FileResult[] = [];

    if (vtt) {
      files.push({
        filename: `${filename}.vtt`,
        contentType: "text/vtt",
        content: result.rawVtt,
      });
    }

    if (transcript) {
      files.push({
        filename: `${filename}.txt`,
        contentType: "text/plain",
        content: result.transcript,
      });
    }

    return NextResponse.json({
      files,
      segmentCount: result.segmentCount,
    });
  } catch (error) {
    console.error("Extract error:", error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
