"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSession } from "../../lib/session";

const AGENTS = [
    {
        key: "feasibility",
        icon: "🔧",
        name: "Feasibility Agent",
        role: "Technical Viability",
        color: "#06b6d4",
        glow: "rgba(6, 182, 212, 0.3)",
    },
    {
        key: "innovation",
        icon: "💡",
        name: "Innovation Agent",
        role: "Originality & Novelty",
        color: "#a855f7",
        glow: "rgba(168, 85, 247, 0.3)",
    },
    {
        key: "risk",
        icon: "🛡️",
        name: "Risk Agent",
        role: "Safety & Ethics",
        color: "#10b981",
        glow: "rgba(16, 185, 129, 0.3)",
    },
];

function ScoreBar({ score, color }) {
    return (
        <div style={{ margin: "0.75rem 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: "0.4rem" }}>
                <span>Score</span>
                <span style={{ color, fontWeight: 700 }}>{score}/100</span>
            </div>
            <div style={{ height: 7, background: "rgba(255,255,255,0.07)", borderRadius: 100, overflow: "hidden" }}>
                <div style={{
                    width: `${score}%`,
                    height: "100%",
                    background: `linear-gradient(90deg, ${color}99, ${color})`,
                    borderRadius: 100,
                    transition: "width 1.2s cubic-bezier(0.4, 0, 0.2, 1)",
                }} />
            </div>
        </div>
    );
}

function AgentCard({ agent, data, index }) {
    const [expanded, setExpanded] = useState(false);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setVisible(true), index * 250);
        return () => clearTimeout(timer);
    }, [index]);

    return (
        <div
            className="glass-card"
            style={{
                padding: "1.5rem",
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(24px)",
                transition: "opacity 0.5s ease, transform 0.5s ease",
                border: `1px solid ${agent.color}33`,
                boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 0 ${agent.glow}`,
            }}
        >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                <div style={{
                    width: 44, height: 44, borderRadius: "50%",
                    background: `${agent.color}20`,
                    border: `1px solid ${agent.color}50`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "1.3rem",
                }}>
                    {agent.icon}
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{agent.name}</div>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>{agent.role}</div>
                </div>
                <div style={{
                    padding: "0.3rem 0.8rem",
                    background: `${agent.color}20`,
                    borderRadius: 100,
                    fontSize: "1.1rem",
                    fontWeight: 800,
                    color: agent.color,
                }}>
                    {data.score}
                </div>
            </div>

            <ScoreBar score={data.score} color={agent.color} />

            {/* Pros/Cons preview */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginTop: "1rem" }}>
                <div>
                    <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#34d399", marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>✓ Strengths</div>
                    {data.topPros.slice(0, expanded ? undefined : 2).map((p, i) => (
                        <div key={i} style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
                            <span style={{ color: "#34d399" }}>•</span> {p}
                        </div>
                    ))}
                </div>
                <div>
                    <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#f87171", marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>✗ Concerns</div>
                    {data.topCons.slice(0, expanded ? undefined : 2).map((c, i) => (
                        <div key={i} style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
                            <span style={{ color: "#f87171" }}>•</span> {c}
                        </div>
                    ))}
                </div>
            </div>

            {/* Expanded details */}
            {expanded && (
                <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--glass-border)" }}>
                    <div style={{ marginBottom: "0.75rem" }}>
                        <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.4rem", textTransform: "uppercase" }}>❓ Questions Raised</div>
                        {data.questions.map((q, i) => (
                            <div key={i} style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: "0.3rem" }}>→ {q}</div>
                        ))}
                    </div>
                    <div>
                        <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.4rem", textTransform: "uppercase" }}>🚀 Suggested MVP Steps</div>
                        {data.suggestedMVP.map((s, i) => (
                            <div key={i} style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: "0.3rem" }}>{i + 1}. {s}</div>
                        ))}
                    </div>
                </div>
            )}

            <button
                onClick={() => setExpanded(!expanded)}
                style={{
                    marginTop: "1rem",
                    width: "100%",
                    padding: "0.5rem",
                    background: "transparent",
                    border: `1px solid ${agent.color}33`,
                    borderRadius: "var(--radius-sm)",
                    color: agent.color,
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "background 0.2s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = `${agent.color}15`}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
                {expanded ? "▲ Collapse" : "▼ View Details"}
            </button>
        </div>
    );
}

export default function DeliberationPage() {
    const router = useRouter();
    const [session, setSession] = useState(null);

    useEffect(() => {
        const s = getSession();
        if (!s || !s.evaluation) {
            router.replace("/submit");
            return;
        }
        setSession(s);
    }, [router]);

    if (!session) {
        return (
            <div className="page-wrapper" style={{ justifyContent: "center", alignItems: "center" }}>
                <div className="spinner" style={{ width: 40, height: 40 }} />
            </div>
        );
    }

    const { evaluation } = session;

    return (
        <div className="page-wrapper">
            {/* Nav */}
            <nav className="nav container">
                <Link href="/submit" className="nav-logo">⚖️ Agent Jury</Link>
                <div className="nav-links">
                    <Link href="/submit" className="nav-link"><span>Submit</span></Link>
                    <Link href="/history" className="nav-link"><span>History</span></Link>
                </div>
            </nav>

            <div className="container">
                {/* Header */}
                <div style={{ textAlign: "center", marginBottom: "2rem" }} className="fade-in">
                    <div style={{
                        display: "inline-block",
                        padding: "0.35rem 1rem",
                        borderRadius: "100px",
                        background: "rgba(124, 58, 237, 0.15)",
                        border: "1px solid rgba(124,58,237,0.3)",
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        color: "#a855f7",
                        marginBottom: "1rem",
                        letterSpacing: "0.05em",
                    }}>
                        ⚖️ Agent Deliberation Complete
                    </div>
                    <h1 style={{ fontSize: "clamp(1.5rem, 4vw, 2.2rem)", fontWeight: 800, marginBottom: "0.5rem" }}>
                        The Jury Has Spoken
                    </h1>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                        3 independent AI agents evaluated your idea. Click any card to expand details.
                    </p>
                </div>

                {/* Agent Cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
                    {AGENTS.map((agent, i) => (
                        <AgentCard
                            key={agent.key}
                            agent={agent}
                            data={evaluation[agent.key]}
                            index={i}
                        />
                    ))}
                </div>

                {/* Case preview */}
                <div className="glass-card fade-in fade-in-delay-3" style={{ padding: "1.25rem", marginBottom: "2rem" }}>
                    <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.5rem" }}>📋 Evaluated Case</div>
                    <p style={{
                        color: "var(--text-secondary)",
                        fontSize: "0.85rem",
                        lineHeight: 1.6,
                        maxHeight: "3.2em",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                    }}>
                        {session.caseText}
                    </p>
                </div>

                {/* CTA */}
                <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }} className="fade-in fade-in-delay-4">
                    <Link href="/submit" className="btn btn-ghost">← New Case</Link>
                    <Link href="/verdict" className="btn btn-primary btn-lg">View Final Verdict →</Link>
                </div>
            </div>
        </div>
    );
}
