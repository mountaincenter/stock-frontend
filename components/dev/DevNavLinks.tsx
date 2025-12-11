"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft } from "lucide-react";

interface NavLinkConfig {
  href: string;
  label: string;
}

const NAV_LINKS: Record<string, NavLinkConfig> = {
  dashboard: {
    href: "/dev",
    label: "Dashboard",
  },
  recommendations: {
    href: "/dev/recommendations",
    label: "Recommendations",
  },
  "stock-results": {
    href: "/dev/stock-results",
    label: "Stock Results",
  },
  // v3: {
  //   href: "/dev/v3",
  //   label: "v3 Analysis",
  // },
  // ifo: {
  //   href: "/dev/ifo",
  //   label: "IFO",
  // },
};

interface DevNavLinksProps {
  links?: (keyof typeof NAV_LINKS)[];
  className?: string;
}

export function DevNavLinks({ links, className = "" }: DevNavLinksProps) {
  const pathname = usePathname();

  // If no links provided, show all except current
  const linksToShow = links || (Object.keys(NAV_LINKS) as (keyof typeof NAV_LINKS)[]);

  return (
    <nav className={`flex items-center gap-1 ${className}`}>
      {/* Back to dashboard if not on dashboard */}
      {pathname !== "/dev" && (
        <Link
          href="/dev"
          className="flex items-center gap-1 px-2 py-1 text-muted-foreground hover:text-foreground transition-colors text-xs"
        >
          <ChevronLeft className="w-3 h-3" />
          Back
        </Link>
      )}

      {/* Separator */}
      {pathname !== "/dev" && (
        <span className="text-border mx-1">|</span>
      )}

      {/* Nav links */}
      {linksToShow.map((key) => {
        const link = NAV_LINKS[key];
        if (!link) return null;

        const isActive = pathname === link.href;
        if (isActive) return null; // Don't show current page

        return (
          <Link
            key={key}
            href={link.href}
            className="px-2 py-1 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default DevNavLinks;
