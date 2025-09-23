// components/ui/step/StepForm.tsx
"use client";

import React from "react";
import "./StepContent.css";

interface StepFormProps {
  currentStep: number; // 1 = สร้างทริป, 2 = รอ member join, 3 = Ready for the journey
}

export default function StepForm({ currentStep }: StepFormProps) {
  return (
    <div className="step-circles-fixed">
      {[1, 2, 3].map((step) => (
        <div
          key={step}
          className={`step-circle ${
            currentStep > step ? "completed" : ""
          } ${currentStep === step ? "active" : ""}`}
        >
          {step}
        </div>
      ))}
    </div>
  );
}
