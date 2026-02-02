"use client";

import { useEffect } from "react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { BackgroundGradientAnimation } from "@/components/ui/background-gradient-animation";
import { Download, Info } from "lucide-react";
import { GitHubLogoIcon } from "@radix-ui/react-icons";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  return (
    <BackgroundGradientAnimation
      gradientBackgroundStart="rgb(0, 0, 0)"
      gradientBackgroundEnd="rgb(10, 10, 30)"
      firstColor="99, 102, 241"
      secondColor="139, 92, 246"
      thirdColor="59, 130, 246"
      fourthColor="16, 185, 129"
      fifthColor="236, 72, 153"
      pointerColor="99, 102, 241"
      size="100%"
      blendingValue="hard-light"
      interactive={true}
      containerClassName="!h-screen !w-screen"
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center z-50 px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col items-center gap-8 w-full max-w-4xl"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-center space-y-4"
          >
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white tracking-tight">
              Lecture Extractor
            </h1>
            <p className="text-white/60 text-lg md:text-xl max-w-xl mx-auto font-light">
              Extract transcripts from any lecture video with a single click
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-4"
          >
            <a
              href="/extension.zip"
              download
              className="group relative inline-flex items-center gap-3 px-8 py-4 bg-white text-black font-medium rounded-full overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_rgba(255,255,255,0.3)]"
            >
              <Download className="w-5 h-5 transition-transform group-hover:-translate-y-0.5" />
              <span>Download Extension</span>
            </a>
            
            <button
              onClick={() => router.push("/about")}
              className="group inline-flex items-center gap-3 px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-medium rounded-full border border-white/20 transition-all duration-300 hover:bg-white/20 hover:scale-105"
            >
              <Info className="w-5 h-5 transition-transform group-hover:-rotate-10" />
              <span>How It Works</span>
            </button>

            <a
              href="https://github.com/Gahnxd/lecture-extractor"
              target="_blank"
              rel="noopener noreferrer"
              className="group px-4.5 py-4 bg-gradient-to-br from-zinc-600 to-zinc-800 text-white rounded-full border border-zinc-400 shadow-lg transition-all duration-300 hover:from-zinc-550 hover:to-zinc-750 hover:scale-110 hover:shadow-[0_0_20px_rgba(161,161,170,0.4)]"
            >
              <GitHubLogoIcon className="w-5 h-5" />
            </a>
          </motion.div>
        </motion.div>
      </div>
    </BackgroundGradientAnimation>
  );
}
