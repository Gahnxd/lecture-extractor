"use client";

import { Spotlight } from "@/components/ui/spotlight-new";
import { SquareButton } from "@/components/ui/square-button";


export default function Home() {





  return (
    <div className="h-screen w-full bg-black flex flex-col items-center justify-center overflow-hidden">
      <Spotlight duration={0} brightness={2} rotate={50} xOffset={0} />
      <h1 className="md:text-7xl text-3xl lg:text-9xl font-bold text-center text-white relative z-20">
        Lecture Extractor
      </h1>
      <div className="w-full h-40 relative translate-y-8 translate-x-27">
        <div className="absolute inset-x-20 top-0 bg-gradient-to-r from-transparent via-indigo-500 to-transparent h-[2px] w-3/4 blur-sm" />
        <div className="absolute inset-x-20 top-0 bg-gradient-to-r from-transparent via-indigo-500 to-transparent h-px w-3/4" />
        <div className="absolute inset-x-60 top-0 bg-gradient-to-r from-transparent via-sky-500 to-transparent h-[5px] w-1/4 blur-sm" />
        <div className="absolute inset-x-60 top-0 bg-gradient-to-r from-transparent via-sky-500 to-transparent h-px w-1/4" />

        <div className="absolute inset-0 w-full h-full bg-black [mask-image:radial-gradient(350px_200px_at_top,transparent_20%,white)]"></div>
      </div>
      <a href="/extension.zip" download>
        <SquareButton className="w-[20%] -translate-y-10" blinkRate={0.8}>Download Extension</SquareButton>
      </a>
    </div>
  );
}
