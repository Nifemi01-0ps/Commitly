"use client";

import { useState } from "react";
import { useUserStore } from "../store/useUserStore";
import { useWalletBalance } from "../hooks/useWalletBalance";
import { getSolanaMode } from "../services/solanaService";
import styles from "./BlockchainSetting.module.css";

const FAUCET_URL = "https://faucet.solana.com";

export default function BlockchainSettings() {
  const user = useUserStore((s) => s.user);
  const realMode = user?.realMode ?? false;
  const solanaMode = getSolanaMode();

  const {
    walletInfo,
    fetchBalance,
    refreshMsg,
    startFaucetPolling,
    converting,
    convertMsg,
    convertSolToCredits,
    CREDIT_TO_SOL,
  } = useWalletBalance();

  const [copied, setCopied] = useState(false);
  const [convertInput, setConvertInput] = useState("");
  const [showConvert, setShowConvert] = useState(false);

  if (!user) return null;

  const { initialLoading, isRefreshing, solBalance, error, lastUpdated } =
    walletInfo;
  const isBusy = initialLoading || isRefreshing;

  const maxSol = solBalance ?? 0;
  const convertAmt = parseFloat(convertInput) || 0;
  const wouldGet = Math.floor(convertAmt / CREDIT_TO_SOL);
  const canConvert = convertAmt > 0 && convertAmt <= maxSol && !converting;

  const lastUpdatedLabel = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : null;

  function handleCopy() {
    if (!walletInfo.fullAddress) return;
    navigator.clipboard.writeText(walletInfo.fullAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleCopyAndPoll() {
    handleCopy();
    startFaucetPolling();
  }

  function handleConvert() {
    const amount = parseFloat(convertInput);
    if (isNaN(amount) || amount <= 0) return;
    convertSolToCredits(Math.min(amount, solBalance ?? 0));
    setConvertInput("");
    setShowConvert(false);
  }

  return (
    <div className={styles.card}>
      {/* Header */}
      <div className={`${styles.header} ${realMode ? styles.realMode : ""}`}>
        <div className={styles.headerContent}>
          <div className={styles.icon}>{realMode ? "⚡" : "🔗"}</div>
          <div>
            <div className={styles.title}>Blockchain Settings</div>
            <div className={styles.subtitle}>
              <NetworkBadge solanaMode={solanaMode} />
              <span className={styles.modeText}>
                {realMode ? "Real commitment active ⚡" : "Credits only"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        {/* Wallet Address */}
        <div className={styles.section}>
          <div className={styles.label}>Wallet address</div>
          <div className={styles.addressRow}>
            <div className={styles.address}>{walletInfo.displayAddress}</div>
            <button onClick={handleCopy} className={styles.copyButton}>
              {copied ? "✓ Copied" : "Copy"}
            </button>
          </div>
        </div>

        {/* SOL Balance */}
        <div className={styles.section}>
          <div className={styles.balanceHeader}>
            <div className={styles.label}>Balance</div>
            {lastUpdatedLabel && !isBusy && (
              <div className={styles.lastUpdated}>
                Updated {lastUpdatedLabel}
              </div>
            )}
          </div>

          <div className={styles.balanceDisplay}>
            {initialLoading ? (
              <BalanceSkeleton />
            ) : error ? (
              <div className={styles.error}>{error}</div>
            ) : (
              <div className={styles.balanceAmount}>
                <span className={styles.solValue}>
                  {solBalance?.toFixed(4) ?? "0.0000"}
                </span>
                <span className={styles.solLabel}>SOL</span>
                {solBalance !== null && solBalance > 0 && (
                  <span className={styles.creditEquivalent}>
                    ≈ {walletInfo.creditEquivalent.toLocaleString()} credits
                  </span>
                )}
              </div>
            )}
          </div>

          <button
            onClick={() => fetchBalance("manual")}
            disabled={isBusy}
            className={styles.refreshButton}
          >
            {isRefreshing || initialLoading ? (
              <>⟳ Refreshing…</>
            ) : (
              <>⟳ Refresh Balance</>
            )}
          </button>

          {refreshMsg && (
            <div
              className={`${styles.message} ${
                refreshMsg.includes("SOL received")
                  ? styles.success
                  : styles.info
              }`}
            >
              {refreshMsg}
            </div>
          )}
        </div>

        {/* Conversion Rate */}
        <div className={styles.rateBox}>
          1 credit = <strong>{CREDIT_TO_SOL} SOL</strong>
          <span className={styles.rateSmall}>
            10 credits = {(10 * CREDIT_TO_SOL).toFixed(4)} SOL
          </span>
        </div>

        {/* Faucet */}
        <div className={styles.faucetBox}>
          <div className={styles.faucetTitle}>Need SOL for testing?</div>
          <div className={styles.faucetDesc}>
            Get free devnet SOL from the faucet. Copy your address and
            we&apos;ll detect when it arrives.
          </div>
          <div className={styles.faucetActions}>
            <a href={FAUCET_URL} target="_blank" rel="noopener noreferrer">
              <button className={styles.faucetButton}>Open Faucet ↗</button>
            </a>
            <button
              onClick={handleCopyAndPoll}
              className={styles.copyFaucetButton}
            >
              {copied ? "✓ Address copied — watching" : "Copy address"}
            </button>
          </div>
        </div>

        {/* Converter */}
        {!initialLoading && maxSol > 0 && (
          <Converter
            showConvert={showConvert}
            setShowConvert={setShowConvert}
            convertInput={convertInput}
            setConvertInput={setConvertInput}
            maxSol={maxSol}
            convertAmt={convertAmt}
            wouldGet={wouldGet}
            canConvert={canConvert}
            converting={converting}
            convertMsg={convertMsg}
            onConvert={handleConvert}
            onCancel={() => {
              setShowConvert(false);
              setConvertInput("");
            }}
          />
        )}

        <div className={styles.securityNote}>
          🔒 Your wallet key is stored securely on this device and is never
          shared with Commitly servers.
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────────────── */

function NetworkBadge({ solanaMode }: { solanaMode: string }) {
  const labels: Record<string, string> = {
    mock: "Mock",
    devnet: "Devnet",
    "mainnet-beta": "Mainnet",
  };

  const classes: Record<string, string> = {
    mock: styles.mockBadge,
    devnet: styles.devnetBadge,
    "mainnet-beta": styles.mainnetBadge,
  };

  return (
    <span
      className={`${styles.badge} ${
        classes[solanaMode] || styles.mainnetBadge
      }`}
    >
      {labels[solanaMode] || "Mainnet"}
    </span>
  );
}

function BalanceSkeleton() {
  return <div className={styles.skeleton} />;
}

function Converter({
  showConvert,
  setShowConvert,
  convertInput,
  setConvertInput,
  maxSol,
  convertAmt,
  wouldGet,
  canConvert,
  converting,
  convertMsg,
  onConvert,
  onCancel,
}: {
  showConvert: boolean;
  setShowConvert: (v: boolean) => void;
  convertInput: string;
  setConvertInput: (v: string) => void;
  maxSol: number;
  convertAmt: number;
  wouldGet: number;
  canConvert: boolean;
  converting: boolean;
  convertMsg: string | null;
  onConvert: () => void;
  onCancel: () => void;
}) {
  if (!showConvert) {
    return (
      <button
        onClick={() => setShowConvert(true)}
        className={styles.convertToggleButton}
      >
        ⬡ Convert SOL to Credits
      </button>
    );
  }

  return (
    <div className={styles.converterBox}>
      <div className={styles.converterTitle}>Convert SOL → Credits</div>

      <div className={styles.converterInputRow}>
        <input
          type="number"
          step="0.001"
          min="0"
          max={maxSol}
          placeholder="0.000"
          value={convertInput}
          onChange={(e) => setConvertInput(e.target.value)}
          className={`${styles.solInput} ${
            convertAmt > maxSol ? styles.solInputError : ""
          }`}
        />
        <span className={styles.solInputLabel}>SOL</span>
        <button
          onClick={() => setConvertInput(maxSol.toFixed(4))}
          className={styles.maxButton}
        >
          MAX
        </button>
      </div>

      {convertAmt > 0 && convertAmt <= maxSol && (
        <div className={styles.convertPreview}>
          ⬡ You&apos;ll receive{" "}
          <strong>{wouldGet.toLocaleString()} credits</strong>
        </div>
      )}

      {convertAmt > maxSol && (
        <div className={styles.convertError}>
          Max available: {maxSol.toFixed(4)} SOL
        </div>
      )}

      <div className={styles.converterActions}>
        <button
          onClick={onConvert}
          disabled={!canConvert || converting}
          className={`${styles.convertButton} ${
            !canConvert || converting ? styles.convertButtonDisabled : ""
          }`}
        >
          {converting ? "Converting…" : "Convert"}
        </button>
        <button onClick={onCancel} className={styles.cancelButton}>
          Cancel
        </button>
      </div>

      {convertMsg && (
        <div
          className={`${styles.message} ${
            convertMsg.startsWith("+") ? styles.success : styles.errorMsg
          }`}
        >
          {convertMsg}
        </div>
      )}
    </div>
  );
}