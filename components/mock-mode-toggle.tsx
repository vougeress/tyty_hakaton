"use client";

import { FlaskConical } from "lucide-react";
import { useEffect, useState } from "react";

export function MockModeToggle() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const stored = window.localStorage.getItem("tutu-okno:mock-mode");
    setEnabled(stored === null ? true : stored === "true");
  }, []);

  function toggle() {
    setEnabled((current) => {
      const next = !current;
      window.localStorage.setItem("tutu-okno:mock-mode", String(next));
      return next;
    });
  }

  return (
    <button
      type="button"
      aria-pressed={enabled}
      title="Mock-режим"
      onClick={toggle}
      className="inline-flex h-9 items-center gap-2 rounded-full border border-border bg-surface px-3 text-xs font-semibold text-ink shadow-sm"
    >
      <FlaskConical aria-hidden="true" size={15} />
      {enabled ? "Mock" : "Live"}
    </button>
  );
}
