import { useState, lazy, Suspense } from "react";
import {
  Captions,
  BotIcon,
  Settings2Icon
} from "lucide-react";
import "@/App.css";
import { Spinner } from "@/components/ui/spinner";
import { useOpenRouterRuntime } from "@/lib/runtime";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

const ExtractorPage = lazy(() => import("@/pages/ExtractorPage").then(m => ({ default: m.ExtractorPage })));
const AssistantPage = lazy(() => import("@/pages/AssistantPage").then(m => ({ default: m.AssistantPage })));
const SettingsPage = lazy(() => import("@/pages/SettingsPage").then(m => ({ default: m.SettingsPage })));

type Page = "extractor" | "assistant" | "settings";

function AppContent() {
  const [page, setPage] = useState<Page>("extractor");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <TooltipProvider>
      <div className="app dark h-full flex">
        <Sidebar open={sidebarOpen} setOpen={setSidebarOpen}>
          <SidebarBody className="h-full gap-2 bg-zinc-900 border-r border-zinc-800">
            <div className="flex flex-col gap-1">
              <SidebarLink
                link={{ icon: <Captions className="size-5" />, label: "Extractor" }}
                active={page === "extractor"}
                onClick={() => setPage("extractor")}
              />
              <SidebarLink
                link={{ icon: <BotIcon className="size-5" />, label: "Assistant" }}
                active={page === "assistant"}
                onClick={() => setPage("assistant")}
              />
              <SidebarLink
                link={{ icon: <Settings2Icon className="size-5" />, label: "Settings" }}
                active={page === "settings"}
                onClick={() => setPage("settings")}
              />
            </div>
          </SidebarBody>
        </Sidebar>

        <main className="flex-1 overflow-hidden">
          {page === "extractor" && (
            <Suspense fallback={
              <div className="flex items-center justify-center h-full">
                <Spinner className="size-6" />
              </div>
            }>
              <ExtractorPage />
            </Suspense>
          )}
          {page === "assistant" && (
            <Suspense fallback={
              <div className="flex items-center justify-center h-full">
                <Spinner className="size-6" />
              </div>
            }>
              <AssistantPage />
            </Suspense>
          )}
          {page === "settings" && (
            <Suspense fallback={
              <div className="flex items-center justify-center h-full">
                <Spinner className="size-6" />
              </div>
            }>
              <SettingsPage />
            </Suspense>
          )}
        </main>
      </div>
    </TooltipProvider>
  );
}

function App() {
  const runtime = useOpenRouterRuntime();
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <AppContent />
    </AssistantRuntimeProvider>
  );
}

export default App;
