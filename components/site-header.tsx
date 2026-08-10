"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount } from "@/components/account-provider";

const navItems = [
  { href: "/prospects", label: "Pipeline" },
  { href: "/library", label: "Outreach" },
  { href: "/reply-helper", label: "Objections" },
  { href: "/sequence-builder", label: "Follow-ups" },
  { href: "/team", label: "Team" },
];

function isActive(pathname: string, href: string) {
  if (href === "/prospects") {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  if (href === "/library") {
    return ["/library", "/playbook", "/editor"].some(
      (path) => pathname === path || pathname.startsWith(`${path}/`)
    );
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function SiteHeader() {
  const pathname = usePathname();
  const { user, isAdmin, isConfigured, isSyncing } = useAccount();

  return (
    <header className="topbar">
      <div className="container topbarInner">
        <Link href="/" className="brand">
          <span className="brandText">Thalovo</span>
        </Link>

        <nav className="nav" aria-label="Main navigation">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`navLink ${active ? "navLinkActive" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <nav className="nav navActions" aria-label="Account navigation">
          <Link
            href="/pricing"
            className={`navLink ${pathname === "/pricing" ? "navLinkActive" : ""}`}
            aria-current={pathname === "/pricing" ? "page" : undefined}
          >
            Pricing
          </Link>

          <Link
            href="/account"
            className={`navLink ${pathname === "/account" ? "navLinkActive" : ""}`}
            aria-current={pathname === "/account" ? "page" : undefined}
          >
            {user
              ? isSyncing
                ? "Syncing"
                : "Account"
              : isConfigured
                ? "Sign In"
                : "Local Mode"}
          </Link>

          {isAdmin ? (
            <Link
              href="/admin"
              className={`navLink ${pathname === "/admin" ? "navLinkActive" : ""}`}
              aria-current={pathname === "/admin" ? "page" : undefined}
            >
              Admin
            </Link>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
