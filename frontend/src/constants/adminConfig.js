// Every contract name the admin UI depends on lives here.
// If MicroLoan.sol ends up using different names, change them here only.
export const ADMIN_FUNCTIONS = {
  owner: "owner",
  paused: "paused",
  pause: "pause",
  unpause: "unpause",
  maxPrincipal: "maxPrincipal", // wei, 0 = no limit
  maxDuration: "maxDuration", // seconds, 0 = no limit
  setLimits: "setLimits", // (uint256 maxPrincipal, uint64 maxDuration)
};

export const SEPOLIA = {
  chainId: 11155111n,
  hexChainId: "0xaa36a7",
  name: "Sepolia",
  explorer: "https://sepolia.etherscan.io",
};

// How often the admin page and the maintenance banner re-read the contract.
export const POLL_MS = 20000;
