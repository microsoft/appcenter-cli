import { parseRange, getByteRange, IByteRange } from "../../../../src/commands/test/lib/byte-range-helper";
import { expect } from "chai";
import * as temp from "temp";
import * as fs from "fs";
import * as pfs from "../../../../src/util/misc/promisfied-fs";

async function createFileWithByteRange(start: number, range: number[], totalSize: number): Promise<string> {
  let pathAndFd = await pfs.openTempFile("byte_range_test");
  try {
    if (start > 0) {
      debugger;
      await appendData(pathAndFd.fd, getRandomBytes(start));
    }    
    await appendData(pathAndFd.fd, range);
    
    let remaining = totalSize - start - range.length;
    if (remaining > 0) {
      await appendData(pathAndFd.fd, getRandomBytes(remaining));
    }
    await pfs.close(pathAndFd.fd);
  }
  catch (err) {
    await pfs.close(pathAndFd.fd);
    await pfs.unlink(pathAndFd.path);
    throw err;
  }

  return pathAndFd.path;
}

function getRandomBytes(length: number): number[] {
  let result: number[] = [];
  
  for (let i = 0; i < length; i++) {
    result.push(Math.floor(Math.random() * 256));
  }

  return result;
}

function appendData(fd: number, range: number[]): Promise<void> {
  return pfs.write(fd, new Buffer(range));
}

describe("parseRange", () => {
  it("should parse correct range", () => {
    expect(parseRange("1-10")).to.deep.equal({ start: 1, length: 10 });
    expect(parseRange("2-3")).to.deep.equal({ start: 2, length: 2 });
    expect(parseRange("1-1")).to.deep.equal({ start: 1, length: 1 });
    expect(parseRange("1024-2048")).to.deep.equal({ start: 1024, length: 1025 }); 
  });

  it("should throw if range is incorrect", () => {
    expect(() => parseRange("123-")).to.throw(Error);
    expect(() => parseRange("foo-bar")).to.throw(Error);
    expect(() => parseRange("-1-2")).to.throw(Error);
    expect(() => parseRange("2-1")).to.throw(Error);
  });
});

describe("getByteRange", () => {
  it("should return correct range is within file size", async () => {
    let expectedRange = [ 1, 1, 3, 4, 5 ];
    let testFile = await createFileWithByteRange(10, expectedRange, 1024);
    try {
      let actualRange = await getByteRange(testFile, 10, expectedRange.length);
      expect(actualRange).to.deep.equal(expectedRange);
    }
    finally {
      await pfs.unlink(testFile);
    }
  });

  it("should remove bytes outside of file size", async () => {
    let expectedRange = [ 1, 1, 3 ];
    let testFile = await createFileWithByteRange(0, expectedRange, expectedRange.length);
    try {
      let actualRange = await getByteRange(testFile, 0, 1024);
      expect(actualRange).to.deep.equal(expectedRange);
    }
    finally {
      await pfs.unlink(testFile);
    }
  });
});

