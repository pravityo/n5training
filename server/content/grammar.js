import { grammarCore } from './grammar-core.js';
import { grammarExtra } from './grammar-extra.js';

export const grammar = [...grammarCore, ...grammarExtra];
