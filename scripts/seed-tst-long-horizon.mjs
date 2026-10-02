import { TaskStatusService } from '../lib/service.mjs'

const cwd = '/home/hagbard/dev/tst-long-horizon'
const svc = new TaskStatusService()
await svc.init({
  cwd,
  title: 'tst-long-horizon',
  phase: 'demo',
  verifyHint: 'node hello.js prints hello long-horizon',
})
await svc.setNext(cwd, [
  'skim README',
  'run node hello.js',
  'mark greet done',
])
await svc.setInflight(cwd, 'skim README')
await svc.markDone(cwd, 'create fixture repo', 'README + hello.js committed', false)
console.log('seeded', svc.pathFor(cwd))
console.log(await svc.get(cwd))
