import React from "react";

export default function StepIndicator({ currentStep, onStepChange, steps }) {
  const allSteps = steps || [
    { id: 1, label: "Sides" },
    { id: 2, label: "Configure" },
    { id: 3, label: "Finishing" },
    { id: 4, label: "Materials" },
  ];

  return (
    <nav className="flex items-center">
      {allSteps.map((s, i) => {
        const isActive = currentStep === s.id;
        const isDone = currentStep > s.id;
        return (
          <button
            key={s.id}
            onClick={() => onStepChange(s.id)}
            className="flex flex-col items-center px-6 py-3 text-sm relative group"
          >
            {/* connector line */}
            {i > 0 && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-px h-5 bg-gray-200" />
            )}
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mb-1 transition-colors ${
                isActive
                  ? "bg-cyan-500 text-white"
                  : isDone
                  ? "bg-cyan-100 text-cyan-700"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {s.id}
            </span>
            <span
              className={`text-xs font-medium whitespace-nowrap ${
                isActive ? "text-cyan-600" : isDone ? "text-gray-600" : "text-gray-400"
              }`}
            >
              {s.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
