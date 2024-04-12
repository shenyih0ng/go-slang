import { RequireProvider } from '../modules/requireProvider';
import { NativeStorage } from '../types';
type Evaler = (code: string, req: RequireProvider, nativeStorage: NativeStorage) => any;
export declare const sandboxedEval: Evaler;
export {};
