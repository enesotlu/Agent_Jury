"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSession } from "../../lib/session";
import { saveVerdictOnChain, CONTRACT_ADDRESS, isMetaMaskInstalled } from "../../lib/contract";

function VerdictBadge({ verdict }) {
    const cls = verdict === "Ship MVP" ? "verdict-ship" : verdict === "Iterate" ? "verdict-iterate" : "verdict-reject";
    const emoji = verdict === "Ship MVP" ? "🚀" : verdict === "Iterate" ? "🔄" : "❌";
    return <span className={`verdict-badge ${cls}`}>{emoji} {verdict}</span>;
}

function ScoreCircle({ score, verdict }) {
    const gradient = verdict === "Ship MVP"
        ? "conic-gradient(from 0deg, #10b981, #06b6d4 " + (score * 3.6) + "deg, rgba(255,255,255,0.07) " + (score * 3.6) + "deg)"
        : verdict === "Iterate"
            ? "conic-gradient(from 0deg, #f59e0b, #7c3aed " + (score * 3.6) + "deg, rgba(255,255,255,0.07) " + (score * 3.6) + "deg)"
            : "conic-gradient(from 0deg, #ef4444, #7c3aed " + (score * 3.6) + "deg, rgba(255,255,255,0.07) " + (score * 3.6) + "deg)";

    return (
        <div style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{
                width: 140, height: 140,
                borderRadius: "50%",
                background: gradient,
                display: "flex", alignItems: "center", justifyContent: "center",
            }}>
                <div style={{
                    width: 112, height: 112,
                    borderRadius: "50%",
                    background: "var(--bg-deep)",
                    display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                }}>
                    <div style={{ fontSize: "2.2rem", fontWeight: 900, lineHeight: 1 }}>{score}</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600 }}>/ 100</div>
                </div>
            </div>
        </div>
    );
}

