/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Rule, UpdateRecorder } from '@angular-devkit/schematics';
import * as ts from '../../third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { findNodes } from '../../utility/ast-utils';

/**
 * Update the usage of `TestBed.get` to `TestBed.inject`
 */
export function updateTestBedGet(): Rule {
  return tree => {
    tree.visit(path => {
      if (!path.endsWith('.ts')) {
        return;
      }

      const source = tree.read(path);
      if (!source) {
        return;
      }

      const sourceFile = ts.createSourceFile(
        path,
        source.toString().replace(/^\uFEFF/, ''),
        ts.ScriptTarget.Latest,
        true,
      );

      if (sourceFile.isDeclarationFile) {
        return;
      }

      const propertyAccessExpressionNodes = findNodes(
        sourceFile,
        ts.SyntaxKind.PropertyAccessExpression,
      ) as ts.PropertyAccessExpression[];

      const testbedNodes = propertyAccessExpressionNodes.filter(
        n => n.expression.getText() === 'TestBed' && n.name.text === 'get',
      );

      if (!testbedNodes.length) {
        return;
      }

      const recorder = tree.beginUpdate(path);
      for (const node of testbedNodes) {
        // replace `get` with `inject`
        recorder.remove(node.name.pos, node.name.getFullWidth());
        recorder.insertRight(node.name.pos, 'inject');

        if (ts.isCallExpression(node.parent) && node.parent.arguments) {
          const callExpression = node.parent;

          const typeArgumentName = removeTypeArgumentsNode(callExpression, recorder);
          const typeName = removeAsExpressionNode(callExpression, recorder);

          const argumentName = callExpression.arguments[0].getText();
          const nameToCheck = typeArgumentName || typeName || argumentName;

          if (argumentName !== nameToCheck) {
            recorder.insertRight(callExpression.end, ` as unknown as ${nameToCheck}`);
          }
        }
      }

      tree.commitUpdate(recorder);
    });

    return tree;
  };
}

/**
 * Remove the typeArguments, `get<T>` becomes `get`
 * @returns the name of the type argument
 */
function removeTypeArgumentsNode(
  callExpression: ts.CallExpression,
  recorder: UpdateRecorder,
): string {
  let typedArgument = '';
  if (callExpression.typeArguments) {
    const first = callExpression.typeArguments[0];
    const last = callExpression.typeArguments[callExpression.typeArguments.length - 1];
    typedArgument = first.getText();

    // also get the `<` and `>` nodes
    const [start, end] = [first.pos - 1, last.pos + last.getFullWidth() + 1];
    recorder.remove(start, end - start);
  }

  return typedArgument;
}

/**
 * Remove the as expression, `as T` becomes ``
 * @returns the type name
 */
function removeAsExpressionNode(
  callExpression: ts.CallExpression,
  recorder: UpdateRecorder,
): string {
  let typeName = '';
  if (ts.isAsExpression(callExpression.parent)) {
    const asExpression = callExpression.parent;
    typeName = ts.isTypeReferenceNode(asExpression.type)
      ? asExpression.type.typeName.getText()
      : '';

    // start at `callExpression.end` to also get the `as` node
    recorder.remove(
      callExpression.end,
      asExpression.type.pos - callExpression.end + asExpression.type.getFullWidth(),
    );
  }

  return typeName;
}
