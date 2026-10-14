import assert from "node:assert/strict";
import { DUNSPARCE_SPECIES, isThreeSegmentDudunsparcePid } from "../src/utils/dudunsparce.ts";

assert.equal(DUNSPARCE_SPECIES, 206);
for (const pid of [0, 100, 200, 0x12345618, 4294967200]) {
    assert.equal(pid % 100, 0);
    assert.equal(isThreeSegmentDudunsparcePid(pid), true);
}
for (const pid of [1, 25, 50, 75, 99, 101, 0x80000000, 0xffffffff, -100, 4294967296, 100.5, NaN, Infinity]) {
    assert.equal(isThreeSegmentDudunsparcePid(pid), false);
}
for (const pid of [100, 200, 0x12345618, 4294967200]) {
    assert.equal(pid % 25, 0, "Eligible Gen 3 PIDs must be Hardy, not merely any nature");
    assert.equal(pid & 1, 0, "Use the whole PID, not just nature or the ability bit");
}
console.log("Three-Segment Dudunsparce: unsigned full-PID criterion and boundaries passed.");
