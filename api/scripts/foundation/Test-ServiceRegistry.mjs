import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { generateService } from './Generate-Service.mjs';

const registry = {
  schemaVersion: 1,
  services: [
    { id: 'identity-profile-service', variant: 'relational', preserved: true, groupId: 'com.auctionpromax', artifactId: 'identity-profile-service', version: '0.0.1-SNAPSHOT', packageName: 'com.auctionpromax.identityprofileservice', entryClass: 'IdentityProfileServiceApplication', destination: 'api/services/identity-profile-service', database: 'identity_db', testDatabase: 'identity_test_db', schema: 'identity', environmentPrefix: 'IDENTITY' },
    { id: 'auction-service', variant: 'relational', preserved: false, groupId: 'com.auctionpromax', artifactId: 'auction-service', version: '0.0.1-SNAPSHOT', packageName: 'com.auctionpromax.auctionservice', entryClass: 'AuctionServiceApplication', destination: 'api/services/auction-service', database: 'auction_db', testDatabase: 'auction_test_db', schema: 'auction', environmentPrefix: 'AUCTION' },
    { id: 'bidding-service', variant: 'relational', preserved: false, groupId: 'com.auctionpromax', artifactId: 'bidding-service', version: '0.0.1-SNAPSHOT', packageName: 'com.auctionpromax.biddingservice', entryClass: 'BiddingServiceApplication', destination: 'api/services/bidding-service', database: 'bidding_db', testDatabase: 'bidding_test_db', schema: 'bidding', environmentPrefix: 'BIDDING' },
    { id: 'billing-service', variant: 'relational', preserved: false, groupId: 'com.auctionpromax', artifactId: 'billing-service', version: '0.0.1-SNAPSHOT', packageName: 'com.auctionpromax.billingservice', entryClass: 'BillingServiceApplication', destination: 'api/services/billing-service', database: 'billing_db', testDatabase: 'billing_test_db', schema: 'billing', environmentPrefix: 'BILLING' },
    { id: 'realtime-gateway', variant: 'gateway', preserved: false, groupId: 'com.auctionpromax', artifactId: 'realtime-gateway', version: '0.0.1-SNAPSHOT', packageName: 'com.auctionpromax.realtimegateway', entryClass: 'RealtimeGatewayApplication', destination: 'api/services/realtime-gateway', database: null, testDatabase: null, schema: null, environmentPrefix: null },
  ],
};

const temporaryRoots = [];

async function fixture(mutate = () => {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'service-registry-fixture-'));
  temporaryRoots.push(root);
  const directory = path.join(root, 'api/service-foundation');
  await mkdir(directory, { recursive: true });
  const value = structuredClone(registry);
  mutate(value);
  await writeFile(path.join(directory, 'services.json'), `${JSON.stringify(value)}\n`);
  return root;
}

test('registry fixes the exact five approved ids and preserved identity cannot generate', async () => {
  const root = await fixture();
  assert.throws(() => generateService({ serviceId: 'identity-profile-service', repositoryRoot: root }),
    { message: 'SERVICE_PRESERVED' });
  assert.throws(() => generateService({ serviceId: 'unregistered-service', repositoryRoot: root }),
    { message: 'SERVICE_UNKNOWN' });
});

test('unknown top-level and record keys are rejected', async (t) => {
  await t.test('top-level key', async () => {
    const root = await fixture(value => { value.extra = true; });
    assert.throws(() => generateService({ serviceId: 'auction-service', repositoryRoot: root }),
      { message: 'REGISTRY_INVALID' });
  });
  await t.test('record key', async () => {
    const root = await fixture(value => { value.services[1].extra = true; });
    assert.throws(() => generateService({ serviceId: 'auction-service', repositoryRoot: root }),
      { message: 'REGISTRY_INVALID' });
  });
});

test('duplicate ids and registered database mismatches are rejected', async (t) => {
  await t.test('duplicate id', async () => {
    const root = await fixture(value => { value.services[2].id = value.services[1].id; });
    assert.throws(() => generateService({ serviceId: 'auction-service', repositoryRoot: root }),
      { message: 'REGISTRY_INVALID' });
  });
  await t.test('database mismatch', async () => {
    const root = await fixture(value => { value.services[1].database = 'transaction_db'; });
    assert.throws(() => generateService({ serviceId: 'auction-service', repositoryRoot: root }),
      { message: 'REGISTRY_INVALID' });
  });
});

test.after(async () => {
  for (const root of temporaryRoots) await rm(root, { recursive: true, force: true });
});

process.on('exit', code => { if (code === 0) process.stdout.write('SERVICE_REGISTRY_FIXTURES_PASS\n'); });
