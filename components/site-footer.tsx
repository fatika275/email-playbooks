import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="siteFooter">
      <div className="container footerInner">
        <div className="footerBrandBlock">
          <Link href="/" className="brand">
            <span className="brandText">Thalovo</span>
          </Link>
          <p className="muted footerCopy">
            Built for small agencies turning outreach into booked clients.
          </p>
        </div>

        <div className="footerLinks">
          <div className="footerColumn">
            <div className="footerHeading">Product</div>
            <Link href="/prospects" className="footerLink">
              Pipeline
            </Link>
            <Link href="/sequence-builder" className="footerLink">
              Follow-ups
            </Link>
            <Link href="/pricing" className="footerLink">
              Pricing
            </Link>
          </div>

          <div className="footerColumn footerColumnTight">
            <div className="footerHeading">Workspace</div>
            <Link href="/library" className="footerLink">
              Templates
            </Link>
            <Link href="/workspace" className="footerLink">
              Saved
            </Link>
          </div>

          <div className="footerColumn">
            <div className="footerHeading">Legal</div>
            <Link href="/terms" className="footerLink">
              Terms
            </Link>
            <Link href="/privacy" className="footerLink">
              Privacy
            </Link>
            <Link href="/refunds" className="footerLink">
              Refunds
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
