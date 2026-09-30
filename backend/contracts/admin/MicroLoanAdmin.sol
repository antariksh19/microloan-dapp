// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/// @title MicroLoanAdmin
/// @notice Admin controls for MicroLoan: a pause switch and loan limits.
/// @dev MicroLoan inherits this contract. In MicroLoan.sol:
///   - add `whenNotPaused` to requestLoan, fund and withdrawToBorrower
///   - call `_checkLimits(principal, dueDate)` at the top of requestLoan
///   - leave repay and markDefault unpaused, so a pause never pushes
///     a borrower into default
/// Uses OpenZeppelin v5 paths. On v4, Pausable lives in security/Pausable.sol
/// and Ownable takes no constructor argument.
abstract contract MicroLoanAdmin is Ownable, Pausable {
    /// @notice Largest principal a borrower can request, in wei. 0 means no limit.
    uint256 public maxPrincipal;

    /// @notice Longest loan term, in seconds from the time of request. 0 means no limit.
    uint64 public maxDuration;

    event LimitsUpdated(uint256 maxPrincipal, uint64 maxDuration);

    error PrincipalAboveLimit(uint256 requested, uint256 limit);
    error DurationAboveLimit(uint256 requested, uint64 limit);

    constructor(uint256 initialMaxPrincipal, uint64 initialMaxDuration) Ownable(msg.sender) {
        _setLimits(initialMaxPrincipal, initialMaxDuration);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function setLimits(uint256 newMaxPrincipal, uint64 newMaxDuration) external onlyOwner {
        _setLimits(newMaxPrincipal, newMaxDuration);
    }

    function _setLimits(uint256 newMaxPrincipal, uint64 newMaxDuration) internal {
        maxPrincipal = newMaxPrincipal;
        maxDuration = newMaxDuration;
        emit LimitsUpdated(newMaxPrincipal, newMaxDuration);
    }

    /// @dev Call from requestLoan. Reverts with a custom error the UI can decode.
    function _checkLimits(uint256 principal, uint64 dueDate) internal view {
        if (maxPrincipal != 0 && principal > maxPrincipal) {
            revert PrincipalAboveLimit(principal, maxPrincipal);
        }
        if (maxDuration != 0) {
            uint256 term = dueDate > block.timestamp ? dueDate - block.timestamp : 0;
            if (term > maxDuration) revert DurationAboveLimit(term, maxDuration);
        }
    }
}
