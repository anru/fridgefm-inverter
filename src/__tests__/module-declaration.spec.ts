import { declareContainer, createToken, declareModule, injectable } from '../index';
import type { ModuleDeclaration } from '../module/module.types';
// [ModuleN, TokenN, ProviderInModuleN]
const V1_TOKEN = createToken<readonly [number, 1, number]>('value1');
const V2_TOKEN = createToken<readonly [number, 2, number]>('value2');

const createFakeModule = (count: number, imports?: ModuleDeclaration[]) =>
  declareModule({
    name: `module-${count}`,
    providers: [
      injectable({ provide: V1_TOKEN, useValue: [count, 1, 1] }),
      injectable({ provide: V1_TOKEN, useFactory: () => [count, 1, 2] as const }),
      injectable({ provide: V2_TOKEN, useValue: [count, 2, 3] }),
    ],
    imports: imports || [],
  });

describe('module-declaration', () => {
  describe('base mechanics', () => {
    it('modules declare self providers', () => {
      const container = declareContainer({
        modules: [createFakeModule(0)],
        providers: [],
      });

      expect(container.get(V1_TOKEN)).toEqual([0, 1, 2]);
      expect(container.get(V2_TOKEN)).toEqual([0, 2, 3]);
    });

    it('container providers are higher priority than modules ones', () => {
      const container = declareContainer({
        modules: [createFakeModule(0)],
        providers: [
          injectable({
            provide: V2_TOKEN,
            useValue: [100, 2, 100],
          }),
        ],
      });

      expect(container.get(V1_TOKEN)).toEqual([0, 1, 2]);
      expect(container.get(V2_TOKEN)).toEqual([100, 2, 100]);
    });

    it.todo('dynamic modules via forRootFn');
  });

  // declaring a module into a container basically means to create a correct order of providers
  describe('order specific mechanics', () => {
    it('first registered module is shadowed by next providers', () => {
      const container = declareContainer({
        modules: [createFakeModule(0), createFakeModule(1)],
        providers: [],
      });

      expect(container.get(V1_TOKEN)).toEqual([1, 1, 2]);
      expect(container.get(V2_TOKEN)).toEqual([1, 2, 3]);
    });

    it('module wont register its dependencies more than once', () => {
      const repeatedModule = createFakeModule(0);
      const container = declareContainer({
        modules: [repeatedModule, createFakeModule(1, [repeatedModule])],
        providers: [],
      });
      expect(container.get(V1_TOKEN)).toEqual([1, 1, 2]);
      expect(container.get(V2_TOKEN)).toEqual([1, 2, 3]);
    });

    it('duped module injects if added later', () => {
      let timesV1Called = 0;
      const dupModule = declareModule({
        name: 'Module',
        providers: [
          injectable({
            provide: V1_TOKEN,
            useFactory: () => {
              timesV1Called += 1;
              return [1, 1, 0] as const;
            },
          }),
        ],
      });
      const container = declareContainer({
        modules: [createFakeModule(1, [dupModule]), dupModule],
        providers: [],
      });
      expect(container.get(V1_TOKEN)).toEqual([1, 1, 0]);
      expect(timesV1Called).toEqual(1);
    });

    it('duped module wont inject if added earlier', () => {
      let timesV1Called = 0;
      const dupModule = declareModule({
        name: 'Module',
        providers: [
          injectable({
            provide: V1_TOKEN,
            useFactory: () => {
              timesV1Called += 1;
              return [1, 1, 0] as const;
            },
          }),
        ],
      });
      const container = declareContainer({
        modules: [dupModule, createFakeModule(1, [dupModule])],
        providers: [],
      });
      expect(container.get(V1_TOKEN)).toEqual([1, 1, 2]);
      expect(timesV1Called).toEqual(0);
    });

    it('first registered module is shadowed by next modules imports', () => {
      const container = declareContainer({
        modules: [createFakeModule(0), createFakeModule(1, [createFakeModule(2)])],
        providers: [],
      });
      // resolve order: module-0, module-2, module-1 - the latter wins
      expect(container.get(V1_TOKEN)).toEqual([1, 1, 2]);
      expect(container.get(V2_TOKEN)).toEqual([1, 2, 3]);
    });
  });
});