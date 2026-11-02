import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { DuckLinkProvider } from "@/components/DuckLink";
import { THEME_SCRIPT } from "@/components/ThemeToggle";
import { MotionProvider } from "@/components/Motion";

const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"], axes: ["opsz", "wdth"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f6f6" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1b1e" },
  ],
};

export const metadata: Metadata = {
  title: "Quack Overflow — the rubber duck that won't give you the answer",
  description:
    "An AI rubber duck that only asks Socratic questions, so you find the bug yourself and actually learn.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${bricolage.variable} ${jetbrains.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
        >
          Skip to content
        </a>
        <MotionProvider>
          <DuckLinkProvider>
            <Nav />
            <main id="main" className="flex flex-1 flex-col">
              {children}
            </main>
          </DuckLinkProvider>
        </MotionProvider>
      </body>
    </html>
  );
}
