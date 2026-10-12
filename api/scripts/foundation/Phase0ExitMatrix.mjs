const OWNER='AkaDNT (Project Owner / Repository Owner)';
const REPOSITORY='https://github.com/AkaDNT/auction-promax';
const SERVICE_IDS=['identity-profile-service','auction-service','bidding-service','billing-service','realtime-gateway'];
const REQUIREMENTS=[...Array.from({length:12},(_,i)=>`D${String(i+1).padStart(2,'0')}`),'E01','E02','E03'];
const SCOPES=[['architecture-decisions'],['repository'],SERVICE_IDS.slice(1),SERVICE_IDS,SERVICE_IDS,['shared-contracts'],SERVICE_IDS,
  [SERVICE_IDS[0]],[SERVICE_IDS[0]],SERVICE_IDS.slice(0,4),SERVICE_IDS,SERVICE_IDS,SERVICE_IDS,SERVICE_IDS,[SERVICE_IDS[0]]];
const GAP_IDS=['service-template','authentication-authorization','product-functions','producer-consumer-contracts','production-platform-operations','security-findings'];
const RUNTIME=new Set(['D04','D05','D07','D08','D09','D10','D11','D12','E01','E02','E03']);
const exact=(value,keys)=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const sha=value=>typeof value==='string'&&/^[0-9a-f]{40}$/.test(value)&&!/^0+$/.test(value);
const text=value=>typeof value==='string'&&value.trim()===value&&value.length>0&&value.length<=2000&&!/[\r\n\u0000]/.test(value);
const reference=value=>text(value)&&(/^(?:api\/docs\/|docs\/superpowers\/)[A-Za-z0-9_./-]+\.md(?:#[A-Za-z0-9_-]+)?$/.test(value)&&!value.includes('..')
  || /^https:\/\/github\.com\/AkaDNT\/auction-promax\/(?:actions\/runs|pull)\/[1-9][0-9]*$/.test(value));
const date=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
const equal=(left,right)=>Array.isArray(left)&&left.length===right.length&&left.every((value,index)=>value===right[index]);

export function parsePhase0ExitMatrix(markdown) {
  if(typeof markdown!=='string') throw new Error('PHASE0_MATRIX_BLOCK_INVALID');
  const blocks=[...markdown.replace(/\r\n/g,'\n').matchAll(/^## Machine-readable evidence\n\n```json\n([\s\S]*?)\n```(?=\n|$)/gm)];
  if(blocks.length!==1||(markdown.match(/^## Machine-readable evidence\r?$/gm)??[]).length!==1) throw new Error('PHASE0_MATRIX_BLOCK_INVALID');
  try {return JSON.parse(blocks[0][1]);} catch {throw new Error('PHASE0_MATRIX_BLOCK_INVALID');}
}

export function validatePhase0ExitMatrix(matrix,{expectedRevision,expectedTree,requireExit=false}={}) {
  const errors=[];
  const fail=code=>{if(!errors.includes(code))errors.push(code);};
  try {
    if(!exact(matrix,['schemaVersion','phase','status','implementationRevision','implementationTree','requirements','services',
      'consumerCompatibility','inheritedGaps','security','ownerAcceptance','publication'])) {
      return {valid:false,exitReady:false,errors:['PHASE0_MATRIX_SHAPE_INVALID']};
    }
    if(matrix.schemaVersion!==1||matrix.phase!==0||!['IN_PROGRESS','CANDIDATE_READY','OWNER_ACCEPTED','PUBLISHED_VERIFIED'].includes(matrix.status)) fail('PHASE0_MATRIX_STATE_INVALID');
    if(!sha(expectedRevision)||!sha(expectedTree)||matrix.implementationRevision!==expectedRevision||matrix.implementationTree!==expectedTree) fail('PHASE0_MATRIX_REVISION_MISMATCH');
    if(!Array.isArray(matrix.requirements)||matrix.requirements.length!==15) fail('PHASE0_REQUIREMENT_SET_INVALID');
    for(const [index,row] of (Array.isArray(matrix.requirements)?matrix.requirements:[]).entries()) {
      if(!exact(row,['requirementId','authority','scope','implementationRevision','evidence','result','ownerAcceptanceReference'])) {fail('PHASE0_REQUIREMENT_SHAPE_INVALID');continue;}
      if(row.requirementId!==REQUIREMENTS[index]||!equal(row.scope,SCOPES[index]??[])) fail('PHASE0_REQUIREMENT_SET_INVALID');
      if(!reference(row.authority)||row.implementationRevision!==expectedRevision) fail('PHASE0_REQUIREMENT_REVISION_INVALID');
      if(!['PENDING','PASS','APPROVED_DECISION'].includes(row.result)||(row.result==='APPROVED_DECISION'&&row.requirementId!=='D01')
        ||(row.result==='PASS'&&row.requirementId==='D01')) fail('PHASE0_REQUIREMENT_RESULT_INVALID');
      if(!Array.isArray(row.evidence)) {fail('PHASE0_EVIDENCE_INVALID');continue;}
      for(const item of row.evidence) if(!exact(item,['kind','revision','reference'])||!['DECISION','SOURCE','RUNTIME','CONTRACT'].includes(item.kind)
        ||item.revision!==expectedRevision||!reference(item.reference)) fail('PHASE0_EVIDENCE_INVALID');
      if(row.result!=='PENDING') {
        if(row.evidence.length===0) fail('PHASE0_EVIDENCE_MISSING');
        if(RUNTIME.has(row.requirementId)&&!row.evidence.some(item=>item.kind==='RUNTIME')) fail('PHASE0_RUNTIME_EVIDENCE_REQUIRED');
        if(['D02','D03','D06'].includes(row.requirementId)&&!row.evidence.some(item=>['SOURCE','RUNTIME','CONTRACT'].includes(item.kind))) fail('PHASE0_IMPLEMENTATION_EVIDENCE_REQUIRED');
        if(row.requirementId==='D01'&&!row.evidence.some(item=>item.kind==='DECISION')) fail('PHASE0_DECISION_EVIDENCE_REQUIRED');
      }
      if(row.ownerAcceptanceReference!==null&&!text(row.ownerAcceptanceReference)) fail('PHASE0_ACCEPTANCE_INVALID');
    }
    if(!Array.isArray(matrix.services)||matrix.services.length!==5) fail('PHASE0_SERVICE_SET_INVALID');
    for(const [index,service] of (Array.isArray(matrix.services)?matrix.services:[]).entries()) {
      if(!exact(service,['serviceId','sourceKind','build','isolation','http','candidateRevision','executionRevision','evidenceReference'])) {fail('PHASE0_SERVICE_SHAPE_INVALID');continue;}
      if(service.serviceId!==SERVICE_IDS[index]||service.sourceKind!=='COMMITTED') fail('PHASE0_SERVICE_SET_INVALID');
      if(!['PENDING','PASS'].includes(service.build)||!['PENDING','PASS'].includes(service.http)) fail('PHASE0_SERVICE_RESULT_INVALID');
      if(index===4?service.isolation!=='NOT_APPLICABLE_GATEWAY':!['PENDING','PASS'].includes(service.isolation)) fail('PHASE0_SERVICE_ISOLATION_INVALID');
      if(service.candidateRevision!==expectedRevision||!sha(service.executionRevision)||!reference(service.evidenceReference)) fail('PHASE0_SERVICE_REVISION_INVALID');
    }
    if(matrix.consumerCompatibility!=='DEFERRED_NO_PRODUCER_CONTRACT') fail('PHASE0_CONSUMER_SCOPE_INVALID');
    if(!Array.isArray(matrix.inheritedGaps)||matrix.inheritedGaps.length!==6) fail('PHASE0_GAP_SET_INVALID');
    for(const [index,gap] of (Array.isArray(matrix.inheritedGaps)?matrix.inheritedGaps:[]).entries()) {
      if(!exact(gap,['gapId','source','mandatoryPhase0','targetPhase','disposition','authority','evidenceReference'])) {fail('PHASE0_GAP_SHAPE_INVALID');continue;}
      if(gap.gapId!==GAP_IDS[index]||gap.mandatoryPhase0!==(index===0)||!reference(gap.source)||!reference(gap.authority)||!reference(gap.evidenceReference)) fail('PHASE0_GAP_SET_INVALID');
      if(!Number.isInteger(gap.targetPhase)||gap.targetPhase<0||gap.targetPhase>13) fail('PHASE0_GAP_SCOPE_INVALID');
      if(index===0&&(gap.targetPhase!==0||!['PENDING','RESOLVED_PHASE0'].includes(gap.disposition))) fail('PHASE0_MANDATORY_GAP_UNRESOLVED');
      if([1,2,4].includes(index)&&(gap.targetPhase===0||gap.disposition!=='OPEN_LATER_PHASE')) fail('PHASE0_GAP_SCOPE_INVALID');
      if(index===3&&(gap.targetPhase===0||gap.disposition!=='DEFERRED_NO_PRODUCER_CONTRACT')) fail('PHASE0_CONSUMER_SCOPE_INVALID');
      if(index===5&&(gap.targetPhase!==0||gap.disposition!=='RESIDUAL_FINDINGS')) fail('PHASE0_SECURITY_SCOPE_INVALID');
    }
    const security=matrix.security;
    if(!exact(security,['executionState','policyState','revision','evidenceReference','counts'])||!['PENDING','PASS'].includes(security.executionState)
      ||!['PENDING','PASS','BLOCKED'].includes(security.policyState)||security.revision!==expectedRevision||!reference(security.evidenceReference)) fail('PHASE0_SECURITY_INVALID');
    if(security.counts!==null&&(!exact(security.counts,['CRITICAL','HIGH','MEDIUM','LOW','UNKNOWN'])
      ||Object.values(security.counts).some(value=>!Number.isSafeInteger(value)||value<0))) fail('PHASE0_SECURITY_COUNTS_INVALID');
    const technicalReady=matrix.requirements.every(row=>row.result!=='PENDING')&&matrix.services.every(service=>service.build==='PASS'&&service.http==='PASS'
      &&(service.serviceId===SERVICE_IDS[4]?service.isolation==='NOT_APPLICABLE_GATEWAY':service.isolation==='PASS'))
      &&matrix.inheritedGaps[0]?.disposition==='RESOLVED_PHASE0'&&security.executionState==='PASS'&&['PASS','BLOCKED'].includes(security.policyState)&&security.counts!==null;
    if(matrix.status!=='IN_PROGRESS'&&!technicalReady) fail('PHASE0_TECHNICAL_EVIDENCE_INCOMPLETE');
    const accepted=['OWNER_ACCEPTED','PUBLISHED_VERIFIED'].includes(matrix.status);
    const acceptance=matrix.ownerAcceptance;
    if(accepted) {
      if(!exact(acceptance,['owner','date','scope','reference','revision','tree'])||acceptance.owner!==OWNER||!date(acceptance.date)
        ||acceptance.scope!=='PHASE0_TECHNICAL_CANDIDATE'||!text(acceptance.reference)||acceptance.revision!==expectedRevision||acceptance.tree!==expectedTree) fail('PHASE0_ACCEPTANCE_INVALID');
      if(matrix.requirements.some(row=>row.ownerAcceptanceReference!==acceptance?.reference)) fail('PHASE0_ACCEPTANCE_INVALID');
    } else if(acceptance!==null||matrix.requirements.some(row=>row.ownerAcceptanceReference!==null)) fail('PHASE0_PREMATURE_ACCEPTANCE');
    const publication=matrix.publication;
    if(matrix.status==='PUBLISHED_VERIFIED') {
      if(!exact(publication,['status','merge','tree','pr','runtimeRevision','runtimeTree','applicabilityReference','checks'])||publication.status!=='PUBLISHED_VERIFIED'
        ||!sha(publication.merge)||!sha(publication.tree)||!new RegExp(`^${REPOSITORY}/pull/[1-9][0-9]*$`).test(publication.pr??'')
        ||publication.runtimeRevision!==expectedRevision||publication.runtimeTree!==expectedTree||!reference(publication.applicabilityReference)) fail('PHASE0_PUBLICATION_INVALID');
      const checks=publication?.checks;
      if(!Array.isArray(checks)||checks.length!==2||!equal(checks.map(item=>item?.name).sort(),['monorepo-required','supply-chain-verification'])) fail('PHASE0_PUBLISHED_CHECKS_INVALID');
      for(const item of Array.isArray(checks)?checks:[]) if(!exact(item,['name','conclusion','commit','runUrl'])||item.conclusion!=='SUCCESS'
        ||item.commit!==publication.merge||!new RegExp(`^${REPOSITORY}/actions/runs/[1-9][0-9]*$`).test(item.runUrl??'')) fail('PHASE0_PUBLISHED_CHECKS_INVALID');
    } else if(publication!==null) fail('PHASE0_PREMATURE_PUBLICATION');
    if(requireExit&&matrix.status!=='PUBLISHED_VERIFIED') fail('PHASE0_EXIT_NOT_PUBLISHED');
    return {valid:errors.length===0,exitReady:errors.length===0&&technicalReady&&accepted&&matrix.status==='PUBLISHED_VERIFIED',errors};
  } catch {fail('PHASE0_MATRIX_INPUT_INVALID');return {valid:false,exitReady:false,errors};}
}
