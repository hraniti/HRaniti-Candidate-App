"use client";
import Link from "next/link";
import { ArrowRight, Building2, GitBranch, ShieldCheck, UsersRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import EmployerShell from "@/components/employer/EmployerShell";
const items: Array<[string,string,string,LucideIcon]>=[
["Company & Workspace","Company identity, workspace details and hiring context.","/employer/profile",Building2],
["Team & Permissions","People, roles and access for your hiring workspace.","/employer/settings/team",UsersRound],
["Hiring Configuration","Reusable hiring pipelines and assessments.","/employer/settings/hiring",GitBranch],
["Security & Access","A dedicated home for SSO, MFA, sessions and enterprise controls.","/employer/settings/security",ShieldCheck],
];
export default function SettingsPage(){return <EmployerShell><div className="min-h-[calc(100vh-72px)] bg-[#FCFCFA]"><div className="mx-auto max-w-[1080px] px-5 py-8 sm:px-8 sm:py-10"><p className="text-[10px] font-semibold tracking-[0.18em] text-[#167D73] uppercase">ACCOUNT</p><h1 className="mt-2 font-display text-3xl text-[#173454]">Settings</h1><p className="mt-1 max-w-2xl text-sm text-[#71859A]">A calm control centre for your hiring workspace.</p><div className="mt-8 grid gap-4 sm:grid-cols-2">{items.map(([title,desc,href,Icon])=><Link key={title as string} href={href as string} className="group rounded-2xl border border-[#DDE5EA] bg-white p-6 hover:border-[#B9DDD7]"><div className="flex items-start justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E7F3F1] text-[#167D73]"><Icon size={18}/></span><ArrowRight size={16} className="text-[#A1AFB9] transition group-hover:translate-x-0.5 group-hover:text-[#167D73]"/></div><h2 className="mt-5 text-sm font-semibold text-[#173454]">{title}</h2><p className="mt-1 text-xs leading-5 text-[#71859A]">{desc}</p></Link>)}</div></div></div></EmployerShell>}