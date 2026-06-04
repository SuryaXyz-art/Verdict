import { expect } from "chai";
import { ethers } from "hardhat";

const ONE = ethers.parseEther("1");
const Status = { Success: 2, Failed: 3 };

async function deploy() {
  const [client, provider] = await ethers.getSigners();
  const Mock = await ethers.getContractFactory("MockAgentRequester");
  const mock = await Mock.deploy();
  const Court = await ethers.getContractFactory("VerdictCourt");
  const court = await Court.deploy(await mock.getAddress(), 1n);
  return { court, mock, client, provider };
}

describe("VerdictCourt", () => {
  it("escrows and releases on confirmDelivery", async () => {
    const { court, client, provider } = await deploy();
    await court.connect(client).createDeal(provider.address, "logo design", { value: ONE });
    await expect(court.connect(client).confirmDelivery(1)).to.changeEtherBalance(provider, ONE);
    expect(await court.reputation(provider.address)).to.equal(1n);
  });

  it("resolves a dispute via AI verdict (RELEASE pays provider)", async () => {
    const { court, mock, client, provider } = await deploy();
    await court.connect(client).createDeal(provider.address, "build API", { value: ONE });
    const dep = await court.disputeDeposit();
    await court.connect(client).dispute(1, { value: dep });
    await expect(mock.fulfill(1, "RELEASE", Status.Success)).to.changeEtherBalance(provider, ONE);
    const d = await court.getDeal(1);
    expect(d.state).to.equal(3); // Resolved
    expect(d.verdict).to.equal(1); // Release
  });

  it("SPLIT divides escrow equally", async () => {
    const { court, mock, client, provider } = await deploy();
    await court.connect(client).createDeal(provider.address, "x", { value: ONE });
    await court.connect(provider).dispute(1, { value: await court.disputeDeposit() });
    await expect(mock.fulfill(1, "SPLIT", Status.Success))
      .to.changeEtherBalances([client, provider], [ONE / 2n, ONE / 2n]);
  });

  it("refunds client on agent failure", async () => {
    const { court, mock, client, provider } = await deploy();
    await court.connect(client).createDeal(provider.address, "x", { value: ONE });
    await court.connect(client).dispute(1, { value: await court.disputeDeposit() });
    await expect(mock.fulfill(1, "", Status.Failed)).to.changeEtherBalance(client, ONE);
  });

  it("rejects evidence from a non-party", async () => {
    const { court, client, provider } = await deploy();
    const [, , stranger] = await ethers.getSigners();
    await court.connect(client).createDeal(provider.address, "x", { value: ONE });
    await expect(court.connect(stranger).submitEvidence(1, "hi")).to.be.revertedWith("not a party");
  });

  it("rejects an underfunded dispute", async () => {
    const { court, client, provider } = await deploy();
    await court.connect(client).createDeal(provider.address, "x", { value: ONE });
    await expect(court.connect(client).dispute(1, { value: 1n })).to.be.revertedWith("underfunded");
  });

  it("cannot dispute a deal that is already resolved", async () => {
    const { court, client, provider } = await deploy();
    await court.connect(client).createDeal(provider.address, "x", { value: ONE });
    await court.connect(client).confirmDelivery(1);
    await expect(court.connect(client).dispute(1, { value: await court.disputeDeposit() })).to.be.revertedWith("not open");
  });

  it("only the platform can deliver a verdict", async () => {
    const { court, client, provider } = await deploy();
    await court.connect(client).createDeal(provider.address, "x", { value: ONE });
    await court.connect(client).dispute(1, { value: await court.disputeDeposit() });
    const empty: any[] = [];
    const req: any = [0, ethers.ZeroAddress, ethers.ZeroAddress, "0x00000000", [], [], 0, 0, 0, 0, 0, 0, 0, 0, 0];
    await expect(court.connect(client).handleResponse(1, empty, 2, req)).to.be.revertedWith("only platform");
  });

  it("rejects createDeal with a bad provider or no escrow", async () => {
    const { court, client, provider } = await deploy();
    await expect(court.connect(client).createDeal(client.address, "x", { value: ONE })).to.be.revertedWith("bad provider");
    await expect(court.connect(client).createDeal(provider.address, "x", { value: 0 })).to.be.revertedWith("no escrow");
  });

  it("only the client can confirm delivery", async () => {
    const { court, client, provider } = await deploy();
    await court.connect(client).createDeal(provider.address, "x", { value: ONE });
    await expect(court.connect(provider).confirmDelivery(1)).to.be.revertedWith("only client");
  });

  it("REFUND verdict pays the client and bumps client reputation", async () => {
    const { court, mock, client, provider } = await deploy();
    await court.connect(client).createDeal(provider.address, "x", { value: ONE });
    await court.connect(provider).dispute(1, { value: await court.disputeDeposit() });
    await expect(mock.fulfill(1, "REFUND", Status.Success)).to.changeEtherBalance(client, ONE);
    expect(await court.reputation(client.address)).to.equal(1n);
  });

  it("refunds dispute overpayment to the sender", async () => {
    const { court, mock, client, provider } = await deploy();
    await court.connect(client).createDeal(provider.address, "x", { value: ONE });
    const dep = await court.disputeDeposit();
    // Sends dep + ONE; only `dep` reaches the platform, the surplus ONE is refunded
    // (court's balance change is 0 — it keeps just the original escrow).
    await expect(court.connect(client).dispute(1, { value: dep + ONE }))
      .to.changeEtherBalances([mock, court], [dep, 0n]);
  });

  it("forceSettle after timeout refunds client (escape hatch, no platform callback needed)", async () => {
    const { court, client, provider } = await deploy();
    await court.connect(client).createDeal(provider.address, "x", { value: ONE });
    const dep = await court.disputeDeposit();
    await court.connect(client).dispute(1, { value: dep });

    await expect(court.connect(provider).forceSettle(1)).to.be.revertedWith("too early");

    await ethers.provider.send("evm_increaseTime", [24 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);

    // forces Refund to client
    await expect(court.connect(provider).forceSettle(1)).to.changeEtherBalance(client, ONE);
    const d = await court.getDeal(1);
    expect(d.state).to.equal(3); // Resolved
    expect(d.verdict).to.equal(2); // Refund
    // requestId kept for potential receipt, but event used 0 (we don't assert event here)
  });
});
