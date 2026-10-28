# MicroLoan DApp

Peer-to-peer micro-loans on Sepolia. Borrowers post a request, lenders fund it, the borrower
withdraws the principal and repays principal plus reward before the due date.

| Folder | What it is |
|---|---|
| `backend/` | `MicroLoan.sol`, its tests and the deploy script (Hardhat 3) |
| `frontend/` | Next.js app: borrower, lender and admin dashboards |
| `admin-backend/` | Admin command line and the default-marking bot (Node + ethers) |

The ABI and address in `frontend/src/constants/` are shared by all three. `npm run deploy:sepolia`
rewrites both, so never edit them by hand.

## Loan lifecycle

```
Requested ──fund──▶ Funded ──withdrawToBorrower──▶ Withdrawn ──repay──▶ Repaid
   │                  │                               │
 cancelLoan     reclaimFunding                   markDefault
   ▼            (lender, after due)              (anyone, after due)
Cancelled          Refunded                        Defaulted
```

- The borrower picks a term; the clock starts when a lender funds the request, not when it is posted.
- If the borrower never withdraws, the lender can take the principal back once the term ends.
- Repayments are credited to the lender, who pulls them with `withdrawPending()`
  ("Ready to Claim" on the lender page).
- A pause blocks new requests and funding only. Everything that settles an existing loan still works.
- Loans are not collateralised: a default means the lender loses the principal.

## Setup

```bash
cd backend && npm install && npm test
cd ../frontend && npm install && npm run dev
cd ../admin-backend && npm install
```

Copy each `.env.example` to `.env` (`.env.local` for the frontend) and fill it in.
`backend` tests run without any `.env`.

## Deploy

```bash
cd backend && npm run deploy:sepolia
```

Needs `SEPOLIA_RPC_URL` and `PRIVATE_KEY` in `backend/.env`. The deploying wallet becomes the admin.

## Admin

```bash
cd admin-backend
npm run admin -- status
npm run admin -- pause | unpause
npm run admin -- limit 5
npm run admin -- transfer 0xNewAdmin   # then, with the new admin's key:
npm run admin -- accept
npm run bot                            # marks overdue loans as defaulted every 6 hours
```

The admin page in the app does the same pause and limit changes from MetaMask.
