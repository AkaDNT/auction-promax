import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { validatePhase0ExitMatrix, parsePhase0ExitMatrix } from './Phase0ExitMatrix.mjs';

const revision = '1'.repeat(40);
const tree = '2'.repeat(40);
const ids = ['identity-profile-service', 'auction-service', 'bidding-service', 'billing-service', 'realtime-gateway'];
const scopes = [ ['architecture-decisions'], ['repository'], ids.slice(1), ids, ids, ['shared-contracts'], ids,
  [ids[0]], [ids[0]], ids.slice(0,4), ids, ids, ids, ids, [ids[0]] ];
const requirementIds = [...Array.from({length:12}, (_,i) => `D${String(i+1).padStart(2,'0')}`), 'E01','E02','E03'];
const frozenImplementationPaths=['.',':(top,exclude)api/docs/**',':(top,exclude)docs/**'];
function fixture() {
  return {schemaVersion:1, phase:0, status:'PUBLISHED_VERIFIED', implementationRevision:revision, implementationTree:tree,
    requirements:requirementIds.map((requirementId,i) => ({requirementId, authority:'api/docs/Auction_Platform_Final_Production_Architecture_Blueprint_and_Roadmap.md#phase-0',
      scope:[...scopes[i]], implementationRevision:revision, evidence:[{kind:i===0?'DECISION':'RUNTIME',revision,reference:'api/docs/sprints/S002_REVIEW_EVIDENCE.md#verified-revision'}],
      result:i===0?'APPROVED_DECISION':'PASS', ownerAcceptanceReference:'OWNER-FIXTURE-ACCEPTANCE'})),
    services:ids.map(serviceId => ({serviceId, sourceKind:'COMMITTED', build:'PASS', isolation:serviceId===ids[4]?'NOT_APPLICABLE_GATEWAY':'PASS', http:'PASS',
      candidateRevision:revision,executionRevision:'7'.repeat(40),evidenceReference:'https://github.com/AkaDNT/auction-promax/actions/runs/123'})),
    consumerCompatibility:'DEFERRED_NO_PRODUCER_CONTRACT',
    inheritedGaps:['service-template','authentication-authorization','product-functions','producer-consumer-contracts','production-platform-operations','security-findings'].map((gapId,i) => ({gapId,
      source:'api/docs/sprints/SPRINT_001.md#incomplete-work',mandatoryPhase0:i===0,targetPhase:i===0||i===5?0:i===2?2:1,
      disposition:i===0?'RESOLVED_PHASE0':i===3?'DEFERRED_NO_PRODUCER_CONTRACT':i===5?'RESIDUAL_FINDINGS':'OPEN_LATER_PHASE',
      authority:'api/docs/Auction_Platform_Final_Production_Architecture_Blueprint_and_Roadmap.md', evidenceReference:'api/docs/sprints/S002_REVIEW_EVIDENCE.md'})),
    security:{executionState:'PASS',policyState:'BLOCKED',revision,evidenceReference:'https://github.com/AkaDNT/auction-promax/actions/runs/123',
      counts:{CRITICAL:0,HIGH:1,MEDIUM:4,LOW:0,UNKNOWN:0}},
    ownerAcceptance:{owner:'AkaDNT (Project Owner / Repository Owner)',date:'2026-10-12',scope:'PHASE0_TECHNICAL_CANDIDATE',reference:'OWNER-FIXTURE-ACCEPTANCE',revision,tree},
    publication:{status:'PUBLISHED_VERIFIED',merge:'3'.repeat(40),tree:'4'.repeat(40),pr:'https://github.com/AkaDNT/auction-promax/pull/24',
      runtimeRevision:revision,runtimeTree:tree,applicabilityReference:'api/docs/sprints/S002_REVIEW_EVIDENCE.md#publication-applicability',
      checks:['monorepo-required','supply-chain-verification'].map(name => ({name,conclusion:'SUCCESS',commit:'3'.repeat(40),runUrl:'https://github.com/AkaDNT/auction-promax/actions/runs/123'}))}};
}
const check = (matrix, options={}) => validatePhase0ExitMatrix(matrix,{expectedRevision:revision,expectedTree:tree,...options});
test('published exact matrix permits exit while keeping blocked policy and deferred consumer truthful', () => {
  const result=check(fixture(),{requireExit:true}); assert.equal(result.valid,true); assert.equal(result.exitReady,true);
});
test('pending matrix remains valid in Phase0 but cannot exit', () => {
  const value=fixture(); value.status='IN_PROGRESS'; value.ownerAcceptance=null; value.publication=null;
  value.requirements[14].result='PENDING'; value.requirements[14].evidence=[];
  for (const row of value.requirements) row.ownerAcceptanceReference=null;
  assert.equal(check(value).valid,true); assert.equal(check(value).exitReady,false);
  assert.equal(check(value,{requireExit:true}).valid,false);
});
for (const [name,mutate] of [
  ['missingDeliverableRejected',v=>v.requirements.splice(3,1)],
  ['duplicateDeliverableRejected',v=>v.requirements[3]=v.requirements[2]],
  ['oneServiceMissingRejected',v=>v.services.pop()],
  ['incompleteServiceScopeRejected',v=>v.requirements[12].scope.pop()],
  ['decisionOnlyRuntimeRejected',v=>v.requirements[12].evidence[0].kind='DECISION'],
  ['consumerDeferredNotPass',v=>v.consumerCompatibility='PASS'],
  ['staleRevisionRejected',v=>v.requirements[14].evidence[0].revision='5'.repeat(40)],
  ['staleImplementationRejected',v=>v.implementationRevision='5'.repeat(40)],
  ['unresolvedMandatoryGapRejected',v=>v.inheritedGaps[0].disposition='OPEN_LATER_PHASE'],
  ['mandatoryGapCannotBeReclassified',v=>{v.inheritedGaps[0].mandatoryPhase0=false;v.inheritedGaps[0].targetPhase=1;}],
  ['missingInheritedGapRejected',v=>v.inheritedGaps.pop()],
  ['missingAcceptanceRejected',v=>v.ownerAcceptance=null],
  ['wrongOwnerRejected',v=>v.ownerAcceptance.owner='Other'],
  ['wrongScopeRejected',v=>v.ownerAcceptance.scope='SPRINT_ACTIVATION'],
  ['wrongAcceptedTreeRejected',v=>v.ownerAcceptance.tree='6'.repeat(40)],
  ['invalidAcceptanceDateRejected',v=>v.ownerAcceptance.date='2026-02-30'],
  ['missingPublicationRejected',v=>v.publication=null],
  ['wrongPublishedRuntimeRejected',v=>v.publication.runtimeRevision='6'.repeat(40)],
  ['failedActualCheckRejected',v=>v.publication.checks[0].conclusion='FAILURE'],
  ['wrongActualCheckRevisionRejected',v=>v.publication.checks[0].commit=revision],
  ['wrongServiceCandidateRejected',v=>v.services[0].candidateRevision='8'.repeat(40)],
  ['invalidServiceExecutionRejected',v=>v.services[0].executionRevision='0'.repeat(40)],
  ['missingActualCheckRejected',v=>v.publication.checks.pop()],
  ['gatewayDatabaseClaimRejected',v=>v.services[4].isolation='PASS'],
  ['failedServiceRejected',v=>v.services[2].build='FAIL'],
  ['pendingSecurityRejected',v=>v.security.policyState='PENDING'],
  ['extraFieldRejected',v=>v.unreviewed=true],
]) test(name,()=> {const value=fixture();mutate(value);assert.equal(check(value,{requireExit:true}).valid,false);});
test('parser requires exactly one canonical JSON block',()=> {
  const block='## Machine-readable evidence\n\n```json\n'+JSON.stringify(fixture())+'\n```\n';
  assert.deepEqual(parsePhase0ExitMatrix(block),fixture());
  assert.throws(()=>parsePhase0ExitMatrix(''),/PHASE0_MATRIX_BLOCK_INVALID/);
  assert.throws(()=>parsePhase0ExitMatrix(block+block),/PHASE0_MATRIX_BLOCK_INVALID/);
});
if(!process.argv.includes('--repository')&&!process.argv.includes('--require-exit')) test('real Git repository rejects changed runtime/tooling and false publication trees',t=> {
  const tempParent=fs.realpathSync(os.tmpdir());
  const fixtureRoot=fs.mkdtempSync(path.join(tempParent,'apx-phase0-git-'));
  t.after(()=> {
    const resolved=fs.realpathSync(fixtureRoot);
    assert.ok(resolved.startsWith(tempParent+path.sep)&&path.basename(resolved).startsWith('apx-phase0-git-'));
    fs.rmSync(resolved,{recursive:true});
  });
  const write=(relative,contents)=>{const target=path.join(fixtureRoot,relative);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,contents);};
  const git=(...args)=>{const result=spawnSync('git',args,{cwd:fixtureRoot,encoding:'utf8',timeout:10000});assert.equal(result.status,0,result.stderr);return result.stdout.trim();};
  const testDirectory=path.dirname(fileURLToPath(import.meta.url));
  for(const name of ['Phase0ExitMatrix.mjs','Test-Phase0ExitMatrix.mjs']) write('api/scripts/foundation/'+name,fs.readFileSync(path.join(testDirectory,name)));
  const value=fixture();value.status='CANDIDATE_READY';value.ownerAcceptance=null;value.publication=null;
  for(const row of value.requirements)row.ownerAcceptanceReference=null;
  const refs=[...value.requirements.flatMap(row=>[row.authority,...row.evidence.map(item=>item.reference)]),
    ...value.inheritedGaps.flatMap(gap=>[gap.source,gap.authority,gap.evidenceReference])];
  for(const ref of refs.filter(ref=>!ref.startsWith('https://')))write(ref.split('#')[0],'# Synthetic Git fixture\n');
  const inputs=['api/services/fixture.txt','api/contracts/fixture.txt','api/service-foundation/fixture.txt','api/infra/fixture.txt','web/fixture.txt',
    '.github/workflows/fixture.yml','api/scripts/runtime-gate.ps1','scripts/security-gate.mjs','api/security/fixture.json','api/.nvmrc','.gitignore'];
  for(const input of inputs)write(input,'baseline\n');
  git('init','--quiet');git('config','user.email','fixture@example.invalid');git('config','user.name','Synthetic fixture');
  git('add','.');git('commit','--quiet','-m','synthetic frozen implementation');
  const frozen=git('rev-parse','HEAD');const frozenTree=git('rev-parse','HEAD^{tree}');
  value.implementationRevision=frozen;value.implementationTree=frozenTree;value.security.revision=frozen;
  for(const row of value.requirements){row.implementationRevision=frozen;for(const evidence of row.evidence)evidence.revision=frozen;}
  for(const service of value.services)service.candidateRevision=frozen;
  const save=()=>write('api/docs/decisions/PHASE_0_EXIT_MATRIX.md','## Machine-readable evidence\n\n```json\n'+JSON.stringify(value)+'\n```\n');
  const run=()=>spawnSync(process.execPath,['api/scripts/foundation/Test-Phase0ExitMatrix.mjs','--repository'],{cwd:fixtureRoot,encoding:'utf8',timeout:15000});
  save();git('add','.');git('commit','--quiet','-m','synthetic candidate documentation');
  assert.equal(run().status,0);
  for(const input of inputs){write(input,'changed\n');const result=run();assert.notEqual(result.status,0,input);assert.match(result.stderr,/frozen implementation\/source tree changed/);write(input,'baseline\n');}
  const extra='scripts/untracked-security-gate.mjs';write(extra,'untracked\n');
  const untracked=run();assert.notEqual(untracked.status,0);assert.match(untracked.stderr,/untracked implementation files/);
  fs.unlinkSync(path.join(fixtureRoot,extra));
  const published=git('rev-parse','HEAD');const publishedTree=git('rev-parse','HEAD^{tree}');
  const accepted=fixture().ownerAcceptance;accepted.revision=frozen;accepted.tree=frozenTree;
  value.status='PUBLISHED_VERIFIED';value.ownerAcceptance=accepted;
  for(const row of value.requirements)row.ownerAcceptanceReference=accepted.reference;
  value.publication={...fixture().publication,merge:published,tree:publishedTree,runtimeRevision:frozen,runtimeTree:frozenTree};
  for(const check of value.publication.checks)check.commit=published;
  write(value.publication.applicabilityReference.split('#')[0],'# Synthetic applicability\n');save();assert.equal(run().status,0);
  value.publication.tree='8'.repeat(40);save();const wrongTree=run();assert.notEqual(wrongTree.status,0);assert.match(wrongTree.stderr,/published Git tree/);
});
if(process.argv.includes('--repository')||process.argv.includes('--require-exit')) {
  const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
  const matrix=parsePhase0ExitMatrix(fs.readFileSync(path.join(root,'api/docs/decisions/PHASE_0_EXIT_MATRIX.md'),'utf8'));
  assert.match(matrix.implementationRevision,/^[0-9a-f]{40}$/);
  const anchor=spawnSync('git',['rev-parse',`${matrix.implementationRevision}^{tree}`],{cwd:root,encoding:'utf8',timeout:10000});
  assert.equal(anchor.status,0,'frozen implementation commit must exist in the actual Git history');
  const ancestry=spawnSync('git',['merge-base','--is-ancestor',matrix.implementationRevision,'HEAD'],{cwd:root,encoding:'utf8',timeout:10000});
  assert.equal(ancestry.status,0,'frozen implementation must be an ancestor of the actual checkout');
  const result=validatePhase0ExitMatrix(matrix,{expectedRevision:matrix.implementationRevision,expectedTree:anchor.stdout.trim(),
    requireExit:process.argv.includes('--require-exit')});
  assert.equal(result.valid,true,result.errors.join(','));
  const localReferences=[...matrix.requirements.flatMap(row=>[row.authority,...row.evidence.map(item=>item.reference)]),
    ...matrix.inheritedGaps.flatMap(gap=>[gap.source,gap.authority,gap.evidenceReference]),matrix.security.evidenceReference,
    ...(matrix.publication?[matrix.publication.applicabilityReference]:[])];
  for(const reference of localReferences.filter(value=>!value.startsWith('https://'))) {
    const filename=path.join(root,reference.split('#')[0]);
    const stat=fs.lstatSync(filename);
    assert.ok(stat.isFile()&&!stat.isSymbolicLink(),'local evidence reference must be an ordinary existing file');
  }
  if(matrix.status!=='IN_PROGRESS') {
    const delta=spawnSync('git',['diff','--quiet',matrix.implementationRevision,'--',...frozenImplementationPaths],
      {cwd:root,encoding:'utf8',timeout:10000});
    assert.equal(delta.status,0,'frozen implementation/source tree changed; renewed evidence required');
    const untracked=spawnSync('git',['ls-files','--others','--exclude-standard','--',...frozenImplementationPaths],
      {cwd:root,encoding:'utf8',timeout:10000});
    assert.equal(untracked.status,0);
    assert.equal(untracked.stdout.trim(),'','untracked implementation files cannot join the frozen candidate');
  }
  if(matrix.status==='PUBLISHED_VERIFIED') {
    const publication=matrix.publication;
    const actualTree=spawnSync('git',['rev-parse',`${publication.merge}^{tree}`],{cwd:root,encoding:'utf8',timeout:10000});
    assert.equal(actualTree.status,0,'published commit must exist in the actual checkout history');
    assert.equal(actualTree.stdout.trim(),publication.tree,'published Git tree must match the actual object');
    const publishedAncestor=spawnSync('git',['merge-base','--is-ancestor',publication.merge,'HEAD'],{cwd:root,encoding:'utf8',timeout:10000});
    assert.equal(publishedAncestor.status,0,'published merge must be an ancestor of actual checkout');
    const publishedDelta=spawnSync('git',['diff','--quiet',matrix.implementationRevision,publication.merge,'--',...frozenImplementationPaths],
      {cwd:root,encoding:'utf8',timeout:10000});
    assert.equal(publishedDelta.status,0,'published runtime/source differs from frozen evidence');
  }
  console.log(`PHASE0_MATRIX_REPOSITORY_PASS status=${matrix.status} exitReady=${result.exitReady}`);
}
