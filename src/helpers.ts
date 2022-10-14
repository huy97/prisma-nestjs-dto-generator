import type { Dictionary, DMMF as PrismaDMMF } from '@prisma/generator-helper';
import path from 'path';
import {
  ExportDeclarationStructure,
  OptionalKind,
  SourceFile,
  DecoratorStructure,
  Project,
  ImportDeclarationStructure,
} from 'ts-morph';

export const generateModelsIndexFile = (
  prismaClientDmmf: PrismaDMMF.Document,
  project: Project,
  outputDir: string,
  config: Dictionary<string | boolean>,
) => {
  const modelsBarrelExportSourceFile = project.createSourceFile(
    path.resolve(outputDir, 'models', 'index.ts'),
    undefined,
    { overwrite: true },
  );

  modelsBarrelExportSourceFile.addExportDeclarations(
    prismaClientDmmf.datamodel.models
      .map((model) => model.name)
      .sort()
      .map<OptionalKind<ExportDeclarationStructure>>((modelName) => {
        let moduleSpecifier = `./${modelName}${
          config.modelFileNameSuffix || '.model'
        }`;

        if (config.toLowerCase) {
          moduleSpecifier = moduleSpecifier.toLowerCase();
        }

        return {
          moduleSpecifier,
          namedExports: [modelName + `${config.modelClassNameSuffix || ''}`],
        };
      }),
  );
};

export const generateDtosIndexFile = (
  prismaClientDmmf: PrismaDMMF.Document,
  project: Project,
  outputDir: string,
  config: Dictionary<string | boolean>,
) => {
  const modelsBarrelExportSourceFile = project.createSourceFile(
    path.resolve(outputDir, 'dtos', 'index.ts'),
    undefined,
    { overwrite: true },
  );

  //add import first
  modelsBarrelExportSourceFile.addImportDeclarations(
    prismaClientDmmf.datamodel.models
      .map((model) => model.name)
      .sort()
      .map<OptionalKind<ImportDeclarationStructure>>((modelName) => {
        let moduleSpecifier = `./${modelName}${
          config.dtoFileNameSuffix || '.dto'
        }`;

        if (config.toLowerCase) {
          moduleSpecifier = moduleSpecifier.toLowerCase();
        }

        return {
          moduleSpecifier,
          namedImports: [modelName + `${config.dtoClassNameSuffix || 'Dto'}`],
        };
      }),
  );

  //Then export
  modelsBarrelExportSourceFile.addExportDeclarations(
    prismaClientDmmf.datamodel.models
      .map((model) => model.name)
      .sort()
      .map<OptionalKind<ExportDeclarationStructure>>((modelName) => {
        let moduleSpecifier = `./${modelName}${
          config.dtoFileNameSuffix || '.dto'
        }`;

        if (config.toLowerCase) {
          moduleSpecifier = moduleSpecifier.toLowerCase();
        }

        return {
          moduleSpecifier,
          namedExports: [modelName + `${config.dtoClassNameSuffix || 'Dto'}`],
        };
      }),
  );

  modelsBarrelExportSourceFile.addStatements(/* ts */ `
    export const extraModels = [
      ${prismaClientDmmf.datamodel.models
        .map((model) => model.name)
        .sort()
        .map<String>(
          (modelName) => modelName + `${config.dtoClassNameSuffix || 'Dto'}`,
        )}
    ]
  `);
};

export const shouldImportPrisma = (fields: PrismaDMMF.Field[]) => {
  return fields.some((field) => ['Decimal', 'Json'].includes(field.type));
};

export const shouldImportHelpers = (fields: PrismaDMMF.Field[]) => {
  return fields.some((field) => ['enum'].includes(field.kind));
};

export const getTSDataTypeFromFieldType = (
  field: PrismaDMMF.Field,
  config: Dictionary<string | boolean>,
  isModel: boolean = true,
) => {
  let type = field.type;
  switch (field.type) {
    case 'Int':
    case 'Float':
      type = 'number';
      break;
    case 'DateTime':
      type = 'Date';
      break;
    case 'String':
      type = 'string';
      break;
    case 'Boolean':
      type = 'boolean';
      break;
    case 'Decimal':
      type = 'Prisma.Decimal';
      break;
    case 'Json':
      type = 'Prisma.JsonValue';
      break;
    default:
      if (field.relationName) {
        if (isModel) {
          type = `${type}${config.modelClassNameSuffix || ''}`;
        } else {
          type = `${type}${config.dtoClassNameSuffix || 'Dto'}`;
        }
      }
      if (field.isList) {
        type = `${type}[]`;
      }
  }
  return type;
};

