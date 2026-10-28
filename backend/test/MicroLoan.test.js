import { expect } from "chai";
import hre from "hardhat";

describe("MicroLoan Core Lifecycle", function () {
  let microLoan;
  let ethers;
  let admin, borrower, lender;
  let PRINCIPAL, REPAYMENT;
  const DURATION = 7 * 24 * 60 * 60; 

  before(async function () {
    // Initialize the network connection for Hardhat 3
    const connection = await hre.network.create();
    ethers = connection.ethers;

    PRINCIPAL = ethers.parseEther("1");
    REPAYMENT = ethers.parseEther("1.1");

    [admin, borrower, lender] = await ethers.getSigners();
    
    const MicroLoan = await ethers.getContractFactory("MicroLoan");
    microLoan = await MicroLoan.deploy();
  });

  it("Should allow a borrower to request a loan", async function () {
    await expect(microLoan.connect(borrower).requestLoan(PRINCIPAL, REPAYMENT, DURATION))
      .to.emit(microLoan, "Requested")
      .withArgs(1, borrower.address, PRINCIPAL);
  });

  it("Should allow a lender to fund the loan", async function () {
    await expect(microLoan.connect(lender).fund(1, { value: PRINCIPAL }))
      .to.emit(microLoan, "Funded")
      .withArgs(1, lender.address, PRINCIPAL);
  });

  it("Should allow the borrower to withdraw the funded principal", async function () {
    await expect(microLoan.connect(borrower).withdrawToBorrower(1))
      .to.emit(microLoan, "Withdrawn")
      .withArgs(1, borrower.address, PRINCIPAL);
  });

  it("Should allow the borrower to repay the loan", async function () {
    await expect(microLoan.connect(borrower).repay(1, { value: REPAYMENT }))
      .to.emit(microLoan, "Repaid")
      .withArgs(1, borrower.address, REPAYMENT);
  });
});

