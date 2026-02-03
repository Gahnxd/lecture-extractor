"use client";

import { useLocalRuntime, type ChatModelAdapter } from "@assistant-ui/react";
import type { ChatModelRunOptions } from "@assistant-ui/react";

import type { TranscriptEntry } from "@/lib/extract";

// Fetch settings from chrome.storage.local
const getSettings = async () => {
  return new Promise<{ apiKey: string; model: string }>((resolve) => {
    chrome.storage.local.get(["openRouterApiKey", "aiModel"], (result: { openRouterApiKey?: string; aiModel?: string }) => {
      resolve({
        apiKey: result.openRouterApiKey ?? "",
        model: result.aiModel ?? "z-ai/glm-4.5-air:free",
      });
    });
  });
};

// Fetch transcripts from chrome.storage.local
const getTranscripts = async (): Promise<TranscriptEntry[]> => {
  return new Promise((resolve) => {
    chrome.storage.local.get(["global_data"], (result: { global_data?: { transcripts?: TranscriptEntry[] } }) => {
      resolve(result.global_data?.transcripts ?? []);
    });
  });
};

// Tool definitions for OpenRouter
const tools = [
  {
    type: "function" as const,
    function: {
      name: "list_transcripts",
      description: "List all available video transcripts with their page titles and URLs",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_raw_transcript",
      description: "Get the raw transcript content with timestamps for a specific video. Use the pageUrl from list_transcripts.",
      parameters: {
        type: "object",
        properties: {
          pageUrl: {
            type: "string",
            description: "The page URL of the transcript to retrieve",
          },
          chars: {
            type: "number",
            description: "Maximum characters to return. Use -1 for full transcript. Default is -1.",
          },
        },
        required: ["pageUrl"],
      },
    },
  },
];

// Execute tool calls
const executeTool = async (name: string, args: Record<string, unknown>): Promise<string> => {
  const transcripts = await getTranscripts();

  if (name === "list_transcripts") {
    if (transcripts.length === 0) {
      return "No transcripts available. The user needs to visit a video page to capture transcripts.";
    }
    const list = transcripts
      .filter(t => t.status === "complete")
      .map((t, i) => `${i + 1}. "${t.pageTitle}"\n   URL: ${t.pageUrl}\n   Format: ${t.format.toUpperCase()}`)
      .join("\n\n");
    return `Available transcripts:\n\n${list}`;
  }

  if (name === "get_raw_transcript") {
    const pageUrl = args.pageUrl as string;
    const chars = (args.chars as number) ?? -1;
    
    const transcript = transcripts.find(t => t.pageUrl === pageUrl);
    if (!transcript) {
      return `Transcript not found for URL: ${pageUrl}. Use list_transcripts to see available transcripts.`;
    }
    if (transcript.status !== "complete") {
      return `Transcript is still loading or has an error. Status: ${transcript.status}`;
    }
    
    let content = transcript.rawVtt || transcript.transcript || "";
    if (chars > 0 && content.length > chars) {
      content = content.substring(0, chars) + `\n\n[TRUNCATED at ${chars} characters. Total length: ${transcript.rawVtt?.length || 0}]`;
    }
    
    return `Transcript for "${transcript.pageTitle}":\n\n${content}`;
  }

  return `Unknown tool: ${name}`;
};

