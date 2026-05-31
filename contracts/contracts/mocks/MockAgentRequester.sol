// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../ISomniaAgents.sol";

/// Minimal local stand-in for the Somnia platform, used only in tests.
/// Lets a test fund a request then push a simulated consensus verdict back.
contract MockAgentRequester {
    uint256 public nextId = 1;
    uint256 public constant FLOOR = 0.03 ether;

    struct Pending { address cb; bytes4 sel; }
    mapping(uint256 => Pending) public pending;

    function getRequestDeposit() external pure returns (uint256) { return FLOOR; }

    function createRequest(
        uint256 /*agentId*/,
        address callbackAddress,
        bytes4 callbackSelector,
        bytes calldata /*payload*/
    ) external payable returns (uint256 requestId) {
        requestId = nextId++;
        pending[requestId] = Pending(callbackAddress, callbackSelector);
    }

    /// Test helper: simulate validators returning `verdict` with given status.
    function fulfill(uint256 requestId, string calldata verdict, ResponseStatus status) external {
        Pending memory p = pending[requestId];
        require(p.cb != address(0), "no request");
        delete pending[requestId];

        Response[] memory responses = new Response[](1);
        responses[0] = Response({
            validator: address(this),
            result: abi.encode(verdict),
            status: status,
            receipt: 1,
            timestamp: block.timestamp,
            executionCost: 0
        });
        Request memory details;
        (bool ok, ) = p.cb.call(abi.encodeWithSelector(p.sel, requestId, responses, status, details));
        require(ok, "callback failed");
    }
}
