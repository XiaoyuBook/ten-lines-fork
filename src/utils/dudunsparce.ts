export const DUNSPARCE_SPECIES = 206;

// Gen 3's PID becomes the Encryption Constant on the traditional transfer
// path. Dudunsparce's rare evolved form requires EC % 100 === 0:
// https://github.com/kwsch/PKHeX/blob/master/PKHeX.Core/PKM/PK5.cs
// https://github.com/kwsch/PKHeX/blob/master/PKHeX.Core/Legality/Restrictions/EvolutionRestrictions.cs
export function isThreeSegmentDudunsparcePid(pid: number): boolean {
    return Number.isInteger(pid) && pid >= 0 && pid <= 0xffffffff && pid % 100 === 0;
}
