import type { Dictionary, DMMF as PrismaDMMF } from '@prisma/generator-helper';
import { EnumMemberStructure, OptionalKind, Project } from 'ts-morph';
import path from 'path';

export default function generateEnum(
  project: Project,
  outputDir: string,
  enumItem: PrismaDMMF.DatamodelEnum,
  config: Dictionary<string | boolean>,
) {
  const dirPath = path.resolve(outputDir, 'enums');
  let fileName = `${enumItem.name}.enum.ts`;

  if (config.toLowerCase) {
    fileName = fileName.toLowerCase();
  }
  let filePath = path.resolve(dirPath, fileName);

  const sourceFile = project.createSourceFile(filePath, undefined, {
    overwrite: true,
  });

  sourceFile.addEnum({
    isExported: true,
    name: enumItem.name,
    members: enumItem.values.map<OptionalKind<EnumMemberStructure>>(
      ({ name }) => ({
        name,
        value: name,
      }),
    ),
  });
}
