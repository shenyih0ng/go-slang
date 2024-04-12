"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenType = void 0;
// Token names mostly identical to CPython https://github.com/python/cpython/blob/main/Lib/token.py.
// Main difference is that keywords are also a token type while in CPython they are generic name.
// We could also resolve special names at AST parse time.
// Also renamed some token names to make more sense.
var TokenType;
(function (TokenType) {
    //// Source S1
    TokenType[TokenType["ENDMARKER"] = 0] = "ENDMARKER";
    TokenType[TokenType["NAME"] = 1] = "NAME";
    TokenType[TokenType["NUMBER"] = 2] = "NUMBER";
    TokenType[TokenType["STRING"] = 3] = "STRING";
    TokenType[TokenType["NEWLINE"] = 4] = "NEWLINE";
    TokenType[TokenType["INDENT"] = 5] = "INDENT";
    TokenType[TokenType["DEDENT"] = 6] = "DEDENT";
    TokenType[TokenType["LPAR"] = 7] = "LPAR";
    TokenType[TokenType["RPAR"] = 8] = "RPAR";
    TokenType[TokenType["COLON"] = 9] = "COLON";
    TokenType[TokenType["DOUBLECOLON"] = 10] = "DOUBLECOLON";
    TokenType[TokenType["COMMA"] = 11] = "COMMA";
    TokenType[TokenType["PLUS"] = 12] = "PLUS";
    TokenType[TokenType["MINUS"] = 13] = "MINUS";
    TokenType[TokenType["BANG"] = 14] = "BANG";
    TokenType[TokenType["STAR"] = 15] = "STAR";
    TokenType[TokenType["SLASH"] = 16] = "SLASH";
    TokenType[TokenType["VBAR"] = 17] = "VBAR";
    TokenType[TokenType["AMPER"] = 18] = "AMPER";
    TokenType[TokenType["LESS"] = 19] = "LESS";
    TokenType[TokenType["GREATER"] = 20] = "GREATER";
    TokenType[TokenType["EQUAL"] = 21] = "EQUAL";
    TokenType[TokenType["PERCENT"] = 22] = "PERCENT";
    TokenType[TokenType["DOUBLEEQUAL"] = 23] = "DOUBLEEQUAL";
    TokenType[TokenType["NOTEQUAL"] = 24] = "NOTEQUAL";
    TokenType[TokenType["LESSEQUAL"] = 25] = "LESSEQUAL";
    TokenType[TokenType["GREATEREQUAL"] = 26] = "GREATEREQUAL";
    TokenType[TokenType["DOUBLESTAR"] = 27] = "DOUBLESTAR";
    // Special identifiers
    TokenType[TokenType["AND"] = 28] = "AND";
    TokenType[TokenType["OR"] = 29] = "OR";
    TokenType[TokenType["FOR"] = 30] = "FOR";
    TokenType[TokenType["WHILE"] = 31] = "WHILE";
    TokenType[TokenType["NONE"] = 32] = "NONE";
    TokenType[TokenType["TRUE"] = 33] = "TRUE";
    TokenType[TokenType["FALSE"] = 34] = "FALSE";
    TokenType[TokenType["IS"] = 35] = "IS";
    TokenType[TokenType["NOT"] = 36] = "NOT";
    TokenType[TokenType["ISNOT"] = 37] = "ISNOT";
    TokenType[TokenType["PASS"] = 38] = "PASS";
    TokenType[TokenType["DEF"] = 39] = "DEF";
    TokenType[TokenType["LAMBDA"] = 40] = "LAMBDA";
    TokenType[TokenType["FROM"] = 41] = "FROM";
    TokenType[TokenType["DOUBLESLASH"] = 42] = "DOUBLESLASH";
    TokenType[TokenType["BREAK"] = 43] = "BREAK";
    TokenType[TokenType["CONTINUE"] = 44] = "CONTINUE";
    TokenType[TokenType["RETURN"] = 45] = "RETURN";
    TokenType[TokenType["ASSERT"] = 46] = "ASSERT";
    TokenType[TokenType["IMPORT"] = 47] = "IMPORT";
    TokenType[TokenType["GLOBAL"] = 48] = "GLOBAL";
    TokenType[TokenType["NONLOCAL"] = 49] = "NONLOCAL";
    TokenType[TokenType["IF"] = 50] = "IF";
    TokenType[TokenType["ELSE"] = 51] = "ELSE";
    TokenType[TokenType["ELIF"] = 52] = "ELIF";
    TokenType[TokenType["IN"] = 53] = "IN";
    TokenType[TokenType["NOTIN"] = 54] = "NOTIN";
    //// Source s3
    TokenType[TokenType["RSQB"] = 55] = "RSQB";
    TokenType[TokenType["LSQB"] = 56] = "LSQB";
    TokenType[TokenType["ELLIPSIS"] = 57] = "ELLIPSIS";
    //// Unusued - Found in normal Python
    TokenType[TokenType["SEMI"] = 58] = "SEMI";
    TokenType[TokenType["DOT"] = 59] = "DOT";
    TokenType[TokenType["LBRACE"] = 60] = "LBRACE";
    TokenType[TokenType["RBRACE"] = 61] = "RBRACE";
    TokenType[TokenType["TILDE"] = 62] = "TILDE";
    TokenType[TokenType["CIRCUMFLEX"] = 63] = "CIRCUMFLEX";
    TokenType[TokenType["LEFTSHIFT"] = 64] = "LEFTSHIFT";
    TokenType[TokenType["RIGHTSHIFT"] = 65] = "RIGHTSHIFT";
    TokenType[TokenType["PLUSEQUAL"] = 66] = "PLUSEQUAL";
    TokenType[TokenType["MINEQUAL"] = 67] = "MINEQUAL";
    TokenType[TokenType["STAREQUAL"] = 68] = "STAREQUAL";
    TokenType[TokenType["SLASHEQUAL"] = 69] = "SLASHEQUAL";
    TokenType[TokenType["PERCENTEQUAL"] = 70] = "PERCENTEQUAL";
    TokenType[TokenType["AMPEREQUAL"] = 71] = "AMPEREQUAL";
    TokenType[TokenType["VBAREQUAL"] = 72] = "VBAREQUAL";
    TokenType[TokenType["CIRCUMFLEXEQUAL"] = 73] = "CIRCUMFLEXEQUAL";
    TokenType[TokenType["LEFTSHIFTEQUAL"] = 74] = "LEFTSHIFTEQUAL";
    TokenType[TokenType["RIGHTSHIFTEQUAL"] = 75] = "RIGHTSHIFTEQUAL";
    TokenType[TokenType["DOUBLESTAREQUAL"] = 76] = "DOUBLESTAREQUAL";
    TokenType[TokenType["DOUBLESLASHEQUAL"] = 77] = "DOUBLESLASHEQUAL";
    TokenType[TokenType["AT"] = 78] = "AT";
    TokenType[TokenType["ATEQUAL"] = 79] = "ATEQUAL";
    TokenType[TokenType["RARROW"] = 80] = "RARROW";
    TokenType[TokenType["COLONEQUAL"] = 81] = "COLONEQUAL";
    TokenType[TokenType["OP"] = 82] = "OP";
    TokenType[TokenType["AWAIT"] = 83] = "AWAIT";
    TokenType[TokenType["ASYNC"] = 84] = "ASYNC";
    TokenType[TokenType["TYPE_IGNORE"] = 85] = "TYPE_IGNORE";
    TokenType[TokenType["TYPE_COMMENT"] = 86] = "TYPE_COMMENT";
    TokenType[TokenType["YIELD"] = 87] = "YIELD";
    TokenType[TokenType["WITH"] = 88] = "WITH";
    TokenType[TokenType["DEL"] = 89] = "DEL";
    TokenType[TokenType["TRY"] = 90] = "TRY";
    TokenType[TokenType["EXCEPT"] = 91] = "EXCEPT";
    TokenType[TokenType["FINALLY"] = 92] = "FINALLY";
    TokenType[TokenType["RAISE"] = 93] = "RAISE";
})(TokenType = exports.TokenType || (exports.TokenType = {}));
//# sourceMappingURL=tokens.js.map