"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Archive, ArrowLeft, FileText, Lock, Plus, Upload, X } from "lucide-react";
import Link from "next/link";
import EmployerShell from "@/components/employer/EmployerShell";
import { createClient } from "@/lib/supabase/client";
import { getOrCreateCompanyId } from "@/lib/employer/getOrCreateCompany";

type Version = {
  id: string;
  template_id: string;
  version_number: number;
  source_file_path: string | null;
  source_file_name: string | null;
  source_mime_type: string | null;
  content_html: string;
  variable_schema: { key: string; label: string }[];
  locked_sections: string[];
  status: string;
  created_at: string;
};
type Template = {
  id: string;
  name: string;
  description: string | null;
  template_type: "hraniti" | "company_upload";
  country_code: string | null;
  employment_type: string | null;
  is_default: boolean;
  status: string;
  created_at: string;
  versions?: Version[];
};

const fields = [
  ["candidate_name", "Candidate name"], ["candidate_email", "Candidate email"],
  ["job_title", "Job title"], ["company_name", "Company name"],
  ["work_location", "Work location"], ["work_mode", "Work mode"],
  ["employment_type", "Employment type"], ["base_salary", "Base salary"],
  ["currency", "Currency"], ["pay_frequency", "Pay frequency"],
  ["bonus_target", "Bonus target"], ["start_date", "Start date"],
  ["offer_expiry_date", "Offer expiry date"], ["reporting_manager", "Reporting manager"],
  ["probation_period", "Probation period"], ["notice_period", "Notice period"],
] as const;

const emptyTemplate: Template = { id: "", name: "", description: null, template_type: "hraniti", country_code: null, employment_type: null, is_default: false, status: "Active", versions: [] };\n\nconst starterHtml =
  "<p>Dear {{candidate_name}},</p>" +
  "<p>We are pleased to offer you the position of <strong>{{job_title}}</strong> at {{company_name}}.</p>" +
  "<p>Your annual base salary will be <strong>{{base_salary}} {{currency}}</strong>, paid {{pay_frequency}}.</p>" +
  "<p>Your proposed joining date is <strong>{{start_date}}</strong>.</p>" +
  "<p>You will report to {{reporting_manager}}.</p>" +
  "<p>We look forward to welcoming you.</p>" +
  "<p>Sincerely,<br/>{{company_name}}</p>";

function sanitizeHtml(html: string) {
  if (typeof window === "undefined") return html;
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script,iframe,object,embed,form,style,link,meta").forEach((el) => el.remove());
  doc.querySelectorAll("*").forEach((el) => {
    [...el.attributes].forEach((attr) => {
      if (attr.name.toLowerCase().startsWith("on") || attr.name.toLowerCase() === "srcdoc") el.removeAttribute(attr.name);
      if ((attr.name === "href" || attr.name === "src") && /^\s*javascript:/i.test(attr.value)) el.removeAttribute(attr.name);
    });
  });
  return doc.body.innerHTML;
}

function normalizePlaceholders(html: string) {
  const map: Record<string, string> = {
    "[Candidate Name]": "{{candidate_name}}", "[Candidate's Name]": "{{candidate_name}}",
    "[Job Title]": "{{job_title}}", "[Position]": "{{job_title}}",
    "[Company Name]": "{{company_name}}", "[Location]": "{{work_location}}",
    "[Work Location]": "{{work_location}}", "[Salary]": "{{base_salary}}",
    "[Base Salary]": "{{base_salary}}", "[Start Date]": "{{start_date}}",
    "[Joining Date]": "{{start_date}}", "[Manager]": "{{reporting_manager}}",
    "[Reporting Manager]": "{{reporting_manager}}", "[Currency]": "{{currency}}",
    "[Employment Type]": "{{employment_type}}"
  };
  return Object.entries(map).reduce((out, pair) => out.split(pair[0]).join(pair[1]), html);
}

