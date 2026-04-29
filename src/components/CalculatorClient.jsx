"use client";

import Calculator from "@/components/calculator/CalculatorPage";

export default function CalculatorClient({ demoMode = false }) {
  return <Calculator demoMode={demoMode} />;
}
