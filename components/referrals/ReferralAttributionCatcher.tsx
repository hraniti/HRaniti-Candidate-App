"use client";

import { useEffect } from "react";

export default function ReferralAttributionCatcher() {
  useEffect(() => {
    (async () => {
      let pending: { referrerSlug: string; jobSlug: string | null } | null = null;
      try {
        const raw = localStorage.getItem("hraniti_referral");
        if (raw) pending = JSON.parse(raw);
      } catch {}
      if (!pending) return;

      try {
        await fetch("/api/referrals/attribute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ referrerSlug: pending.referrerSlug, jobSlug: pending.jobSlug }),
        });
      } finally {
        localStorage.removeItem("hraniti_referral");
      }
    })();
  }, []);

  return null;
}
