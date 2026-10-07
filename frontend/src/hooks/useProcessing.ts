"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export interface StartProcessingOptions {
  title: string;
  steps: string[];
  stepIntervalMs?: number;
  allowCancel?: boolean;
  onRetry?: () => void;
}

export function useProcessing() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [title, setTitle] = useState("");
  const [steps, setSteps] = useState<string[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const [allowCancel, setAllowCancel] = useState(false);
  const [isTimedOut, setIsTimedOut] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const stepTimerRef = useRef<NodeJS.Timeout | null>(null);
  const onRetryRef = useRef<(() => void) | undefined>(undefined);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (stepTimerRef.current) {
      clearInterval(stepTimerRef.current);
      stepTimerRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    cleanup();
    setIsProcessing(false);
    setUploadPercent(null);
    setIsTimedOut(false);
    setSuccessMessage(null);
  }, [cleanup]);

  const stopProcessing = useCallback(() => {
    cleanup();
    abortControllerRef.current = null;
    setIsProcessing(false);
    setUploadPercent(null);
    setIsTimedOut(false);
    setSuccessMessage(null);
  }, [cleanup]);

  const showSuccess = useCallback((message: string, durationMs = 600): Promise<void> => {
    cleanup();
    setSuccessMessage(message);
    return new Promise((resolve) => {
      setTimeout(() => {
        setIsProcessing(false);
        setSuccessMessage(null);
        resolve();
      }, durationMs);
    });
  }, [cleanup]);

  const startProcessing = useCallback(
    ({
      title: initialTitle,
      steps: initialSteps,
      stepIntervalMs = 2400,
      allowCancel: canCancel = false,
      onRetry,
    }: StartProcessingOptions): AbortSignal => {
      cleanup();

      const controller = new AbortController();
      abortControllerRef.current = controller;
      onRetryRef.current = onRetry;

      setTitle(initialTitle);
      setSteps(initialSteps);
      setCurrentStepIndex(0);
      setElapsedSeconds(0);
      setUploadPercent(null);
      setAllowCancel(canCancel);
      setIsTimedOut(false);
      setSuccessMessage(null);
      setIsProcessing(true);

      // 1-second elapsed timer
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => {
          const next = prev + 1;
          if (next >= 45) {
            // Trigger 45s timeout
            if (abortControllerRef.current) {
              abortControllerRef.current.abort();
            }
            cleanup();
            setIsTimedOut(true);
          }
          return next;
        });
      }, 1000);

      // Step cycling timer
      if (initialSteps.length > 1) {
        stepTimerRef.current = setInterval(() => {
          setCurrentStepIndex((prev) => {
            if (prev < initialSteps.length - 1) {
              return prev + 1;
            }
            return prev;
          });
        }, stepIntervalMs);
      }

      return controller.signal;
    },
    [cleanup]
  );

  const retry = useCallback(() => {
    setIsTimedOut(false);
    if (onRetryRef.current) {
      onRetryRef.current();
    } else {
      stopProcessing();
    }
  }, [stopProcessing]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // Compute active sub-message
  let subMessage = steps[currentStepIndex] || "";
  if (uploadPercent !== null && uploadPercent < 100) {
    subMessage = `Uploading ${uploadPercent}%…`;
  }

  return {
    isProcessing,
    title,
    subMessage,
    elapsedSeconds,
    uploadPercent,
    allowCancel,
    isTimedOut,
    successMessage,
    startProcessing,
    stopProcessing,
    setUploadPercent,
    showSuccess,
    cancel,
    retry,
  };
}
