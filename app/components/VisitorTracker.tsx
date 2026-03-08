"use client";

import { useEffect } from "react";

export default function VisitorTracker() {
  useEffect(() => {
    // التحقق مما إذا كان الزائر قد تم احتسابه بالفعل في هذه الجلسة (Session)
    // هذا يمنع زيادة العداد عند كل تحديث للصفحة (Refresh)
    const hasVisited = sessionStorage.getItem("visit_recorded");

    if (!hasVisited) {
      fetch("/api/visitors", { method: "POST" })
        .then(() => {
          sessionStorage.setItem("visit_recorded", "true");
        })
        .catch((err) => console.error("Tracking error", err));
    }
  }, []);

  return null; // هذا المكون لا يعرض شيئًا
}