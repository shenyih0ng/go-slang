export declare const streamPrelude = "\n\n// Supporting streams in the Scheme style, following\n// \"stream discipline\"\n\n// is_stream recurses down the stream and checks that it ends with the\n// empty list null\n\nfunction is_stream(xs) {\n  return is_null(xs) ||\n    (is_pair(xs) &&\n    is_function(tail(xs)) &&\n    arity(tail(xs)) === 0 &&\n    is_stream(stream_tail(xs)));\n}\n\n// A stream is either null or a pair whose tail is\n// a nullary function that returns a stream.\n\nfunction list_to_stream(xs) {\n  return is_null(xs)\n    ? null\n    : pair(head(xs),\n      () => list_to_stream(tail(xs)));\n}\n\n// stream_to_list transforms a given stream to a list\n// Lazy? No: stream_to_list needs to force the whole stream\nfunction stream_to_list(xs) {\n  return is_null(xs)\n    ? null\n    : pair(head(xs), stream_to_list(stream_tail(xs)));\n}\n\n// stream_length returns the length of a given argument stream\n// throws an exception if the argument is not a stream\n// Lazy? No: The function needs to explore the whole stream\nfunction stream_length(xs) {\n  return is_null(xs)\n    ? 0\n    : 1 + stream_length(stream_tail(xs));\n}\n\n// stream_map applies first arg f to the elements of the second\n// argument, assumed to be a stream.\n// f is applied element-by-element:\n// stream_map(f,list_to_stream(list(1,2)) results in\n// the same as list_to_stream(list(f(1),f(2)))\n// stream_map throws an exception if the second argument is not a\n// stream, and if the second argument is a nonempty stream and the\n// first argument is not a function.\n// Lazy? Yes: The argument stream is only explored as forced by\n//            the result stream.\nfunction stream_map(f, s) {\n  return is_null(s)\n    ? null\n    : pair(f(head(s)),\n      () => stream_map(f, stream_tail(s)));\n}\n\n// build_stream takes a function fun as first argument, \n// and a nonnegative integer n as second argument,\n// build_stream returns a stream of n elements, that results from\n// applying fun to the numbers from 0 to n-1.\n// Lazy? Yes: The result stream forces the applications of fun\n//            for the next element\nfunction build_stream(fun, n) {\n  function build(i) {\n    return i >= n\n      ? null\n      : pair(fun(i),\n        () => build(i + 1));\n  }\n  return build(0);\n}\n\n// stream_for_each applies first arg fun to the elements of the stream\n// passed as second argument. fun is applied element-by-element:\n// for_each(fun,list_to_stream(list(1, 2,null))) results in the calls fun(1)\n// and fun(2).\n// stream_for_each returns true.\n// stream_for_each throws an exception if the second argument is not a\n// stream, and if the second argument is a nonempty stream and the\n// first argument is not a function.\n// Lazy? No: stream_for_each forces the exploration of the entire stream\nfunction stream_for_each(fun, xs) {\n  if (is_null(xs)) {\n    return true;\n  } else {\n    fun(head(xs));\n    return stream_for_each(fun, stream_tail(xs));\n  }\n}\n\n// stream_reverse reverses the argument stream\n// stream_reverse throws an exception if the argument is not a stream.\n// Lazy? No: stream_reverse forces the exploration of the entire stream\nfunction stream_reverse(xs) {\n  function rev(original, reversed) {\n    return is_null(original)\n      ? reversed\n      : rev(stream_tail(original),\n        pair(head(original), () => reversed));\n  }\n  return rev(xs, null);\n}\n\n// stream_append appends first argument stream and second argument stream.\n// In the result, null at the end of the first argument stream\n// is replaced by the second argument stream\n// stream_append throws an exception if the first argument is not a\n// stream.\n// Lazy? Yes: the result stream forces the actual append operation\nfunction stream_append(xs, ys) {\n  return is_null(xs)\n    ? ys\n    : pair(head(xs),\n      () => stream_append(stream_tail(xs), ys));\n}\n\n// stream_member looks for a given first-argument element in a given\n// second argument stream. It returns the first postfix substream\n// that starts with the given element. It returns null if the\n// element does not occur in the stream\n// Lazy? Sort-of: stream_member forces the stream only until the element is found.\nfunction stream_member(x, s) {\n  return is_null(s)\n    ? null\n    : head(s) === x\n      ? s\n      : stream_member(x, stream_tail(s));\n}\n\n// stream_remove removes the first occurrence of a given first-argument element\n// in a given second-argument list. Returns the original list\n// if there is no occurrence.\n// Lazy? Yes: the result stream forces the construction of each next element\nfunction stream_remove(v, xs) {\n  return is_null(xs)\n    ? null\n    : v === head(xs)\n      ? stream_tail(xs)\n      : pair(head(xs),\n        () => stream_remove(v, stream_tail(xs)));\n}\n\n// stream_remove_all removes all instances of v instead of just the first.\n// Lazy? Yes: the result stream forces the construction of each next element\nfunction stream_remove_all(v, xs) {\n  return is_null(xs)\n    ? null\n    : v === head(xs)\n      ? stream_remove_all(v, stream_tail(xs))\n      : pair(head(xs), () => stream_remove_all(v, stream_tail(xs)));\n}\n\n// filter returns the substream of elements of given stream s\n// for which the given predicate function p returns true.\n// Lazy? Yes: The result stream forces the construction of\n//            each next element. Of course, the construction\n//            of the next element needs to go down the stream\n//            until an element is found for which p holds.\nfunction stream_filter(p, s) {\n  return is_null(s)\n    ? null\n    : p(head(s))\n      ? pair(head(s),\n        () => stream_filter(p, stream_tail(s)))\n      : stream_filter(p, stream_tail(s));\n}\n\n// enumerates numbers starting from start,\n// using a step size of 1, until the number\n// exceeds end.\n// Lazy? Yes: The result stream forces the construction of\n//            each next element\nfunction enum_stream(start, end) {\n  return start > end\n    ? null\n    : pair(start,\n      () => enum_stream(start + 1, end));\n}\n\n// integers_from constructs an infinite stream of integers\n// starting at a given number n\n// Lazy? Yes: The result stream forces the construction of\n//            each next element\nfunction integers_from(n) {\n  return pair(n,\n    () => integers_from(n + 1));\n}\n\n// eval_stream constructs the list of the first n elements\n// of a given stream s\n// Lazy? Sort-of: eval_stream only forces the computation of\n//                the first n elements, and leaves the rest of\n//                the stream untouched.\nfunction eval_stream(s, n) {\n    function es(s, n) {\n        return n === 1 \n               ? list(head(s))\n               : pair(head(s), \n                      es(stream_tail(s), n - 1));\n    }\n    return n === 0 \n           ? null\n           : es(s, n);\n}\n\n// Returns the item in stream s at index n (the first item is at position 0)\n// Lazy? Sort-of: stream_ref only forces the computation of\n//                the first n elements, and leaves the rest of\n//                the stream untouched.\nfunction stream_ref(s, n) {\n  return n === 0\n    ? head(s)\n    : stream_ref(stream_tail(s), n - 1);\n}\n";
