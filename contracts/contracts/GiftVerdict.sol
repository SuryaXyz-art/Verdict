// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./AgentArbitrated.sol";

/// @title GiftVerdict — sender funds a gift; the recipient pull-claims it, or it goes to AI arbitration.
contract GiftVerdict is AgentArbitrated {
    struct Gift {
        address sender;
        address recipient;
        uint256 amount;
        string message;
        string note;       // disputing party's statement
        State state;
        uint256 requestId;
        Verdict verdict;
        uint256 judgedAt; // when entered Judging (for forceSettle escape hatch)
    }

    uint256 public count;
    mapping(uint256 => Gift) public gifts;

    event GiftSent(uint256 indexed id, address indexed sender, address indexed recipient, uint256 amount, string message);

    constructor(address r, uint256 a) AgentArbitrated(r, a) {}

    /// Sender funds a gift for a recipient.
    function sendGift(address recipient, string calldata message) external payable returns (uint256 id) {
        require(recipient != address(0) && recipient != msg.sender, "bad recipient");
        require(msg.value > 0, "no gift");
        id = ++count;
        Gift storage g = gifts[id];
        g.sender = msg.sender;
        g.recipient = recipient;
        g.amount = msg.value;
        g.message = message;
        g.state = State.Open;
        emit GiftSent(id, msg.sender, recipient, msg.value, message);
    }

    /// Recipient pulls the gift to themselves.
    function claim(uint256 id) external {
        Gift storage g = gifts[id];
        require(msg.sender == g.recipient, "only recipient");
        require(g.state == State.Open, "not open");
        g.state = State.Resolved;
        g.verdict = Verdict.Release;
        reputation[g.recipient] += 1;
        _pay(g.recipient, g.amount);
        emit Resolved(id, Verdict.Release, 0);
    }

    /// Either party disputes (e.g. sent by mistake); `msg.value` funds the AI verdict.
    function dispute(uint256 id, string calldata note) external payable {
        Gift storage g = gifts[id];
        require(g.state == State.Open, "not open");
        require(msg.sender == g.sender || msg.sender == g.recipient, "not a party");
        g.note = note;
        g.state = State.Judging;
        _startDispute(id);
    }

    function _parties(uint256 id) internal view override returns (address, address, uint256) {
        Gift storage g = gifts[id];
        return (g.sender, g.recipient, g.amount);
    }

    function _prompt(uint256 id) internal view override returns (string memory) {
        Gift storage g = gifts[id];
        return string.concat("GIFT MESSAGE: ", g.message, "\nDISPUTE NOTE: ", bytes(g.note).length == 0 ? "(none)" : g.note);
    }

    function _onJudging(uint256 id, uint256 requestId) internal override {
        gifts[id].requestId = requestId;
        gifts[id].judgedAt = judgedAt[id]; // copy for getGift() completeness + UI
    }
    function _onResolved(uint256 id, Verdict v) internal override { gifts[id].state = State.Resolved; gifts[id].verdict = v; }

    function getGift(uint256 id) external view returns (Gift memory) { return gifts[id]; }
}
