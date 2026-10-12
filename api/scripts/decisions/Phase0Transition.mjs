import {validatePhase0ExitMatrix} from '../foundation/Phase0ExitMatrix.mjs';
import {spawnSync} from 'node:child_process';

const OWNER='AkaDNT (Project Owner / Repository Owner)';
const REPOSITORY='https://github.com/AkaDNT/auction-promax';
const CHECKS=['monorepo-required','supply-chain-verification'];
const exact=(value,keys)=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const sha=value=>typeof value==='string'&&/^[0-9a-f]{40}$/.test(value)&&!/^0+$/.test(value);
const text=value=>typeof value==='string'&&value.trim()===value&&value.length>0&&value.length<=2000&&!/[\r\n\u0000]/.test(value);
function date(value) {
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed=new Date(value+'T00:00:00Z');
  return !Number.isNaN(parsed.valueOf())&&parsed.toISOString().slice(0,10)===value;
}
function publication(value,allowPending,fail) {
  if(!exact(value,['status','merge','tree','pr','checks'])) {fail('TRANSITION_PUBLICATION_INVALID');return false;}
  if(allowPending&&value.status==='PENDING_PROTECTED_PR') {
    const valid=value.merge===null&&value.tree===null&&Array.isArray(value.checks)&&value.checks.length===0
      &&(value.pr===null||new RegExp(`^${REPOSITORY}/pull/[1-9][0-9]*$`).test(value.pr));
    if(!valid)fail('TRANSITION_PUBLICATION_INVALID');
    return valid;
  }
  if(value.status!=='PUBLISHED_VERIFIED'||!sha(value.merge)||!sha(value.tree)||!new RegExp(`^${REPOSITORY}/pull/[1-9][0-9]*$`).test(value.pr??'')) fail('TRANSITION_PUBLICATION_INVALID');
  if(!Array.isArray(value.checks)||value.checks.length!==2||value.checks.map(item=>item?.name).sort().join('|')!==CHECKS.join('|')) fail('TRANSITION_CHECKS_INVALID');
  for(const check of Array.isArray(value.checks)?value.checks:[]) if(!exact(check,['name','conclusion','commit','runUrl'])||check.conclusion!=='SUCCESS'
    ||check.commit!==value.merge||!new RegExp(`^${REPOSITORY}/actions/runs/[1-9][0-9]*$`).test(check.runUrl??'')) fail('TRANSITION_CHECKS_INVALID');
  return value.status==='PUBLISHED_VERIFIED';
}

