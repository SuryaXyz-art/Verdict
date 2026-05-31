// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./AgentArbitrated.sol";

/// @title InvoiceVerdict — payee issues an invoice, the payer funds it, then accepts or disputes.
contract InvoiceVerdict is AgentArbitrated {
    struct Invoice {
        address payer;
        address payee;
        uint256 amount;
        string terms;
        string note;       // disputing party's statement
        State state;       // None = created/unfunded, Open = funded
        uint256 requestId;
        Verdict verdict;
    }

    uint256 public count;
    mapping(uint256 => Invoice) public invoices;

    event InvoiceCreated(uint256 indexed id, address indexed payee, address indexed payer, uint256 amount, string terms);
    event InvoicePaid(uint256 indexed id);

    constructor(address r, uint256 a) AgentArbitrated(r, a) {}

    /// Payee issues an invoice to a payer (no funds yet).
    function createInvoice(address payer, uint256 amount, string calldata terms) external returns (uint256 id) {
        require(payer != address(0) && payer != msg.sender, "bad payer");
        require(amount > 0, "no amount");
        id = ++count;
        Invoice storage i = invoices[id];
        i.payee = msg.sender;
        i.payer = payer;
        i.amount = amount;
        i.terms = terms;
        emit InvoiceCreated(id, msg.sender, payer, amount, terms);
    }

    /// Payer funds the exact invoice amount into escrow.
    function payInvoice(uint256 id) external payable {
        Invoice storage i = invoices[id];
        require(i.payee != address(0) && i.state == State.None, "not payable");
        require(msg.sender == i.payer, "only payer");
        require(msg.value == i.amount, "wrong amount");
        i.state = State.Open;
        emit InvoicePaid(id);
    }

    /// Payer accepts the work → releases escrow to the payee.
    function accept(uint256 id) external {
        Invoice storage i = invoices[id];
        require(msg.sender == i.payer, "only payer");
        require(i.state == State.Open, "not open");
        i.state = State.Resolved;
        i.verdict = Verdict.Release;
        reputation[i.payee] += 1;
        _pay(i.payee, i.amount);
        emit Resolved(id, Verdict.Release, 0);
    }

    /// Either party disputes a funded invoice; `msg.value` funds the AI verdict.
    function dispute(uint256 id, string calldata note) external payable {
        Invoice storage i = invoices[id];
        require(i.state == State.Open, "not open");
        require(msg.sender == i.payer || msg.sender == i.payee, "not a party");
        i.note = note;
        i.state = State.Judging;
        _startDispute(id);
    }

    function _parties(uint256 id) internal view override returns (address, address, uint256) {
        Invoice storage i = invoices[id];
        return (i.payer, i.payee, i.amount);
    }

    function _prompt(uint256 id) internal view override returns (string memory) {
        Invoice storage i = invoices[id];
        return string.concat("INVOICE TERMS: ", i.terms, "\nDISPUTE NOTE: ", bytes(i.note).length == 0 ? "(none)" : i.note);
    }

    function _onJudging(uint256 id, uint256 requestId) internal override { invoices[id].requestId = requestId; }
    function _onResolved(uint256 id, Verdict v) internal override { invoices[id].state = State.Resolved; invoices[id].verdict = v; }

    function getInvoice(uint256 id) external view returns (Invoice memory) { return invoices[id]; }
}
