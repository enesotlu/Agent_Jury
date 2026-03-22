// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title AgentJury - On-chain AI Agent Evaluation Verdicts
/// @notice Stores AI agent jury verdicts for project/product idea evaluations
contract AgentJury {
    struct Verdict {
        bytes32 caseHash;
        uint8 feasibilityScore;
        uint8 innovationScore;
        uint8 riskScore;
        uint8 finalScore;
        string shortVerdict;   // "Ship MVP" | "Iterate" | "Reject"
        address submitter;
        uint256 timestamp;
    }

    /// @notice All stored verdicts
    mapping(uint256 => Verdict) public verdicts;

    /// @notice Total number of verdicts saved
    uint256 public verdictCount;

    /// @notice Emitted when a new verdict is saved on-chain
    event VerdictSaved(
        uint256 indexed verdictId,
        bytes32 caseHash,
        uint8 finalScore,
        string shortVerdict,
        address indexed submitter,
        uint256 timestamp
    );

    /// @notice Save an AI jury verdict on-chain
    /// @param _caseHash  keccak256 hash of the case text
    /// @param _feasibility Feasibility agent score (0-100)
    /// @param _innovation  Innovation agent score (0-100)
    /// @param _risk        Risk agent score (0-100, higher = safer)
    /// @param _finalScore  Weighted final score (0-100)
    /// @param _shortVerdict Short verdict string ("Ship MVP", "Iterate", or "Reject")
    function saveVerdict(
        bytes32 _caseHash,
        uint8 _feasibility,
        uint8 _innovation,
        uint8 _risk,
        uint8 _finalScore,
        string calldata _shortVerdict
    ) external {
        require(_feasibility <= 100, "Feasibility score must be 0-100");
        require(_innovation <= 100, "Innovation score must be 0-100");
        require(_risk <= 100, "Risk score must be 0-100");
        require(_finalScore <= 100, "Final score must be 0-100");
        require(bytes(_shortVerdict).length > 0, "Verdict cannot be empty");
        require(bytes(_shortVerdict).length <= 140, "Verdict too long");

        uint256 id = verdictCount;
        verdicts[id] = Verdict({
            caseHash: _caseHash,
            feasibilityScore: _feasibility,
            innovationScore: _innovation,
            riskScore: _risk,
            finalScore: _finalScore,
            shortVerdict: _shortVerdict,
            submitter: msg.sender,
            timestamp: block.timestamp
        });

        emit VerdictSaved(id, _caseHash, _finalScore, _shortVerdict, msg.sender, block.timestamp);
        verdictCount++;
    }

    /// @notice Get a verdict by its ID
    /// @param _id Verdict ID
    /// @return The full Verdict struct
    function getVerdict(uint256 _id) external view returns (Verdict memory) {
        require(_id < verdictCount, "Verdict does not exist");
        return verdicts[_id];
    }
}
