# Prisma NestJS DTO Generator

[![npm version](https://badge.fury.io/js/prisma-nestjs-dto-generator.svg)](https://badge.fury.io/js/prisma-nestjs-dto-generator)
[![npm](https://img.shields.io/npm/dt/prisma-nestjs-dto-generator.svg)](https://www.npmjs.com/package/prisma-nestjs-dto-generator)
[![HitCount](https://hits.dwyl.com/omar-dulaimi/prisma-nestjs-dto-generator.svg?style=flat)](http://hits.dwyl.com/omar-dulaimi/prisma-nestjs-dto-generator)
[![npm](https://img.shields.io/npm/l/prisma-nestjs-dto-generator.svg)](LICENSE)

Automatically generate typescript models of your database with class validator validations ready, from your [Prisma](https://github.com/prisma/prisma) Schema. Updates every time `npx prisma generate` runs.

## Table of Contents

- [Supported Prisma Versions](#supported-prisma-versions)
- [Installation](#installing)
- [Usage](#usage)
- [Additional Options](#additional-options)

# Supported Prisma Versions

Probably no breaking changes for this library, so try newer versions first.

### Prisma 4

- 0.2.0 and higher

### Prisma 2/3

- 0.1.1 and lower

## Installation

Using npm:

```bash
 npm install --save-dev prisma-nestjs-dto-generator
```

Using yarn:

```bash
 yarn add -D prisma-nestjs-dto-generator
```

# Usage

1, Star this repo 😉

2, Add the generator to your Prisma schema

```prisma
generator nestjs_dto_generator {
  provider = "prisma-nestjs-dto-generator"
}
```

3, Running `npx prisma generate` for the following schema.prisma

```prisma
generator client {
  provider = "prisma-client-js"
}

generator nestjs_dto_generator {
  provider = "prisma-nestjs-dto-generator"
  enableModel = true // default: true
  modelFileNameSuffix = ".model" // default: ".model"
  modelClassNameSuffix = "Model" // default: ""
  enableSwagger = true // default: false
  dtoClassNameSuffix = "Dto" // default: "Dto"
  dtoFileNameSuffix = ".dto" // default: ".dto"
  toLowerCase = true // field name to lower case, default: false
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  ADMIN
  USER
}

model User {
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?
  posts Post[]
  role  Role    @default(USER)
}

model Post {
  id        Int      @id @default(autoincrement())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  title     String
  content   String?
  published Boolean  @default(false)
  viewCount Int      @default(0)
  author    User?    @relation(fields: [authorId], references: [id])
  authorId  Int?
  // This comment is just for you. It will not be displayed.
  /// It will be displayed as description ApiProperty
  rating    Float
}

```

Will generate the following path:

```
- prisma
  - genarated
    - dtos
    - models
    - enums
```

Inside `UserModel` model:

```ts
import {
  IsNumber,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { PostModel } from './';
import { Role } from '../enums';

export class UserModel {
  @IsNotEmpty()
  @IsNumber()
  id: number;

  @IsNotEmpty()
  @IsString()
  email: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  posts: PostModel[];

  @IsNotEmpty()
  @IsEnum(Role)
  role: Role;
}
```

Inside `UserDto`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { PostDto } from './';
import { Role } from '../enums';

export class UserDto {
  @ApiProperty({ required: true })
  @IsNotEmpty()
  @IsNumber()
  id: number;

  @ApiProperty({ required: true })
  @IsNotEmpty()
  @IsString()
  email: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: true, type: () => PostDto })
  @IsOptional()
  posts: PostDto[];

  @ApiProperty({ required: true })
  @IsNotEmpty()
  @IsEnum(Role)
  role: Role;
}
```

## Using with Nest.js Swagger module

```ts

import { extraModels } from 'prisma/generated/dtos';
...

const document = SwaggerModule.createDocument(app, config, {
    extraModels: extraModels,
  });
```

## Additional Options

| Option                 |  Description                                | Type      |  Default      |
| ---------------------- | ------------------------------------------- | --------- | ------------- |
| `output`               | Output directory for the generated models   | `string`  | `./generated` |
| `enableModel`          | Enable generate models folder and class     | `boolean` | `true`        |
| `modelFileNameSuffix`  | Suffix model file name, ex: `user.model.ts` | `string`  | `.model`      |
| `modelClassNameSuffix` | Suffix model class name, ex: `UserModel`    | `string`  | `null`        |
| `enableSwagger`        | Enable generate dtos folder and Dto class   | `boolean` | `false`       |
| `dtoClassNameSuffix`   | Suffix dto class name, ex: `UserDto`        | `string`  | `Dto`         |
| `dtoFileNameSuffix`    | Suffix dto file name, ex: `user.dto.ts`     | `string`  | `.dto`        |
| `toLowerCase`          | Convert generated file name to lower case   | `boolean` | `false`       |

Use additional options in the `schema.prisma`

```prisma
generator nestjs_dto_generator {
  provider = "prisma-nestjs-dto-generator"
  output = "./output-generated"
  enableModel = true // default: true
  modelFileNameSuffix = ".model" // default: ".model"
  modelClassNameSuffix = "Model" // default: ""
  enableSwagger = true // default: false
  dtoClassNameSuffix = "Dto" // default: "Dto"
  dtoFileNameSuffix = ".dto" // default: ".dto"
  toLowerCase = true // field name to lower case, default: false
}
```

## Tips

Add description for `ApiProperty` can use `///` in `schema.prisma`. Follow example bellow!

In `schema.prisma`
Add `It will be displayed as description ApiProperty` description for `rating` column

```prisma
model Post {
  id        Int      @id @default(autoincrement())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  title     String
  content   String?
  published Boolean  @default(false)
  viewCount Int      @default(0)
  author    User?    @relation(fields: [authorId], references: [id])
  authorId  Int?
  // This comment is just for you. It will not be displayed.
  /// It will be displayed as description ApiProperty
  rating    Float
}
```

In `PostDto`

```ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsNotEmpty,
  IsDate,
  IsString,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { UserDto } from './';

export class PostDto {
  @ApiProperty({ required: true })
  @IsNotEmpty()
  @IsNumber()
  id: number;

  @ApiProperty({ required: true })
  @IsNotEmpty()
  @IsDate()
  createdAt: Date;

  @ApiProperty({ required: true })
  @IsNotEmpty()
  @IsDate()
  updatedAt: Date;

  @ApiProperty({ required: true })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  content?: string;

  @ApiProperty({ required: true })
  @IsNotEmpty()
  @IsBoolean()
  published: boolean;

  @ApiProperty({ required: true })
  @IsNotEmpty()
  @IsNumber()
  viewCount: number;

  @ApiProperty({ type: () => UserDto })
  @IsOptional()
  author?: UserDto;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  authorId?: number;

  @ApiProperty({
    description: 'It will be displayed as description ApiProperty',
    required: true,
  })
  @IsNotEmpty()
  @IsNumber()
  rating: number;
}
```
