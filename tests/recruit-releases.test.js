const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const releases=require('../recruit-releases.js');
const data=require('../releases.json');
const load=path=>fs.readFileSync(require('node:path').join(__dirname,'..',path),'utf8');
test('App release manifest includes immutable identity, Chinese details and visible version',()=>{
 assert.equal(releases.valid(data),true);
 assert.equal(data.currentVersion,'v2.1.3');
 assert.equal(data.releases.filter(x=>x.published).length,1);
 assert.equal(data.releases[0].id,'recruit-v2.1.3-20261118');
 assert.match(load('index.html'),/v2\.1\.3/);
 assert.match(load('recruit-content.js'),/version: "v2\.1\.3"/);
});
test('semantic versions compare numerically; malformed versions cannot trigger lock',()=>{
 assert.equal(releases.compare('v2.10.0','v2.9.9'),1);
 assert.equal(releases.compare('v2.1.3','v2.1.3'),0);
 assert.equal(releases.compare('v2.1.3','v2.1.4'),-1);
 assert.equal(releases.compare('2.1.0','v2.1.0'),0);
 assert.equal(releases.compare('bad','v2.1.3'),null);
 assert.equal(releases.compare('v2.1.3','https://x.invalid'),null);
});
test('same-origin manifest and app-scoped storage/release history remain separate from GAS',()=>{
 assert.match(load('recruit-releases.js'),/new URL\("releases\.json",win\.location\.href\)/);
 assert.match(load('recruit-releases.js'),/url\.origin!==win\.location\.origin/);
 assert.match(load('recruit-releases.js'),/editor\.isDirty/);
 assert.match(load('recruit-releases.js'),/editor\.save\(\)/);
 assert.match(load('recruit-releases.js'),/sessionStorage\.getItem\(GUARD\)/);
 assert.match(load('recruit-releases.js'),/win\.location\.reload\(\)/);
 assert.doesNotMatch(load('recruit-releases.js'),/localStorage\.clear|deleteDatabase/);
 assert.match(load('sw.js'),/releases\.json/);
 assert.match(load('index.html'),/recruit-releases\.js/);
});
