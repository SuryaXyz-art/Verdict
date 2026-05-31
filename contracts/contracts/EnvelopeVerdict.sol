// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./AgentArbitrated.sol";

/// @title EnvelopeVerdict — a sealed payment locked by a passcode hash; the recipient reveals it to claim.
contract EnvelopeVerdict is AgentArbitrated {
    struct Envelope {
        address sender;
        address recipient;
        uint256 amount;
        bytes32 lock;      // keccak256(passcode)
        string note;
        State state;
        uint256 requestId;
        Verdict verdict;
    }

    uint256 public count;
    mapping(uint256 => Envelope) public envelopes;

    event Sealed(uint256 indexed id, address indexed sender, address indexed recipient, uint256 amount);
    event Opened(uint256 indexed id);

    constructor(address r, uint256 a) AgentArbitrated(r, a) {}

    /// Sender seals funds for a recipient behind `lock = keccak256(passcode)`.
    function seal(address recipient, bytes32 lock, string calldata note) external payable returns (uint256 id) {
        require(recipient != address(0) && recipient != msg.sender, "bad recipient");
        require(msg.value > 0, "empty");
        require(lock != bytes32(0), "no lock");
        id = ++count;
        Envelope storage e = envelopes[id];
        e.sender = msg.sender;
        e.recipient = recipient;
        e.amount = msg.value;
        e.lock = lock;
        e.note = note;
        e.state = State.Open;
        emit Sealed(id, msg.sender, recipient, msg.value);
    }

    /// Recipient reveals the passcode to claim the funds.
    function open(uint256 id, string calldata passcode) external {
        Envelope storage e = envelopes[id];
        require(msg.sender == e.recipient, "only recipient");
        require(e.state == State.Open, "not open");
        require(keccak256(bytes(passcode)) == e.lock, "bad passcode");
        e.state = State.Resolved;
        e.verdict = Verdict.Release;
        reputation[e.recipient] += 1;
        _pay(e.recipient, e.amount);
        emit Opened(id);
        emit Resolved(id, Verdict.Release, 0);
    }

    /// Either party disputes (e.g. lost passcode); `msg.value` funds the AI verdict.
    function dispute(uint256 id, string calldata reason) external payable {
        Envelope storage e = envelopes[id];
        require(e.state == State.Open, "not open");
        require(msg.sender == e.sender || msg.sender == e.recipient, "not a party");
        e.note = reason;
        e.state = State.Judging;
        _startDispute(id);
    }

    function _parties(uint256 id) internal view override returns (address, address, uint256) {
        Envelope storage e = envelopes[id];
        return (e.sender, e.recipient, e.amount);
    }

    function _prompt(uint256 id) internal view override returns (string memory) {
        Envelope storage e = envelopes[id];
        return string.concat("ENVELOPE NOTE: ", e.note);
    }

    function _onJudging(uint256 id, uint256 requestId) internal override { envelopes[id].requestId = requestId; }
    function _onResolved(uint256 id, Verdict v) internal override { envelopes[id].state = State.Resolved; envelopes[id].verdict = v; }

    function getEnvelope(uint256 id) external view returns (Envelope memory) { return envelopes[id]; }
}