const OpenRouterModelAdapter: ChatModelAdapter = {
  async *run({ messages, abortSignal }: ChatModelRunOptions) {
    // Check for slash commands in the last user message
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === "user") {
      const textContent = lastMessage.content
        .filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join("")
        .trim()
        .toLowerCase();
      
      if (textContent === "/clear") {
        // Signal that chat should be cleared
        // The actual clearing needs to happen from the UI side
        yield {
          content: [{ type: "text" as const, text: "[SYSTEM] Chat cleared. Starting fresh conversation..." }],
        };
        // Note: We can't actually switch threads from here since that's a UI action
        // The runtime adapter doesn't have access to switchToNewThread()
        // Consider this a placeholder that shows the command was recognized
        return;
      }
      
      if (textContent === "/help") {
        yield {
          content: [
            {
              type: "text" as const,
              text: `### Available Commands\n\n| Command | Description |\n| :--- | :--- |\n| \`/clear\` | Clear the chat and start fresh |\n| \`/help\` | Show this help message |\n\n**Tips:**\n- Ask me to summarize or analyze any captured transcripts\n- I can search for specific topics within transcripts\n- Upload files to discuss their contents`,
            },
          ],
        };
        return;
      }
    }

    const { apiKey, model } = await getSettings();

    if (!apiKey) {
      yield {
        content: [{ type: "text" as const, text: "Please set your OpenRouter API Key in the Settings tab." }],
      };
      return;
    }

    // System message explaining the assistant's capabilities
    const systemMessage = {
      role: "system" as const,
      content: `You are a helpful AI assistant for the Video Transcript Extractor extension. You help users understand, summarize, search, and analyze their video transcripts.

You have access to tools to interact with the user's transcripts:
- list_transcripts: Shows available transcripts with their titles and URLs
- get_raw_transcript: Retrieves the full raw transcript (with timestamps) for a specific video

Always use list_transcripts first to see what's available, then get_raw_transcript to read the content. When referencing content, cite timestamps when available.`,
    };

    // Convert messages to OpenRouter format (handling text, images, and file attachments)
    const formattedMessages = messages.map((m) => {
      // Collect all content parts
      const contentParts: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];
      
      // Process regular content
      for (const part of m.content) {
        if (part.type === "text") {
          contentParts.push({ type: "text", text: (part as { type: "text"; text: string }).text });
        } else if (part.type === "image") {
          const imgPart = part as { type: "image"; image: string };
          contentParts.push({
            type: "image_url",
            image_url: { url: imgPart.image },
          });
        }
      }
      
      // Process attachments (from the attachments property, not content)
      // Cast to access attachments property which exists on user messages
      const msgWithAttachments = m as { attachments?: Array<{ type: string; name: string; content?: Array<{ type: string; text?: string; image?: string }> }> };
      
      if (msgWithAttachments.attachments && msgWithAttachments.attachments.length > 0) {
        console.log("[Runtime] Found attachments:", msgWithAttachments.attachments.length);
        
        for (const attachment of msgWithAttachments.attachments) {
          console.log("[Runtime] Attachment:", attachment.type, attachment.name);
          
          if (attachment.content) {
            for (const part of attachment.content) {
              if (part.type === "text" && part.text) {
                contentParts.push({ type: "text", text: part.text });
              } else if (part.type === "image" && part.image) {
                contentParts.push({
                  type: "image_url",
                  image_url: { url: part.image },
                });
              }
            }
          }
        }
      }
      
      // Build final message
      const hasMultipleTypes = contentParts.some(p => p.type === "image_url");
      
      if (hasMultipleTypes || contentParts.length > 1) {
        return {
          role: m.role as "user" | "assistant" | "system",
          content: contentParts,
        };
      } else {
        // Simple text-only message
        const text = contentParts.filter(p => p.type === "text").map(p => p.text).join("");
        return {
          role: m.role as "user" | "assistant" | "system",
          content: text || "",
        };
      }
    });

