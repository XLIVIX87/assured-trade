"use client";

import { useState, FormEvent } from "react";

interface RfqForm {
  commodityType: string;
  volume: string;
  unit: string;
  destinationPort: string;
  deliveryDate: string;
  qualityRequirements: string;
  certifications: string[];
  packaging: string;
  incoterms: string;
  paymentTerms: string;
  insuranceRequired: boolean;
  specialInstructions: string;
}

const STEPS = ["General Info", "Specifications", "Terms", "Review"] as const;

const COMMODITIES = [
  "Cocoa Beans",
  "Cashew Nuts",
  "Sesame Seeds",
  "Shea Butter",
  "Hibiscus Flower",
  "Palm Oil",
];

const UNITS = ["MT", "KG", "LBS"];

const CERTIFICATIONS = [
  "ISO 9001",
  "HACCP",
  "Fair Trade",
  "Organic",
  "Rainforest Alliance",
];

const PACKAGING_OPTIONS = [
  "Bulk",
  "25kg Bags",
  "50kg Bags",
  "Container Lined",
];

const INCOTERMS = ["FOB", "CIF", "CFR", "EXW", "DDP"];

const PAYMENT_TERMS = [
  "LC at Sight",
  "LC 30 Days",
  "LC 60 Days",
  "TT Advance",
  "TT Against Docs",
];

const inputClass =
  "w-full rounded-lg border border-outline-variant bg-surface-container px-4 py-3 text-on-surface placeholder:text-outline focus:border-primary-container focus:outline-none focus:ring-1 focus:ring-primary-container";

const labelClass = "block text-sm font-medium text-on-surface-variant mb-2";

