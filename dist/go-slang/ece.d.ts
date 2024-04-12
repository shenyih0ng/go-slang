import { Context as SlangContext } from '..';
import { Value } from '../types';
import { SourceFile } from './types';
export declare function evaluate(program: SourceFile, heapSize: number, slangContext: SlangContext): Value;