export const getDecoratorsByFieldType = (
  field: PrismaDMMF.Field,
  config: Dictionary<string | boolean>,
  isModel: boolean = true,
) => {
  const decorators: OptionalKind<DecoratorStructure>[] = [];

  switch (field.type) {
    case 'Int':
    case 'Float':
      decorators.push({
        name: 'IsNumber',
        arguments: [],
      });
      break;
    case 'DateTime':
      decorators.push({
        name: 'IsDate',
        arguments: [],
      });
      break;
    case 'String':
      decorators.push({
        name: 'IsString',
        arguments: [],
      });
      break;
    case 'Boolean':
      decorators.push({
        name: 'IsBoolean',
        arguments: [],
      });
      break;
  }
  if (field.isRequired && !field.relationName) {
    decorators.unshift({
      name: 'IsNotEmpty',
      arguments: [],
    });
  } else {
    decorators.unshift({
      name: 'IsOptional',
      arguments: [],
    });
  }
  if (field.kind === 'enum') {
    decorators.push({
      name: 'IsEnum',
      arguments: [String(field.type)],
    });
  }

  if (config.enableSwagger && !isModel) {
    const swaggerArguments = [];

    if (field.documentation) {
      swaggerArguments.push(`description: "${field.documentation}"`);
    }

    if (field.isRequired) {
      swaggerArguments.push(`required: true`);
    }

    if (field.relationName) {
      swaggerArguments.push(
        `type: () => ${field.type}${config.dtoClassNameSuffix || 'Dto'}`,
      );
    }

    const apiProperty: any = {
      name: 'ApiProperty',
      arguments: swaggerArguments.length
        ? [`{ ${swaggerArguments.join(', ')} }`]
        : [],
    };

    decorators.unshift(apiProperty);
  }

  return decorators;
};

export const getDecoratorsImportsByType = (field: PrismaDMMF.Field) => {
  const validatorImports = new Set();

  switch (field.type) {
    case 'Int':
    case 'Float':
      validatorImports.add('IsNumber');
      break;
    case 'DateTime':
      validatorImports.add('IsDate');
      break;
    case 'String':
      validatorImports.add('IsString');
      break;
    case 'Boolean':
      validatorImports.add('IsBoolean');
      break;
  }
  if (field.isRequired && !field.relationName) {
    validatorImports.add('IsNotEmpty');
  } else {
    validatorImports.add('IsOptional');
  }
  if (field.kind === 'enum') {
    validatorImports.add('IsEnum');
  }
  return [...validatorImports];
};

export const generateClassValidatorImport = (
  sourceFile: SourceFile,
  validatorImports: Array<string>,
) => {
  sourceFile.addImportDeclaration({
    moduleSpecifier: 'class-validator',
    namedImports: validatorImports,
  });
};

export const generateNestSwaggerImport = (
  sourceFile: SourceFile,
  propertiesImports: Array<string>,
) => {
  sourceFile.addImportDeclaration({
    moduleSpecifier: '@nestjs/swagger',
    namedImports: propertiesImports,
  });
};

export const generatePrismaImport = (sourceFile: SourceFile) => {
  sourceFile.addImportDeclaration({
    moduleSpecifier: '@prisma/client',
    namedImports: ['Prisma'],
  });
};

export const generateRelationImportsImport = (
  sourceFile: SourceFile,
  relationImports: Array<string>,
  config: Dictionary<string | boolean>,
  isModel: boolean = true,
) => {
  const namedImports = relationImports.map((relationImport) => {
    if (isModel) {
      return `${relationImport}${config.modelClassNameSuffix || ''}`;
    } else {
      return `${relationImport}${config.dtoClassNameSuffix || 'Dto'}`;
    }
  });

  sourceFile.addImportDeclaration({
    moduleSpecifier: './',
    namedImports,
  });
};

export const generateEnumImports = (
  sourceFile: SourceFile,
  fields: PrismaDMMF.Field[],
) => {
  const enumsToImport = fields
    .filter((field) => field.kind === 'enum')
    .map((field) => field.type);

  if (enumsToImport.length > 0) {
    sourceFile.addImportDeclaration({
      moduleSpecifier: '../enums',
      namedImports: enumsToImport,
    });
  }
};

export function generateEnumsIndexFile(
  sourceFile: SourceFile,
  enumNames: string[],
  config: Dictionary<string | boolean>,
) {
  sourceFile.addExportDeclarations(
    enumNames.sort().map<OptionalKind<ExportDeclarationStructure>>((name) => {
      let moduleSpecifier = `./${name}.enum`;

      if (config.toLowerCase) {
        moduleSpecifier = moduleSpecifier.toLowerCase();
      }
      return {
        moduleSpecifier,
        namedExports: [name],
      };
    }),
  );
}
