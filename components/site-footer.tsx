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
            Structured outbound systems for agencies, founders, and service
            businesses.
          </p>
          <p className="small footerMeta">
            Built for practical outreach, saved workflows, and reusable email
            systems.
          </p>
        </div>

        <div className="footerLinks">
          <div className="footerColumn">
            <div className="footerHeading">Product</div>
            <Link href="/pricing" className="footerLink">
              Pricing
            </Link>
            <Link href="/founder" className="footerLink">
              Founder Pro
            </Link>
            <Link href="/workspace" className="footerLink">
              Workspace
            </Link>
            <Link href="/account" className="footerLink">
              Account
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