export default function VerdictPage() {
    const router = useRouter();
    const [session, setSession] = useState(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [txHash, setTxHash] = useState("");
    const [saveError, setSaveError] = useState("");
    const [metaMaskMissing, setMetaMaskMissing] = useState(false);
    const [wallet, setWallet] = useState("");

    useEffect(() => {
        const s = getSession();
        if (!s || !s.evaluation) {
            router.replace("/submit");
            return;
        }
        setSession(s);
        // Check if already saved
        if (s.txHash) { setTxHash(s.txHash); setSaved(true); }
        if (s.wallet) setWallet(s.wallet);
    }, [router]);

    async function handleSaveOnChain() {
        if (!session) return;
        // MetaMask kontrolü
        if (!isMetaMaskInstalled()) {
            setMetaMaskMissing(true);
            setSaveError("");
            return;
        }
        setMetaMaskMissing(false);
        setSaving(true);
        setSaveError("");
        try {
            const { evaluation, caseText } = session;
            const { txHash: hash, caseHash } = await saveVerdictOnChain({
                caseText,
                feasibility: evaluation.feasibility.score,
                innovation: evaluation.innovation.score,
                risk: evaluation.risk.score,
                finalScore: evaluation.finalVerdict.finalScore,
                shortVerdict: evaluation.finalVerdict.verdict,
            });
            setTxHash(hash);
            setSaved(true);
            // Persist in session
            const updatedSession = { ...session, txHash: hash, caseHash };
            import("../../lib/session").then(({ saveSession }) => saveSession(updatedSession));
        } catch (err) {
            if (err.message === "METAMASK_NOT_FOUND") {
                setMetaMaskMissing(true);
            } else {
                setSaveError(err.message || "Transaction failed");
            }
        } finally {
            setSaving(false);
        }
    }

    if (!session) {
        return (
            <div className="page-wrapper" style={{ justifyContent: "center", alignItems: "center" }}>
                <div className="spinner" style={{ width: 40, height: 40 }} />
            </div>
        );
    }

    const { finalVerdict, feasibility, innovation, risk } = session.evaluation;
    const contractDeployed = CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000";

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
                {/* Main verdict card */}
                <div className="glass-card fade-in" style={{ padding: "2.5rem", textAlign: "center", marginBottom: "1.5rem" }}>
                    <div style={{ marginBottom: "1.5rem" }}>
                        <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.75rem" }}>
                            ⚖️ Final Verdict
                        </div>
                        <VerdictBadge verdict={finalVerdict.verdict} />
                    </div>

                    <ScoreCircle score={finalVerdict.finalScore} verdict={finalVerdict.verdict} />

                    <div style={{ marginTop: "1.75rem" }}>
                        <p style={{
                            color: "var(--text-secondary)",
                            fontSize: "0.95rem",
                            lineHeight: 1.7,
                            maxWidth: 560,
                            margin: "0 auto 1.5rem",
                        }}>
                            {finalVerdict.decision}
                        </p>
                    </div>

                    {/* Score breakdown */}
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        gap: "0.75rem",
                        margin: "0 auto 1.75rem",
                        maxWidth: 480,
                    }}>
                        {[
                            { label: "🔧 Feasibility", score: feasibility.score, weight: "45%" },
                            { label: "💡 Innovation", score: innovation.score, weight: "35%" },
                            { label: "🛡️ Risk Safety", score: risk.score, weight: "20%" },
                        ].map((item) => (
                            <div key={item.label} style={{
                                padding: "0.75rem 0.5rem",
                                background: "var(--glass)",
                                borderRadius: "var(--radius-md)",
                                border: "1px solid var(--glass-border)",
                            }}>
                                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>{item.label}</div>
                                <div style={{ fontSize: "1.4rem", fontWeight: 800 }}>{item.score}</div>
                                <div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>weight: {item.weight}</div>
                            </div>
                        ))}
                    </div>

                    {/* Next steps */}
                    <div style={{ textAlign: "left", maxWidth: 460, margin: "0 auto 2rem" }}>
                        <div style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "0.75rem", letterSpacing: "0.05em" }}>
                            📋 Recommended Next Steps
                        </div>
                        {finalVerdict.nextSteps.map((step, i) => (
                            <div key={i} style={{
                                display: "flex",
                                alignItems: "flex-start",
                                gap: "0.6rem",
                                marginBottom: "0.5rem",
                            }}>
                                <div style={{
                                    width: 22, height: 22, borderRadius: "50%",
                                    background: "var(--gradient-primary)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontSize: "0.7rem", fontWeight: 700, flexShrink: 0, marginTop: 2,
                                }}>
                                    {i + 1}
                                </div>
                                <span style={{ color: "var(--text-secondary)", fontSize: "0.88rem" }}>{step}</span>
                            </div>
                        ))}
                    </div>

                    {/* Save on-chain area */}
                    {!contractDeployed ? (
                        <div style={{
                            padding: "1rem",
                            background: "rgba(245, 158, 11, 0.1)",
                            border: "1px solid rgba(245, 158, 11, 0.3)",
                            borderRadius: "var(--radius-md)",
                            color: "#fbbf24",
                            fontSize: "0.85rem",
                        }}>
                            ⚠️ Contract not deployed yet. Deploy to Monad Testnet first, then set <code>NEXT_PUBLIC_CONTRACT_ADDRESS</code> in <code>.env.local</code>
                        </div>
                    ) : saved ? (
                        <div style={{ textAlign: "center" }}>
                            <div style={{
                                display: "inline-block",
                                padding: "0.75rem 1.5rem",
                                background: "rgba(16, 185, 129, 0.15)",
                                border: "1px solid rgba(16, 185, 129, 0.35)",
                                borderRadius: "var(--radius-md)",
                                marginBottom: "0.75rem",
                            }}>
                                <div style={{ color: "#34d399", fontWeight: 700, marginBottom: "0.25rem" }}>✅ Saved on Monad Testnet!</div>
                                {txHash && (
                                    <a
                                        href={`https://testnet.monadexplorer.com/tx/${txHash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: "#06b6d4", fontSize: "0.78rem", wordBreak: "break-all" }}
                                    >
                                        🔗 {txHash.slice(0, 20)}...{txHash.slice(-8)}
                                    </a>
                                )}
                            </div>
                            <div>
                                <Link href="/history" className="btn btn-ghost">📜 View History</Link>
                            </div>
                        </div>
                    ) : (
                        <div>
                            {/* MetaMask Yüklü Değil Uyarısı */}
                            {metaMaskMissing && (
                                <div style={{
                                    padding: "1rem 1.25rem",
                                    background: "rgba(245,158,11,0.1)",
                                    border: "1px solid rgba(245,158,11,0.35)",
                                    borderRadius: "var(--radius-md)",
                                    marginBottom: "1rem",
                                    textAlign: "left",
                                }}>
                                    <div style={{ color: "#fbbf24", fontWeight: 700, marginBottom: "0.4rem", fontSize: "0.9rem" }}>
                                        🦊 MetaMask Bulunamadı
                                    </div>
                                    <div style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginBottom: "0.6rem" }}>
                                        Verdict&apos;i zincire kaydetmek için tarayıcınıza MetaMask cüzdanı kurmanız gerekir.
                                    </div>
                                    <a
                                        href="https://metamask.io/download/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            display: "inline-block",
                                            padding: "0.4rem 1rem",
                                            background: "rgba(245,158,11,0.2)",
                                            border: "1px solid rgba(245,158,11,0.5)",
                                            borderRadius: "var(--radius-sm)",
                                            color: "#fbbf24",
                                            fontSize: "0.8rem",
                                            fontWeight: 600,
                                            textDecoration: "none",
                                        }}
                                    >
                                        🔗 MetaMask İndir →
                                    </a>
                                </div>
                            )}
                            {/* Genel Hata */}
                            {saveError && (
                                <div style={{
                                    padding: "0.6rem 1rem",
                                    background: "rgba(239,68,68,0.1)",
                                    border: "1px solid rgba(239,68,68,0.3)",
                                    borderRadius: "var(--radius-md)",
                                    color: "#f87171",
                                    fontSize: "0.82rem",
                                    marginBottom: "0.75rem",
                                }}
                                >
                                    ⚠️ {saveError}
                                </div>
                            )}
                            <button
                                id="save-onchain-btn"
                                onClick={handleSaveOnChain}
                                disabled={saving}
                                className="btn btn-success btn-lg"
                                style={{ width: "100%", maxWidth: 360 }}
                            >
                                {saving ? (
                                    <><div className="spinner" /> Waiting for MetaMask...</>
                                ) : (
                                    <>🔗 Save Verdict On-Chain</>
                                )}
                            </button>
                            <div style={{ marginTop: "0.5rem", fontSize: "0.72rem", color: "var(--text-muted)" }}>
                                Requires MetaMask + Monad Testnet + MON tokens
                            </div>
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }} className="fade-in fade-in-delay-2">
                    <Link href="/deliberation" className="btn btn-ghost">← Agent Details</Link>
                    <Link href="/submit" className="btn btn-ghost">🔄 New Case</Link>
                    <Link href="/history" className="btn btn-ghost">📜 History</Link>
                </div>
            </div>
        </div>
    );
}
