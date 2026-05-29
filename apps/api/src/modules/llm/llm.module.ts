/**
 * LLM Module — proxy Anthropic pour TerriScan Lab
 * Importé dans app.module.ts.
 */

import { Module } from "@nestjs/common";
import { LlmController } from "./llm.controller";
import { Tome5Module } from "../../tomes/tome-5/tome-5.module";

@Module({
  imports: [Tome5Module],
  controllers: [LlmController],
})
export class LlmModule {}
