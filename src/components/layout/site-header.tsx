"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { ThemeToggle } from "./theme-toggle";
import { SectorToggleGlobal } from "./sector-toggle-global";

const navigation = [
  { name: "Dashboard", href: "/" },
  { name: "Opportunities", href: "/opportunities" },
  { name: "Learn", href: "/learn" },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-12 items-center px-4 md:px-6">
        <Link href="/" className="mr-6 flex items-center gap-1.5">
          <span className="font-mono font-semibold text-base tracking-tighter text-foreground">
            InsurIntel
          </span>
          <span className="cursor-blink text-primary font-mono font-bold">_</span>
        </Link>

        <nav className="hidden md:flex md:items-center md:gap-0.5">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition-colors",
                (pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href)))
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:flex lg:items-center lg:ml-4">
          <Suspense>
            <SectorToggleGlobal />
          </Suspense>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            className="hidden md:inline-flex h-7 w-52 justify-between rounded-sm bg-secondary/50 border-border font-mono text-[10px] text-muted-foreground"
            onClick={() => {
              document.dispatchEvent(
                new KeyboardEvent("keydown", { key: "k", metaKey: true })
              );
            }}
          >
            <span className="flex items-center gap-2">
              <Search className="h-3 w-3" />
              Search companies...
            </span>
            <kbd className="pointer-events-none inline-flex h-4 select-none items-center gap-0.5 rounded-sm border bg-muted px-1 font-mono text-[9px] font-medium text-muted-foreground">
              <span className="text-[10px]">&#8984;</span>K
            </kbd>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-8 w-8"
            onClick={() => {
              document.dispatchEvent(
                new KeyboardEvent("keydown", { key: "k", metaKey: true })
              );
            }}
          >
            <Search className="h-4 w-4" />
            <span className="sr-only">Search</span>
          </Button>
          <ThemeToggle />

          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <SheetTitle className="flex items-center gap-1.5 px-2 font-mono font-semibold text-base tracking-tighter">
                InsurIntel
                <span className="cursor-blink text-primary font-mono font-bold">_</span>
              </SheetTitle>
              <nav className="mt-6 flex flex-col gap-0.5">
                {navigation.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "rounded-sm px-3 py-2 font-mono text-xs uppercase tracking-wider transition-colors hover:bg-accent",
                      (pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href)))
                        ? "bg-accent text-primary"
                        : "text-muted-foreground"
                    )}
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>
              <div className="mt-4 px-2">
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Sector Filter</p>
                <div className="overflow-x-auto">
                  <Suspense>
                    <SectorToggleGlobal />
                  </Suspense>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
