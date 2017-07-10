'use strict';

const assert = require('assert');
const consensus = require('../lib/protocol/consensus');
const encoding = require('../lib/utils/encoding');
const co = require('../lib/utils/co');
const Amount = require('../lib/btc/amount');
const Address = require('../lib/primitives/address');
const Script = require('../lib/script/script');
const Outpoint = require('../lib/primitives/outpoint');
const MTX = require('../lib/primitives/mtx');
const HTTP = require('../lib/http');
const FullNode = require('../lib/node/fullnode');
const pkg = require('../lib/pkg');
const plugin = require('../lib/wallet/plugin');

describe('HTTP', function() {
  let node, wallet, walletdb, addr, hash;

  node = new FullNode({
    network: 'regtest',
    apiKey: 'foo',
    walletAuth: true,
    walletWitness: false,
    db: 'memory'
  });

  wallet = new HTTP.Wallet({
    network: 'regtest',
    apiKey: 'foo'
  });

  walletdb = node.use(plugin);

  node.on('error', () => {});

  this.timeout(15000);

  it('should open node', async () => {
    consensus.COINBASE_MATURITY = 0;
    await node.open();
  });

  it('should create wallet', async () => {
    let info = await wallet.create({ id: 'test' });
    assert.equal(info.id, 'test');
  });

  it('should get info', async () => {
    let info = await wallet.client.getInfo();
    assert.equal(info.network, node.network.type);
    assert.equal(info.version, pkg.version);
    assert.equal(info.pool.agent, node.pool.options.agent);
    assert.equal(typeof info.chain, 'object');
    assert.equal(info.chain.height, 0);
  });

  it('should get wallet info', async () => {
    let info = await wallet.getInfo();
    assert.equal(info.id, 'test');
    addr = info.account.receiveAddress;
    assert.equal(typeof addr, 'string');
    addr = Address.fromString(addr);
  });

  it('should fill with funds', async () => {
    let tx, balance, receive, details;

    // Coinbase
    tx = new MTX();
    tx.addOutpoint(new Outpoint(encoding.NULL_HASH, 0));
    tx.addOutput(addr, 50460);
    tx.addOutput(addr, 50460);
    tx.addOutput(addr, 50460);
    tx.addOutput(addr, 50460);
    tx = tx.toTX();

    wallet.once('balance', (b) => {
      balance = b;
    });

    wallet.once('address', (r) => {
      receive = r[0];
    });

    wallet.once('tx', (d) => {
      details = d;
    });

    await walletdb.addTX(tx);
    await co.timeout(300);

    assert(receive);
    assert.equal(receive.id, 'test');
    assert.equal(receive.type, 'pubkeyhash');
    assert.equal(receive.branch, 0);
    assert(balance);
    assert.equal(Amount.value(balance.confirmed), 0);
    assert.equal(Amount.value(balance.unconfirmed), 201840);
    assert(details);
    assert.equal(details.hash, tx.rhash());
  });

  it('should get balance', async () => {
    let balance = await wallet.getBalance();
    assert.equal(Amount.value(balance.confirmed), 0);
    assert.equal(Amount.value(balance.unconfirmed), 201840);
  });

  it('should send a tx', async () => {
    let value = 0;
    let options, tx;

    options = {
      rate: 10000,
      outputs: [{
        value: 10000,
        address: addr.toString()
      }]
    };

    tx = await wallet.send(options);

    assert(tx);
    assert.equal(tx.inputs.length, 1);
    assert.equal(tx.outputs.length, 2);

    value += Amount.value(tx.outputs[0].value);
    value += Amount.value(tx.outputs[1].value);
    assert.equal(value, 48190);

    hash = tx.hash;
  });

  it('should get a tx', async () => {
    let tx = await wallet.getTX(hash);
    assert(tx);
    assert.equal(tx.hash, hash);
  });

  it('should generate new api key', async () => {
    let t = wallet.token.toString('hex');
    let token = await wallet.retoken(null);
    assert(token.length === 64);
    assert.notEqual(token, t);
  });

  it('should get balance', async () => {
    let balance = await wallet.getBalance();
    assert.equal(Amount.value(balance.unconfirmed), 199570);
  });

  it('should execute an rpc call', async () => {
    let info = await wallet.client.rpc.execute('getblockchaininfo', []);
    assert.equal(info.blocks, 0);
  });

  it('should execute an rpc call with bool parameter', async () => {
    let info = await wallet.client.rpc.execute('getrawmempool', [true]);
    assert.deepStrictEqual(info, {});
  });

  it('should create account', async () => {
    let info = await wallet.createAccount('foo1');
    assert(info);
    assert(info.initialized);
    assert.equal(info.name, 'foo1');
    assert.equal(info.accountIndex, 1);
    assert.equal(info.m, 1);
    assert.equal(info.n, 1);
  });

  it('should create account', async () => {
    let info = await wallet.createAccount('foo2', {
      type: 'multisig',
      m: 1,
      n: 2
    });
    assert(info);
    assert(!info.initialized);
    assert.equal(info.name, 'foo2');
    assert.equal(info.accountIndex, 2);
    assert.equal(info.m, 1);
    assert.equal(info.n, 2);
  });

  it('should get a block template', async () => {
    let json = await wallet.client.rpc.execute('getblocktemplate', []);
    assert.deepStrictEqual(json, {
      capabilities: [ 'proposal' ],
      mutable: [ 'time', 'transactions', 'prevblock' ],
      version: 536870912,
      rules: [],
      vbavailable: {},
      vbrequired: 0,
      height: 1,
      previousblockhash: '530827f38f93b43ed12af0b3ad25a288dc02ed74d6d7857862df51fc56c416f9',
      target: '7fffff0000000000000000000000000000000000000000000000000000000000',
      bits: '207fffff',
      noncerange: '00000000ffffffff',
      curtime: json.curtime,
      mintime: 1296688603,
      maxtime: json.maxtime,
      expires: json.expires,
      sigoplimit: 20000,
      sizelimit: 1000000,
      longpollid: '530827f38f93b43ed12af0b3ad25a288dc02ed74d6d7857862df51fc56c416f90000000000',
      submitold: false,
      coinbaseaux: { flags: '6d696e65642062792062636f696e' },
      coinbasevalue: 5000000000,
      transactions: []
    });
  });

  it('should send a block template proposal', async () => {
    let attempt = await node.miner.createBlock();
    let block = attempt.toBlock();
    let hex = block.toRaw().toString('hex');
    let json = await wallet.client.rpc.execute('getblocktemplate', [{
      mode: 'proposal',
      data: hex
    }]);
    assert.strictEqual(json, null);
  });

  it('should validate an address', async () => {
    let json = await wallet.client.rpc.execute('validateaddress', [addr.toString()]);
    assert.deepStrictEqual(json, {
      isvalid: true,
      address: addr.toString(),
      scriptPubKey: Script.fromAddress(addr).toRaw().toString('hex'),
      ismine: false,
      iswatchonly: false
    });
  });

  it('should cleanup', async () => {
    consensus.COINBASE_MATURITY = 100;
    await wallet.close();
    await node.close();
  });
});