function variableSchema(html: string) {
  const keys = [...new Set([...html.matchAll(/{{\s*([a-z0-9_]+)\s*}}/gi)].map((m) => m[1].toLowerCase()))];
  return keys.map((key) => ({
    key,
    label: fields.find(([field]) => field === key)?.[1] ?? key.replace(/_/g, " ").replace(/\b\w/g, (x) => x.toUpperCase())
  }));
}

function latest(t: Template) {
  return (t.versions ?? []).slice().sort((a, b) => b.version_number - a.version_number)[0] ?? null;
}

export default function OfferTemplateLibraryPage() {
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Template | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [country, setCountry] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [html, setHtml] = useState(starterHtml);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [converting, setConverting] = useState(false);

  async function load() {
    setLoading(true);
    const auth = await supabase.auth.getUser();
    if (!auth.data.user) { setLoading(false); return; }
    const companyId = await getOrCreateCompanyId(supabase, auth.data.user);
    const result = await supabase
      .from("offer_templates")
      .select("id,name,description,template_type,country_code,employment_type,is_default,status,created_at,offer_template_versions(id,template_id,version_number,source_file_path,source_file_name,source_mime_type,content_html,variable_schema,locked_sections,status,created_at)")
      .eq("company_id", companyId)
      .order("updated_at", { ascending: false });
    if (result.error) setMessage(result.error.message);
    setTemplates((result.data ?? []) as unknown as Template[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function resetEditor(template?: Template) {
    const version = template ? latest(template) : null;
    setSelected(template ?? null);
    setName(template?.name ?? "");
    setDescription(template?.description ?? "");
    setCountry(template?.country_code ?? "");
    setEmploymentType(template?.employment_type ?? "");
    setIsDefault(template?.is_default ?? false);
    setSourceFile(null);
    setHtml(version?.content_html ?? starterHtml);
    setMessage("");
    setOpen(true);
    setTimeout(() => {
      if (editorRef.current) editorRef.current.innerHTML = version?.content_html ?? starterHtml;
    }, 0);
  }

  async function importWord(file: File) {
    if (!file.name.toLowerCase().endsWith(".docx")) {
      setMessage("For an editable company template, upload a Word .docx file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setMessage("Please keep offer templates under 10 MB.");
      return;
    }
    setSourceFile(file);
    setConverting(true);
    setMessage("");
    try {
      const mammoth = await import("mammoth/mammoth.browser");
      const result = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
      const safe = sanitizeHtml(normalizePlaceholders(result.value));
      setHtml(safe);
      if (editorRef.current) editorRef.current.innerHTML = safe;
      if (!name.trim()) setName(file.name.replace(/\.docx$/i, ""));
      if (result.messages?.length) setMessage("Imported. Please review the document preview before saving; complex Word layouts may need a quick visual check.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "We could not read this Word file.");
    } finally {
      setConverting(false);
    }
  }

  function insertField(key: string) {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const token = "{{" + key + "}}";
    const selection = window.getSelection();
    if (selection && selection.rangeCount) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(token));
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      editor.innerHTML += token;
    }
    setHtml(sanitizeHtml(editor.innerHTML));
  }

  async function save() {
    const finalHtml = sanitizeHtml(editorRef.current?.innerHTML ?? html);
    if (!name.trim() || finalHtml.replace(/<[^>]+>/g, "").trim().length < 20) {
      setMessage("Add a template name and offer content first.");
      return;
    }
    setSaving(true);
    setMessage("");
    const auth = await supabase.auth.getUser();
    if (!auth.data.user) { setSaving(false); return; }
    const user = auth.data.user;
    const companyId = await getOrCreateCompanyId(supabase, user);
    let templateId = selected?.id ?? null;
    let nextVersion = selected ? Math.max(0, ...(selected.versions ?? []).map((v) => v.version_number)) + 1 : 1;
    if (!templateId) {
      const created = await supabase.from("offer_templates").insert({
        company_id: companyId, name: name.trim(), description: description.trim() || null,
        template_type: sourceFile ? "company_upload" : "hraniti",
        country_code: country.trim() || null, employment_type: employmentType || null,
        is_default: isDefault, created_by: user.id
      }).select("id").single();
      if (created.error || !created.data) {
        setMessage(created.error?.message ?? "Could not create the template.");
        setSaving(false);
        return;
      }
      templateId = created.data.id;
    } else {
      const updated = await supabase.from("offer_templates").update({
        name: name.trim(), description: description.trim() || null,
        country_code: country.trim() || null, employment_type: employmentType || null,
        is_default: isDefault, updated_at: new Date().toISOString()
      }).eq("id", templateId);
      if (updated.error) { setMessage(updated.error.message); setSaving(false); return; }
    }

    if (isDefault) {
      await supabase.from("offer_templates").update({ is_default: false }).eq("company_id", companyId).neq("id", templateId);
      await supabase.from("offer_templates").update({ is_default: true }).eq("id", templateId);
    }

    let sourcePath = selected ? latest(selected)?.source_file_path ?? null : null;
    if (sourceFile && templateId) {
      sourcePath = companyId + "/" + templateId + "/" + crypto.randomUUID() + "-" + sourceFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const uploaded = await supabase.storage.from("offer-templates").upload(sourcePath, sourceFile, {
        contentType: sourceFile.type || "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        upsert: false
      });
      if (uploaded.error) { setMessage(uploaded.error.message); setSaving(false); return; }
    }

    const versionResult = await supabase.from("offer_template_versions").insert({
      template_id: templateId,
      version_number: nextVersion,
      source_file_path: sourcePath,
      source_file_name: sourceFile?.name ?? latest(selected ?? ({ versions: [] } as Template))?.source_file_name ?? null,
      source_mime_type: sourceFile?.type ?? latest(selected ?? ({ versions: [] } as Template))?.source_mime_type ?? "text/html",
      content_html: finalHtml,
      variable_schema: variableSchema(finalHtml),
      locked_sections: [],
      status: "Active",
      created_by: user.id
    });
    if (versionResult.error) { setMessage(versionResult.error.message); setSaving(false); return; }

    setOpen(false);
    setSaving(false);
    await load();
  }

  async function archive(template: Template) {
    if (!window.confirm("Archive “" + template.name + "”? Existing offers keep their saved version.")) return;
    const result = await supabase.from("offer_templates").update({ status: "Archived", is_default: false }).eq("id", template.id);
    if (result.error) setMessage(result.error.message);
    else load();
  }

  const active = useMemo(() => templates.filter((t) => t.status !== "Archived"), [templates]);

  return <EmployerShell>
    <div className="min-h-[calc(100vh-72px)] bg-[#FCFCFA]">
      <div className="mx-auto max-w-[1120px] px-5 py-8 sm:px-8 sm:py-10">
        <Link href="/employer/settings/hiring" className="inline-flex items-center gap-2 text-xs text-[#71859A] hover:text-[#173454]"><ArrowLeft size={14}/> Hiring configuration</Link>
        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#167D73]">SETTINGS · HIRING</p>
            <h1 className="mt-2 font-display text-3xl text-[#173454]">Offer letter templates</h1>
            <p className="mt-1 max-w-2xl text-sm text-[#71859A]">Use an HRaniti template or bring your company’s approved Word template. Each offer keeps the exact version used.</p>
          </div>
          <button onClick={() => resetEditor()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#167D73] px-4 py-2.5 text-xs font-medium text-white"><Plus size={15}/> Create template</button>
        </div>

        <div className="mt-8 rounded-2xl border border-[#DDE5EA] bg-white p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E7F3F1] text-[#167D73]"><Lock size={16}/></div>
            <div><p className="text-sm font-semibold text-[#173454]">Private company templates</p><p className="mt-1 text-xs leading-5 text-[#71859A]">Uploaded Word files stay in a private, company-scoped storage bucket. HRaniti keeps the original file and a versioned editable copy.</p></div>
          </div>
        </div>

        {message && <div className="mt-4 rounded-xl border border-[#F0D5CF] bg-[#FFF8F6] px-4 py-3 text-xs text-[#8F493C]">{message}</div>}

        <div className="mt-6 space-y-3">
          {loading ? <div className="rounded-2xl border border-[#DDE5EA] bg-white p-6 text-sm text-[#71859A]">Loading templates…</div> :
           active.length === 0 ? <div className="rounded-2xl border border-dashed border-[#CBD8DE] bg-white p-10 text-center"><FileText className="mx-auto text-[#9AA8B3]" size={24}/><p className="mt-3 text-sm font-medium text-[#173454]">No offer templates yet</p><p className="mt-1 text-xs text-[#71859A]">Create a clean HRaniti template or upload your approved Word document.</p><button onClick={() => resetEditor()} className="mt-5 rounded-xl border border-[#B9DDD7] px-4 py-2.5 text-xs font-medium text-[#167D73]">Add your first template</button></div> :
           active.map((template) => {
             const version = latest(template);
             return <div key={template.id} className="rounded-2xl border border-[#DDE5EA] bg-white p-5">
               <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                 <div className="min-w-0">
                   <div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-semibold text-[#173454]">{template.name}</h2>{template.is_default && <span className="rounded-full bg-[#E7F3F1] px-2 py-1 text-[10px] font-medium text-[#167D73]">Default</span>}<span className="rounded-full bg-[#F5F7F7] px-2 py-1 text-[10px] text-[#71859A]">{template.template_type === "company_upload" ? "Company template" : "HRaniti template"}</span></div>
                   <p className="mt-1 text-xs text-[#71859A]">{template.description || "No description"}{template.country_code ? " · " + template.country_code : ""}{template.employment_type ? " · " + template.employment_type : ""}</p>
                   <p className="mt-3 text-[11px] text-[#9AA8B3]">Version {version?.version_number ?? 1} · {(version?.variable_schema ?? []).length} dynamic fields{version?.source_file_name ? " · " + version.source_file_name : ""}</p>
                 </div>
                 <div className="flex items-center gap-2"><button onClick={() => resetEditor(template)} className="rounded-xl border border-[#DDE5EA] px-3 py-2 text-xs font-medium text-[#526A7D]">Edit</button><button onClick={() => archive(template)} className="inline-flex items-center gap-1.5 rounded-xl border border-[#DDE5EA] px-3 py-2 text-xs text-[#71859A]"><Archive size={13}/> Archive</button></div>
               </div>
             </div>;
           })}
        </div>
      </div>

      {open && <div className="fixed inset-0 z-50 overflow-y-auto bg-[#173454]/20 p-4 sm:p-8">
        <div className="mx-auto max-w-[1180px] rounded-2xl bg-white shadow-[0_24px_80px_rgba(23,52,84,0.2)]">
          <div className="flex items-center justify-between border-b border-[#E6ECEF] px-5 py-4 sm:px-7">
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#167D73]">{selected ? "NEW VERSION" : "NEW TEMPLATE"}</p><h2 className="mt-1 text-lg font-semibold text-[#173454]">{selected ? name : "Create offer template"}</h2></div>
            <button onClick={() => setOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-lg text-[#71859A] hover:bg-[#F5F7F7]" aria-label="Close"><X size={18}/></button>
          </div>
          <div className="grid lg:grid-cols-[360px_minmax(0,1fr)]">
            <aside className="border-b border-[#E6ECEF] p-5 lg:border-b-0 lg:border-r sm:p-7">
              <label className="block text-xs font-medium text-[#526A7D]">Template name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-[#DDE5EA] px-3 text-sm text-[#173454] outline-none focus:border-[#A9D4CE]" placeholder="India full-time offer"/>
              <label className="mt-4 block text-xs font-medium text-[#526A7D]">Description</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-[#DDE5EA] px-3 text-sm text-[#173454] outline-none focus:border-[#A9D4CE]" placeholder="Standard India employment offer"/>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-[#526A7D]">Country</label><input value={country} onChange={(e) => setCountry(e.target.value)} className="mt-2 h-10 w-full rounded-xl border border-[#DDE5EA] px-3 text-xs outline-none" placeholder="IN"/></div>
                <div><label className="block text-xs font-medium text-[#526A7D]">Employment</label><select value={employmentType} onChange={(e) => setEmploymentType(e.target.value)} className="mt-2 h-10 w-full rounded-xl border border-[#DDE5EA] bg-white px-2 text-xs outline-none"><option value="">Any</option><option>Full-time</option><option>Contract</option><option>Freelance</option><option>Internship</option></select></div>
              </div>
              <div className="mt-5 rounded-xl border border-[#DDE5EA] p-4">
                <p className="text-xs font-semibold text-[#173454]">Use your company template</p>
                <p className="mt-1 text-[11px] leading-5 text-[#71859A]">Upload an approved Word document. HRaniti converts it into an editable offer and keeps the original private.</p>
                <input ref={fileRef} type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importWord(f); }}/>
                <button onClick={() => fileRef.current?.click()} disabled={converting} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[#B9DDD7] px-3 py-2.5 text-xs font-medium text-[#167D73]"><Upload size={14}/>{converting ? "Reading Word file…" : sourceFile ? sourceFile.name : "Upload Word template"}</button>
              </div>
              <div className="mt-5">
                <p className="text-xs font-semibold text-[#173454]">Dynamic fields</p>
                <p className="mt-1 text-[11px] leading-5 text-[#71859A]">Click a field to insert it at the cursor.</p>
                <div className="mt-3 flex flex-wrap gap-1.5">{fields.map(([key, label]) => <button key={key} onClick={() => insertField(key)} className="rounded-lg border border-[#DDE5EA] bg-[#FAFBFB] px-2 py-1.5 text-[10px] text-[#526A7D] hover:border-[#A9D4CE] hover:text-[#167D73]">{label}</button>)}</div>
              </div>
              <label className="mt-5 flex items-center gap-2 text-xs text-[#526A7D]"><input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="accent-[#167D73]"/> Use as default template</label>
              <div className="mt-5 rounded-xl bg-[#F7F9F9] p-4"><p className="text-xs font-semibold text-[#173454]">Version safe</p><p className="mt-1 text-[11px] leading-5 text-[#71859A]">Editing creates a new version. Existing offers keep the version they used.</p></div>
            </aside>
            <section className="p-5 sm:p-7">
              <div className="flex items-center justify-between"><div><p className="text-xs font-semibold text-[#173454]">Offer letter</p><p className="mt-1 text-[11px] text-[#71859A]">Edit the wording while keeping the uploaded source file unchanged.</p></div><span className="rounded-full bg-[#F5F7F7] px-2.5 py-1 text-[10px] text-[#71859A]">{variableSchema(html).length} fields</span></div>
              <div className="mt-4 overflow-hidden rounded-xl border border-[#DDE5EA]">
                <div className="border-b border-[#E6ECEF] bg-[#FAFBFB] px-3 py-2 text-[10px] text-[#9AA8B3]">Editable document · version-safe</div>
                <div ref={editorRef} contentEditable suppressContentEditableWarning onInput={(e) => setHtml(sanitizeHtml(e.currentTarget.innerHTML))} className="min-h-[560px] bg-white p-8 text-sm leading-7 text-[#2F4658] outline-none prose prose-sm max-w-none"/>
              </div>
              <div className="mt-4 flex flex-col gap-3 rounded-xl border border-[#DDE5EA] bg-[#FCFCFA] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div><p className="text-xs font-medium text-[#173454]">Ready to use</p><p className="mt-1 text-[11px] leading-5 text-[#71859A]">This template becomes selectable when creating an offer. Candidate and job fields are filled automatically.</p></div>
                <button onClick={save} disabled={saving || converting} className="shrink-0 rounded-xl bg-[#167D73] px-4 py-2.5 text-xs font-medium text-white disabled:opacity-50">{saving ? "Saving…" : selected ? "Save new version" : "Save template"}</button>
              </div>
            </section>
          </div>
        </div>
      </div>}
    </div>
  </EmployerShell>;
}
