"use client";

import { useState } from "react";
import { useUserStore } from "../store/useUserStore";
import { useWalletBalance } from "../hooks/useWalletBalance";
import { getSolanaMode } from "../services/solanaService";
import styles from "./BlockchainSettings.module.css";

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

  const { initialLoading, isRefreshing, solBalance, error, lastUpdated } = walletInfo;
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
          <div className={styles.icon}>
            {realMode ? "⚡" : "🔗"}
          </div>
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
              <div className={styles.lastUpdated}>Updated {lastUpdatedLabel}</div>
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
            <div className={`${styles.message} ${refreshMsg.includes("SOL received") ? styles.success : styles.info}`}>
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
            Get free devnet SOL from the faucet. Copy your address and we&apos;ll detect when it arrives.
          </div>
          <div className={styles.faucetActions}>
            <a href={FAUCET_URL} target="_blank" rel="noopener noreferrer">
              <button className={styles.faucetButton}>Open Faucet ↗</button>
            </a>
            <button onClick={handleCopyAndPoll} className={styles.copyFaucetButton}>
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
          🔒 Your wallet key is stored securely on this device and is never shared with Commitly servers.
        </div>
      </div>
    </div>
  );
}

/* Small Sub Components */
function NetworkBadge({ solanaMode }: { solanaMode: string }) {
  const labels = {
    mock: "Mock",
    devnet: "Devnet",
    mainnet: "Mainnet",
  };

  const classes = {
    mock: styles.mockBadge,
    devnet: styles.devnetBadge,
    mainnet: styles.mainnetBadge,
  };

  return (
    <span className={`${styles.badge} ${classes[solanaMode as keyof typeof classes] || styles.mainnetBadge}`}>
      {labels[solanaMode as keyof typeof labels] || "Mainnet"}
    </span>
  );
}

function BalanceSkeleton() {
  return <div className={styles.skeleton} />;
}