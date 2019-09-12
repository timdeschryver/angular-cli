/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { tags } from '@angular-devkit/core';
import { EmptyTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';

const sutFile = 'src/sut.spec.ts';

describe('Migration to version 9', () => {
  describe('Migrate to TestBed.inject', () => {
    const schematicRunner = new SchematicTestRunner(
      'migrations',
      require.resolve('../migration-collection.json'),
    );

    let tree: UnitTestTree;

    beforeEach(async () => {
      tree = new UnitTestTree(new EmptyTree());
      tree = await schematicRunner
        .runExternalSchematicAsync(
          require.resolve('../../collection.json'),
          'workspace',
          {
            name: 'migration-test',
            version: '1.2.3',
            directory: '.',
          },
          tree,
        )
        .toPromise();
    });

    it('should replace TestBed.get(T) with TestBed.inject(T)', async () => {
      tree.create(
        sutFile,
        Buffer.from(tags.stripIndents`
          import { TestBed } from '@angular/core/testing';
          import { HeroesService } from './heroes-service.ts';

          const heroesService = TestBed.get(HeroesService);
        `),
      );

      const tree2 = await schematicRunner
        .runSchematicAsync('migration-09', {}, tree.branch())
        .toPromise();
      expect(tree2.readContent(sutFile)).toContain(tags.stripIndents`
        import { TestBed } from '@angular/core/testing';
        import { HeroesService } from './heroes-service.ts';

        const heroesService = TestBed.inject(HeroesService);
      `);
    });

    it('should replace TestBed.get<T>(T) with TestBed.inject(T)', async () => {
      tree.create(
        sutFile,
        Buffer.from(tags.stripIndents`
          import { TestBed } from '@angular/core/testing';
          import { HeroesService } from './heroes-service.ts';

          const heroesService = TestBed.get<HeroesService>(HeroesService);
        `),
      );

      const tree2 = await schematicRunner
        .runSchematicAsync('migration-09', {}, tree.branch())
        .toPromise();

      expect(tree2.readContent(sutFile)).toContain(tags.stripIndents`
        import { TestBed } from '@angular/core/testing';
        import { HeroesService } from './heroes-service.ts';

        const heroesService = TestBed.inject(HeroesService);
      `);
    });

    it('should replace TestBed.get(T) as T with TestBed.inject(T)', async () => {
      tree.create(
        sutFile,
        Buffer.from(tags.stripIndents`
          import { TestBed } from '@angular/core/testing';
          import { HeroesService } from './heroes-service.ts';

          const heroesService = TestBed.get(HeroesService) as HeroesService;
        `),
      );

      const tree2 = await schematicRunner
        .runSchematicAsync('migration-09', {}, tree.branch())
        .toPromise();
      expect(tree2.readContent(sutFile)).toContain(tags.stripIndents`
        import { TestBed } from '@angular/core/testing';
        import { HeroesService } from './heroes-service.ts';

        const heroesService = TestBed.inject(HeroesService);
      `);
    });

    it('should cast to unknown if type names are not matching', async () => {
      tree.create(
        sutFile,
        Buffer.from(tags.stripIndents`
          import { TestBed } from '@angular/core/testing';
          import { HeroesService } from './heroes-service.ts';
          import { HeroesServiceMock } from './heroes-service-mock.ts';

          const heroesService = TestBed.get<HeroesServiceMock>(HeroesService);
          const heroesService2 = TestBed.get(HeroesService) as HeroesServiceMock;
        `),
      );

      const tree2 = await schematicRunner
        .runSchematicAsync('migration-09', {}, tree.branch())
        .toPromise();
      expect(tree2.readContent(sutFile)).toContain(tags.stripIndents`
        import { TestBed } from '@angular/core/testing';
        import { HeroesService } from './heroes-service.ts';
        import { HeroesServiceMock } from './heroes-service-mock.ts';

        const heroesService = TestBed.inject(HeroesService) as unknown as HeroesServiceMock;
        const heroesService2 = TestBed.inject(HeroesService) as unknown as HeroesServiceMock;
      `);
    });
  });
});
