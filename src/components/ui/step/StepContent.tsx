// components/ui/step/StepContent.tsx
"use client";

import React from "react";
import "./StepContent.css";

interface StepFormProps {
  currentStep: number; 
  // ⭐ 1. เพิ่มพร็อพพ์ totalSteps
  totalSteps: number;
}

// ⭐ 2. รับพร็อพพ์ totalSteps เข้ามา
export default function StepForm({ currentStep, totalSteps }: StepFormProps) {
  
  // ⭐ 3. สร้าง Array สำหรับ Step โดยอิงจาก totalSteps
  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1);

  return (
    <div className="step-circles-fixed">
      {/* 4. วนลูปจาก Array ที่สร้างขึ้นใหม่ */}
      {steps.map((step) => (
        <div
          key={step}
          className={`step-circle 
            ${currentStep > step ? "completed" : ""} 
            ${currentStep === step ? "active" : ""}
          `}
        >
          {step}
        </div>
      ))}
    </div>
  );
}