"use client"
import * as React from "react"
import { useState } from "react"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  IconChevronDown,
  IconChevronUp,
  IconDownload,
  IconQuestionMark,
  IconLoader2,
  IconCheck,
  IconX,
  IconFileText,
} from "@tabler/icons-react"

interface ExtractedFile {
  filename: string;
  contentType: string;
  content: string;
}

interface ExtractResult {
  files: ExtractedFile[];
  segmentCount: number;
}

export default function Extract() {
    const [folderName, setFolderName] = useState("")
    const [m3u8Url, setM3u8Url] = useState("")
    const [showInstructions, setShowInstructions] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [result, setResult] = useState<ExtractResult | null>(null)

    const downloadFile = (file: ExtractedFile) => {
        const blob = new Blob([file.content], { type: file.contentType })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = file.filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    const downloadAllFiles = () => {
        if (!result) return
        result.files.forEach(file => downloadFile(file))
    }

    const handleExtract = async () => {
        if (!folderName.trim() || !m3u8Url.trim()) return
        
        setIsLoading(true)
        setError(null)
        setResult(null)
        
        try {
            const response = await fetch("/api/extract", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    m3u8Url: m3u8Url.trim(),
                    filename: folderName.trim(),
                    vtt: true,
                    transcript: true,
                }),
            })
            
            const data = await response.json()
            
            if (!response.ok) {
                throw new Error(data.error || "Failed to extract transcript")
            }
            
            setResult(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unexpected error occurred")
        } finally {
            setIsLoading(false)
        }
    }

    const resetForm = () => {
        setResult(null)
        setError(null)
        setFolderName("")
        setM3u8Url("")
    }

    return (
        <div className="min-h-screen w-full bg-black flex flex-col items-center justify-center p-6 overflow-auto">
            <div className="w-full max-w-lg space-y-8">
                {/* Header */}
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold text-white">Lecture Extractor</h1>
                    <p className="text-gray-400">
                        Extract transcripts from M3U8 video playlists
                    </p>
                </div>

                {/* Form */}
                <div className="space-y-6">
                    {/* Folder Name Input */}
                    <div className="space-y-2">
                        <label htmlFor="folder-name" className="block text-sm font-medium text-gray-300">
                            Output Folder Name
                        </label>
                        <InputGroup className="[--radius:9999px]">
                            <InputGroupInput 
                                id="folder-name" 
                                placeholder="e.g., Week1_Lecture"
                                value={folderName}
                                onChange={(e) => setFolderName(e.target.value)}
                            />
                        </InputGroup>
                        <p className="text-xs text-gray-500">
                            This will be used to name your output files
                        </p>
                    </div>

                    {/* M3U8 URL Input */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label htmlFor="m3u8-url" className="block text-sm font-medium text-gray-300">
                                M3U8 Playlist URL
                            </label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <button className="text-gray-400 hover:text-gray-200 transition-colors">
                                        <IconQuestionMark size={16} />
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent
                                    align="end"
                                    className="w-80 rounded-xl text-sm bg-gray-900 border-gray-700"
                                >
                                    <p className="font-medium text-white mb-2">What is an M3U8 URL?</p>
                                    <p className="text-gray-300">
                                        M3U8 is a playlist format used by video players like Kaltura. 
                                        It contains links to subtitle/transcript files that this tool extracts.
                                    </p>
                                </PopoverContent>
                            </Popover>
                        </div>
                        <InputGroup className="[--radius:9999px]">
                            <InputGroupInput 
                                id="m3u8-url" 
                                placeholder="https://cfvod.kaltura.com/[...]/a.m3u8"
                                value={m3u8Url}
                                onChange={(e) => setM3u8Url(e.target.value)}
                            />
                            <InputGroupAddon align="inline-end">
                                <InputGroupButton 
                                    onClick={handleExtract}
                                    disabled={!folderName.trim() || !m3u8Url.trim() || isLoading}
                                >
                                    {isLoading ? (
                                        <IconLoader2 className="animate-spin" />
                                    ) : (
                                        <IconDownload />
                                    )}
                                </InputGroupButton>
                            </InputGroupAddon>
                        </InputGroup>
                    </div>
                </div>

                {/* How to find M3U8 URL - Collapsible */}
                <div className="bg-gray-900/50 rounded-2xl border border-gray-800">
                    <button
                        onClick={() => setShowInstructions(!showInstructions)}
                        className="w-full flex items-center justify-between p-4 text-left"
                    >
                        <span className="text-sm font-medium text-gray-300">
                            How to find the M3U8 URL
                        </span>
                        {showInstructions ? (
                            <IconChevronUp className="text-gray-400" size={20} />
                        ) : (
                            <IconChevronDown className="text-gray-400" size={20} />
                        )}
                    </button>
                    
                    {showInstructions && (
                        <div className="px-4 pb-4 space-y-3 text-sm text-gray-400">
                            <ol className="list-decimal list-inside space-y-2">
                                <li>Open the video page in your browser (e.g., Chrome)</li>
                                <li>Right-click anywhere and select <span className="text-white font-medium">Inspect</span></li>
                                <li>Switch to the <span className="text-white font-medium">Network</span> tab</li>
                                <li>In the filter box, type <code className="bg-gray-800 px-1.5 py-0.5 rounded text-gray-300">m3u8</code></li>
                                <li>Refresh the page and watch for requests</li>
                                <li>Look for <code className="bg-gray-800 px-1.5 py-0.5 rounded text-gray-300">master.m3u8</code>, <code className="bg-gray-800 px-1.5 py-0.5 rounded text-gray-300">index.m3u8</code>, or <code className="bg-gray-800 px-1.5 py-0.5 rounded text-gray-300">a.m3u8</code></li>
                                <li>Right-click the request → <span className="text-white font-medium">Copy</span> → <span className="text-white font-medium">Copy link address</span></li>
                            </ol>
                        </div>
                    )}
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-900/30 border border-red-700 rounded-2xl p-4 flex items-start gap-3">
                        <IconX className="text-red-400 shrink-0 mt-0.5" size={20} />
                        <div>
                            <p className="text-red-400 font-medium">Extraction Failed</p>
                            <p className="text-red-300 text-sm mt-1">{error}</p>
                        </div>
                    </div>
                )}

                {/* Success Result */}
                {result && (
                    <div className="bg-green-900/30 border border-green-700 rounded-2xl p-4 space-y-4">
                        <div className="flex items-start gap-3">
                            <IconCheck className="text-green-400 shrink-0 mt-0.5" size={20} />
                            <div>
                                <p className="text-green-400 font-medium">Extraction Complete!</p>
                                <p className="text-green-300 text-sm mt-1">
                                    Found {result.segmentCount} segments
                                </p>
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            {result.files.map((file, index) => (
                                <button
                                    key={index}
                                    onClick={() => downloadFile(file)}
                                    className="w-full flex items-center gap-3 p-3 bg-gray-800/50 hover:bg-gray-800 rounded-xl transition-colors text-left"
                                >
                                    <IconFileText className="text-gray-400" size={20} />
                                    <span className="text-gray-200 flex-1 font-mono text-sm">
                                        {file.filename}
                                    </span>
                                    <IconDownload className="text-gray-400" size={18} />
                                </button>
                            ))}
                        </div>
                        
                        <div className="flex gap-2">
                            <button
                                onClick={downloadAllFiles}
                                className="flex-1 py-2 px-4 bg-green-600 hover:bg-green-500 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                <IconDownload size={18} />
                                Download All
                            </button>
                            <button
                                onClick={resetForm}
                                className="py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors"
                            >
                                Extract Another
                            </button>
                        </div>
                    </div>
                )}

                {/* Output info - only show when not completed */}
                {!result && !isLoading && (
                    <div className="text-center text-xs text-gray-500 space-y-1">
                        <p>Output files will include:</p>
                        <p className="font-mono text-gray-400">
                            {folderName || "folder"}.vtt &amp; {folderName || "folder"}.txt
                        </p>
                    </div>
                )}

                {/* Loading state message */}
                {isLoading && (
                    <div className="text-center text-sm text-gray-400 space-y-2">
                        <IconLoader2 className="animate-spin mx-auto" size={24} />
                        <p>Extracting transcript... This may take a moment.</p>
                    </div>
                )}
            </div>
        </div>
    )
}