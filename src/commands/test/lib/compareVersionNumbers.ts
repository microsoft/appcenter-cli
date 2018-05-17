 // From appcenter testCloud utils

/**
 * Compare version numbers.
 *
 * @export
 * @class CompareVersionNumbers
 */

export namespace CompareVersionNumbers {
  const regExStripAZ = /[^\.0-9]/g;
  const regExStrip0 = /(\.0+)+$/;

  /**
   * Converts a version number string into an array of numbers.
   */
  const getSegments = (version: string): number[] => {
    return version.replace(regExStripAZ, "").replace(regExStrip0, "").split(".").map(Number);
  };

  /**
   * Finds the sorting difference between two version number arrays.
   */
  const getDiff = (pre: string, pos: string): number => {
    const segmentsA = getSegments(pre);
    const segmentsB = getSegments(pos);
    let diff;
    let i;
    const minLength = Math.min(segmentsA.length, segmentsB.length);
    for (i = 0; i < minLength; i++) {
      diff = segmentsA[i] - segmentsB[i];
      if (diff) {
        return diff;
      }
    }
    return segmentsA.length - segmentsB.length;
  };

  /**
   * Compares version numbers in descending order.
   */
  export function compareDesc(versionA: string, versionB: string): number {
    return getDiff(versionB, versionA);
  }

  /**
   * Compares version numbers in ascending order.
   */
  export function compareAsc(versionA: string, versionB: string): number {
    return getDiff(versionA, versionB);
  }
}
