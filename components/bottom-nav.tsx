"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "@/lib/screens";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string, id: string) {
  if (id === "calendar") {
    return pathname === "/" || pathname.startsWith("/calendar");
  }

  if (id === "add") {
    return pathname.includes("/create") || pathname.includes("/manual") || pathname.includes("/ideas");
  }

  return pathname.startsWith(href);
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-10 border-t border-border bg-surface/96 px-3 py-2 backdrop-blur">
      <div className="grid grid-cols-3 gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href, item.id);

          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "flex h-14 flex-col items-center justify-center gap-1 rounded-[12px] text-[11px] font-semibold text-ink/58 transition",
                active && "bg-primary text-white shadow-card"
              )}
            >
              <Icon aria-hidden="true" size={19} strokeWidth={2.2} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
