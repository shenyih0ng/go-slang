/* Set of default configurations for the heap used in the Go ECE */

// The smallest addressable unit in the heap
// We can think of it as the heap containing N number of words, each of size WORD_SIZE
export const WORD_SIZE = 8 // in bytes

// The default size of the heap in words
// Total heap size (in bytes)
export const DEFAULT_HEAP_SIZE = 4096 * WORD_SIZE

// The byte offset to the size of a heap object within a tagged pointer
export const SIZE_OFFSET = 5 // in bytes
