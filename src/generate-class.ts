import path from 'path';
import { OptionalKind, Project, PropertyDeclarationStructure } from 'ts-morph';

import {
  generateClassValidatorImport,
  generateEnumImports,
  generatePrismaImport,
  generateRelationImportsImport,
  getDecoratorsByFieldType,
  getDecoratorsImportsByType,
  getTSDataTypeFromFieldType,
  shouldImportPrisma,
} from './helpers';

import type { Dictionary, DMMF as PrismaDMMF } from '@prisma/generator-helper';
export default async function generateClass(
  project: Project,
  outputDir: string,
  model: PrismaDMMF.Model,
  config: Dictionary<string>,
) {
  const dirPath = path.resolve(outputDir, 'models');
  let fileName = `${model.name}${config.modelFileNameSuffix || '.model'}.ts`;

  if (config.toLowerCase) {
    fileName = fileName.toLowerCase();
  }

  let filePath = path.resolve(dirPath, fileName);

  const sourceFile = project.createSourceFile(filePath, undefined, {
    overwrite: true,
  });

  const validatorImports = [
    ...new Set(
      model.fields
        .map((field) => getDecoratorsImportsByType(field))
        .flatMap((item) => item),
    ),
  ];

  if (shouldImportPrisma(model.fields)) {
    generatePrismaImport(sourceFile);
  }

  generateClassValidatorImport(sourceFile, validatorImports as Array<string>);

  const relationImports = new Set();
  model.fields.forEach((field) => {
    if (field.relationName && model.name !== field.type) {
      relationImports.add(field.type);
    }
  });

  generateRelationImportsImport(
    sourceFile,
    [...relationImports] as Array<string>,
    config,
  );

  generateEnumImports(sourceFile, model.fields);

  sourceFile.addClass({
    name: model.name + `${config.modelClassNameSuffix || ''}`,
    isExported: true,
    properties: [
      ...model.fields.map<OptionalKind<PropertyDeclarationStructure>>(
        (field) => {
          return {
            name: field.name,
            type: getTSDataTypeFromFieldType(field, config),
            hasQuestionToken: !field.isRequired,
            trailingTrivia: '\r\n',
            decorators: getDecoratorsByFieldType(field, config),
          };
        },
      ),
    ],
  });
}
