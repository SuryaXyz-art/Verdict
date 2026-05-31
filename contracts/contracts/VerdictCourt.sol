// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./ISomniaAgents.sol";

/// @title VerdictCourt — trustless escrow with on-chain AI dispute resolution.
/// Funds are escrowed; on dispute, Somnia's deterministic LLM agent rules
/// RELEASE / REFUND / SPLIT via consensus, and the contract settles automatically.
contract VerdictCourt {
    enum State { None, Open, Judging, Resolved }
    enum Verdict { None, Release, Refund, Split }

    struct Deal {
        address client;        // pays into escrow
        address provider;      // delivers the work
        uint256 amount;        // escrowed funds
        string terms;          // agreed deliverable
        string clientEvidence;
        string providerEvidence;
        State state;
        uint256 requestId;     // Somnia agent request (for receipt link)
        Verdict verdict;
    }

    // --- Somnia Agents config (testnet defaults; see docs Gas Fees) ---
    IAgentRequester public immutable agentRequester;
    uint256 public immutable llmAgentId;
    uint256 public constant SUBCOMMITTEE_SIZE = 3;          // platform default
    uint256 public constant LLM_PRICE_PER_AGENT = 0.07 ether; // LLM Inference price

    uint256 public dealCount;
    mapping(uint256 => Deal) public deals;
    mapping(uint256 => uint256) public requestToDeal; // agent requestId => dealId
    mapping(address => uint256) public reputation;

    event DealCreated(uint256 indexed id, address indexed client, address indexed provider, uint256 amount, string terms);
    event EvidenceSubmitted(uint256 indexed id, address indexed party, string evidence);
    event DeliveryConfirmed(uint256 indexed id);
    event Disputed(uint256 indexed id, uint256 indexed requestId);
    event Resolved(uint256 indexed id, Verdict verdict, uint256 indexed requestId);

    constructor(address _agentRequester, uint256 _llmAgentId) {
        agentRequester = IAgentRequester(_agentRequester);
        llmAgentId = _llmAgentId;
    }

    /// Client escrows `msg.value` for a deal with `provider`.
    function createDeal(address provider, string calldata terms) external payable returns (uint256 id) {
        require(provider != address(0) && provider != msg.sender, "bad provider");
        require(msg.value > 0, "no escrow");
        id = ++dealCount;
        Deal storage d = deals[id];
        d.client = msg.sender;
        d.provider = provider;
        d.amount = msg.value;
        d.terms = terms;
        d.state = State.Open;
        emit DealCreated(id, msg.sender, provider, msg.value, terms);
    }

    function submitEvidence(uint256 id, string calldata evidence) external {
        Deal storage d = deals[id];
        require(d.state == State.Open, "not open");
        if (msg.sender == d.client) d.clientEvidence = evidence;
        else if (msg.sender == d.provider) d.providerEvidence = evidence;
        else revert("not a party");
        emit EvidenceSubmitted(id, msg.sender, evidence);
    }

    /// Happy path: client releases escrow to provider, no AI needed.
    function confirmDelivery(uint256 id) external {
        Deal storage d = deals[id];
        require(msg.sender == d.client, "only client");
        require(d.state == State.Open, "not open");
        d.state = State.Resolved;
        d.verdict = Verdict.Release;
        reputation[d.provider] += 1;
        _pay(d.provider, d.amount);
        emit Resolved(id, Verdict.Release, 0);
    }

    /// Exact deposit needed to fund a dispute's agent invocation.
    function disputeDeposit() public view returns (uint256) {
        return agentRequester.getRequestDeposit() + LLM_PRICE_PER_AGENT * SUBCOMMITTEE_SIZE;
    }

    /// Either party opens a dispute; `msg.value` funds the AI verdict.
    function dispute(uint256 id) external payable {
        Deal storage d = deals[id];
        require(d.state == State.Open, "not open");
        require(msg.sender == d.client || msg.sender == d.provider, "not a party");
        uint256 deposit = disputeDeposit();
        require(msg.value >= deposit, "underfunded");

        string[] memory allowed = new string[](3);
        allowed[0] = "RELEASE";
        allowed[1] = "REFUND";
        allowed[2] = "SPLIT";

        bytes memory payload = abi.encodeWithSelector(
            ILLMAgent.inferString.selector,
            _buildPrompt(d),
            "You are an impartial on-chain arbiter. Based strictly on the deal terms and the evidence from both parties, decide the outcome. RELEASE pays the provider, REFUND returns funds to the client, SPLIT divides funds equally. Reply with exactly one of the allowed values.",
            true,      // chainOfThought (visible in the receipt)
            allowed
        );

        d.state = State.Judging;
        uint256 requestId = agentRequester.createRequest{value: deposit}(
            llmAgentId,
            address(this),
            this.handleResponse.selector,
            payload
        );
        d.requestId = requestId;
        requestToDeal[requestId] = id;
        emit Disputed(id, requestId);

        // Refund any overpayment (state is already Judging, so this is reentrancy-safe).
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
        uint256 id = requestToDeal[requestId];
        require(id != 0, "unknown request");
        Deal storage d = deals[id];
        require(d.state == State.Judging, "not judging");
        delete requestToDeal[requestId];

        // On failure/timeout, refund the client (safe default).
        if (status != ResponseStatus.Success || responses.length == 0) {
            _resolve(id, d, Verdict.Refund);
            return;
        }

        string memory verdict = abi.decode(responses[0].result, (string));
        bytes32 v = keccak256(bytes(verdict));
        if (v == keccak256("RELEASE")) _resolve(id, d, Verdict.Release);
        else if (v == keccak256("SPLIT")) _resolve(id, d, Verdict.Split);
        else _resolve(id, d, Verdict.Refund);
    }

    function _resolve(uint256 id, Deal storage d, Verdict verdict) internal {
        d.state = State.Resolved;
        d.verdict = verdict;
        uint256 amt = d.amount;
        if (verdict == Verdict.Release) {
            reputation[d.provider] += 1;
            _pay(d.provider, amt);
        } else if (verdict == Verdict.Refund) {
            reputation[d.client] += 1;
            _pay(d.client, amt);
        } else {
            _pay(d.provider, amt / 2);
            _pay(d.client, amt - amt / 2);
        }
        emit Resolved(id, verdict, d.requestId);
    }

    function _buildPrompt(Deal storage d) internal view returns (string memory) {
        return string.concat(
            "DEAL TERMS: ", d.terms,
            "\nCLIENT EVIDENCE: ", bytes(d.clientEvidence).length == 0 ? "(none)" : d.clientEvidence,
            "\nPROVIDER EVIDENCE: ", bytes(d.providerEvidence).length == 0 ? "(none)" : d.providerEvidence
        );
    }

    function _pay(address to, uint256 amount) internal {
        (bool ok, ) = payable(to).call{value: amount}("");
        require(ok, "pay failed");
    }

    function getDeal(uint256 id) external view returns (Deal memory) {
        return deals[id];
    }

    // Accept rebates from the Somnia platform (required — see docs Gas Fees).
    receive() external payable {}
}
