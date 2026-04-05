#!/usr/bin/env node
import { createDartProgram } from './cli.js';

createDartProgram().parseAsync(process.argv).catch((err) => {
  console.error(err.message);
  process.exit(1);
});
