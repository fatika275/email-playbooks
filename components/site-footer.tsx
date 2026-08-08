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
            A focused, agency-native outreach and pipeline tool for small agencies.
          </p>
          <p className="small footerMeta">
            Built for one job: turn outreach into booked clients for service agencies.
          </p>
        </div>

        <div className="footerLinks">
          <div className="footerColumn">
            <div className="footerHeading">Product</div>
            <Link href="/prospects" className="footerLink">
              Pipeline
            </Link>
            <Link href="/library" className="footerLink">
              Templates
            </Link>
            <Link href="/sequence-builder" className="footerLink">
              Follow-ups
            </Link>
            <Link href="/pricing" className="footerLink">
              Pricing
            </Link>
            <Link href="/founder" className="footerLink">
              Founder Pro
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
