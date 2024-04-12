"use strict";
/* Set of default configurations for the heap used in the Go ECE */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SIZE_OFFSET = exports.DEFAULT_HEAP_SIZE = exports.WORD_SIZE = void 0;
// The smallest addressable unit in the heap
// We can think of it as the heap containing N number of words, each of size WORD_SIZE
exports.WORD_SIZE = 8; // in bytes
// The default size of the heap in words
// Total heap size (in bytes)
exports.DEFAULT_HEAP_SIZE = 4096 * exports.WORD_SIZE;
// The byte offset to the size of a heap object within a tagged pointer
exports.SIZE_OFFSET = 5; // in bytes
//# sourceMappingURL=config.js.map