export function parsePhase0Transition(markdown) {
  if(typeof markdown!=='string') throw new Error('TRANSITION_RECORD_INVALID');
  const source=markdown.replace(/\r\n/g,'\n');
  const headings=source.match(/^## Phase 0 transition$/gm)??[];
  const blocks=[...source.matchAll(/^## Phase 0 transition\n\n```json\n([\s\S]*?)\n```(?=\n|$)/gm)];
  if(headings.length!==1||blocks.length!==1) throw new Error('TRANSITION_RECORD_INVALID');
  try {return JSON.parse(blocks[0][1]);} catch {throw new Error('TRANSITION_RECORD_INVALID');}
}

export function validatePhase0Transition({sprint,delivery,index,transition,matrix}) {
  const errors=[];const fail=code=>{if(!errors.includes(code))errors.push(code);};
  try {
    if(!exact(transition,['schemaVersion','technicalPublication','exitApproval','handoffApproval','transitionPublication','consumerCompatibility','releasePolicy','handoffReference'])
      ||transition.schemaVersion!==1) return {valid:false,state:'INVALID',errors:['TRANSITION_RECORD_INVALID']};
    const matrixResult=validatePhase0ExitMatrix(matrix,{expectedRevision:matrix?.implementationRevision,expectedTree:matrix?.implementationTree,requireExit:true});
    if(!matrixResult.valid||!matrixResult.exitReady) fail('TRANSITION_MATRIX_NOT_PUBLISHED');
    publication(transition.technicalPublication,false,fail);
    const expected=matrix?.publication;
    const actual=transition.technicalPublication;
    if(!expected||actual?.merge!==expected.merge||actual?.tree!==expected.tree||actual?.pr!==expected.pr
      ||JSON.stringify(actual?.checks)!==JSON.stringify(expected.checks)) fail('TRANSITION_TECHNICAL_IDENTITY_MISMATCH');
    for(const [field,scope] of [['exitApproval','ACTUAL_PHASE0_EXIT'],['handoffApproval','PHASE1_HANDOFF']]) {
      const approval=transition[field];
      if(!exact(approval,['owner','date','scope','reference','technicalMerge','technicalTree'])||approval.owner!==OWNER||!date(approval.date)
        ||approval.scope!==scope||!text(approval.reference)||approval.technicalMerge!==actual?.merge||approval.technicalTree!==actual?.tree
        ||approval.date< (matrix?.ownerAcceptance?.date??'')) fail('TRANSITION_OWNER_APPROVAL_INVALID');
    }
    if(transition.handoffApproval?.date<transition.exitApproval?.date) fail('TRANSITION_OWNER_APPROVAL_INVALID');
    if(transition.consumerCompatibility!=='DEFERRED_NO_PRODUCER_CONTRACT'||transition.consumerCompatibility!==matrix?.consumerCompatibility) fail('TRANSITION_CONSUMER_SCOPE_INVALID');
    if(!['PASS','BLOCKED'].includes(transition.releasePolicy)||transition.releasePolicy!==matrix?.security?.policyState) fail('TRANSITION_POLICY_MISMATCH');
    if(transition.handoffReference!=='api/docs/decisions/PHASE_1_HANDOFF.md') fail('TRANSITION_HANDOFF_REFERENCE_INVALID');
    publication(transition.transitionPublication,true,fail);
    if(transition.transitionPublication?.status==='PUBLISHED_VERIFIED'&&transition.transitionPublication.merge===actual?.merge) fail('TRANSITION_PUBLICATION_REUSED');
    const pending=sprint.status==='TRANSITION_PENDING';
    const completed=sprint.status==='COMPLETED';
    if(!pending&&!completed) fail('TRANSITION_STATE_INVALID');
    if(sprint.deliveryPhase!==0||delivery.currentSprint!=='SPRINT-002'||index.currentSprint!=='SPRINT-002') fail('PHASE_MISMATCH');
    if(pending) {
      if(transition.transitionPublication?.status!=='PENDING_PROTECTED_PR'||sprint.publicationStatus!=='PENDING_PROTECTED_PR'
        ||delivery.currentPhase!==0||index.currentPhase!==0||delivery.currentStatus!=='IN_PROGRESS'||index.currentStatus!=='IN_PROGRESS'
        ||delivery.publicationStatus!=='PENDING_PROTECTED_PR'||index.publicationStatus!=='PENDING_PROTECTED_PR') fail('TRANSITION_PREMATURE_COMPLETION');
    } else if(completed) {
      if(transition.transitionPublication?.status!=='PUBLISHED_VERIFIED'||sprint.publicationStatus!=='PUBLISHED_VERIFIED'
        ||delivery.currentPhase!==1||index.currentPhase!==1||delivery.currentStatus!=='COMPLETED'||index.currentStatus!=='COMPLETED'
        ||delivery.publicationStatus!=='PUBLISHED_VERIFIED'||index.publicationStatus!=='PUBLISHED_VERIFIED') fail('TRANSITION_PREMATURE_COMPLETION');
    }
    return {valid:errors.length===0,state:errors.length?'INVALID':pending?'TRANSITION_PENDING':'COMPLETED',errors};
  } catch {fail('TRANSITION_RECORD_INVALID');return {valid:false,state:'INVALID',errors};}
}

export function validateTransitionPublicationRepository({transition,repositoryRoot}) {
  const errors=[];
  publication(transition?.transitionPublication,true,code=>errors.push(code));
  if(errors.length)throw new Error(errors[0]);
  const published=transition.transitionPublication;
  if(published.status==='PENDING_PROTECTED_PR')return;
  const git=(args,code)=> {
    const result=spawnSync('git',args,{cwd:repositoryRoot,encoding:'utf8',timeout:10000,maxBuffer:2*1024*1024});
    if(result.status!==0||result.error)throw new Error(code);
    return result.stdout;
  };
  const actualTree=git(['rev-parse',`${published.merge}^{tree}`],'TRANSITION_PUBLISHED_COMMIT_INVALID').trim();
  if(actualTree!==published.tree)throw new Error('TRANSITION_PUBLISHED_TREE_MISMATCH');
  git(['merge-base','--is-ancestor',published.merge,'HEAD'],'TRANSITION_PUBLISHED_COMMIT_NOT_ANCESTOR');
  const actualMarkdown=git(['show',`${published.merge}:api/docs/sprints/S002_REVIEW_EVIDENCE.md`],'TRANSITION_PUBLISHED_RECORD_INVALID');
  let actual;
  try {actual=parsePhase0Transition(actualMarkdown);} catch {throw new Error('TRANSITION_PUBLISHED_RECORD_INVALID');}
  if(!exact(actual,['schemaVersion','technicalPublication','exitApproval','handoffApproval','transitionPublication','consumerCompatibility','releasePolicy','handoffReference'])
    ||actual.transitionPublication?.status!=='PENDING_PROTECTED_PR')throw new Error('TRANSITION_PUBLISHED_RECORD_INVALID');
  if(actual.transitionPublication.pr!==null&&actual.transitionPublication.pr!==published.pr)throw new Error('TRANSITION_PUBLISHED_PR_MISMATCH');
  for(const key of ['schemaVersion','technicalPublication','exitApproval','handoffApproval','consumerCompatibility','releasePolicy','handoffReference']) {
    if(JSON.stringify(actual[key])!==JSON.stringify(transition[key]))throw new Error('TRANSITION_PUBLISHED_RECORD_MISMATCH');
  }
}
