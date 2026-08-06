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
import { AccountProvider } from "@/components/account-provider";
import SiteFooter from "@/components/site-footer";
import SiteHeader from "@/components/site-header";

export const metadata: Metadata = {
  title: "Thalovo",
  description:
    "Built for one job: helping small agencies turn outreach into booked clients with a lightweight workflow for inquiries, scoping calls, proposals, negotiation, and handoff.",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AccountProvider>
          <div className="siteShell">
            <SiteHeader />
            {children}
            <SiteFooter />
          </div>
        </AccountProvider>
      </body>
    </html>
  );
}
