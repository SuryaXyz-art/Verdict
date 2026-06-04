import { expect } from "chai";
import { ethers } from "hardhat";

const ONE = ethers.parseEther("1");
const Status = { Success: 2, Failed: 3 };

// `c` is a non-party signer used to push the mock verdict, so no party pays gas
// inside changeEtherBalance assertions.
async function mock() {
  const Mock = await ethers.getContractFactory("MockAgentRequester");
  return Mock.deploy();
}

describe("InvoiceVerdict", () => {
  async function deploy() {
    const [payee, payer, c] = await ethers.getSigners();
    const m = await mock();
    const inv = await (await ethers.getContractFactory("InvoiceVerdict")).deploy(await m.getAddress(), 1n);
    return { inv, m, payee, payer, c };
  }

  it("payee invoices, payer funds and accepts → payee paid", async () => {
    const { inv, payee, payer } = await deploy();
    await inv.connect(payee).createInvoice(payer.address, ONE, "40h dev");
    await inv.connect(payer).payInvoice(1, { value: ONE });
    await expect(inv.connect(payer).accept(1)).to.changeEtherBalance(payee, ONE);
    expect((await inv.getInvoice(1)).state).to.equal(3);
  });

  it("rejects a wrong funding amount", async () => {
    const { inv, payee, payer } = await deploy();
    await inv.connect(payee).createInvoice(payer.address, ONE, "x");
    await expect(inv.connect(payer).payInvoice(1, { value: ONE / 2n })).to.be.revertedWith("wrong amount");
  });

  it("AI REFUND returns funds to the payer", async () => {
    const { inv, m, payee, payer, c } = await deploy();
    await inv.connect(payee).createInvoice(payer.address, ONE, "x");
    await inv.connect(payer).payInvoice(1, { value: ONE });
    await inv.connect(payer).dispute(1, "not delivered", { value: await inv.disputeDeposit() });
    await expect(m.connect(c).fulfill(1, "REFUND", Status.Success)).to.changeEtherBalance(payer, ONE);
  });

  it("forceSettle after timeout refunds the payer (escape hatch)", async () => {
    const { inv, payee, payer } = await deploy();
    await inv.connect(payee).createInvoice(payer.address, ONE, "x");
    await inv.connect(payer).payInvoice(1, { value: ONE });
    const dep = await inv.disputeDeposit();
    await inv.connect(payee).dispute(1, "dispute note", { value: dep });

    // too early
    await expect(inv.connect(payer).forceSettle(1)).to.be.revertedWith("too early");

    // advance 24h+
    await ethers.provider.send("evm_increaseTime", [24 * 60 * 60 + 10]);
    await ethers.provider.send("evm_mine", []);

    // either party can force Refund to payer
    await expect(inv.connect(payee).forceSettle(1)).to.changeEtherBalance(payer, ONE);
    const i = await inv.getInvoice(1);
    expect(i.state).to.equal(3); // Resolved
    expect(i.verdict).to.equal(2); // Refund
  });
});

describe("GiftVerdict", () => {
  async function deploy() {
    const [sender, recipient, c] = await ethers.getSigners();
    const m = await mock();
    const gift = await (await ethers.getContractFactory("GiftVerdict")).deploy(await m.getAddress(), 1n);
    return { gift, m, sender, recipient, c };
  }

  it("recipient pull-claims the gift", async () => {
    const { gift, sender, recipient } = await deploy();
    await gift.connect(sender).sendGift(recipient.address, "hbd", { value: ONE });
    await expect(gift.connect(recipient).claim(1)).to.changeEtherBalance(gift, -ONE);
    expect((await gift.getGift(1)).verdict).to.equal(1); // Release
  });

  it("only the recipient can claim", async () => {
    const { gift, sender, recipient } = await deploy();
    await gift.connect(sender).sendGift(recipient.address, "x", { value: ONE });
    await expect(gift.connect(sender).claim(1)).to.be.revertedWith("only recipient");
  });

  it("AI SPLIT divides the gift", async () => {
    const { gift, m, sender, recipient, c } = await deploy();
    await gift.connect(sender).sendGift(recipient.address, "x", { value: ONE });
    await gift.connect(sender).dispute(1, "sent by mistake", { value: await gift.disputeDeposit() });
    await expect(m.connect(c).fulfill(1, "SPLIT", Status.Success)).to.changeEtherBalances([sender, recipient], [ONE / 2n, ONE / 2n]);
  });
});

describe("EnvelopeVerdict", () => {
  const code = "open-sesame";
  const lock = ethers.keccak256(ethers.toUtf8Bytes(code));

  async function deploy() {
    const [sender, recipient, c] = await ethers.getSigners();
    const m = await mock();
    const env = await (await ethers.getContractFactory("EnvelopeVerdict")).deploy(await m.getAddress(), 1n);
    return { env, m, sender, recipient, c };
  }

  it("recipient opens with the correct passcode", async () => {
    const { env, sender, recipient } = await deploy();
    await env.connect(sender).seal(recipient.address, lock, "note", { value: ONE });
    await expect(env.connect(recipient).open(1, code)).to.changeEtherBalance(env, -ONE);
  });

  it("rejects a wrong passcode", async () => {
    const { env, sender, recipient } = await deploy();
    await env.connect(sender).seal(recipient.address, lock, "note", { value: ONE });
    await expect(env.connect(recipient).open(1, "wrong")).to.be.revertedWith("bad passcode");
  });

  it("AI RELEASE pays the recipient", async () => {
    const { env, m, sender, recipient, c } = await deploy();
    await env.connect(sender).seal(recipient.address, lock, "note", { value: ONE });
    await env.connect(recipient).dispute(1, "lost code", { value: await env.disputeDeposit() });
    await expect(m.connect(c).fulfill(1, "RELEASE", Status.Success)).to.changeEtherBalance(recipient, ONE);
  });
});
