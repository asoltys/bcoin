'use strict';

const assert = require('assert');
const BIP151 = require('../lib/net/bip151');

describe('BIP151', function() {
  let client = new BIP151();
  let server = new BIP151();

  function payload() {
    return Buffer.from('deadbeef', 'hex');
  }

  it('should do encinit', () => {
    let init = server.toEncinit();
    client.encinit(init.publicKey, init.cipher);

    init = client.toEncinit();
    server.encinit(init.publicKey, init.cipher);

    assert(!client.handshake);
    assert(!server.handshake);
  });

  it('should do encack', () => {
    client.encack(server.toEncack().publicKey);
    server.encack(client.toEncack().publicKey);
    assert(client.handshake);
    assert(server.handshake);
  });

  it('should have completed ECDH handshake', () => {
    assert(client.isReady());
    assert(server.isReady());
    assert(client.handshake);
    assert(server.handshake);
  });

  it('should encrypt payload from client to server', () => {
    let packet = client.packet('fake', payload());
    let emitted = false;
    server.once('packet', (cmd, body) => {
      emitted = true;
      assert.equal(cmd, 'fake');
      assert.equal(body.toString('hex'), 'deadbeef');
    });
    server.feed(packet);
    assert(emitted);
  });

  it('should encrypt payload from server to client', () => {
    let packet = server.packet('fake', payload());
    let emitted = false;
    client.once('packet', (cmd, body) => {
      emitted = true;
      assert.equal(cmd, 'fake');
      assert.equal(body.toString('hex'), 'deadbeef');
    });
    client.feed(packet);
    assert(emitted);
  });

  it('should encrypt payload from client to server (2)', () => {
    let packet = client.packet('fake', payload());
    let emitted = false;
    server.once('packet', (cmd, body) => {
      emitted = true;
      assert.equal(cmd, 'fake');
      assert.equal(body.toString('hex'), 'deadbeef');
    });
    server.feed(packet);
    assert(emitted);
  });

  it('should encrypt payload from server to client (2)', () => {
    let packet = server.packet('fake', payload());
    let emitted = false;
    client.once('packet', (cmd, body) => {
      emitted = true;
      assert.equal(cmd, 'fake');
      assert.equal(body.toString('hex'), 'deadbeef');
    });
    client.feed(packet);
    assert(emitted);
  });

  it('client should rekey', () => {
    let rekeyed = false;
    let bytes = client.output.processed;

    client.once('rekey', () => {
      rekeyed = true;
      let packet = client.packet('encack', client.toRekey().toRaw());
      let emitted = false;
      server.once('packet', (cmd, body) => {
        emitted = true;
        assert.equal(cmd, 'encack');
        server.encack(body);
      });
      server.feed(packet);
      assert(emitted);
    });

    // Force a rekey after 1gb processed.
    client.maybeRekey({ length: 1024 * (1 << 20) });

    assert(rekeyed);

    // Reset so as not to mess up
    // the symmetry of client and server.
    client.output.processed = bytes + 33 + 31;
  });

  it('should encrypt payload from client to server after rekey', () => {
    let packet = client.packet('fake', payload());
    let emitted = false;
    server.once('packet', (cmd, body) => {
      emitted = true;
      assert.equal(cmd, 'fake');
      assert.equal(body.toString('hex'), 'deadbeef');
    });
    server.feed(packet);
    assert(emitted);
  });

  it('should encrypt payload from server to client after rekey', () => {
    let packet = server.packet('fake', payload());
    let emitted = false;
    client.once('packet', (cmd, body) => {
      emitted = true;
      assert.equal(cmd, 'fake');
      assert.equal(body.toString('hex'), 'deadbeef');
    });
    client.feed(packet);
    assert(emitted);
  });

  it('should encrypt payload from client to server after rekey (2)', () => {
    let packet = client.packet('fake', payload());
    let emitted = false;
    server.once('packet', (cmd, body) => {
      emitted = true;
      assert.equal(cmd, 'fake');
      assert.equal(body.toString('hex'), 'deadbeef');
    });
    server.feed(packet);
    assert(emitted);
  });

  it('should encrypt payload from server to client after rekey (2)', () => {
    let packet = server.packet('fake', payload());
    let emitted = false;
    client.once('packet', (cmd, body) => {
      emitted = true;
      assert.equal(cmd, 'fake');
      assert.equal(body.toString('hex'), 'deadbeef');
    });
    client.feed(packet);
    assert(emitted);
  });

  it('should encrypt payloads both ways asynchronously', () => {
    let spacket = server.packet('fake', payload());
    let cpacket = client.packet('fake', payload());
    let cemitted = false;
    let semitted = false;
    client.once('packet', (cmd, body) => {
      cemitted = true;
      assert.equal(cmd, 'fake');
      assert.equal(body.toString('hex'), 'deadbeef');
    });
    server.once('packet', (cmd, body) => {
      semitted = true;
      assert.equal(cmd, 'fake');
      assert.equal(body.toString('hex'), 'deadbeef');
    });
    client.feed(spacket);
    server.feed(cpacket);
    assert(cemitted);
    assert(semitted);
  });
});
