// 과장 표현 규칙 자체 점검: npx tsx scripts/check-exaggeration.ts
// 테스트 데이터(20261028_테스트상품_v3.csv) 10건 — P07·P10은 잡혀야 하고, 나머지는 잡히면 안 됨(오탐)
import { readFileSync } from "node:fs";
import { findExaggeration } from "../lib/logic";

const rows = readFileSync("../20261028_테스트상품_v3.csv", "utf-8").trim().split("\n").slice(1).map(l => l.split(","));
let fail = 0;
for (const r of rows) {
  const id = r[0], text = r.slice(5).join(" ");
  const found = findExaggeration(text);
  const expect = id === "P07" || id === "P10";
  const ok = expect ? found.length > 0 : found.length === 0;
  if (!ok) fail++;
  console.log(`${ok ? "OK " : "XX "} ${id} ${found.length}건 ${found.map(f => `[${f.cat}] ${f.word}`).join(" / ")}`);
}
// 흔한 정상 문장이 잡히지 않는지 (오탐 방지)
for (const t of ["최대 4명 소규모", "맛과 당도는 일반 사과와 같아요", "꼼꼼한 안내와 관리", "출근 전 30분 PT"]) {
  const f = findExaggeration(t);
  if (f.length) { fail++; console.log("XX 오탐:", t, f.map(x => x.word)); }
}
console.log(fail ? `FAIL ${fail}` : "ALL OK");
process.exit(fail ? 1 : 0);
