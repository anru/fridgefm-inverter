import fs from 'fs/promises';
import path from 'path';
import tsd from 'tsd';

type Diagnostic = {
  message: string;
  severity: string;
  line: string;
  column: string;
};

type TestTypeRes = {
  [key: `suite${number}`]: Diagnostic[] | undefined;
};

const runTypeTest = async (testFile: string): Promise<TestTypeRes> => {
  const testFileContents = await fs.readFile(path.resolve(process.cwd(), testFile), { encoding: 'utf-8' });
  const suiteBounds = testFileContents.split('\n').reduce((acc, cur, index) => {
    if (cur.trim().includes('_test_anchor')) {
      acc.push(index);
    }
    return acc;
  }, [] as number[]);

  const diagnostics = await tsd({
    cwd: process.cwd(),
    testFiles: [testFile],
    typingsFile: testFile, // fake
  });

  return diagnostics
    .filter((x) => x.fileName.includes(testFile))
    .reduce((acc, cur) => {
      const index = suiteBounds.findIndex((s, i) => cur.line > s && cur.line < (suiteBounds[i + 1] || +Infinity));
      const key = `suite${index + 1}`;
      if (!acc[key]) {
        throw new Error(`You have a type error out of bounds, please sync tests with typings in: ${cur.fileName}`);
      }
      acc[key].push({
        message: cur.message.split('\n')[0],
        severity: cur.severity,
        line: cur.line,
        column: cur.column,
      });
      return acc;
    }, Object.fromEntries(suiteBounds.map((_, i) => [`suite${i + 1}`, []])));
};

describe('types are sound', () => {
  it('token.type', async () => {
    const res = await runTypeTest('src/__tests__/token.spec-d.ts');
    expect(res).toEqual({
      suite1: [],
      suite2: [
        expect.objectContaining({
          message: "Type '(x: 1) => 1' is not assignable to type 'Fn'.",
        }),
      ],
    });
  });

  it('provider.type', async () => {
    const res = await runTypeTest('src/__tests__/provider.spec-d.ts');
    expect(res).toEqual({
      suite1: [],
      suite2: [
        expect.objectContaining({ message: expect.stringContaining('is not assignable to parameter of type') }),
        expect.objectContaining({ message: expect.stringContaining('is not assignable to parameter of type') }),
        expect.objectContaining({ message: "Parameter 'a' implicitly has an 'any' type." }),
      ],
      suite3: [
        expect.objectContaining({ message: expect.stringContaining("Property 'b' is missing in type") }),
        expect.objectContaining({
          message: expect.stringContaining("{ a: () => number; }' is not assignable to type"),
        }),
        expect.objectContaining({
          message: expect.stringContaining("{ a: () => number; c: () => number; }' is not assignable to type"),
        }),
      ],
    });
  });

  it('module.type', async () => {
    const res = await runTypeTest('src/__tests__/module.spec-d.ts');
    expect(res).toEqual({
      suite1: [],
      suite2: [
        expect.objectContaining({
          message: "Cannot invoke an object which is possibly 'undefined'.",
        }),
      ],
    });
  });
});
