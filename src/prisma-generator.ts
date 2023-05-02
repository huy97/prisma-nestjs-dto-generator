import { EnvValue, GeneratorOptions } from '@prisma/generator-helper';
import { getDMMF, parseEnvValue } from '@prisma/internals';
import { promises as fs } from 'fs';
import path from 'path';

import generateClass from './generate-class';
import generateDtos from './generate-dto';
import generateEnum from './generate-enum';
import {
  generateDtosIndexFile,
  generateEnumsIndexFile,
  generateModelsIndexFile,
} from './helpers';
import { project } from './project';
import removeDir from './utils/removeDir';

export async function generate(options: GeneratorOptions) {
  const config = options.generator.config;

  const { enableModel = true, enableSwagger } = config;

  const outputDir = parseEnvValue(options.generator.output as EnvValue);
  await fs.mkdir(outputDir, { recursive: true });
  await removeDir(outputDir, true);

  const prismaClientProvider = options.otherGenerators.find(
    (it) => parseEnvValue(it.provider) === 'prisma-client-js',
  );

  const prismaClientDmmf = await getDMMF({
    datamodel: options.datamodel,
    previewFeatures: prismaClientProvider?.previewFeatures,
  });

  const enumNames = new Set<string>();
  prismaClientDmmf.datamodel.enums.forEach((enumItem) => {
    enumNames.add(enumItem.name);
    generateEnum(project, outputDir, enumItem, config);
  });

  if (enumNames.size > 0) {
    const enumsIndexSourceFile = project.createSourceFile(
      path.resolve(outputDir, 'enums', 'index.ts'),
      undefined,
      { overwrite: true },
    );
    generateEnumsIndexFile(enumsIndexSourceFile, [...enumNames], config);
  }

  const types = prismaClientDmmf.datamodel.types.map((type) => type.name);

  if (enableModel) {
    prismaClientDmmf.datamodel.models.forEach((model) =>
      generateClass(project, outputDir, model, config, types),
    );
    generateModelsIndexFile(prismaClientDmmf, project, outputDir, config);
  }

  if (enableSwagger) {
    prismaClientDmmf.datamodel.models.forEach((model) =>
      generateDtos(project, outputDir, model, config, types),
    );
    generateDtosIndexFile(prismaClientDmmf, project, outputDir, config);
  }

  await project.save();
}
