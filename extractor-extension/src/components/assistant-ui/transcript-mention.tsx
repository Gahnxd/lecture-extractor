"use client";

import { cn } from "@/lib/utils";
import type { TranscriptEntry } from "@/lib/extract";
import { FileText, X } from "lucide-react";
import { useEffect, useRef, useState, type FC } from "react";

interface TranscriptMentionPopupProps {
  isOpen: boolean;
  searchQuery: string;
  onSelect: (transcript: TranscriptEntry) => void;
  onClose: () => void;
}

export const TranscriptMentionPopup: FC<TranscriptMentionPopupProps> = ({
  isOpen,
  searchQuery,
  onSelect,
  onClose,
}) => {
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load transcripts from storage
  useEffect(() => {
    if (isOpen) {
      chrome.storage.local.get(["global_data"], (result: { global_data?: { transcripts?: TranscriptEntry[] } }) => {
        const loaded = result.global_data?.transcripts ?? [];
        // Only show complete transcripts
        setTranscripts(loaded.filter(t => t.status === "complete"));
      });
    }
  }, [isOpen]);

  // Filter transcripts based on search query
  const filteredTranscripts = transcripts.filter((t) => {
    if (!searchQuery) return true;
    return t.pageTitle.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Reset selected index when filtered list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => 
          Math.min(prev + 1, filteredTranscripts.length - 1)
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" && filteredTranscripts.length > 0) {
        e.preventDefault();
        onSelect(filteredTranscripts[selectedIndex]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredTranscripts, selectedIndex, onSelect, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (containerRef.current) {
      const selectedElement = containerRef.current.querySelector(
        `[data-index="${selectedIndex}"]`
      );
      selectedElement?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className={cn(
        "absolute bottom-full left-0 right-0 mb-2 max-h-64 overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900/95 shadow-xl backdrop-blur-md",
        "animate-in slide-in-from-bottom-2 fade-in duration-150"
      )}
    >
      {/* Header */}
      <div className="sticky top-0 flex items-center justify-between border-b border-zinc-700/50 bg-zinc-900/95 px-3 py-2 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-300">
          <FileText className="size-4" />
          <span>Transcripts</span>
          {searchQuery && (
            <span className="text-zinc-500">
              — filtering "{searchQuery}"
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="rounded p-0.5 text-zinc-500 transition-colors hover:bg-zinc-700 hover:text-zinc-300"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Transcript List */}
      {filteredTranscripts.length === 0 ? (
        <div className="px-3 py-4 text-center text-sm text-zinc-500">
          {transcripts.length === 0
            ? "No transcripts captured yet"
            : "No matching transcripts"}
        </div>
      ) : (
        <div className="py-1">
          {filteredTranscripts.map((transcript, index) => (
            <button
              key={transcript.id}
              data-index={index}
              onClick={() => onSelect(transcript)}
              className={cn(
                "flex w-full flex-col gap-0.5 px-3 py-2 text-left transition-colors",
                index === selectedIndex
                  ? "bg-zinc-700/50 text-white"
                  : "text-zinc-300 hover:bg-zinc-800"
              )}
            >
              <span className="line-clamp-1 text-sm font-medium">
                {transcript.pageTitle || "Untitled"}
              </span>
              <span className="line-clamp-1 text-xs text-zinc-500">
                {transcript.pageUrl}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
