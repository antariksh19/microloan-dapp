import Head from "next/head";
import { Archivo } from "next/font/google";
import styles from "../components/admin/AdminPanel.module.css";
import WalletBar from "../components/admin/WalletBar";
import PauseSwitch from "../components/admin/PauseSwitch";
import LimitsForm from "../components/admin/LimitsForm";
import TxNotice from "../components/admin/TxNotice";
import { useWallet } from "../hooks/useWallet";
import { useAdminContract } from "../hooks/useAdminContract";
import { addressUrl, shortAddress } from "../lib/contract";

// Self-hosted by Next at build time. The wdth axis is needed for font-stretch in the CSS.
const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo" });

// Works out why controls are locked (if they are) and the one step that fixes it.
function getGate(wallet, admin) {
  if (!admin.address) {
    return {
      text: "No contract address yet. Run the deploy script so it writes src/constants/contractAddress.json, then reload.",
    };
  }
  if (wallet.hasWallet === false) {
    return {
      text: "Install MetaMask to manage the contract.",
      action: { label: "Get MetaMask", href: "https://metamask.io/download/" },
    };
  }
  if (wallet.hasWallet === null) return { text: "Looking for MetaMask…" };
  if (!wallet.account) {
    return {
      text: "Connect the owner wallet to pause lending or change limits.",
      action: { label: "Connect wallet", onClick: wallet.connect },
    };
  }
  if (!wallet.onSepolia) {
    return {
      text: "MetaMask is on another network. Admin actions run on Sepolia.",
      action: { label: "Switch to Sepolia", onClick: wallet.switchToSepolia },
    };
  }
  if (!admin.loaded) return { text: "Reading the contract…" };
  if (admin.supports.owner && !admin.isOwner) {
    return {
      text: `This wallet isn't the contract owner. Only ${shortAddress(admin.owner)} can make changes here.`,
    };
  }
  return null;
}

export default function AdminPage() {
  const wallet = useWallet();
  const admin = useAdminContract(wallet);
  const gate = getGate(wallet, admin);
  const canAct = !gate && !admin.pending;
  const pendingAction = admin.pending?.action ?? null;

  return (
    <div className={`${styles.page} ${archivo.variable}`}>
      <Head>
        <title>MicroLoan admin</title>
      </Head>

      <main className={styles.shell}>
        <header className={styles.header}>
          <h1 className={styles.title}>MicroLoan admin</h1>
          <WalletBar wallet={wallet} />
        </header>

        {gate && (
          <div className={styles.gate}>
            <div>
              <p>{gate.text}</p>
              {wallet.error && <p className={styles.errorText}>{wallet.error}</p>}
            </div>
            {gate.action?.href && (
              <a className={styles.button} href={gate.action.href} target="_blank" rel="noreferrer">
                {gate.action.label}
              </a>
            )}
            {gate.action?.onClick && (
              <button
                type="button"
                className={styles.button}
                onClick={gate.action.onClick}
                disabled={wallet.connecting}
              >
                {wallet.connecting ? "Waiting for MetaMask…" : gate.action.label}
              </button>
            )}
          </div>
        )}

        {admin.readError && (
          <div className={`${styles.notice} ${styles.noticeFail}`} role="alert">
            <p>{admin.readError}</p>
            <button type="button" className={styles.buttonQuiet} onClick={admin.refresh}>
              Try again
            </button>
          </div>
        )}

        <TxNotice pending={admin.pending} lastTx={admin.lastTx} onDismiss={admin.clearLastTx} />

        <PauseSwitch
          paused={admin.paused}
          supported={admin.supports.pause}
          canAct={canAct}
          pendingAction={pendingAction}
          onPause={admin.pause}
          onUnpause={admin.unpause}
        />

        <div className={styles.grid}>
          <LimitsForm
            maxPrincipal={admin.maxPrincipal}
            maxDuration={admin.maxDuration}
            supported={admin.supports.limits}
            canAct={canAct}
            pendingAction={pendingAction}
            savedHash={admin.lastTx?.ok && admin.lastTx.action === "limits" ? admin.lastTx.hash : null}
            onSave={admin.setLimits}
          />

          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>Contract</h2>
            <p className={styles.panelIntro}>Deployed on Sepolia.</p>
            <dl className={styles.details}>
              <dt>Address</dt>
              <dd>
                {admin.address ? (
                  <a className={styles.link} href={addressUrl(admin.address)} target="_blank" rel="noreferrer">
                    {admin.address}
                  </a>
                ) : (
                  "Not deployed yet"
                )}
              </dd>
              <dt>Owner</dt>
              <dd>{admin.owner ?? "Unknown"}</dd>
            </dl>
          </section>
        </div>
      </main>
    </div>
  );
}
