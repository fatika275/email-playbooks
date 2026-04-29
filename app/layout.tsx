import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "@fontsource/cormorant-garamond/400.css";
import "@fontsource/cormorant-garamond/600.css";
import "@fontsource/cormorant-garamond/700.css";
import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import SiteHeader from "@/components/site-header";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "Thalovo",
  description:
    "Thalovo helps agencies and founders turn cold leads into replies with structured outreach systems.",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="siteShell">
          <SiteHeader />
          {children}
        </div>
        <Analytics />
      </body>
    </html>
  );
}
