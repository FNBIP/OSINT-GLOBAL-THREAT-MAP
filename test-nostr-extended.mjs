import { SimplePool } from 'nostr-tools/pool';

const relays = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.primal.net',
  'wss://offchain.pub',
  'wss://nostr.wine',
  'wss://nostr-pub.wellorder.net',
  'wss://nostr21.com',
];

const pool = new SimplePool();
let count20000 = 0;
let count1geo = 0;

console.log(`[${new Date().toISOString()}] Starting extended Nostr relay test (30 seconds)...`);
console.log('---');

// Test 1: kind 20000 (ephemeral geohash messages) - same as app's subscribeToGlobalChannels
console.log('SUB 1: kind 20000 (ephemeral geohash channels) - no tag filter');
const sub1 = pool.subscribeMany(relays, { kinds: [20000], limit: 500 }, {
  onevent: (event) => {
    count20000++;
    const gTags = event.tags.filter(t => t[0] === 'g').map(t => t[1]);
    const age = Math.floor(Date.now()/1000) - event.created_at;
    console.log(`[kind20000 #${count20000}] age=${age}s geohash=${gTags.join(',')} pubkey=${event.pubkey.slice(0,8)} content="${event.content.slice(0,60)}"`);
  },
  oneose: () => {
    console.log(`[kind20000] EOSE received. Stored events: ${count20000}. Now streaming live...`);
  },
});

// Test 2: kind 1 with geohash tags - same as app's subscribeToStoredGeohashNotes
console.log('SUB 2: kind 1 with since=24h (stored notes, filtering for #g tags)');
const sub2 = pool.subscribeMany(relays, { kinds: [1], since: Math.floor(Date.now()/1000) - 86400, limit: 200 }, {
  onevent: (event) => {
    const gTags = event.tags.filter(t => t[0] === 'g');
    if (gTags.length > 0) {
      count1geo++;
      console.log(`[kind1-geo #${count1geo}] geohash=${gTags.map(t=>t[1]).join(',')} pubkey=${event.pubkey.slice(0,8)} content="${event.content.slice(0,60)}"`);
    }
  },
  oneose: () => {
    console.log(`[kind1] EOSE received. Geo-tagged notes found: ${count1geo}`);
  },
});

// Test 3: Try BitChat-specific relay if it exists
const bitchatRelays = ['wss://relay.bitchat.land'];
let countBitchat = 0;
console.log('SUB 3: kind 20000 from wss://relay.bitchat.land');
try {
  const sub3 = pool.subscribeMany(bitchatRelays, { kinds: [20000], limit: 500 }, {
    onevent: (event) => {
      countBitchat++;
      const gTags = event.tags.filter(t => t[0] === 'g').map(t => t[1]);
      console.log(`[bitchat #${countBitchat}] geohash=${gTags.join(',')} pubkey=${event.pubkey.slice(0,8)} content="${event.content.slice(0,60)}"`);
    },
    oneose: () => {
      console.log(`[bitchat] EOSE received. Events: ${countBitchat}`);
    },
  });

  setTimeout(() => {
    sub3.close();
  }, 28000);
} catch(e) {
  console.log('[bitchat] Failed to connect:', e.message);
}

console.log('---');
console.log('Waiting 30 seconds for events...\n');

setTimeout(() => {
  console.log('\n=== RESULTS ===');
  console.log(`kind 20000 events (global): ${count20000}`);
  console.log(`kind 1 events with #g tags (24h): ${count1geo}`);
  console.log(`kind 20000 from BitChat relay: ${countBitchat}`);
  console.log('================');

  sub1.close();
  sub2.close();
  pool.close([...relays, ...bitchatRelays]);
  process.exit(0);
}, 30000);
