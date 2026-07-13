"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { OnboardingProgressDots } from "./OnboardingProgressDots";
import {
  OnboardingStepWelcome,
  type ReferralSource,
} from "./OnboardingStepWelcome";
import { OnboardingStepMusic } from "./OnboardingStepMusic";
import { OnboardingStepHymns } from "./OnboardingStepHymns";
import { OnboardingStepUpgrade } from "./OnboardingStepUpgrade";
import { OnboardingStepShare } from "./OnboardingStepShare";
import { OnboardingStepNewsletter } from "./OnboardingStepNewsletter";

export interface OnboardingPayload {
  referralSource: ReferralSource | null;
  referralDetail: string;
  favoriteMusic: string;
  favoriteHymns: string;
  newsletterOptIn: boolean;
}

interface OnboardingWizardProps {
  isOpen: boolean;
  tier: "free" | "paid";
  // Whether to include the newsletter opt-in step (hidden if already subscribed).
  showNewsletter: boolean;
  onSkip: () => void;
  onComplete: (payload: OnboardingPayload) => void;
}

type StepKey = "welcome" | "music" | "hymns" | "newsletter" | "closer";

export function OnboardingWizard({
  isOpen,
  tier,
  showNewsletter,
  onSkip,
  onComplete,
}: OnboardingWizardProps) {
  const stepKeys: StepKey[] = [
    "welcome",
    "music",
    "hymns",
    ...(showNewsletter ? (["newsletter"] as StepKey[]) : []),
    "closer",
  ];
  const totalSteps = stepKeys.length;
  const [step, setStep] = useState(1);
  const currentKey = stepKeys[step - 1];
  const [direction, setDirection] = useState<1 | -1>(1);
  const [referralSource, setReferralSource] = useState<ReferralSource | null>(
    null
  );
  const [referralDetail, setReferralDetail] = useState("");
  const [favoriteMusic, setFavoriteMusic] = useState("");
  const [favoriteHymns, setFavoriteHymns] = useState("");
  const [newsletterOptIn, setNewsletterOptIn] = useState(true);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Body scroll lock + Escape handler + focus management
  useEffect(() => {
    if (!isOpen) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onSkip();
    };
    document.addEventListener("keydown", onKey);

    // Move focus into the panel
    panelRef.current?.focus();

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
      previouslyFocused.current?.focus?.();
    };
  }, [isOpen, onSkip]);

  // Every step is optional now — users can advance without answering so they
  // always reach the newsletter + upgrade asks.
  const canAdvance = useCallback(() => true, []);

  const handleNext = () => {
    if (step < totalSteps) {
      setDirection(1);
      setStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setDirection(-1);
      setStep((s) => s - 1);
    }
  };

  const handleFinish = () => {
    onComplete({
      referralSource,
      referralDetail: referralDetail.trim(),
      favoriteMusic: favoriteMusic.trim(),
      favoriteHymns: favoriteHymns.trim(),
      newsletterOptIn: showNewsletter ? newsletterOptIn : false,
    });
  };

  const stepVariants = {
    enter: (dir: 1 | -1) => ({ opacity: 0, x: dir * 24 }),
    center: { opacity: 1, x: 0 },
    exit: (dir: 1 | -1) => ({ opacity: 0, x: dir * -24 }),
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="onboarding-step-title"
        >
          {/* Backdrop — click dismisses with skip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={onSkip}
          />

          {/* Panel */}
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn(
              "relative w-full max-w-lg max-h-[90vh] flex flex-col",
              "rounded-3xl shadow-2xl overflow-hidden",
              "glass-heavy"
            )}
          >
            {/* Header: progress + close */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3">
              <div className="flex-1" />
              <OnboardingProgressDots total={totalSteps} current={step} />
              <div className="flex-1 flex justify-end">
                <button
                  type="button"
                  onClick={onSkip}
                  aria-label="Close onboarding"
                  className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/10 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Body — animated step */}
            <div className="flex-1 overflow-y-auto px-6 pt-2 pb-4">
              <AnimatePresence mode="wait" custom={direction} initial={false}>
                <motion.div
                  key={step}
                  custom={direction}
                  variants={stepVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                >
                  {currentKey === "welcome" && (
                    <OnboardingStepWelcome
                      selectedSource={referralSource}
                      onSourceChange={setReferralSource}
                      detail={referralDetail}
                      onDetailChange={setReferralDetail}
                    />
                  )}
                  {currentKey === "music" && (
                    <OnboardingStepMusic
                      value={favoriteMusic}
                      onChange={setFavoriteMusic}
                    />
                  )}
                  {currentKey === "hymns" && (
                    <OnboardingStepHymns
                      value={favoriteHymns}
                      onChange={setFavoriteHymns}
                    />
                  )}
                  {currentKey === "newsletter" && (
                    <OnboardingStepNewsletter
                      optedIn={newsletterOptIn}
                      onChange={setNewsletterOptIn}
                    />
                  )}
                  {currentKey === "closer" && tier === "free" && (
                    <OnboardingStepUpgrade />
                  )}
                  {currentKey === "closer" && tier === "paid" && (
                    <OnboardingStepShare />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer: back / next / finish */}
            <div className="px-6 pt-2 pb-5 border-t border-white/10 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={step === 1}
                  className={cn(
                    "inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm transition-colors",
                    step === 1
                      ? "text-text-dim cursor-not-allowed"
                      : "text-text-secondary hover:text-text-primary hover:bg-white/5"
                  )}
                >
                  <ChevronLeft size={16} />
                  Back
                </button>

                {step < totalSteps ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={!canAdvance()}
                    className={cn(
                      "inline-flex items-center gap-1 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all",
                      canAdvance()
                        ? "bg-accent-50 hover:bg-accent/60 text-white glow-accent"
                        : "bg-white/5 text-text-dim cursor-not-allowed"
                    )}
                  >
                    Next
                    <ChevronRight size={16} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleFinish}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-accent-50 hover:bg-accent/60 text-white glow-accent transition-colors"
                  >
                    Finish
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={onSkip}
                className="self-center text-xs text-text-secondary/70 hover:text-text-secondary underline-offset-4 hover:underline transition-colors"
              >
                Skip for now
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
