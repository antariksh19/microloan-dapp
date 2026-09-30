import styles from "./AdminPanel.module.css";
import { shortAddress } from "../../lib/contract";
import { SEPOLIA } from "../../constants/adminConfig";

export default function WalletBar({ wallet }) {
  if (wallet.hasWallet === false) return null;

  if (!wallet.account) {
    return (
      <div className={styles.wallet}>
        <button
          type="button"
          className={styles.button}
          onClick={wallet.connect}
          disabled={wallet.connecting}
        >
          {wallet.connecting ? "Waiting for MetaMask…" : "Connect wallet"}
        </button>
      </div>
    );
  }

  return (
    <div className={styles.wallet}>
      <span className={styles.walletNetwork}>
        {wallet.onSepolia ? SEPOLIA.name : "Wrong network"}
      </span>
      <span className={styles.walletAddress} title={wallet.account}>
        {shortAddress(wallet.account)}
      </span>
    </div>
  );
}
