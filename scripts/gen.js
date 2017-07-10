'use strict';

const BN = require('../lib/crypto/bn');
const util = require('../lib/utils/util');
const consensus = require('../lib/protocol/consensus');
const encoding = require('../lib/utils/encoding');
const TX = require('../lib/primitives/tx');
const Block = require('../lib/primitives/block');
const Script = require('../lib/script/script');
const Opcode = require('../lib/script/opcode');
const opcodes = Script.opcodes;

let main, testnet, regtest;

function createGenesisBlock(options) {
  let flags = options.flags;
  let script = options.script;
  let reward = options.reward;
  let tx, block;

  if (!flags) {
    flags = Buffer.from(
      'The Times 03/Jan/2009 Chancellor on brink of second bailout for banks',
      'ascii');
  }

  if (!script) {
    script = Script.fromArray([
      Buffer.from('04678afdb0fe5548271967f1a67130b7105cd6a828e039'
        + '09a67962e0ea1f61deb649f6bc3f4cef38c4f35504e51ec112de5c3'
        + '84df7ba0b8d578a4c702b6bf11d5f', 'hex'),
      opcodes.OP_CHECKSIG
    ]);
  }

  if (!reward)
    reward = 50 * consensus.COIN;

  tx = new TX({
    version: 1,
    flag: 1,
    inputs: [{
      prevout: {
        hash: encoding.NULL_HASH,
        index: 0xffffffff
      },
      script: [
        Opcode.fromNumber(new BN(486604799)),
        Opcode.fromPush(Buffer.from([4])),
        Opcode.fromData(flags)
      ],
      sequence: 0xffffffff
    }],
    outputs: [{
      value: reward,
      script: script
    }],
    locktime: 0
  });

  tx.inputs[0].script = Script.fromRaw(Buffer.from(
    '04ffff001d0104404e592054696d65732030352f4f63742f323031312053746576'
    + '65204a6f62732c204170706c65e280997320566973696f6e6172792c20446965'
    + '73206174203536', 'hex'));

  block = new Block({
    version: options.version,
    prevBlock: encoding.NULL_HASH,
    merkleRoot: tx.hash('hex'),
    ts: options.ts,
    bits: options.bits,
    nonce: options.nonce,
    height: 0
  });

  block.addTX(tx);

  return block;
}

main = createGenesisBlock({
  version: 1,
  ts: 1317972665,
  bits: 504365040,
  nonce: 2084524493
});

testnet = createGenesisBlock({
  version: 1,
  ts: 1486949366,
  bits: 0x1e0ffff0,
  nonce: 293345
});

regtest = createGenesisBlock({
  version: 1,
  ts: 1296688602,
  bits: 0x207fffff,
  nonce: 0
});

util.log(main);
util.log('');
util.log(testnet);
util.log('');
util.log(regtest);
util.log('');
util.log('main hash: %s', main.hash('hex'));
util.log('main raw: %s', main.toRaw().toString('hex'));
util.log('');
util.log('testnet hash: %s', testnet.hash('hex'));
util.log('testnet raw: %s', testnet.toRaw().toString('hex'));
util.log('');
util.log('regtest hash: %s', regtest.hash('hex'));
util.log('regtest raw: %s', regtest.toRaw().toString('hex'));
util.log('');
