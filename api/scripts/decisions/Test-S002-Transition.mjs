import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {parseLifecycleDocuments,validateLifecycle} from './SprintLifecycle.mjs';
import {parsePhase0ExitMatrix} from '../foundation/Phase0ExitMatrix.mjs';
import {validateTransitionPublicationRepository} from './Phase0Transition.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const owner='AkaDNT (Project Owner / Repository Owner)';
function updateSection(markdown,heading,fields) {
  const source=markdown.replace(/\r\n/g,'\n');const headings=[...source.matchAll(/^## .+$/gm)];
  const target=headings.find(match=>match[0]===heading);assert.ok(target);
  const next=headings.find(match=>match.index>target.index);const end=next?.index??source.length;
  let section=source.slice(target.index,end);
  for(const [label,value] of Object.entries(fields))section=section.replace(new RegExp(`^(- ${label}:) .+$`,'m'),`$1 ${value}`);
  return source.slice(0,target.index)+section+source.slice(end);
}
function documents() {
  // Synthetic active projection remains independent of the repository's later
  // transition status; only named current sections change, never S001 history.
  const sprintMarkdown=updateSection(read('docs/sprints/SPRINT_002.md'),'## Sprint Context',{'Roadmap phase':'Phase 0','Sprint status':'IN_PROGRESS','Publication status':'NOT_PUBLISHED'});
  const deliveryMarkdown=updateSection(read('docs/DELIVERY_STATE.md'),'## Current Position',{'Current roadmap phase':'Phase 0','Current sprint':'SPRINT-002','Sprint status':'IN_PROGRESS','Publication status':'NOT_PUBLISHED'});
  const indexMarkdown=updateSection(read('docs/SPRINT_INDEX.md'),'## Current Sprint',{'Roadmap phase':'Phase 0','Sprint':'SPRINT-002','Status':'IN_PROGRESS','Publication status':'NOT_PUBLISHED'});
  let evidenceMarkdown=updateSection(read('docs/sprints/S002_REVIEW_EVIDENCE.md'),'## Lifecycle Evidence',{'Evidence kind':'SPRINT_ACTIVATION'});
  evidenceMarkdown=evidenceMarkdown.replace(/^## Phase 0 transition\n[\s\S]*?(?=^## |$(?![\s\S]))/m,'');
  return {sprintMarkdown,deliveryMarkdown,indexMarkdown,evidenceMarkdown,phase0MatrixMarkdown:read('docs/decisions/PHASE_0_EXIT_MATRIX.md')};
}
function publishedMatrix() {
  const matrix=parsePhase0ExitMatrix(read('docs/decisions/PHASE_0_EXIT_MATRIX.md'));
  const revision='6'.repeat(40),tree='7'.repeat(40),merge='8'.repeat(40),publishedTree='9'.repeat(40);
  Object.assign(matrix,{status:'PUBLISHED_VERIFIED',implementationRevision:revision,implementationTree:tree});
  for(const row of matrix.requirements) Object.assign(row,{implementationRevision:revision,result:row.requirementId==='D01'?'APPROVED_DECISION':'PASS',
    evidence:[{kind:row.requirementId==='D01'?'DECISION':'RUNTIME',revision,reference:'api/docs/sprints/S002_REVIEW_EVIDENCE.md'}],ownerAcceptanceReference:'OWNER-FIXTURE-CANDIDATE'});
  for(const service of matrix.services) Object.assign(service,{candidateRevision:revision,executionRevision:'5'.repeat(40),build:'PASS',http:'PASS',
    isolation:service.serviceId==='realtime-gateway'?'NOT_APPLICABLE_GATEWAY':'PASS'});
  matrix.inheritedGaps[0].disposition='RESOLVED_PHASE0';
  matrix.security={executionState:'PASS',policyState:'BLOCKED',revision,evidenceReference:'api/docs/sprints/S002_REVIEW_EVIDENCE.md',counts:{CRITICAL:0,HIGH:1,MEDIUM:4,LOW:0,UNKNOWN:0}};
  matrix.ownerAcceptance={owner,date:'2026-10-12',scope:'PHASE0_TECHNICAL_CANDIDATE',reference:'OWNER-FIXTURE-CANDIDATE',revision,tree};
  matrix.publication={status:'PUBLISHED_VERIFIED',merge,tree:publishedTree,pr:'https://github.com/AkaDNT/auction-promax/pull/24',runtimeRevision:revision,runtimeTree:tree,
    applicabilityReference:'api/docs/sprints/S002_REVIEW_EVIDENCE.md',checks:['monorepo-required','supply-chain-verification'].map((name,i)=>({name,conclusion:'SUCCESS',commit:merge,
      runUrl:`https://github.com/AkaDNT/auction-promax/actions/runs/${123+i}`}))};
  return matrix;
}
function fixture({published=false}={}) {
  const parsed=parseLifecycleDocuments(documents());
  assert.deepEqual(parsed.errors,[]);
  const records={sprint:parsed.sprint,delivery:parsed.delivery,index:parsed.index,exitEvidence:parsed.exitEvidence,phase0Matrix:publishedMatrix()};
  const technical=records.phase0Matrix.publication;
  records.sprint.status=published?'COMPLETED':'TRANSITION_PENDING';records.sprint.deliveryPhase=0;
  records.sprint.publicationStatus=published?'PUBLISHED_VERIFIED':'PENDING_PROTECTED_PR';
  for(const current of [records.delivery,records.index]) Object.assign(current,{currentSprint:'SPRINT-002',currentPhase:published?1:0,
    currentStatus:published?'COMPLETED':'IN_PROGRESS',publicationStatus:records.sprint.publicationStatus});
  const approval=scope=>({owner,date:'2026-10-12',scope,reference:'OWNER-FIXTURE-'+scope,technicalMerge:technical.merge,technicalTree:technical.tree});
  const transitionPublication=published?{status:'PUBLISHED_VERIFIED',merge:'b'.repeat(40),tree:'c'.repeat(40),pr:'https://github.com/AkaDNT/auction-promax/pull/25',
    checks:['monorepo-required','supply-chain-verification'].map((name,i)=>({name,conclusion:'SUCCESS',commit:'b'.repeat(40),runUrl:`https://github.com/AkaDNT/auction-promax/actions/runs/${125+i}`}))}
    :{status:'PENDING_PROTECTED_PR',merge:null,tree:null,pr:null,checks:[]};
  records.exitEvidence.kind='PHASE0_EXIT_TRANSITION';
  records.exitEvidence.transition={schemaVersion:1,technicalPublication:{status:technical.status,merge:technical.merge,tree:technical.tree,pr:technical.pr,checks:structuredClone(technical.checks)},
    exitApproval:approval('ACTUAL_PHASE0_EXIT'),handoffApproval:approval('PHASE1_HANDOFF'),transitionPublication,
    consumerCompatibility:'DEFERRED_NO_PRODUCER_CONTRACT',releasePolicy:'BLOCKED',handoffReference:'api/docs/decisions/PHASE_1_HANDOFF.md'};
  return records;
}
test('approved actual technical exit permits pending transition while authoritative phase remains0',()=> {
  const result=validateLifecycle(fixture());assert.equal(result.valid,true,result.errors.join(','));assert.equal(result.state,'TRANSITION_PENDING');
});
test('verified transition permits completed S002/currentPhase1 with historicalS001 and sprint deliveryPhase0 intact',()=> {
  const records=fixture({published:true});const result=validateLifecycle(records);assert.equal(result.valid,true,result.errors.join(','));assert.equal(result.state,'COMPLETED');
  assert.equal(records.delivery.historicalSprint1.currentPhase,0);assert.equal(records.sprint.deliveryPhase,0);
});
for(const [name,mutate] of [
  ['candidateOnlyApprovalRejected',r=>r.exitEvidence.transition.exitApproval.scope='PHASE0_TECHNICAL_CANDIDATE'],
  ['missingActualExitRejected',r=>r.exitEvidence.transition.exitApproval=null],
  ['missingHandoffRejected',r=>r.exitEvidence.transition.handoffApproval=null],
  ['wrongActualCandidateRejected',r=>r.exitEvidence.transition.exitApproval.technicalMerge='d'.repeat(40)],
  ['wrongActualTreeRejected',r=>r.exitEvidence.transition.exitApproval.technicalTree='d'.repeat(40)],
  ['missingActualMergeChecksRejected',r=>r.exitEvidence.transition.technicalPublication.checks=[]],
  ['technicalPublicationMismatchRejected',r=>r.exitEvidence.transition.technicalPublication.tree='d'.repeat(40)],
  ['unpublishedMatrixRejected',r=>r.phase0Matrix.status='OWNER_ACCEPTED'],
  ['missingMatrixRejected',r=>delete r.phase0Matrix],
  ['missingTransitionChecksRejected',r=>r.exitEvidence.transition.transitionPublication.checks=[]],
  ['failedTransitionChecksRejected',r=>r.exitEvidence.transition.transitionPublication.checks[0].conclusion='FAILURE'],
  ['mismatchedTransitionChecksRejected',r=>r.exitEvidence.transition.transitionPublication.checks[0].commit='d'.repeat(40)],
  ['blockedPolicyCannotBeRelabeled',r=>r.exitEvidence.transition.releasePolicy='PASS'],
  ['deferredConsumerCannotBeRelabeled',r=>r.exitEvidence.transition.consumerCompatibility='PASS'],
  ['sprintHistoricalPhaseCannotChange',r=>r.sprint.deliveryPhase=1],
  ['historicalS001CannotChange',r=>r.delivery.historicalSprint1.currentPhase=1],
  ['currentPhaseMismatchRejected',r=>r.index.currentPhase=0],
  ['unknownTransitionFieldRejected',r=>r.exitEvidence.transition.unreviewed=true],
  ['unknownApprovalFieldRejected',r=>r.exitEvidence.transition.exitApproval.unreviewed=true],
  ['technicalPublicationCannotStandInForTransition',r=>r.exitEvidence.transition.transitionPublication=structuredClone(r.exitEvidence.transition.technicalPublication)],
  ['invalidExitApprovalDateRejected',r=>r.exitEvidence.transition.exitApproval.date='2026-02-30'],
  ['approvalBeforeCandidateAcceptanceRejected',r=>r.exitEvidence.transition.exitApproval.date='2026-10-11'],
  ['handoffBeforeExitRejected',r=>r.exitEvidence.transition.handoffApproval.date='2026-10-11'],
]) test(name,()=> {const records=fixture({published:true});mutate(records);assert.equal(validateLifecycle(records).valid,false);});
test('activation evidence cannot accept either new transition/completed status even in Phase0',()=> {
  for(const status of ['TRANSITION_PENDING','COMPLETED']) {
    const records=fixture();records.exitEvidence.kind='SPRINT_ACTIVATION';delete records.exitEvidence.transition;delete records.phase0Matrix;
    records.sprint.status=status;records.sprint.publicationStatus='NOT_PUBLISHED';
    for(const current of [records.delivery,records.index])Object.assign(current,{currentPhase:0,currentStatus:'IN_PROGRESS',publicationStatus:'NOT_PUBLISHED'});
    assert.equal(validateLifecycle(records).valid,false,status);
  }
});
test('pending transition cannot assert currentPhase1 or completed sprint',()=> {
  for(const mutate of [r=>{r.delivery.currentPhase=1;r.index.currentPhase=1;},r=>{r.sprint.status='COMPLETED';}]) {
    const records=fixture();mutate(records);assert.equal(validateLifecycle(records).valid,false);
  }
});
test('transition parser binds the canonical matrix and rejects omitted transition record',()=> {
  const records=fixture();const base=documents();
  base.sprintMarkdown=base.sprintMarkdown.replace('- Sprint status: IN_PROGRESS','- Sprint status: TRANSITION_PENDING').replace('- Publication status: NOT_PUBLISHED','- Publication status: PENDING_PROTECTED_PR');
  base.deliveryMarkdown=base.deliveryMarkdown.replace('- Publication status: NOT_PUBLISHED','- Publication status: PENDING_PROTECTED_PR');
  base.indexMarkdown=base.indexMarkdown.replace('- Publication status: NOT_PUBLISHED','- Publication status: PENDING_PROTECTED_PR');
  base.evidenceMarkdown=base.evidenceMarkdown.replace('Evidence kind: SPRINT_ACTIVATION','Evidence kind: PHASE0_EXIT_TRANSITION')
    +'\n## Phase 0 transition\n\n```json\n'+JSON.stringify(records.exitEvidence.transition)+'\n```\n';
  base.phase0MatrixMarkdown='## Machine-readable evidence\n\n```json\n'+JSON.stringify(records.phase0Matrix)+'\n```\n';
  const parsed=parseLifecycleDocuments(base);assert.deepEqual(parsed.errors,[]);assert.equal(parsed.state,'TRANSITION_PENDING');
  const missing={...base,evidenceMarkdown:base.evidenceMarkdown.replace(/\n## Phase 0 transition[\s\S]*$/,'')};
  assert.notEqual(parseLifecycleDocuments(missing).state,'TRANSITION_PENDING');
});
test('parser permits verified currentPhase1 while retaining both historical Phase0 records',()=> {
  const records=fixture({published:true});const base=documents();
  base.sprintMarkdown=updateSection(base.sprintMarkdown,'## Sprint Context',{'Sprint status':'COMPLETED','Publication status':'PUBLISHED_VERIFIED'});
  base.deliveryMarkdown=updateSection(base.deliveryMarkdown,'## Current Position',{'Current roadmap phase':'Phase 1','Sprint status':'COMPLETED','Publication status':'PUBLISHED_VERIFIED'});
  base.indexMarkdown=updateSection(base.indexMarkdown,'## Current Sprint',{'Roadmap phase':'Phase 1','Status':'COMPLETED','Publication status':'PUBLISHED_VERIFIED'});
  base.evidenceMarkdown=base.evidenceMarkdown.replace('Evidence kind: SPRINT_ACTIVATION','Evidence kind: PHASE0_EXIT_TRANSITION')
    +'\n## Phase 0 transition\n\n```json\n'+JSON.stringify(records.exitEvidence.transition)+'\n```\n';
  base.phase0MatrixMarkdown='## Machine-readable evidence\n\n```json\n'+JSON.stringify(records.phase0Matrix)+'\n```\n';
  const parsed=parseLifecycleDocuments(base);assert.deepEqual(parsed.errors,[]);assert.equal(parsed.state,'COMPLETED');
  assert.equal(parsed.sprint.deliveryPhase,0);assert.equal(parsed.delivery.historicalSprint1.currentPhase,0);assert.equal(parsed.index.historicalSprint1.currentPhase,0);
});
test('actual transition publication requires a real ancestor/tree with the same published approval record',t=> {
  const tempParent=fs.realpathSync(os.tmpdir());const fixtureRoot=fs.mkdtempSync(path.join(tempParent,'apx-transition-git-'));
  t.after(()=>{const resolved=fs.realpathSync(fixtureRoot);assert.ok(resolved.startsWith(tempParent+path.sep)&&path.basename(resolved).startsWith('apx-transition-git-'));fs.rmSync(resolved,{recursive:true});});
  const git=(...args)=>{const result=spawnSync('git',args,{cwd:fixtureRoot,encoding:'utf8',timeout:10000});assert.equal(result.status,0,result.stderr);return result.stdout.trim();};
  git('init','--quiet');git('config','user.email','fixture@example.invalid');git('config','user.name','Synthetic fixture');
  fs.writeFileSync(path.join(fixtureRoot,'README.md'),'Synthetic baseline\n');git('add','.');git('commit','--quiet','-m','synthetic baseline');
  const unrelated=git('rev-parse','HEAD');const unrelatedTree=git('rev-parse','HEAD^{tree}');
  const approved=fixture().exitEvidence.transition;
  const recordPath=path.join(fixtureRoot,'api/docs/sprints/S002_REVIEW_EVIDENCE.md');fs.mkdirSync(path.dirname(recordPath),{recursive:true});
  fs.writeFileSync(recordPath,'## Phase 0 transition\n\n```json\n'+JSON.stringify(approved)+'\n```\n');
  git('add','.');git('commit','--quiet','-m','synthetic owner approved pending transition');
  const published=fixture({published:true}).exitEvidence.transition;
  Object.assign(published.transitionPublication,{merge:git('rev-parse','HEAD'),tree:git('rev-parse','HEAD^{tree}')});
  for(const check of published.transitionPublication.checks)check.commit=published.transitionPublication.merge;
  assert.doesNotThrow(()=>validateTransitionPublicationRepository({transition:published,repositoryRoot:fixtureRoot}));
  const badTree=structuredClone(published);badTree.transitionPublication.tree='d'.repeat(40);
  assert.throws(()=>validateTransitionPublicationRepository({transition:badTree,repositoryRoot:fixtureRoot}),/TRANSITION_PUBLISHED_TREE_MISMATCH/);
  const badApproval=structuredClone(published);badApproval.exitApproval.reference='OTHER-FIXTURE';
  assert.throws(()=>validateTransitionPublicationRepository({transition:badApproval,repositoryRoot:fixtureRoot}),/TRANSITION_PUBLISHED_RECORD_MISMATCH/);
  const badIdentity=structuredClone(published);Object.assign(badIdentity.transitionPublication,{merge:unrelated,tree:unrelatedTree});
  for(const check of badIdentity.transitionPublication.checks)check.commit=unrelated;
  assert.throws(()=>validateTransitionPublicationRepository({transition:badIdentity,repositoryRoot:fixtureRoot}),/TRANSITION_PUBLISHED_RECORD_INVALID/);
  approved.transitionPublication.pr='https://github.com/AkaDNT/auction-promax/pull/25';
  fs.writeFileSync(recordPath,'## Phase 0 transition\n\n```json\n'+JSON.stringify(approved)+'\n```\n');
  git('add','.');git('commit','--quiet','-m','synthetic pending publication with known PR');
  const knownPr=structuredClone(published);
  Object.assign(knownPr.transitionPublication,{merge:git('rev-parse','HEAD'),tree:git('rev-parse','HEAD^{tree}')});
  for(const check of knownPr.transitionPublication.checks)check.commit=knownPr.transitionPublication.merge;
  assert.doesNotThrow(()=>validateTransitionPublicationRepository({transition:knownPr,repositoryRoot:fixtureRoot}));
  const relabeledPr=structuredClone(knownPr);relabeledPr.transitionPublication.pr='https://github.com/AkaDNT/auction-promax/pull/26';
  assert.throws(()=>validateTransitionPublicationRepository({transition:relabeledPr,repositoryRoot:fixtureRoot}),/TRANSITION_PUBLISHED_PR_MISMATCH/);
});