export default function NewRfqPage() {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<RfqForm>({
    commodityType: "",
    volume: "",
    unit: "MT",
    destinationPort: "",
    deliveryDate: "",
    qualityRequirements: "",
    certifications: [],
    packaging: "",
    incoterms: "FOB",
    paymentTerms: "",
    insuranceRequired: false,
    specialInstructions: "",
  });

  function updateField<K extends keyof RfqForm>(key: K, value: RfqForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleCertification(cert: string) {
    setForm((prev) => ({
      ...prev,
      certifications: prev.certifications.includes(cert)
        ? prev.certifications.filter((c) => c !== cert)
        : [...prev.certifications, cert],
    }));
  }

  function handleNext() {
    if (step < 4) setStep(step + 1);
  }

  function handleBack() {
    if (step > 1) setStep(step - 1);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/rfqs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        throw new Error("Failed to submit RFQ");
      }
      window.location.href = "/rfqs";
    } catch {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-surface-dim p-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="font-headline text-2xl font-semibold text-on-surface">
          Create New RFQ
        </h1>
        <p className="font-body mt-1 text-on-surface-variant">
          Submit a new request for quotation to matched suppliers
        </p>
      </div>

      {/* Stepper */}
      <div className="mb-10 flex items-center justify-center gap-0">
        {STEPS.map((label, i) => {
          const stepNum = i + 1;
          const isActive = step === stepNum;
          const isCompleted = step > stepNum;

          return (
            <div key={label} className="flex items-center">
              {/* Step circle + label */}
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${
                    isCompleted
                      ? "bg-green-600 text-white"
                      : isActive
                        ? "bg-primary text-white"
                        : "border-2 border-outline-variant text-outline"
                  }`}
                >
                  {isCompleted ? (
                    <span className="material-symbols-outlined text-[18px]">
                      check
                    </span>
                  ) : (
                    stepNum
                  )}
                </div>
                <span
                  className={`mt-2 text-xs font-medium ${
                    isActive
                      ? "text-primary"
                      : isCompleted
                        ? "text-green-400"
                        : "text-outline"
                  }`}
                >
                  {label}
                </span>
              </div>

              {/* Connecting line */}
              {i < STEPS.length - 1 && (
                <div
                  className={`mx-3 h-0 w-16 border-b-2 ${
                    step > stepNum
                      ? "border-primary"
                      : "border-outline-variant"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* 2-Column Layout */}
      <div className="mx-auto grid max-w-7xl grid-cols-12 gap-8">
        {/* Left: Form */}
        <div className="col-span-8">
          <form onSubmit={handleSubmit}>
            <div className="rounded-2xl bg-surface-container-low p-8">
              {/* Step 1: General Info */}
              {step === 1 && (
                <div className="space-y-6">
                  <h2 className="font-headline text-lg font-semibold text-on-surface">
                    General Information
                  </h2>

                  <div>
                    <label className={labelClass}>Commodity Type</label>
                    <select
                      className={inputClass}
                      value={form.commodityType}
                      onChange={(e) =>
                        updateField("commodityType", e.target.value)
                      }
                    >
                      <option value="">Select commodity</option>
                      {COMMODITIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Volume</label>
                      <input
                        type="number"
                        className={inputClass}
                        placeholder="Enter volume"
                        value={form.volume}
                        onChange={(e) => updateField("volume", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Unit</label>
                      <select
                        className={inputClass}
                        value={form.unit}
                        onChange={(e) => updateField("unit", e.target.value)}
                      >
                        {UNITS.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Destination Port</label>
                    <input
                      type="text"
                      className={inputClass}
                      placeholder="e.g. Felixstowe, UK"
                      value={form.destinationPort}
                      onChange={(e) =>
                        updateField("destinationPort", e.target.value)
                      }
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Required Delivery Date</label>
                    <input
                      type="date"
                      className={inputClass}
                      value={form.deliveryDate}
                      onChange={(e) =>
                        updateField("deliveryDate", e.target.value)
                      }
                    />
                  </div>
                </div>
              )}

              {/* Step 2: Specifications */}
              {step === 2 && (
                <div className="space-y-6">
                  <h2 className="font-headline text-lg font-semibold text-on-surface">
                    Specifications
                  </h2>

                  <div>
                    <label className={labelClass}>Quality Requirements</label>
                    <textarea
                      className={inputClass}
                      rows={4}
                      placeholder="Describe quality standards, grade, moisture content, etc."
                      value={form.qualityRequirements}
                      onChange={(e) =>
                        updateField("qualityRequirements", e.target.value)
                      }
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      Certifications Required
                    </label>
                    <div className="mt-1 grid grid-cols-2 gap-3">
                      {CERTIFICATIONS.map((cert) => (
                        <label
                          key={cert}
                          className="flex cursor-pointer items-center gap-3 rounded-lg border border-outline-variant bg-surface-container px-4 py-3 transition-colors hover:bg-surface-container-high"
                        >
                          <input
                            type="checkbox"
                            checked={form.certifications.includes(cert)}
                            onChange={() => toggleCertification(cert)}
                            className="h-4 w-4 rounded border-outline-variant accent-primary"
                          />
                          <span className="font-body text-sm text-on-surface">
                            {cert}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>
                      Packaging Requirements
                    </label>
                    <select
                      className={inputClass}
                      value={form.packaging}
                      onChange={(e) =>
                        updateField("packaging", e.target.value)
                      }
                    >
                      <option value="">Select packaging</option>
                      {PACKAGING_OPTIONS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Step 3: Terms */}
              {step === 3 && (
                <div className="space-y-6">
                  <h2 className="font-headline text-lg font-semibold text-on-surface">
                    Terms
                  </h2>

                  <div>
                    <label className={labelClass}>Incoterms</label>
                    <select
                      className={inputClass}
                      value={form.incoterms}
                      onChange={(e) =>
                        updateField("incoterms", e.target.value)
                      }
                    >
                      {INCOTERMS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>Payment Terms</label>
                    <select
                      className={inputClass}
                      value={form.paymentTerms}
                      onChange={(e) =>
                        updateField("paymentTerms", e.target.value)
                      }
                    >
                      <option value="">Select payment terms</option>
                      {PAYMENT_TERMS.map((pt) => (
                        <option key={pt} value={pt}>
                          {pt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="flex cursor-pointer items-center gap-3">
                      <div
                        role="switch"
                        aria-checked={form.insuranceRequired}
                        tabIndex={0}
                        className={`relative h-7 w-12 rounded-full transition-colors ${
                          form.insuranceRequired
                            ? "bg-primary"
                            : "bg-outline-variant"
                        }`}
                        onClick={() =>
                          updateField(
                            "insuranceRequired",
                            !form.insuranceRequired,
                          )
                        }
                        onKeyDown={(e) => {
                          if (e.key === " " || e.key === "Enter") {
                            e.preventDefault();
                            updateField(
                              "insuranceRequired",
                              !form.insuranceRequired,
                            );
                          }
                        }}
                      >
                        <div
                          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                            form.insuranceRequired
                              ? "translate-x-[22px]"
                              : "translate-x-0.5"
                          }`}
                        />
                      </div>
                      <span className="text-sm font-medium text-on-surface-variant">
                        Insurance Required
                      </span>
                    </label>
                  </div>

                  <div>
                    <label className={labelClass}>Special Instructions</label>
                    <textarea
                      className={inputClass}
                      rows={4}
                      placeholder="Any additional requirements or notes for suppliers"
                      value={form.specialInstructions}
                      onChange={(e) =>
                        updateField("specialInstructions", e.target.value)
                      }
                    />
                  </div>
                </div>
              )}

              {/* Step 4: Review */}
              {step === 4 && (
                <div className="space-y-6">
                  <h2 className="font-headline text-lg font-semibold text-on-surface">
                    Review Your RFQ
                  </h2>

                  {/* General Info Summary */}
                  <div className="rounded-xl bg-surface-container p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="font-headline text-sm font-semibold text-primary">
                        General Information
                      </h3>
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          edit
                        </span>
                        Edit
                      </button>
                    </div>
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                      <div>
                        <dt className="text-on-surface-variant">Commodity</dt>
                        <dd className="font-medium text-on-surface">
                          {form.commodityType || "Not specified"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-on-surface-variant">Volume</dt>
                        <dd className="font-medium text-on-surface">
                          {form.volume
                            ? `${form.volume} ${form.unit}`
                            : "Not specified"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-on-surface-variant">
                          Destination Port
                        </dt>
                        <dd className="font-medium text-on-surface">
                          {form.destinationPort || "Not specified"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-on-surface-variant">
                          Delivery Date
                        </dt>
                        <dd className="font-medium text-on-surface">
                          {form.deliveryDate || "Not specified"}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  {/* Specifications Summary */}
                  <div className="rounded-xl bg-surface-container p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="font-headline text-sm font-semibold text-primary">
                        Specifications
                      </h3>
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          edit
                        </span>
                        Edit
                      </button>
                    </div>
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                      <div className="col-span-2">
                        <dt className="text-on-surface-variant">
                          Quality Requirements
                        </dt>
                        <dd className="mt-1 font-medium text-on-surface">
                          {form.qualityRequirements || "Not specified"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-on-surface-variant">
                          Certifications
                        </dt>
                        <dd className="font-medium text-on-surface">
                          {form.certifications.length > 0
                            ? form.certifications.join(", ")
                            : "None selected"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-on-surface-variant">Packaging</dt>
                        <dd className="font-medium text-on-surface">
                          {form.packaging || "Not specified"}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  {/* Terms Summary */}
                  <div className="rounded-xl bg-surface-container p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="font-headline text-sm font-semibold text-primary">
                        Terms
                      </h3>
                      <button
                        type="button"
                        onClick={() => setStep(3)}
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          edit
                        </span>
                        Edit
                      </button>
                    </div>
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                      <div>
                        <dt className="text-on-surface-variant">Incoterms</dt>
                        <dd className="font-medium text-on-surface">
                          {form.incoterms}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-on-surface-variant">
                          Payment Terms
                        </dt>
                        <dd className="font-medium text-on-surface">
                          {form.paymentTerms || "Not specified"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-on-surface-variant">Insurance</dt>
                        <dd className="font-medium text-on-surface">
                          {form.insuranceRequired ? "Required" : "Not required"}
                        </dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-on-surface-variant">
                          Special Instructions
                        </dt>
                        <dd className="mt-1 font-medium text-on-surface">
                          {form.specialInstructions || "None"}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Navigation */}
            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                className="rounded-lg px-5 py-2.5 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container"
              >
                Save Draft
              </button>

              <div className="flex items-center gap-3">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={handleBack}
                    className="rounded-lg border border-outline-variant px-5 py-2.5 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container"
                  >
                    Back
                  </button>
                )}

                {step < 4 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="rounded-lg bg-gradient-to-r from-primary to-tertiary px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition-opacity hover:opacity-90"
                  >
                    Continue
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary to-tertiary px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {submitting && (
                      <span className="material-symbols-outlined animate-spin text-[18px]">
                        progress_activity
                      </span>
                    )}
                    {submitting ? "Submitting..." : "Submit RFQ"}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* Right: AI Assist Panel */}
        <div className="col-span-4">
          <div className="glass-panel sticky top-8 rounded-xl border border-white/10 p-6">
            <div className="mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">
                auto_awesome
              </span>
              <h3 className="font-headline text-base font-semibold text-on-surface">
                AI Assistant
              </h3>
            </div>

            {/* Streaming indicator */}
            <div className="mb-4 flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-primary/60 [animation-delay:0ms]" />
              <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-primary/60 [animation-delay:150ms]" />
              <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-primary/60 [animation-delay:300ms]" />
            </div>

            <p className="font-body mb-6 text-sm leading-relaxed text-on-surface-variant">
              I can help optimize your RFQ for better supplier matching. Submit
              your details and I&apos;ll provide suggestions.
            </p>

            <div className="group relative">
              <button
                type="button"
                disabled
                className="w-full rounded-lg bg-primary-container px-4 py-2.5 text-sm font-semibold text-primary opacity-50"
              >
                Get AI Suggestions
              </button>
              <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 rounded-md bg-surface-container-high px-3 py-1.5 text-xs text-on-surface-variant opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                AI features coming soon
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
