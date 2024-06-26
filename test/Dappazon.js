const { expect } = require("chai");

// Helper function to convert number of tokens to ether units
const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(), 'ether');
};

// Global constants for listing an item
const ID = 1;
const NAME = "Shoes";
const CATEGORY = "Clothing";
const IMAGE = "https://ipfs.io/ipfs/QmTYEboq8raiBs7GTUg2yLXB3PMz6HuBNgNfSZBx5Msztg/shoes.jpg";
const COST = tokens(1); // Cost of the item in ether units
const RATING = 4;
const STOCK = 5;

describe("Dappazon", () => {
  let dappazon;
  let deployer, buyer;

  beforeEach(async () => {
    // Setup accounts
    [deployer, buyer] = await ethers.getSigners();

    // Deploy contract
    const Dappazon = await ethers.getContractFactory("Dappazon");
    dappazon = await Dappazon.deploy();
  });

  describe("Deployment", () => {
    it("Sets the owner", async () => {
      expect(await dappazon.owner()).to.equal(deployer.address);
    });
  });

  describe("Listing", () => {
    let transaction;

    beforeEach(async () => {
      // List an item
      transaction = await dappazon.connect(deployer).list(ID, NAME, CATEGORY, IMAGE, COST, RATING, STOCK);
      await transaction.wait();
    });

    it("Returns item attributes", async () => {
      // Check item details after listing
      const item = await dappazon.items(ID);

      expect(item.id).to.equal(ID);
      expect(item.name).to.equal(NAME);
      expect(item.category).to.equal(CATEGORY);
      expect(item.image).to.equal(IMAGE);
      expect(item.cost).to.equal(COST);
      expect(item.rating).to.equal(RATING);
      expect(item.stock).to.equal(STOCK);
    });

    it("Emits List event", () => {
      // Check if the 'List' event was emitted correctly
      expect(transaction).to.emit(dappazon, "List");
    });
  });

  describe("Buying", () => {
    let transaction;

    beforeEach(async () => {
      // List an item
      transaction = await dappazon.connect(deployer).list(ID, NAME, CATEGORY, IMAGE, COST, RATING, STOCK);
      await transaction.wait();

      // Buy an item
      transaction = await dappazon.connect(buyer).buy(ID, { value: COST });
      await transaction.wait();
    });

    it("Updates buyer's order count", async () => {
      // Check if buyer's order count is updated
      const result = await dappazon.orderCount(buyer.address);
      expect(result).to.equal(1);
    });

    it("Adds the order", async () => {
      // Check details of the order added
      const order = await dappazon.orders(buyer.address, 1);

      expect(order.time).to.be.greaterThan(0);
      expect(order.item.name).to.equal(NAME);
    });

    it("Updates the contract balance", async () => {
      // Check if the contract's balance is updated after purchase
      const result = await ethers.provider.getBalance(dappazon.address);
      expect(result).to.equal(COST);
    });

    it("Emits Buy event", () => {
      // Check if the 'Buy' event was emitted correctly
      expect(transaction).to.emit(dappazon, "Buy");
    });
  });

  describe("Withdrawing", () => {
    let balanceBefore;

    beforeEach(async () => {
      // List an item
      let transaction = await dappazon.connect(deployer).list(ID, NAME, CATEGORY, IMAGE, COST, RATING, STOCK);
      await transaction.wait();

      // Buy an item
      transaction = await dappazon.connect(buyer).buy(ID, { value: COST });
      await transaction.wait();

      // Get Deployer balance before withdrawal
      balanceBefore = await ethers.provider.getBalance(deployer.address);

      // Withdraw funds from contract
      transaction = await dappazon.connect(deployer).withdraw();
      await transaction.wait();
    });

    it('Updates the owner balance', async () => {
      // Check if owner's balance increases after withdrawal
      const balanceAfter = await ethers.provider.getBalance(deployer.address);
      expect(balanceAfter).to.be.greaterThan(balanceBefore);
    });

    it('Updates the contract balance', async () => {
      // Check if the contract's balance is zero after withdrawal
      const result = await ethers.provider.getBalance(dappazon.address);
      expect(result).to.equal(0);
    });
  });
});
