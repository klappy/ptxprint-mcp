import {readFile, writeFile, appendFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
export function selectTag(tags, current) {
  const parse = v => /^v?(\d+)\.(\d+)\.(\d+)$/.exec(v)?.slice(1).map(Number);
  const cmp = (a,b) => a[0]-b[0] || a[1]-b[1] || a[2]-b[2];
  const baseline = parse(current);
  if (!baseline) throw Error('Invalid current semver');
  return tags.filter(t => parse(t.name) && /^[a-f0-9]{40}$/.test(t.commit?.sha ?? '') && cmp(parse(t.name), baseline)>0)
    .sort((a,b)=>cmp(parse(b.name),parse(a.name)))[0];
}
export function candidate(lock, tags) {
  const tag=selectTag(tags,lock.ptxprint.version);
  // Keep tested usfmtc until a deliberate paired-pin compatibility change.
  // Upstream's mutable main dependency is never followed automatically.
  return tag ? {...lock,ptxprint:{version:tag.name.replace(/^v/,''),commit:tag.commit.sha}} : null;
}
async function run() {
  const lock=JSON.parse(await readFile('engine-lock.json','utf8'));
  const tags=[];
  for (let page=1;page<=20;page++) {
    const res=await fetch(`https://api.github.com/repos/sillsdev/ptx2pdf/tags?per_page=100&page=${page}`,{headers:{Accept:'application/vnd.github+json',Authorization:`Bearer ${process.env.GH_TOKEN}`}});
    if(!res.ok) throw Error(`Upstream tags HTTP${res.status}`);
    const batch=await res.json(); tags.push(...batch);
    if(batch.length<100) break;
    if(page===20) throw Error('Tag pagination incomplete; refusing partial decision');
  }
  const next=candidate(lock,tags);
  if(!next) return;
  // /commits dereferences annotated tags; never confuse tag-object SHA with HEAD.
  const resolved=await fetch(`https://api.github.com/repos/sillsdev/ptx2pdf/commits/${next.ptxprint.commit}`,{headers:{Accept:'application/vnd.github+json',Authorization:`Bearer ${process.env.GH_TOKEN}`}});
  if(!resolved.ok) throw Error(`Commit resolution HTTP${resolved.status}`);
  const commit=await resolved.json();
  if(!/^[a-f0-9]{40}$/.test(commit.sha ?? '')) throw Error('Invalid resolved commit');
  next.ptxprint.commit=commit.sha;
  await writeFile('engine-lock.json',JSON.stringify(next,null,2)+'\n');
  if(process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT,`changed=true\nbranch=engine-candidate/${next.ptxprint.version}-${next.ptxprint.commit.slice(0,12)}\n`);
}
if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) await run();
