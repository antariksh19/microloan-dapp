// Every contract name the admin UI depends on lives here.
// These match backend/contracts/MicroLoan.sol. If a name changes there, change it here only.
export const ADMIN_FUNCTIONS = {
  admin: "admin", // address allowed to use onlyAdmin functions
  paused: "paused",
  togglePause: "togglePause", // flips paused on/off
  maxLoanAmount: "maxLoanAmount", // wei
  setMaxLoanAmount: "setMaxLoanAmount",
  loanCounter: "loanCounter",
};

export const SEPOLIA = {
  chainId: 11155111n,
  hexChainId: "0xaa36a7",
  name: "Sepolia",
  explorer: "https://sepolia.etherscan.io",
};

// How often the admin page and the maintenance banner re-read the contract.
export const POLL_MS = 20000;
