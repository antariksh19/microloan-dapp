"use client";

import { ethers } from "ethers";
import PauseCard from "./PauseCard";
import LimitCard from "./LimitCard";
import TxNotice from "./TxNotice";
import Notice from "@/components/ui/Notice";
import Ledger from "@/components/ui/Ledger";
import { card, cardTitle, link } from "./ui";
import { useAdminContract } from "@/hooks/useAdminContract";
import { addressUrl, shortAddress } from "@/utils/web3Helpers";

// Works out why the controls are locked, if they are. Returns { text, action? } or null.
function getGate(wallet, admin) {
  if (!admin.address) return { text: "No contract address is set. Add it to src/constants/contractAddress.json." };
  if (wallet.hasWallet === false) return { text: "Install MetaMask to manage the platform." };
  if (wallet.hasWallet === null) return { text: "Looking for MetaMask…" };
  if (!wallet.account) {
    return { text: "Connect the admin wallet to pause the platform or change the limit.", action: { label: "Connect wallet", onClick: wallet.connect } };
  }
  if (!wallet.onSepolia) {
    return { text: "MetaMask is on another network. Switch to Sepolia to continue.", action: { label: "Switch to Sepolia", onClick: wallet.switchToSepolia } };
  }
  if (!admin.loaded) return { text: "Reading the contract…" };
  if (admin.supports.admin && !admin.isAdmin) {
    return {
      text: `This wallet isn't the admin. Only ${shortAddress(admin.admin)} can make changes, so the controls are read-only.`,
    };
  }
  return null;
}

export default function AdminDashboard({ wallet }) {
  const admin = useAdminContract(wallet);
  const gate = getGate(wallet, admin);
  const canAct = !gate && !admin.pending;
  const pendingAction = admin.pending?.action ?? null;

  const status =
    admin.paused === null
      ? { value: "Unknown", note: "Not read yet", tone: undefined }
      : admin.paused
        ? { value: "Paused", note: "New activity on hold", tone: "text-sun-ink" }
        : { value: "Running", note: "Accepting loan activity", tone: "text-lagoon" };

  return (
    <>
      {gate && (
        <Notice tone="warning" action={gate.action}>
          {gate.text}
        </Notice>
      )}

      {wallet.error && <Notice tone="error">{wallet.error}</Notice>}

      {admin.readError && (
        <Notice tone="error" action={{ label: "Try again", onClick: admin.refresh }}>
          {admin.readError}
        </Notice>
      )}

      <TxNotice pending={admin.pending} lastTx={admin.lastTx} onDismiss={admin.clearLastTx} />

      <Ledger
        items={[
          { label: "Platform", value: status.value, note: status.note, tone: status.tone },
          {
            label: "Maximum loan",
            value: admin.maxLoanAmount === null ? "–" : `${ethers.formatEther(admin.maxLoanAmount)} ETH`,
            note: "Per loan request",
          },
          { label: "Total loans", value: admin.loanCount === null ? "–" : admin.loanCount.toString(), note: "Created on this contract" },
        ]}
      />

      <section className="grid items-start gap-5 lg:grid-cols-2">
        <PauseCard
          paused={admin.paused}
          supported={admin.supports.pause}
          canAct={canAct}
          pendingAction={pendingAction}
          onPause={admin.pause}
          onUnpause={admin.unpause}
        />
        <LimitCard
          key={admin.lastTx?.ok && admin.lastTx.action === "limit" ? admin.lastTx.hash : "limit"}
          maxLoanAmount={admin.maxLoanAmount}
          supported={admin.supports.limit}
          canAct={canAct}
          pendingAction={pendingAction}
          onSave={admin.setMaxLoanAmount}
        />
      </section>

      <section className={card}>
        <h3 className={cardTitle}>Contract details</h3>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-mute">Contract</dt>
            <dd className="mt-1 break-all font-mono text-ink">
              {admin.address ? (
                <a className={link} href={addressUrl(admin.address)} target="_blank" rel="noreferrer">
                  {admin.address}
                </a>
              ) : (
                "Not set"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-mute">Admin</dt>
            <dd className="mt-1 break-all font-mono text-ink">{admin.admin ?? "Unknown"}</dd>
          </div>
          <div>
            <dt className="text-mute">Network</dt>
            <dd className="mt-1 text-ink">Sepolia test network</dd>
          </div>
        </dl>
      </section>
    </>
  );
}
