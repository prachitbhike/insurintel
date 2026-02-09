import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { DM_Sans, IBM_Plex_Mono, Playfair_Display } from "next/font/google";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { SiteHeader } from "@/components/layout/site-header";
import { Footer } from "@/components/layout/footer";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const CommandSearch = dynamic(
  () => import("@/components/layout/command-search").then((m) => m.CommandSearch)
);

const dmSans = DM_Sans({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-geist-mono",
  weight: ["400", "600", "700"],
  subsets: ["latin"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "InsurIntel - Insurance Company KPI Dashboard",
    template: "%s | InsurIntel",
  },
  description:
    "Track KPIs for 60+ insurance companies across P&C, Life, Health, Reinsurance, and Brokers. Data sourced from SEC EDGAR.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link
          rel="preconnect"
          href={process.env.NEXT_PUBLIC_SUPABASE_URL}
        />
      </head>
      <body
        className={`${dmSans.variable} ${ibmPlexMono.variable} ${playfairDisplay.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            <div className="relative flex min-h-screen flex-col">
              <SiteHeader />
              <CommandSearch />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
