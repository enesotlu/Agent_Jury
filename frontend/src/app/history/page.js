"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { getVerdictCount, getVerdictById, CONTRACT_ADDRESS, CHAIN_EXPLORER } from "../../lib/contract";

function VerdictBadge({ verdict }) {
    const cls = verdict === "Ship MVP" ? "verdict-ship" : verdict === "Iterate" ? "verdict-iterate" : "verdict-reject";
    const emoji = verdict === "Ship MVP" ? "🚀" : verdict === "Iterate" ? "🔄" : "❌";
    return <span className={`verdict-badge ${cls}`} style={{ fontSize: "0.7rem" }}>{emoji} {verdict}</span>;
}

function VerdictRow({ verdictData, index }) {
    const [expanded, setExpanded] = useState(false);
    const date = new Date(verdictData.timestamp * 1000);
    const dateStr = date.toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric",
        hour: "2-digit", minute: "2-digit"
    });

    return (
        <div
            className="glass-card fade-in"
            style={{
                padding: "1.25rem",
                animationDelay: `${index * 0.07}s`,
                cursor: "pointer",
                transition: "border-color 0.2s",
            }}
            onClick={() => setExpanded(!expanded)}
        >
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                {/* ID */}
                <div style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: "var(--glass-strong)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.8rem", fontWeight: 700, color: "var(--text-muted)",
                    flexShrink: 0,
                }}>
                    #{verdictData.id}
                </div>

                {/* Badge */}
                <VerdictBadge verdict={verdictData.shortVerdict} />

                {/* Score */}
                <div style={{ fontWeight: 800, fontSize: "1.2rem" }}>
                    {verdictData.finalScore}
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 400 }}>/100</span>
                </div>

                {/* Mini score breakdown */}
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <span className="tag">🔧 {verdictData.feasibilityScore}</span>
                    <span className="tag">💡 {verdictData.innovationScore}</span>
                    <span className="tag">🛡️ {verdictData.riskScore}</span>
                </div>

                <div style={{ marginLeft: "auto", fontSize: "0.72rem", color: "var(--text-muted)", textAlign: "right" }}>
                    <div>{dateStr}</div>
                </div>

                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", transition: "transform 0.2s", transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}>▾</div>
            </div>

            {/* Expanded row */}
            {expanded && (
                <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--glass-border)" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                        <div>
                            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "0.3rem", textTransform: "uppercase" }}>Submitter</div>
                            <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", wordBreak: "break-all" }}>
                                {verdictData.submitter.slice(0, 6)}...{verdictData.submitter.slice(-4)}
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "0.3rem", textTransform: "uppercase" }}>Case Hash</div>
                            <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", wordBreak: "break-all" }}>
                                {verdictData.caseHash.slice(0, 10)}...
                            </div>
                        </div>
                    </div>
                    <a
                        href={`${CHAIN_EXPLORER}/address/${CONTRACT_ADDRESS}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        style={{ display: "inline-block", marginTop: "0.75rem", color: "#06b6d4", fontSize: "0.75rem" }}
                    >
                        🔗 View on Monad Explorer
                    </a>
                </div>
            )}
        </div>
    );
}

export default function HistoryPage() {
    const [verdicts, setVerdicts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [count, setCount] = useState(0);

    const contractDeployed = CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000";

    const loadHistory = useCallback(async () => {
        if (!contractDeployed) { setLoading(false); return; }
        setLoading(true);
        setError("");
        try {
            const total = await getVerdictCount();
            setCount(total);
            if (total === 0) { setLoading(false); return; }

            const start = Math.max(0, total - 10);
            const ids = Array.from({ length: total - start }, (_, i) => start + i).reverse();
            const results = await Promise.all(ids.map(id => getVerdictById(id)));
            setVerdicts(results);
        } catch (e) {
            setError(e.message || "Failed to load on-chain history");
        } finally {
            setLoading(false);
        }
    }, [contractDeployed]);

    useEffect(() => { loadHistory(); }, [loadHistory]);

    return (
        <div className="page-wrapper">
            {/* Nav */}
            <nav className="nav container">
                <Link href="/submit" className="nav-logo">⚖️ Agent Jury</Link>
                <div className="nav-links">
                    <Link href="/submit" className="nav-link"><span>Submit</span></Link>
                    <Link href="/history" className="nav-link active"><span>History</span></Link>
                </div>
            </nav>

            <div className="container">
                {/* Header */}
                <div style={{ textAlign: "center", marginBottom: "2rem" }} className="fade-in">
                    <h1 style={{ fontSize: "clamp(1.5rem, 4vw, 2.2rem)", fontWeight: 800, marginBottom: "0.5rem" }}>
                        On-Chain History
                    </h1>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                        All verdicts saved permanently on <strong style={{ color: "#a855f7" }}>Monad Testnet</strong>
                    </p>
                    {contractDeployed && (
                        <div style={{
                            display: "inline-block",
                            marginTop: "0.75rem",
                            padding: "0.3rem 0.9rem",
                            background: "rgba(6, 182, 212, 0.1)",
                            border: "1px solid rgba(6, 182, 212, 0.25)",
                            borderRadius: 100,
                            fontSize: "0.75rem",
                            color: "#22d3ee",
                        }}>
                            📜 {count} total verdict{count !== 1 ? "s" : ""} on-chain
                        </div>
                    )}
                </div>

                {/* Contract not deployed warning */}
                {!contractDeployed && (
                    <div className="glass-card fade-in" style={{ padding: "2rem", textAlign: "center", marginBottom: "1.5rem" }}>
                        <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>🔗</div>
                        <h2 style={{ fontWeight: 700, marginBottom: "0.5rem" }}>Contract Not Deployed Yet</h2>
                        <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", marginBottom: "1.25rem" }}>
                            Deploy <code>AgentJury.sol</code> to Monad Testnet and set <code>NEXT_PUBLIC_CONTRACT_ADDRESS</code> in <code>.env.local</code>
                        </p>
                        <div style={{
                            background: "rgba(0,0,0,0.3)",
                            borderRadius: "var(--radius-md)",
                            padding: "0.75rem 1rem",
                            fontFamily: "monospace",
                            fontSize: "0.82rem",
                            color: "#22d3ee",
                            textAlign: "left",
                            maxWidth: 480,
                            margin: "0 auto",
                        }}>
                            cd c:\openAI\contracts<br />
                            npx hardhat ignition deploy ./ignition/modules/AgentJury.js --network monadTestnet
                        </div>
                    </div>
                )}

                {/* Loading state */}
                {loading && contractDeployed && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "3rem", gap: "1rem" }}>
                        <div className="spinner" style={{ width: 36, height: 36 }} />
                        <div style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>Loading on-chain verdicts...</div>
                    </div>
                )}

                {/* Error state */}
                {error && (
                    <div className="glass-card" style={{ padding: "1.25rem", textAlign: "center", marginBottom: "1.5rem" }}>
                        <div style={{ color: "#f87171", marginBottom: "0.75rem" }}>⚠️ {error}</div>
                        <button onClick={loadHistory} className="btn btn-ghost">🔄 Retry</button>
                    </div>
                )}

                {/* Empty state */}
                {!loading && !error && contractDeployed && verdicts.length === 0 && (
                    <div className="glass-card fade-in" style={{ padding: "3rem", textAlign: "center" }}>
                        <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📭</div>
                        <h2 style={{ fontWeight: 700, marginBottom: "0.5rem" }}>No Verdicts Yet</h2>
                        <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", marginBottom: "1.25rem" }}>
                            Be the first to submit a case and save a verdict on-chain!
                        </p>
                        <Link href="/submit" className="btn btn-primary">⚖️ Submit First Case</Link>
                    </div>
                )}

                {/* Verdict list */}
                {!loading && verdicts.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        {verdicts.map((v, i) => (
                            <VerdictRow key={v.id} verdictData={v} index={i} />
                        ))}
                    </div>
                )}

                {/* Footer actions */}
                {!loading && verdicts.length > 0 && (
                    <div style={{ display: "flex", justifyContent: "center", gap: "1rem", marginTop: "1.5rem" }} className="fade-in fade-in-delay-3">
                        <button onClick={loadHistory} className="btn btn-ghost">🔄 Refresh</button>
                        <Link href="/submit" className="btn btn-primary">⚖️ New Evaluation</Link>
                    </div>
                )}
            </div>
        </div>
    );
}
