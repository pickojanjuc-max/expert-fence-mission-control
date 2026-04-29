"use client";

import Calculator from "@/components/balustrade/CalculatorPage";

export default function BalustradeClient({ demoMode = false }) {
  return <Calculator demoMode={demoMode} />;
}
