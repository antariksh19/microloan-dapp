// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

contract MicroLoan {
    // New values are only ever appended so existing status numbers keep their meaning.
    enum Status { Requested, Funded, Withdrawn, Repaid, Defaulted, Cancelled, Refunded }

    struct Loan {
        address payable borrower;
        address payable lender;
        uint256 principal;
        uint256 repayment;
        uint256 duration; // seconds, chosen by the borrower
        uint256 dueDate; // 0 until funded; the clock starts when a lender funds
        Status status;
    }

    uint256 public constant MIN_DURATION = 1 hours;

    uint256 public loanCounter;
    mapping(uint256 => Loan) public loans;

    // Repayments are credited here and pulled by the lender, so a lender that
    // can't receive ETH can never block a borrower from repaying.
    mapping(address => uint256) public pendingWithdrawals;

    address public admin;
    address public pendingAdmin;
    bool public paused;
    uint256 public maxLoanAmount;

    modifier onlyAdmin() {
        require(msg.sender == admin, "Caller is not the admin");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "Contract is currently paused by admin");
        _;
    }

    // Unused mapping slots read as Status.Requested, so every id must be checked.
    modifier loanExists(uint256 _loanId) {
        require(_loanId > 0 && _loanId <= loanCounter, "Loan does not exist");
        _;
    }

    event Requested(uint256 indexed loanId, address indexed borrower, uint256 principal);
    event Funded(uint256 indexed loanId, address indexed lender, uint256 principal);
    event Withdrawn(uint256 indexed loanId, address indexed borrower, uint256 principal);
    event Repaid(uint256 indexed loanId, address indexed borrower, uint256 repayment);
    event Defaulted(uint256 indexed loanId, address indexed borrower);
    event Cancelled(uint256 indexed loanId, address indexed borrower);
    event Refunded(uint256 indexed loanId, address indexed lender, uint256 principal);
    event PendingWithdrawn(address indexed lender, uint256 amount);
    event PausedStateChanged(bool isPaused);
    event MaxLoanLimitUpdated(uint256 newLimit);
    event AdminTransferStarted(address indexed currentAdmin, address indexed newAdmin);
    event AdminTransferred(address indexed previousAdmin, address indexed newAdmin);

    constructor() {
        admin = msg.sender;
        maxLoanAmount = 5 ether;
    }

    function togglePause() external onlyAdmin {
        paused = !paused;
        emit PausedStateChanged(paused);
    }

    function setMaxLoanAmount(uint256 _newLimit) external onlyAdmin {
        require(_newLimit > 0, "Limit must be greater than zero");
        maxLoanAmount = _newLimit;
        emit MaxLoanLimitUpdated(_newLimit);
    }

    // Two steps, so a typo in the address can't lock the admin out for good.
    function transferAdmin(address _newAdmin) external onlyAdmin {
        require(_newAdmin != address(0), "New admin is the zero address");
        pendingAdmin = _newAdmin;
        emit AdminTransferStarted(admin, _newAdmin);
    }

    function acceptAdmin() external {
        require(msg.sender == pendingAdmin, "Caller is not the pending admin");
        emit AdminTransferred(admin, pendingAdmin);
        admin = pendingAdmin;
        pendingAdmin = address(0);
    }

    function requestLoan(uint256 _principal, uint256 _repayment, uint256 _duration) external whenNotPaused {
        require(_principal > 0, "Principal must be greater than zero");
        require(_principal <= maxLoanAmount, "Requested amount exceeds admin maximum limit");
        require(_repayment >= _principal, "Repayment must cover the principal");
        require(_duration >= MIN_DURATION, "Duration must be at least one hour");

        loanCounter++;

        loans[loanCounter] = Loan({
            borrower: payable(msg.sender),
            lender: payable(address(0)),
            principal: _principal,
            repayment: _repayment,
            duration: _duration,
            dueDate: 0,
            status: Status.Requested
        });

        emit Requested(loanCounter, msg.sender, _principal);
    }

    // Borrower can withdraw an unfunded request. Allowed while paused.
    function cancelLoan(uint256 _loanId) external loanExists(_loanId) {
        Loan storage loan = loans[_loanId];

        require(loan.status == Status.Requested, "Loan not in Requested state");
        require(msg.sender == loan.borrower, "Only borrower can cancel");

        loan.status = Status.Cancelled;

        emit Cancelled(_loanId, msg.sender);
    }

    function fund(uint256 _loanId) external payable whenNotPaused loanExists(_loanId) {
        Loan storage loan = loans[_loanId];

        require(loan.status == Status.Requested, "Loan not in Requested state");
        require(msg.value == loan.principal, "Must fund the exact principal amount");
        require(msg.sender != loan.borrower, "Borrower cannot fund their own loan");

        loan.lender = payable(msg.sender);
        loan.dueDate = block.timestamp + loan.duration;
        loan.status = Status.Funded;

        emit Funded(_loanId, msg.sender, msg.value);
    }

    // Not pausable: a pause must not trap a lender's ETH or eat into the borrower's term.
    function withdrawToBorrower(uint256 _loanId) external loanExists(_loanId) {
        Loan storage loan = loans[_loanId];

        require(loan.status == Status.Funded, "Loan is not funded");
        require(msg.sender == loan.borrower, "Only borrower can withdraw");
        require(block.timestamp <= loan.dueDate, "Loan is past due date");

        loan.status = Status.Withdrawn;

        (bool success, ) = loan.borrower.call{value: loan.principal}("");
        require(success, "Withdrawal transfer failed");

        emit Withdrawn(_loanId, msg.sender, loan.principal);
    }

    // If the borrower never collects the principal, the lender gets it back after the due date.
    function reclaimFunding(uint256 _loanId) external loanExists(_loanId) {
        Loan storage loan = loans[_loanId];

        require(loan.status == Status.Funded, "Loan is not funded");
        require(msg.sender == loan.lender, "Only lender can reclaim");
        require(block.timestamp > loan.dueDate, "Loan is not yet past due");

        loan.status = Status.Refunded;

        (bool success, ) = loan.lender.call{value: loan.principal}("");
        require(success, "Refund transfer failed");

        emit Refunded(_loanId, msg.sender, loan.principal);
    }

    // Intentionally not pausable: a pause must not make a borrower miss the due date.
    function repay(uint256 _loanId) external payable loanExists(_loanId) {
        Loan storage loan = loans[_loanId];

        require(loan.status == Status.Withdrawn, "Loan not active");
        require(msg.value == loan.repayment, "Must pay exact repayment amount");
        require(block.timestamp <= loan.dueDate, "Loan is past due date");

        loan.status = Status.Repaid;
        pendingWithdrawals[loan.lender] += msg.value;

        emit Repaid(_loanId, loan.borrower, msg.value);
    }

    function withdrawPending() external {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "Nothing to withdraw");

        pendingWithdrawals[msg.sender] = 0;

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Withdrawal transfer failed");

        emit PendingWithdrawn(msg.sender, amount);
    }

    function markDefault(uint256 _loanId) external loanExists(_loanId) {
        Loan storage loan = loans[_loanId];

        require(loan.status == Status.Withdrawn, "Loan not active");
        require(block.timestamp > loan.dueDate, "Loan is not yet past due");

        loan.status = Status.Defaulted;

        emit Defaulted(_loanId, loan.borrower);
    }
}
