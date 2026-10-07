"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogOut, Search, ShieldCheck } from "lucide-react";

type Check = {
  id: string;
  candidate_name: string;
  candidate_email: string | null;
  job_title: string | null;
  status: string;
  joining_date: string | null;
  tat_days: number | null;
  tat_unit: string | null;
  tat_start_basis: string | null;
  tat_start_at: string | null;
  tat_due_at: string | null;
  provider_name: string | null;
  provider_case_id: string | null;
  provider_status: string | null;
  report_url: string | null;
  report_received_at: string | null;
  last_provider_update_at: string | null;
  requested_at: string | null;
  due_at: string | null;
  completed_at: string | null;
  overall_note: string | null;
  consent_status: string;
  consent_at: string | null;
  stop_request_status: string;
  stop_reason: string | null;
  unable_to_proceed_reason: string | null;
};

type ProviderCase = {
  id: string;
  background_check_id: string;
  company_id: string;
  status: string;
  background_checks: Check;
};

type Item = {
  id: string;
  background_check_id: string;
  check_type: string;
  status: string;
  provider: string | null;
  result_summary: string | null;
  reviewer_note: string | null;
  completed_at: string | null;
  unable_to_proceed_reason: string | null;
  unable_to_proceed_reason: string | null;
};

function tone(status: string) {
  if (status === "Clear" || status === "Completed") {
    return "bg-[#E7F3F1] text-[#167D73]";
  }
  if (status === "In progress" || status === "Requested") {
    return "bg-[#EDF5FF] text-[#3D6F9E]";
  }
  if (status === "Needs attention" || status === "Unable to verify") {
    return "bg-[#FFF7E6] text-[#8A641E]";
  }
  return "bg-[#F5F7F7] text-[#71859A]";
}

function tatText(check: Check) {
  if (!check.tat_due_at) return "No TAT set";

  const end = check.completed_at
    ? new Date(check.completed_at)
    : new Date();
  const due = new Date(check.tat_due_at);
  const days = Math.ceil(
    (due.getTime() - end.getTime()) / 86400000
  );

  if (check.completed_at) {
    return days >= 0
      ? `Completed ${days}d early`
      : `Completed ${Math.abs(days)}d late`;
  }

  return days >= 0
    ? `Due in ${days}d`
    : `Overdue by ${Math.abs(days)}d`;
}

function formatDate(value: string | null) {
  return value
    ? new Date(value).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";
}

