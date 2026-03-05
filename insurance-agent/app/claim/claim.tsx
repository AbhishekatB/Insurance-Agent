"use client";

import { useEffect, useRef, useState } from "react";
import { ClaimFormData, ClaimSchema } from "./schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

type ClaimStatusResponse = {
  claim: {
    id: number;
    status: string;
    image_url: string;
    damage_assessment:
      | string
      | {
          summary?: string;
          agent?: string;
          tier?: string;
        }
      | null;
    fraud_score: number | null;
  };
};

const STATUS_LABELS: Record<string, string> = {
  queued: "Queued for agent processing",
  fetch_policy: "Agent 1/3: validating policy context",
  analyzing_image: "Agent 2/3: analyzing uploaded image",
  auditing_claim: "Agent 3/3: auditing and deciding",
  approved: "Claim approved",
  escalated: "Claim escalated for manual review",
  rejected: "Claim rejected",
  failed: "Agent workflow failed",
};

const TERMINAL_STATUSES = new Set(["approved", "escalated", "rejected", "failed"]);

function formatDamageAssessment(
  assessment: ClaimStatusResponse["claim"]["damage_assessment"]
): string | null {
  if (!assessment) {
    return null;
  }

  if (typeof assessment === "string") {
    return assessment;
  }

  if (typeof assessment.summary === "string" && assessment.summary.trim()) {
    return assessment.summary;
  }

  return JSON.stringify(assessment);
}

export default function Claim() {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [claimId, setClaimId] = useState<number | null>(null);
  const [liveStatus, setLiveStatus] = useState<string | null>(null);
  const [damageAssessment, setDamageAssessment] = useState<string | null>(null);
  const [fraudScore, setFraudScore] = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { register, handleSubmit, formState: {errors}} = useForm<ClaimFormData>({
        resolver: zodResolver(ClaimSchema),
    });

  useEffect(() => {
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, []);

  const pollClaimStatus = (id: number) => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
    }

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/claims/${id}`, { cache: "no-store" });
        if (!res.ok) {
          return;
        }

        const data = (await res.json()) as ClaimStatusResponse;
        const status = data.claim.status;

        setLiveStatus(status);
        setDamageAssessment(formatDamageAssessment(data.claim.damage_assessment));
        setFraudScore(data.claim.fraud_score);

        if (TERMINAL_STATUSES.has(status)) {
          clearInterval(pollRef.current!);
          pollRef.current = null;
        }
      } catch {
        // Keep polling. Temporary network errors should not stop status updates.
      }
    }, 2500);
  };

  const onSubmit = async (data: ClaimFormData) =>{
        setIsSubmitting(true);
        setSubmitError(null);
        setSubmitMessage(null);
        setLiveStatus(null);
        setClaimId(null);
        setDamageAssessment(null);
        setFraudScore(null);

        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }

        const formData = new FormData();
        formData.append("policyNumber", data.policyNumber);
        formData.append("claimDescription", data.claimDescription);
        formData.append("claimFile", data.claimFile[0]);
        try {
          const res = await fetch("/api/claims", {
            method: "POST",
            body: formData,
          });

          const result = await res.json();
          if (!res.ok) {
            setSubmitError(result.error ?? "Unable to submit claim");
            return;
          }

          setClaimId(result.claim_id);
          setLiveStatus(result.status ?? "queued");
          setSubmitMessage(result.message ?? "Claim submitted successfully");
          pollClaimStatus(result.claim_id);
        } catch {
          setSubmitError("Network error while submitting claim");
        } finally {
          setIsSubmitting(false);
        }

    };


  

  return (
    <div className="flex items-center justify-center bg-zinc-50 font-sans dark:bg-black">   
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col items-center justify-center bg-white dark:bg-black p-8 rounded-lg shadow-md" >   
        <input {...register("policyNumber")} type="text" placeholder="Policy Number" className="mb-4 p-2 border border-gray-300 rounded w-full" />
        {errors.policyNumber && (
          <p className="text-red-500 text-sm">
            {errors.policyNumber.message}
          </p>
        )}
        <input {...register("claimDescription")} type="text" placeholder="Claim Description" className="mb-4 p-2 border border-gray-300 rounded w-full"/>
           {errors.claimDescription && (
          <p className="text-red-500 text-sm">
            {errors.claimDescription.message}
          </p>
        )}
        <input {...register("claimFile")} type="file" className="mb-4 p-2 border border-gray-300 rounded w-full"/>
        {errors.claimFile && (
          <p className="text-red-500 text-sm">
            {errors.claimFile.message}
          </p>
        )}
        <button disabled={isSubmitting} type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-blue-300">
          {isSubmitting ? "Submitting..." : "Submit Claim"}
        </button>

        {submitError && <p className="mt-3 text-sm text-red-600">{submitError}</p>}
        {submitMessage && <p className="mt-3 text-sm text-emerald-700">{submitMessage}</p>}
        {claimId && <p className="mt-2 text-xs text-gray-600">Claim ID: {claimId}</p>}

        {liveStatus && (
          <div className="mt-4 w-full rounded border border-gray-200 p-3 text-sm">
            <p className="font-medium">Current Stage</p>
            <p className="mt-1">{STATUS_LABELS[liveStatus] ?? liveStatus}</p>
            {damageAssessment && <p className="mt-2 text-xs">Assessment: {damageAssessment}</p>}
            {fraudScore !== null && <p className="mt-1 text-xs">Fraud Score: {fraudScore}</p>}
          </div>
        )}
    </form>

    </div>
    );

}

