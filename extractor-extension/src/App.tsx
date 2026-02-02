import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  MoreHorizontalIcon, 
  Trash2Icon, 
  DownloadIcon, 
  FileTextIcon, 
  Check, 
  X, 
  CopyIcon, 
  ClipboardCopyIcon,
  Captions,
  RefreshCcwIcon 
} from "lucide-react";
import "./App.css";
import { Spinner } from "./components/ui/spinner";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import type { TranscriptEntry } from "./lib/extract";

function App() {
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTranscripts();

    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName === "local" && changes.global_data) {
        const newData = changes.global_data.newValue as { transcripts?: TranscriptEntry[] } | undefined;
        setTranscripts(newData?.transcripts || []);
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  const fetchTranscripts = () => {
    chrome.runtime.sendMessage({ type: "GET_ALL_TRANSCRIPTS" }, (response: TranscriptEntry[]) => {
      setTranscripts(response || []);
      setLoading(false);
    });
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelected(newSelected);
  };

  const toggleSelectAll = () => {
    if (selected.size === transcripts.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(transcripts.map((t) => t.id)));
    }
  };

  const deleteTranscript = (id: string) => {
    chrome.runtime.sendMessage({ type: "DELETE_TRANSCRIPT", id }, () => {
      setSelected((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    });
  };

  const deleteSelected = () => {
    if (selected.size === 0) return;
    chrome.runtime.sendMessage({ type: "DELETE_SELECTED", ids: Array.from(selected) }, () => {
      setSelected(new Set());
    });
  };

  const downloadRaw = (entry: TranscriptEntry) => {
    if (!entry.rawVtt) return;
    const blob = new Blob([entry.rawVtt], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sanitizeFilename(entry.pageTitle)}_raw.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadText = (entry: TranscriptEntry) => {
    if (!entry.transcript) return;
    const blob = new Blob([entry.transcript], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sanitizeFilename(entry.pageTitle)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyText = (entry: TranscriptEntry) => {
    if (!entry.transcript) return;
    navigator.clipboard.writeText(entry.transcript);
  };

  const copyRaw = (entry: TranscriptEntry) => {
    if (!entry.rawVtt) return;
    navigator.clipboard.writeText(entry.rawVtt);
  };

  const getSelectedEntries = () => {
    return transcripts.filter(t => selected.has(t.id));
  };

  const downloadSelectedText = () => {
    const selectedEntries = getSelectedEntries();
    selectedEntries.forEach(entry => downloadText(entry));
  };

  const downloadSelectedRaw = () => {
    const selectedEntries = getSelectedEntries();
    selectedEntries.forEach(entry => downloadRaw(entry));
  };

  const copySelectedText = () => {
    const text = getSelectedEntries()
      .map(t => `--- ${t.pageTitle} ---\n${t.transcript}`)
      .join("\n\n");
    navigator.clipboard.writeText(text);
  };

  const copySelectedRaw = () => {
    const text = getSelectedEntries()
      .map(t => `--- Raw Content for ${t.pageTitle} ---\n\n${t.rawVtt}`)
      .join("\n\n");
    navigator.clipboard.writeText(text);
  };

  const sanitizeFilename = (name: string): string => {
    return name.replace(/[^a-z0-9]/gi, "_").substring(0, 50) || "transcript";
  };

  const refreshPage = () => {
    chrome.tabs.reload();
  };


  if (loading) {
    return (
      <div className="app dark h-full">
        <div className="flex items-center justify-center p-8 text-muted-foreground">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
    <div className="app dark h-full">
      <header className="flex items-center justify-between p-4 min-h-[72px]">
        <h1 className="text-lg font-semibold">Video Transcript Extractor</h1>
        {selected.size > 1 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <HoverBorderGradient
                containerClassName="rounded-full"
                as="button"
                duration={0.5}
                className="dark:bg-black bg-white text-black dark:text-white flex items-center space-x-2 px-4 py-1.5 h-auto text-sm"
              >
                <span>Actions ({selected.size})</span>
              </HoverBorderGradient>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-zinc-800 border-none text-white min-w-[200px] max-h-[unset] overflow-hidden">
               <DropdownMenuItem
                onClick={downloadSelectedText}
                className="focus:bg-zinc-600 focus:text-white cursor-pointer"
              >
                <FileTextIcon className="size-4 mr-2 text-zinc-300" />
                Download Selected
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={downloadSelectedRaw}
                className="focus:bg-zinc-600 focus:text-white cursor-pointer"
              >
                <DownloadIcon className="size-4 mr-2 text-zinc-300" />
                Download Selected Raw
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={copySelectedText}
                className="focus:bg-zinc-600 focus:text-white cursor-pointer"
              >
                <CopyIcon className="size-4 mr-2 text-zinc-300" />
                Copy Selected
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={copySelectedRaw}
                className="focus:bg-zinc-600 focus:text-white cursor-pointer"
              >
                <ClipboardCopyIcon className="size-4 mr-2 text-zinc-300" />
                Copy Selected Raw
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-zinc-700" />
              <DropdownMenuItem
                variant="destructive"
                onClick={deleteSelected}
                className="text-red-400 focus:bg-red-900/30 focus:text-red-400 cursor-pointer"
              >
                <Trash2Icon className="size-4 mr-2 text-red-400" />
                Delete Selected
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>

      {transcripts.length === 0 ? (
        <Empty className="h-auto py-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Captions className="size-6" />
            </EmptyMedia>
            <EmptyTitle>No transcripts captured</EmptyTitle>
            <EmptyDescription className="max-w-xs text-pretty">
              Refresh the page to capture transcripts.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <HoverBorderGradient
              containerClassName="rounded-full"
              as="button"
              duration={0.5}
              onClick={refreshPage}
              className="dark:bg-black bg-white text-black dark:text-white flex items-center space-x-2 px-4 py-1.5 h-auto text-sm"
            >
              <RefreshCcwIcon className="size-4" />
              <span>Refresh</span>
            </HoverBorderGradient>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="p-4 pb-48">
        <Table className="table-fixed w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={selected.size === transcripts.length && transcripts.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Page</TableHead>
              <TableHead className="w-[100px] text-center">Status</TableHead>
              <TableHead className="w-16 text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transcripts.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>
                  <Checkbox
                    checked={selected.has(entry.id)}
                    onCheckedChange={() => toggleSelect(entry.id)}
                  />
                </TableCell>
                <TableCell className="font-medium align-middle">
                   <Tooltip>
                    <TooltipTrigger asChild>
                      <motion.div 
                        className="w-full truncate cursor-pointer hover:bg-zinc-800/50 rounded px-2 py-1 transition-colors" 
                        whileTap={{ scale: 0.90 }}
                        onClick={() => {
                          navigator.clipboard.writeText(entry.pageTitle);
                        }}
                      >
                        {entry.pageTitle}
                        {entry.format === 'srt' && <span className="ml-2 text-xs text-muted-foreground border border-zinc-700 px-1 rounded">SRT</span>}
                      </motion.div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[350px] bg-zinc-800 text-white border-none" arrowClassName="fill-zinc-800 bg-zinc-800">
                      <p className="break-words">{entry.pageTitle}</p>
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center">
                    {entry.status === "loading" && <span className="text-yellow-500"><Spinner className="size-4" /></span>}
                    {entry.status === "complete" && <span className="text-green-500"><Check className="size-4" /></span>}
                    {entry.status === "error" && <span className="text-red-500"><X className="size-4" /></span>}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8 hover:bg-zinc-800 hover:text-white">
                        <MoreHorizontalIcon />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-zinc-800 border-none text-white min-w-[200px]">
                      <DropdownMenuItem
                        onClick={() => downloadText(entry)}
                        disabled={entry.status !== "complete"}
                        className="focus:bg-zinc-600 focus:text-white cursor-pointer"
                      >
                        <FileTextIcon className="size-4 mr-2 text-zinc-300" />
                        Download Transcript
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => downloadRaw(entry)}
                        disabled={entry.status !== "complete"}
                        className="focus:bg-zinc-600 focus:text-white cursor-pointer"
                      >
                        <DownloadIcon className="size-4 mr-2 text-zinc-300" />
                        Download Raw
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => copyText(entry)}
                        disabled={entry.status !== "complete"}
                        className="focus:bg-zinc-600 focus:text-white cursor-pointer"
                      >
                        <CopyIcon className="size-4 mr-2 text-zinc-300" />
                        Copy Transcript
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => copyRaw(entry)}
                        disabled={entry.status !== "complete"}
                        className="focus:bg-zinc-600 focus:text-white cursor-pointer"
                      >
                        <ClipboardCopyIcon className="size-4 mr-2 text-zinc-300" />
                        Copy Raw
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-zinc-700" />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => deleteTranscript(entry.id)}
                        className="text-red-400 focus:bg-red-900/30 focus:text-red-400 cursor-pointer"
                      >
                        <Trash2Icon className="size-4 mr-2 text-red-400" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      )}
    </div>
    </TooltipProvider>
  );
}

export default App;