export default function ProviderBGV() {
  const supabase = createClient();
  const router = useRouter();

  const [member, setMember] = useState<any>(null);
  const [cases, setCases] = useState<ProviderCase[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState<Check | null>(null);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [newCheckType, setNewCheckType] = useState("");

  async function load() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/provider/login");
      return;
    }

    const response = await fetch("/api/bgv/provider/cases");
    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMessage(body.error || "Provider access is unavailable.");
      return;
    }

    setMember(body.member);
    setCases(body.cases || []);
    setItems(body.items || []);
  }

  useEffect(() => {
    void load();
  }, []);

  const rows = useMemo(() => {
    const query = search.toLowerCase();

    return cases.filter((providerCase) => {
      const check = providerCase.background_checks;
      const searchable = [
        check.candidate_name,
        check.candidate_email,
        check.job_title,
        check.provider_case_id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return !query || searchable.includes(query);
    });
  }, [cases, search]);

  const selectedItems = selected
    ? items.filter((item) => item.background_check_id === selected.id)
    : [];

  function patchItem(id: string, key: string, value: string) {
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, [key]: value } : item
      )
    );
  }

  async function save() {
    if (!selected) return;

    setBusy(true);
    setMessage("");

    const payload = {
      providerStatus: selected.provider_status,
      status: selected.status,
      reportUrl: selected.report_url,
      reportReceivedAt: selected.report_received_at,
      completedAt: selected.completed_at,
      overallNote: selected.overall_note,
      consentStatus: selected.consent_status,
      consentAt: selected.consent_at,
      unableToProceedReason: selected.unable_to_proceed_reason,
      stopRequestStatus:
        selected.stop_request_status === "Requested"
          ? "Acknowledged"
          : undefined,
      newItems: newCheckType.trim()
        ? [{ checkType: newCheckType.trim(), status: "Pending" }]
        : [],
      items: selectedItems.map((item) => ({
        id: item.id,
        status: item.status,
        resultSummary: item.result_summary,
        reviewerNote: item.reviewer_note,
        completedAt: item.completed_at,
        unableToProceedReason: item.unable_to_proceed_reason,
        unableToProceedReason: item.unable_to_proceed_reason,
      })),
    };

    const providerCase = cases.find(
      (item) => item.background_check_id === selected.id
    );

    if (!providerCase) {
      setMessage("Provider case could not be found.");
      setBusy(false);
      return;
    }

    const response = await fetch(
      "/api/bgv/provider/cases/" + providerCase.id,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMessage(body.error || "Could not save.");
    } else {
      setMessage("Case updated.");
      setNewCheckType("");
      await load();
    }

    setBusy(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/provider/login");
  }

  return (
    <main className="min-h-screen bg-[#FCFCFA]">
      <header className="border-b border-[#DDE5EA] bg-white">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#167D73]">
              BGV PROVIDER PORTAL
            </p>
            <p className="mt-1 text-sm font-semibold text-[#173454]">
              {member?.provider_org_id ? "Assigned cases" : "Provider access"}
            </p>
          </div>

          <button
            onClick={logout}
            className="inline-flex items-center gap-2 rounded-lg border border-[#DDE5EA] px-3 py-2 text-xs text-[#526A7D]"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-[1180px] px-5 py-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#173454]">
              Background verification cases
            </h1>
            <p className="mt-1 text-sm text-[#71859A]">
              Only cases assigned to your provider organization are visible.
            </p>
          </div>

          <div className="flex h-10 items-center gap-2 rounded-xl border border-[#DDE5EA] bg-white px-3">
            <Search size={14} className="text-[#9AA8B3]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-64 bg-transparent text-xs outline-none"
              placeholder="Search cases…"
            />
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {rows.map((providerCase) => {
            const check = providerCase.background_checks;
            const status = check.provider_status || check.status;

            return (
              <button
                key={providerCase.id}
                onClick={() => {
                  setSelected(check);
                  setMessage("");
                }}
                className="rounded-2xl border border-[#DDE5EA] bg-white p-5 text-left hover:bg-[#FCFDFD]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#173454]">
                      {check.candidate_name}
                    </p>
                    <p className="mt-1 text-[11px] text-[#71859A]">
                      {check.job_title || "Role"}
                    </p>
                  </div>

                  <span
                    className={
                      "rounded-full px-2 py-1 text-[10px] font-medium " +
                      tone(status)
                    }
                  >
                    {status}
                  </span>
                </div>

                <p className="mt-5 text-[11px] text-[#71859A]">
                  Case {check.provider_case_id || "—"} · TAT{" "}
                  {tatText(check)} · Due{" "}
                  {formatDate(check.tat_due_at || check.due_at)}
                </p>
              </button>
            );
          })}
        </div>

        {rows.length === 0 && (
          <div className="mt-6 rounded-2xl border border-[#DDE5EA] bg-white p-12 text-center text-sm text-[#71859A]">
            <ShieldCheck className="mx-auto" size={25} />
            <p className="mt-3">No assigned BGV cases.</p>
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#173454]/20 p-4 sm:p-7">
          <div className="mx-auto max-w-4xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E6ECEF] px-6 py-5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#167D73]">
                  CASE {selected.provider_case_id || "—"}
                </p>
                <h2 className="mt-1 text-lg font-semibold text-[#173454]">
                  {selected.candidate_name}
                </h2>
                <p className="text-xs text-[#71859A]">
                  {selected.candidate_email || ""} ·{" "}
                  {selected.job_title || "Role"}
                </p>
              </div>

              <button
                onClick={() => setSelected(null)}
                className="text-[#71859A]"
              >
                Close
              </button>
            </div>

            <div className="grid gap-6 p-6 lg:grid-cols-[1fr_300px]">
              <section>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-medium text-[#526A7D]">
                    Provider status
                    <input
                      className="input mt-1.5"
                      value={selected.provider_status || ""}
                      onChange={(event) =>
                        setSelected({
                          ...selected,
                          provider_status: event.target.value,
                        })
                      }
                      placeholder="In progress"
                    />
                  </label>

                  <label className="text-xs font-medium text-[#526A7D]">
                    Overall status
                    <select
                      className="input mt-1.5"
                      value={selected.status}
                      onChange={(event) =>
                        setSelected({
                          ...selected,
                          status: event.target.value,
                        })
                      }
                    >
                      <option>In progress</option>
                      <option>Needs attention</option>
                      <option>Unable to proceed</option>
                      <option>Clear</option>
                      <option>Completed</option>
                      <option>Cancelled</option>
                    </select>
                  </label>
                </div>

                <div className="mt-4 rounded-xl border border-[#DDE5EA] bg-[#F7F9F9] p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-xs font-medium text-[#526A7D]">
                      Candidate consent
                      <select
                        className="input mt-1.5"
                        value={selected.consent_status || "Not requested"}
                        onChange={(event) =>
                          setSelected({
                            ...selected,
                            consent_status: event.target.value,
                            consent_at:
                              event.target.value === "Granted"
                                ? new Date().toISOString()
                                : null,
                          })
                        }
                      >
                        <option>Not requested</option>
                        <option>Requested</option>
                        <option>Granted</option>
                        <option>Declined</option>
                        <option>Expired</option>
                      </select>
                    </label>

                    <div className="self-end text-[10px] leading-4 text-[#71859A]">
                      Consent is handled by the provider. HRANITI only
                      displays the provider-reported state.
                    </div>
                  </div>
                </div>

                {selected.status === "Unable to proceed" && (
                  <label className="mt-4 block text-xs font-medium text-[#526A7D]">
                    Reason verification cannot proceed
                    <textarea
                      className="mt-1.5 w-full rounded-xl border border-[#DDE5EA] p-3 text-xs"
                      rows={3}
                      value={selected.unable_to_proceed_reason || ""}
                      onChange={(event) =>
                        setSelected({
                          ...selected,
                          unable_to_proceed_reason: event.target.value,
                        })
                      }
                      placeholder="Enter the reason…"
                    />
                  </label>
                )}

                {selected.stop_request_status === "Requested" && (
                  <div className="mt-4 rounded-xl border border-[#E9D9B5] bg-[#FFF9ED] p-4">
                    <p className="text-xs font-semibold text-[#7A5B1A]">
                      Employer requested that this verification stop
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-[#7A5B1A]">
                      {selected.stop_reason || "No reason provided."}
                    </p>
                    <p className="mt-2 text-[10px] text-[#8A99A5]">
                      Saving this case will acknowledge the stop request and
                      mark the verification Cancelled.
                    </p>
                  </div>
                )}

                <div className="mt-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold text-[#173454]">
                      Checks
                    </p>

                    <div className="flex gap-2">
                      <input
                        value={newCheckType}
                        onChange={(event) =>
                          setNewCheckType(event.target.value)
                        }
                        className="h-8 rounded-lg border border-[#DDE5EA] px-2 text-[10px]"
                        placeholder="Add check"
                      />
                      <span className="self-center text-[9px] text-[#9AA8B3]">
                        added on save
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    {selectedItems.length === 0 ? (
                      <p className="rounded-xl bg-[#F7F9F9] p-4 text-xs text-[#71859A]">
                        No individual checks have been added.
                      </p>
                    ) : (
                      selectedItems.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-xl border border-[#DDE5EA] p-4"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-semibold text-[#173454]">
                              {item.check_type}
                            </p>

                            <select
                              className={
                                "rounded-lg border border-[#DDE5EA] px-2 py-1 text-[10px] " +
                                tone(item.status)
                              }
                              value={item.status}
                              onChange={(event) =>
                                patchItem(
                                  item.id,
                                  "status",
                                  event.target.value
                                )
                              }
                            >
                              <option>Pending</option>
                              <option>Requested</option>
                              <option>In progress</option>
                              <option>Clear</option>
                              <option>Needs review</option>
                              <option>Unable to verify</option>
                              <option>Not applicable</option>
                            </select>
                          </div>

                          <textarea
                            className="mt-3 w-full rounded-lg border border-[#EEF2F4] p-2.5 text-[11px]"
                            value={item.result_summary || ""}
                            onChange={(event) =>
                              patchItem(
                                item.id,
                                "result_summary",
                                event.target.value
                              )
                            }
                            placeholder="Provider result summary"
                          />

                          <textarea
                            className="mt-2 w-full rounded-lg border border-[#EEF2F4] p-2.5 text-[11px]"
                            value={item.reviewer_note || ""}
                            onChange={(event) =>
                              patchItem(
                                item.id,
                                "reviewer_note",
                                event.target.value
                              )
                            }
                            placeholder="Provider note (optional)"
                          />
                          {item.status === "Unable to verify" && (
                            <textarea
                              className="mt-2 w-full rounded-lg border border-[#E9D9B5] bg-[#FFF9ED] p-2.5 text-[11px]"
                              value={item.unable_to_proceed_reason || ""}
                              onChange={(event) =>
                                patchItem(
                                  item.id,
                                  "unable_to_proceed_reason",
                                  event.target.value
                                )
                              }
                              placeholder="Why this check cannot be verified…"
                            />
                          )}
                          {item.status === "Unable to verify" && (
                            <textarea
                              className="mt-2 w-full rounded-lg border border-[#E9D9B5] bg-[#FFF9ED] p-2.5 text-[11px]"
                              value={item.unable_to_proceed_reason || ""}
                              onChange={(event) =>
                                patchItem(
                                  item.id,
                                  "unable_to_proceed_reason",
                                  event.target.value
                                )
                              }
                              placeholder="Why this check cannot be verified…"
                            />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </section>

              <aside>
                <label className="block text-xs font-medium text-[#526A7D]">
                  Report URL
                  <input
                    className="input mt-1.5"
                    value={selected.report_url || ""}
                    onChange={(event) =>
                      setSelected({
                        ...selected,
                        report_url: event.target.value,
                      })
                    }
                    placeholder="https://provider.example/report/…"
                  />
                </label>

                <label className="mt-4 block text-xs font-medium text-[#526A7D]">
                  Provider note
                  <textarea
                    className="mt-1.5 w-full rounded-xl border border-[#DDE5EA] p-3 text-xs"
                    rows={5}
                    value={selected.overall_note || ""}
                    onChange={(event) =>
                      setSelected({
                        ...selected,
                        overall_note: event.target.value,
                      })
                    }
                  />
                </label>

                <label className="mt-4 flex items-center gap-2 text-xs text-[#526A7D]">
                  <input
                    type="checkbox"
                    checked={!!selected.report_received_at}
                    onChange={(event) =>
                      setSelected({
                        ...selected,
                        report_received_at: event.target.checked
                          ? new Date().toISOString()
                          : null,
                      })
                    }
                  />
                  Report received
                </label>

                <label className="mt-3 flex items-center gap-2 text-xs text-[#526A7D]">
                  <input
                    type="checkbox"
                    checked={!!selected.completed_at}
                    onChange={(event) =>
                      setSelected({
                        ...selected,
                        completed_at: event.target.checked
                          ? new Date().toISOString()
                          : null,
                      })
                    }
                  />
                  Verification completed
                </label>

                <button
                  onClick={save}
                  disabled={busy}
                  className="mt-6 w-full rounded-xl bg-[#167D73] px-4 py-3 text-xs font-medium text-white disabled:opacity-60"
                >
                  {busy ? "Saving…" : "Save provider update"}
                </button>

                {message && (
                  <p className="mt-3 text-xs text-[#167D73]">{message}</p>
                )}
              </aside>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