type MessageContent = string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
    type ChatMessage = { role: string; content: MessageContent; tool_call_id?: string; tool_calls?: unknown[] };
    
    let allMessages: ChatMessage[] = [systemMessage, ...formattedMessages];
    let accumulatedText = "";
    let maxToolCalls = 5; // Prevent infinite loops
    
    // Track content parts OUTSIDE the loop to persist across tool call iterations
    // This supports reasoning → respond → tool → reasoning patterns
    type ContentPart = { 
      type: "reasoning" | "text"; 
      text: string; 
      id?: string;
    };
    let contentParts: ContentPart[] = [];
    let lastPartType: "reasoning" | "text" | null = null;

    
    const REASONING_DONE_MARKER = "\u200B";
    
    const markReasoningComplete = () => {
      if (lastPartType === "reasoning" && contentParts.length > 0) {
        const lastPart = contentParts[contentParts.length - 1];
        if (!lastPart.text.endsWith(REASONING_DONE_MARKER)) {
          lastPart.text += REASONING_DONE_MARKER;
        }
      }
    };
    let partCounter = 0;

    while (maxToolCalls > 0) {
      
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "chrome-extension://video-transcript-extractor",
          "X-Title": "Video Transcript Extractor",
        },
        body: JSON.stringify({
          model,
          messages: allMessages,
          tools,
          tool_choice: "auto",
          stream: true, // Enable streaming
        }),
        signal: abortSignal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        yield {
          content: [{ type: "text" as const, text: `OpenRouter Error: ${response.status} - ${errorBody}` }],
        };
        return;
      }

      // Parse streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        yield { content: [{ type: "text" as const, text: "Response body is not readable" }] };
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";
      
      let toolCalls: Array<{ id: string; function: { name: string; arguments: string } }> = [];
      let toolCallsInProgress: Map<number, { id: string; function: { name: string; arguments: string } }> = new Map();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete lines
          while (true) {
            const lineEnd = buffer.indexOf("\n");
            if (lineEnd === -1) break;

            const line = buffer.slice(0, lineEnd).trim();
            buffer = buffer.slice(lineEnd + 1);

            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") break;

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta;
                
                // Handle reasoning content (for models like DeepSeek)
                if (delta?.reasoning_content || delta?.reasoning) {
                  const reasoningChunk = delta.reasoning_content || delta.reasoning;
                  
                  // If last part was reasoning, append to it; otherwise start new reasoning block
                  if (lastPartType === "reasoning" && contentParts.length > 0) {
                    contentParts[contentParts.length - 1].text += reasoningChunk;
                  } else {
                    // Finalize previous reasoning block
                    markReasoningComplete();
                    
                    // Create new reasoning block with unique ID
                    partCounter++;
                    const newId = `reasoning-${partCounter}`;
                    contentParts.push({ 
                      type: "reasoning", 
                      text: reasoningChunk,
                      id: newId,
                    });
                    
                    lastPartType = "reasoning";
                  }
                  
                  // Yield current state
                  yield { content: [...contentParts] };
                }
                
                if (delta?.content) {
                  const textChunk = delta.content;
                  
                  // If transitioning from reasoning to text, finalize reasoning
                  if (lastPartType === "reasoning") {
                    markReasoningComplete();
                  }
                  
                  // If last part was text, append to it; otherwise start new text block
                  if (lastPartType === "text" && contentParts.length > 0) {
                    contentParts[contentParts.length - 1].text += textChunk;
                  } else {
                    // Create new text block with unique ID
                    partCounter++;
                    contentParts.push({ 
                      type: "text", 
                      text: textChunk,
                      id: `text-${partCounter}`,
                    });
                    lastPartType = "text";
                  }
                  
                  // Yield current state
                  yield { content: [...contentParts] };
                }

                // Handle streaming tool calls
                if (delta?.tool_calls) {
                  // Finalize reasoning before tool calls
                  markReasoningComplete();
                  
                  for (const tc of delta.tool_calls) {
                    const idx = tc.index;
                    if (!toolCallsInProgress.has(idx)) {
                      toolCallsInProgress.set(idx, {
                        id: tc.id || "",
                        function: { name: tc.function?.name || "", arguments: "" },
                      });
                    }
                    const existing = toolCallsInProgress.get(idx)!;
                    if (tc.id) existing.id = tc.id;
                    if (tc.function?.name) existing.function.name = tc.function.name;
                    if (tc.function?.arguments) existing.function.arguments += tc.function.arguments;
                  }
                }
              } catch {
                // Ignore JSON parse errors on incomplete chunks
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      // Finalize any remaining reasoning duration after stream ends
      markReasoningComplete();

      // Collect completed tool calls
      toolCalls = Array.from(toolCallsInProgress.values()).filter(tc => tc.id && tc.function.name);

      // Helper to get accumulated text from contentParts
      const getAccumulatedText = () => contentParts
        .filter(p => p.type === "text")
        .map(p => p.text)
        .join("");

      // Check for tool calls
      if (toolCalls.length > 0) {
        // Add assistant message with tool calls to conversation
        // OpenRouter requires tool_calls to have type: "function" field
        allMessages.push({
          role: "assistant",
          content: getAccumulatedText() || "",
          tool_calls: toolCalls.map(tc => ({
            ...tc,
            type: "function" as const,
          })),
        });

        // Execute each tool call and add results
        for (const toolCall of toolCalls) {
          const toolName = toolCall.function.name;
          let toolArgs = {};
          try {
            toolArgs = JSON.parse(toolCall.function.arguments || "{}");
          } catch {
            // ignore parse errors
          }

          const result = await executeTool(toolName, toolArgs);
          
          allMessages.push({
            role: "tool",
            content: result,
            tool_call_id: toolCall.id,
          });
        }

        maxToolCalls--;
        // Reset for next iteration
        accumulatedText = getAccumulatedText();
        continue;
      }

      // No tool calls, streaming is complete
      accumulatedText = getAccumulatedText();
      return;
    }

    // If we exhausted tool calls
    yield {
      content: [{ type: "text" as const, text: accumulatedText || "Reached maximum tool call limit." }],
    };
  },
};

// Helper to convert file to base64 data URL
const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Attachment adapter for local file handling
const attachmentAdapter = {
  accept: "image/*,.pdf,.txt,.md,.json,.csv",
  async add({ file }: { file: File }) {
    // Return a pending attachment - content will be created in send()
    return {
      id: `${Date.now()}-${file.name}`,
      type: file.type.startsWith("image/") ? "image" as const : "document" as const,
      name: file.name,
      contentType: file.type,
      file,
      status: { type: "requires-action" as const, reason: "composer-send" as const },
    };
  },
  async remove() {
    // No cleanup needed for client-side handling
  },
  async send(attachment: { id: string; type: "image" | "document" | "file"; name: string; contentType: string; file: File }) {
    // Convert file to content when sending
    const isImage = attachment.file.type.startsWith("image/");
    const dataUrl = await fileToDataUrl(attachment.file);
    
    return {
      id: attachment.id,
      type: attachment.type,
      name: attachment.name,
      contentType: attachment.contentType,
      status: { type: "complete" as const },
      content: isImage 
        ? [{ type: "image" as const, image: dataUrl }]
        : [{ type: "text" as const, text: `[File: ${attachment.name}]\n${await attachment.file.text()}` }],
    };
  },
};

export function useOpenRouterRuntime() {
  return useLocalRuntime(OpenRouterModelAdapter, {
    adapters: {
      attachments: attachmentAdapter,
    },
  });
}
