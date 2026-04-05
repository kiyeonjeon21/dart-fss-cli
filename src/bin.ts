#!/usr/bin/env node
import { createDartProgram } from './cli.js';
import { formatErrorJson } from './errors.js';

createDartProgram().parseAsync(process.argv).catch((err) => {
  console.error(formatErrorJson(err));
  process.exit(1);
});
