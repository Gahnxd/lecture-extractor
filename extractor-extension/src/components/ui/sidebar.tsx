"use client";
import { cn } from "@/lib/utils";
import React, { useState, createContext, useContext } from "react";
import { motion } from "motion/react";

interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(
  undefined
);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const [openState, setOpenState] = useState(false);

  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  return (
    <SidebarContext.Provider value={{ open, setOpen }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const Sidebar = ({
  children,
  open,
  setOpen,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  return (
    <SidebarProvider open={open} setOpen={setOpen}>
      {children}
    </SidebarProvider>
  );
};

export const SidebarBody = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof motion.div>) => {
  const { open, setOpen } = useSidebar();
  return (
    <motion.div
      className={cn(
        "h-full px-2 py-4 flex flex-col shrink-0",
        className
      )}
      animate={{
        width: open ? "140px" : "48px",
      }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export const SidebarLink = ({
  link,
  className,
  active,
  onClick,
  ...props
}: {
  link: { label: string; icon: React.ReactNode };
  className?: string;
  active?: boolean;
  onClick?: () => void;
}) => {
  const { open } = useSidebar();
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 py-2 px-2 rounded-md transition-colors w-full text-left",
        active 
          ? "bg-zinc-700 text-white" 
          : "text-zinc-400 hover:text-white hover:bg-zinc-800",
        className
      )}
      {...props}
    >
      <span className="shrink-0">{link.icon}</span>
      <motion.span
        animate={{
          display: open ? "inline-block" : "none",
          opacity: open ? 1 : 0,
        }}
        transition={{ duration: 0.15 }}
        className="text-sm whitespace-nowrap overflow-hidden"
      >
        {link.label}
      </motion.span>
    </button>
  );
};
