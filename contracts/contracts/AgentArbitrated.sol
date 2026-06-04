// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./ISomniaAgents.sol";

/// @title AgentArbitrated — shared base for Verdikt feature contracts.
/// Holds the Somnia Agents dispute plumbing (request → consensus callback → settle).
/// Each feature defines its own funding/claim flow and implements the hooks below.
abstract contract AgentArbitrated {
    enum State { None, Open, Judging, Resolved }
    enum Verdict { None, Release, Refund, Split }

    IAgentRequester public immutable agentRequester;
    uint256 public immutable llmAgentId;
    uint256 public constant SUBCOMMITTEE_SIZE = 3;
    uint256 public constant LLM_PRICE_PER_AGENT = 0.07 ether;

    mapping(uint256 => uint256) public requestToCase; // agent requestId => caseId
    mapping(address => uint256) public reputation;

    // Escape hatch: if platform never calls back (outage, timeout, etc.), parties can force Refund.
    uint256 public constant JUDGMENT_TIMEOUT = 24 hours;
    mapping(uint256 => uint256) public judgedAt;        // case id => block.timestamp when entered Judging
    mapping(uint256 => uint256) public caseToRequestId; // case id => agent requestId (for safe cleanup on force)

    event Disputed(uint256 indexed id, uint256 indexed requestId);
    event Resolved(uint256 indexed id, Verdict verdict, uint256 indexed requestId);

    constructor(address _agentRequester, uint256 _llmAgentId) {
        agentRequester = IAgentRequester(_agentRequester);
        llmAgentId = _llmAgentId;
    }

    function disputeDeposit() public view returns (uint256) {
        return agentRequester.getRequestDeposit() + LLM_PRICE_PER_AGENT * SUBCOMMITTEE_SIZE;
    }

    /// Feature calls this after setting its case to Judging. `msg.value` funds the AI verdict.
    function _startDispute(uint256 id) internal {
        uint256 deposit = disputeDeposit();
        require(msg.value >= deposit, "underfunded");

        string[] memory allowed = new string[](3);
        allowed[0] = "RELEASE";
        allowed[1] = "REFUND";
        allowed[2] = "SPLIT";

        bytes memory payload = abi.encodeWithSelector(
            ILLMAgent.inferString.selector,
            _prompt(id),
            "You are an impartial on-chain arbiter. Based strictly on the terms and evidence, decide the outcome. RELEASE pays the payee/recipient, REFUND returns funds to the payer/sender, SPLIT divides funds equally. Reply with exactly one of the allowed values.",
            true,
            allowed
        );

        uint256 requestId = agentRequester.createRequest{value: deposit}(
            llmAgentId, address(this), this.handleResponse.selector, payload
        );
        requestToCase[requestId] = id;
        caseToRequestId[id] = requestId;
        judgedAt[id] = block.timestamp;
        _onJudging(id, requestId);
        emit Disputed(id, requestId);

        if (msg.value > deposit) _pay(msg.sender, msg.value - deposit);
    }

    /// Somnia platform callback once validators reach consensus.
    function handleResponse(
        uint256 requestId,
        Response[] memory responses,
        ResponseStatus status,
        Request memory /*details*/
    ) external {
        require(msg.sender == address(agentRequester), "only platform");
        uint256 id = requestToCase[requestId];
        require(id != 0, "unknown request");
        delete requestToCase[requestId];
        delete caseToRequestId[id];
        delete judgedAt[id];

        Verdict v = Verdict.Refund; // safe default on failure/timeout
        if (status == ResponseStatus.Success && responses.length > 0) {
            bytes32 h = keccak256(bytes(abi.decode(responses[0].result, (string))));
            if (h == keccak256("RELEASE")) v = Verdict.Release;
            else if (h == keccak256("SPLIT")) v = Verdict.Split;
        }
        _settle(id, v, requestId);
    }

    /// Manual escape hatch. Either party may call after JUDGMENT_TIMEOUT has elapsed
    /// since the dispute started (i.e. platform never delivered handleResponse due to
    /// outage, timeout, or other edge case). Forces a Refund (safe default) and cleans
    /// up any pending request mapping so a late callback cannot double-settle.
    function forceSettle(uint256 id) external {
        (address payer, address payee, ) = _parties(id);
        require(msg.sender == payer || msg.sender == payee, "not a party");

        uint256 started = judgedAt[id];
        require(started != 0, "not judging");
        require(block.timestamp >= started + JUDGMENT_TIMEOUT, "too early");

        uint256 requestId = caseToRequestId[id];
        if (requestId != 0) {
            delete requestToCase[requestId];
            delete caseToRequestId[id];
        }
        delete judgedAt[id];

        _settle(id, Verdict.Refund, 0); // 0 in event signals forced/manual refund
    }

    function _settle(uint256 id, Verdict v, uint256 requestId) internal {
        _onResolved(id, v);
        (address payer, address payee, uint256 amount) = _parties(id);
        if (v == Verdict.Release) {
            reputation[payee] += 1;
            _pay(payee, amount);
        } else if (v == Verdict.Refund) {
            reputation[payer] += 1;
            _pay(payer, amount);
        } else {
            _pay(payee, amount / 2);
            _pay(payer, amount - amount / 2);
        }
        emit Resolved(id, v, requestId);
    }

    function _pay(address to, uint256 amount) internal {
        (bool ok, ) = payable(to).call{value: amount}("");
        require(ok, "pay failed");
    }

    // --- hooks each feature implements ---
    function _parties(uint256 id) internal view virtual returns (address payer, address payee, uint256 amount);
    function _prompt(uint256 id) internal view virtual returns (string memory);
    function _onJudging(uint256 id, uint256 requestId) internal virtual;
    function _onResolved(uint256 id, Verdict v) internal virtual;

    // Accept rebates from the Somnia platform (see docs Gas Fees).
    receive() external payable {}
}