describe("MicroLoan Rules and Edge Cases", function () {
  let microLoan, ethers, networkHelpers;
  let admin, borrower, lender, other;
  let PRINCIPAL, REPAYMENT;
  const DURATION = 7 * 24 * 60 * 60;

  beforeEach(async function () {
    const connection = await hre.network.create();
    ethers = connection.ethers;
    networkHelpers = connection.networkHelpers;
    PRINCIPAL = ethers.parseEther("1");
    REPAYMENT = ethers.parseEther("1.1");
    [admin, borrower, lender, other] = await ethers.getSigners();
    const MicroLoan = await ethers.getContractFactory("MicroLoan");
    microLoan = await MicroLoan.deploy();
  });

  const request = () => microLoan.connect(borrower).requestLoan(PRINCIPAL, REPAYMENT, DURATION);
  const fundIt = () => microLoan.connect(lender).fund(1, { value: PRINCIPAL });
  const withdrawIt = () => microLoan.connect(borrower).withdrawToBorrower(1);

  describe("requestLoan", function () {
    it("rejects a zero principal", async function () {
      await expect(microLoan.connect(borrower).requestLoan(0, REPAYMENT, DURATION))
        .to.be.revertedWith("Principal must be greater than zero");
    });
    it("rejects a repayment below the principal", async function () {
      await expect(microLoan.connect(borrower).requestLoan(PRINCIPAL, PRINCIPAL - 1n, DURATION))
        .to.be.revertedWith("Repayment must cover the principal");
    });
    it("rejects a duration under one hour", async function () {
      await expect(microLoan.connect(borrower).requestLoan(PRINCIPAL, REPAYMENT, 3599))
        .to.be.revertedWith("Duration must be at least one hour");
    });
    it("rejects a principal above the admin maximum", async function () {
      await expect(microLoan.connect(borrower).requestLoan(ethers.parseEther("6"), ethers.parseEther("6.1"), DURATION))
        .to.be.revertedWith("Requested amount exceeds admin maximum limit");
    });
  });

  describe("fund", function () {
    beforeEach(request);
    it("rejects the wrong amount", async function () {
      await expect(microLoan.connect(lender).fund(1, { value: PRINCIPAL - 1n }))
        .to.be.revertedWith("Must fund the exact principal amount");
    });
    it("rejects the borrower funding their own loan", async function () {
      await expect(microLoan.connect(borrower).fund(1, { value: PRINCIPAL }))
        .to.be.revertedWith("Borrower cannot fund their own loan");
    });
    it("rejects funding twice", async function () {
      await fundIt();
      await expect(microLoan.connect(other).fund(1, { value: PRINCIPAL }))
        .to.be.revertedWith("Loan not in Requested state");
    });
  });

  describe("withdrawToBorrower", function () {
    beforeEach(async function () { await request(); await fundIt(); });
    it("only lets the borrower withdraw", async function () {
      await expect(microLoan.connect(other).withdrawToBorrower(1))
        .to.be.revertedWith("Only borrower can withdraw");
    });
    it("moves the principal to the borrower", async function () {
      await expect(withdrawIt()).to.changeEtherBalance(ethers, borrower, PRINCIPAL);
    });
    it("cannot be done twice", async function () {
      await withdrawIt();
      await expect(withdrawIt()).to.be.revertedWith("Loan is not funded");
    });
  });

  describe("repay", function () {
    beforeEach(async function () { await request(); await fundIt(); await withdrawIt(); });
    it("rejects the wrong amount", async function () {
      await expect(microLoan.connect(borrower).repay(1, { value: PRINCIPAL }))
        .to.be.revertedWith("Must pay exact repayment amount");
    });
    it("credits the lender the full repayment, which the lender then pulls", async function () {
      await microLoan.connect(borrower).repay(1, { value: REPAYMENT });
      expect(await microLoan.pendingWithdrawals(lender.address)).to.equal(REPAYMENT);
      await expect(microLoan.connect(lender).withdrawPending())
        .to.changeEtherBalance(ethers, lender, REPAYMENT);
      expect(await microLoan.pendingWithdrawals(lender.address)).to.equal(0n);
      await expect(microLoan.connect(lender).withdrawPending()).to.be.revertedWith("Nothing to withdraw");
    });
    it("rejects repayment after the due date", async function () {
      await networkHelpers.time.increase(DURATION + 60);
      await expect(microLoan.connect(borrower).repay(1, { value: REPAYMENT }))
        .to.be.revertedWith("Loan is past due date");
    });
    it("still works while the platform is paused", async function () {
      await microLoan.connect(admin).togglePause();
      await expect(microLoan.connect(borrower).repay(1, { value: REPAYMENT }))
        .to.emit(microLoan, "Repaid");
    });
  });

  describe("markDefault", function () {
    beforeEach(async function () { await request(); await fundIt(); await withdrawIt(); });
    it("rejects before the due date", async function () {
      await expect(microLoan.connect(lender).markDefault(1))
        .to.be.revertedWith("Loan is not yet past due");
    });
    it("works after the due date, even while paused", async function () {
      await networkHelpers.time.increase(DURATION + 60);
      await microLoan.connect(admin).togglePause();
      await expect(microLoan.connect(lender).markDefault(1))
        .to.emit(microLoan, "Defaulted").withArgs(1, borrower.address);
    });
  });

  describe("cancelLoan", function () {
    beforeEach(request);
    it("lets the borrower cancel an unfunded request", async function () {
      await expect(microLoan.connect(borrower).cancelLoan(1))
        .to.emit(microLoan, "Cancelled").withArgs(1, borrower.address);
      await expect(fundIt()).to.be.revertedWith("Loan not in Requested state");
    });
    it("rejects anyone but the borrower", async function () {
      await expect(microLoan.connect(other).cancelLoan(1))
        .to.be.revertedWith("Only borrower can cancel");
    });
    it("rejects cancelling a funded loan", async function () {
      await fundIt();
      await expect(microLoan.connect(borrower).cancelLoan(1))
        .to.be.revertedWith("Loan not in Requested state");
    });
  });

  describe("admin controls", function () {
    it("only the admin can pause or change the limit", async function () {
      await expect(microLoan.connect(other).togglePause()).to.be.revertedWith("Caller is not the admin");
      await expect(microLoan.connect(other).setMaxLoanAmount(1)).to.be.revertedWith("Caller is not the admin");
    });
    it("pause blocks new requests and funding", async function () {
      await request();
      await microLoan.connect(admin).togglePause();
      await expect(request()).to.be.revertedWith("Contract is currently paused by admin");
      await expect(fundIt()).to.be.revertedWith("Contract is currently paused by admin");
    });
    it("the limit can be changed and is enforced", async function () {
      await microLoan.connect(admin).setMaxLoanAmount(ethers.parseEther("0.5"));
      await expect(request()).to.be.revertedWith("Requested amount exceeds admin maximum limit");
    });
    it("rejects a zero limit", async function () {
      await expect(microLoan.connect(admin).setMaxLoanAmount(0)).to.be.revertedWith("Limit must be greater than zero");
    });
    it("pause does not block withdrawing an already funded loan", async function () {
      await request();
      await fundIt();
      await microLoan.connect(admin).togglePause();
      await expect(withdrawIt()).to.emit(microLoan, "Withdrawn");
    });
    it("hands admin over in two steps", async function () {
      await expect(microLoan.connect(other).transferAdmin(other.address)).to.be.revertedWith("Caller is not the admin");
      await microLoan.connect(admin).transferAdmin(other.address);
      expect(await microLoan.admin()).to.equal(admin.address);
      await expect(microLoan.connect(lender).acceptAdmin()).to.be.revertedWith("Caller is not the pending admin");
      await expect(microLoan.connect(other).acceptAdmin())
        .to.emit(microLoan, "AdminTransferred").withArgs(admin.address, other.address);
      expect(await microLoan.admin()).to.equal(other.address);
      expect(await microLoan.pendingAdmin()).to.equal(ethers.ZeroAddress);
    });
  });

  describe("loan ids", function () {
    it("rejects ids that were never created", async function () {
      await expect(microLoan.connect(other).fund(0, { value: 0 })).to.be.revertedWith("Loan does not exist");
      await expect(microLoan.connect(other).fund(999, { value: 0 })).to.be.revertedWith("Loan does not exist");
      await expect(microLoan.connect(other).cancelLoan(1)).to.be.revertedWith("Loan does not exist");
    });
  });

  describe("due date", function () {
    it("starts the clock when the loan is funded, not when it is requested", async function () {
      await request();
      expect((await microLoan.loans(1)).dueDate).to.equal(0n);
      await networkHelpers.time.increase(DURATION * 2);
      await fundIt();
      const fundedAt = BigInt(await networkHelpers.time.latest());
      expect((await microLoan.loans(1)).dueDate).to.equal(fundedAt + BigInt(DURATION));
      await withdrawIt();
      await expect(microLoan.connect(borrower).repay(1, { value: REPAYMENT })).to.emit(microLoan, "Repaid");
    });
    it("stops the borrower withdrawing after the due date", async function () {
      await request();
      await fundIt();
      await networkHelpers.time.increase(DURATION + 60);
      await expect(withdrawIt()).to.be.revertedWith("Loan is past due date");
    });
  });

  describe("reclaimFunding", function () {
    beforeEach(async function () { await request(); await fundIt(); });
    it("rejects before the due date", async function () {
      await expect(microLoan.connect(lender).reclaimFunding(1)).to.be.revertedWith("Loan is not yet past due");
    });
    it("only lets the lender reclaim", async function () {
      await networkHelpers.time.increase(DURATION + 60);
      await expect(microLoan.connect(other).reclaimFunding(1)).to.be.revertedWith("Only lender can reclaim");
    });
    it("returns the principal if the borrower never withdrew, even while paused", async function () {
      await networkHelpers.time.increase(DURATION + 60);
      await microLoan.connect(admin).togglePause();
      await expect(microLoan.connect(lender).reclaimFunding(1)).to.changeEtherBalance(ethers, lender, PRINCIPAL);
      expect((await microLoan.loans(1)).status).to.equal(6n);
      await expect(microLoan.connect(lender).reclaimFunding(1)).to.be.revertedWith("Loan is not funded");
    });
    it("is not possible once the borrower has withdrawn", async function () {
      await withdrawIt();
      await networkHelpers.time.increase(DURATION + 60);
      await expect(microLoan.connect(lender).reclaimFunding(1)).to.be.revertedWith("Loan is not funded");
    });
  });
});