/* Set of default configurations for the heap used in the Go ECE */

// The default size of the heap in words
// Total heap size (in bytes) = DEFAULT_HEAP_SIZE * WORD_SIZE
export const DEFAULT_HEAP_SIZE = 1024 // in words

// The smallest addressable unit in the heap
// We can think of it as the heap containing N number of words, each of size WORD_SIZE
export const WORD_SIZE = 8 // in bytes

// The offset of the size field in a heap block
export const SIZE_OFFSET = 5 // in bytes
