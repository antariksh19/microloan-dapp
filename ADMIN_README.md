# Admin module (Phase 3)

Owner-only controls for MicroLoan: pause/resume lending and set loan limits.
Files follow the monorepo layout, so copy them into the same paths.

## What's here

```
backend/contracts/admin/MicroLoanAdmin.sol   pause switch + limits (MicroLoan inherits this)
backend/scripts/admin.js                     command-line admin (status, pause, unpause, limits)

frontend/src/pages/admin.js                  the /admin page
frontend/src/components/admin/*              breaker switch, limits form, tx notice, wallet bar, styles
frontend/src/components/MaintenanceBanner.jsx  banner for the borrower and lender pages
frontend/src/hooks/useWallet.js              MetaMask connect + Sepolia check
frontend/src/hooks/useAdminContract.js       reads and writes for the admin page
frontend/src/hooks/useContractPaused.js      true while paused (used by the banner)
frontend/src/lib/contract.js                 ABI/address loading, error messages
frontend/src/constants/adminConfig.js        every contract function name the UI uses
```

Nothing here hardcodes the ABI or address. Everything reads
`MicroLoanABI.json` and `contractAddress.json` from `src/constants`,
written by the deploy script.

## What Antariksh needs to add to MicroLoan.sol

```solidity
import {MicroLoanAdmin} from "./admin/MicroLoanAdmin.sol";

contract MicroLoan is MicroLoanAdmin /*, ReentrancyGuard */ {
    constructor() MicroLoanAdmin(1 ether, 30 days) {}   // starting limits, 0 = no limit

    function requestLoan(uint256 principal, uint256 repayment, uint64 dueDate)
        external whenNotPaused returns (uint256 id)
    {
        _checkLimits(principal, dueDate);
        // ...
    }

    function fund(uint256 id) external payable whenNotPaused { /* ... */ }
    function withdrawToBorrower(uint256 id) external whenNotPaused { /* ... */ }

    // repay and markDefault stay unpaused on purpose,
    // so a pause never pushes a borrower into default.
}
```

Needs `npm i @openzeppelin/contracts@5` in `backend/`.
If the team is on OpenZeppelin v4, change the Pausable import to
`security/Pausable.sol` and drop the `Ownable(msg.sender)` argument.

If you end up with different function names, change them in
`adminConfig.js` only. The page checks the ABI and shows a clear
"not in the contract yet" message for anything missing, so it works
before Phase 2 is merged.

## Setup

- Add `NEXT_PUBLIC_SEPOLIA_RPC_URL` to `frontend/.env.local` and to Vercel/Netlify
  (same Alchemy URL as `SEPOLIA_RPC_URL`, but Next.js only exposes variables
  with the `NEXT_PUBLIC_` prefix to the browser). Without it, reads fall back to
  MetaMask and only work while MetaMask is on Sepolia.
- Add the same key to `frontend/.env.example`.
- Visit `/admin` and connect the deployer wallet. It is the owner.

## For Soumya and Dibyanshi

Put `<MaintenanceBanner />` at the top of the borrower and lender pages.
It shows only while the contract is paused. `describeTxError()` in
`lib/contract.js` turns ethers errors (including our custom reverts like
`PrincipalAboveLimit`) into plain sentences, so feel free to reuse it.

## Command line

Run from `backend/`. Uses `SEPOLIA_RPC_URL` and `PRIVATE_KEY` from `backend/.env`.

```
node scripts/admin.js status
node scripts/admin.js pause
node scripts/admin.js unpause
node scripts/admin.js limits 0.5 30     # 0.5 ETH max, 30 days max, 0 = no limit
```

Needs `ethers` and `dotenv` in `backend/`. Refuses to send if the key isn't the owner's.

## Tested

Compiled with solc 0.8.24 + OpenZeppelin 5, then run end to end on a local
chain using Sepolia's chain ID: pause, resume, double-pause error, save limits,
bad input, discard, non-owner lockout, and the mobile layout.
