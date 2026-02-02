"use client";

import { useEffect } from "react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { BackgroundGradientAnimation } from "@/components/ui/background-gradient-animation";
import { ArrowLeft, Download } from "lucide-react";

export default function AboutPage() {
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
            className="text-center space-y-3"
          >
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white tracking-tight">
              How It Works
            </h1>
            <p className="text-white/60 text-lg md:text-xl max-w-xl mx-auto font-light">
              Extract lecture transcripts instantly
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="w-full max-w-3xl"
          >
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl blur-lg opacity-40 group-hover:opacity-60 transition-opacity duration-500" />
              <div className="relative bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
                <video
                  className="w-full aspect-video object-cover"
                  src="/tutorial.mp4"
                  controls
                  preload="auto"
                  playsInline
                />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
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
              onClick={() => router.push("/")}
              className="group inline-flex items-center gap-3 px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-medium rounded-full border border-white/20 transition-all duration-300 hover:bg-white/20 hover:scale-105"
            >
              <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
              <span>Back Home</span>
            </button>
          </motion.div>
        </motion.div>
      </div>
    </BackgroundGradientAnimation>
  );
}