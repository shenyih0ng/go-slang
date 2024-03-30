{{
    function extractList(list, index) {
        return list.map(element => element[index]);
    }
    
    function buildList(head, tail, index) {
        return [head].concat(extractList(tail, index));
    }

    function buildInteger(str, base) {
        // note: we discard the "_" delimiters
        return parseInt(str.replaceAll("_", ""), base)
    }
}}

{
    // `uid` is a monotonically increasing unique identifier for AST nodes
    let uid = 0; 

    function makeNode(node) {
        return { ...node, uid: uid++, loc: location() };
    }

    function buildLiteral(value) {
        return makeNode({ type: "Literal", value: value});
    }
    
    function buildBinaryExpression(head, tail) {
        return tail.reduce(function(result, element) {
            return makeNode({
                type: "BinaryExpression",
                operator: element[1],
                left: result,
                right: element[3]
            });
        }, head);
    }
}

SourceFile
    = _ topLevelDecls: TopLevelDeclaration* _ {
        return makeNode({ type: "SourceFile", topLevelDecls })
      }

TopLevelDeclaration
    = Declaration
    / FunctionDeclaration

Statement
    = Declaration
    / SimpleStatement
    / ReturnStatement
    / IfStatement
    / ForStatement
    / BreakStatement
    / ContinueStatement
    / Block

Declaration
    = VariableDeclaration

SimpleStatement
    = ShortVariableDeclaration
    / Assignment
    / ExpressionStatement

ExpressionStatement
   = expression: Expression EOS { 
        return makeNode({ type: "ExpressionStatement", expression: expression })
     }

Expression
    = RelationalExpression

PrimaryExpression
    = Identifier
    / Literal
    / "(" _ expression: Expression _ ")" { return expression }

Identifier
    = !Keyword Letter IdentifierPart* { 
        return makeNode({ type: "Identifier", name: text() })
      }

Letter
    = UnicodeLetter
    / "_"

IdentifierPart
    = Letter
    / UnicodeDigit

Literal
    = BasicLit
 
BasicLit
    = IntegerLit

IntegerLit "integer"
    = HexInt 
    / OctalInt 
    / BinaryInt 
    / DecimalInt

DecimalInt "decimal"
    = "0" { return buildLiteral(0); } 
 	/ [1-9] DecimalDigit* {
        return buildLiteral(buildInteger(text(), 10))
   	  }

BinaryInt "binary"
    = "0b"i digits:$BinaryDigit+ {
        return buildLiteral(buildInteger(digits, 2))
      }

OctalInt "octal"
    = "0" "o"i? digits:$OctalDigit+ {
        return buildLiteral(buildInteger(digits, 8))
      }

HexInt "hexadecimal"
    = "0x"i digits:$HexDigit+ {
        return buildLiteral(buildInteger(digits, 16))
      }
 
DecimalDigit
    = "_"? [0-9]

BinaryDigit
    = "_"? [0-1]
 
OctalDigit
    = "_"? [0-7]
 
HexDigit
    = "_"? [a-fA-F0-9]
 
UnaryExpression
    = CallExpression 
    / PrimaryExpression
    / operator:UnaryOperator argument:UnaryExpression {
        return makeNode({type: "UnaryExpression", operator, argument})
 	  }
 
UnaryOperator
    = "+" 
    / "-"

MultiplicativeExpression
    = head: UnaryExpression
      tail:(__ MultiplicativeOperator __ UnaryExpression)*
      { return buildBinaryExpression(head, tail); }

MultiplicativeOperator
    = "*" 
    / "/" 
    / "%" 

AdditiveExpression
    = head:MultiplicativeExpression
      tail:(__ AdditiveOperator __ MultiplicativeExpression)*
      { return buildBinaryExpression(head, tail); }
 
AdditiveOperator
    = "+" 
    / "-" 
    / "|" 
    / "^"

RelationalExpression
    = head:AdditiveExpression
      tail:(__ RelationalOperator __ AdditiveExpression)*
      { return buildBinaryExpression(head, tail); }

RelationalOperator
    = "=="
    / "!="
    / "<="
    / "<"
    / ">="
    / ">"

CallExpression
    = callee:PrimaryExpression "(" args:ExpressionList? ")" EOS {
        return makeNode({ type: "CallExpression", callee, args: args ?? [] })
      }

/* Variable Declaration */

VariableDeclaration
    = VAR_TOKEN __ declarations:VarSpec EOS {
        return makeNode({ type: "VariableDeclaration", ...declarations })
      }

VarSpec
    = left:IdentifierList _ right:("=" _ ExpressionList)? {
        return { left, right: right ? right[2] : [] }
      }

ShortVariableDeclaration
    = left:IdentifierList _ ":=" _ right:ExpressionList EOS {
        return makeNode({ type: "VariableDeclaration", left, right })
      }

/* Function Declaration */

FunctionDeclaration "function declaration"
    = FUNC_TOKEN _ id:Identifier _ params:Signature _ body:Block EOS {
        return makeNode({ type: "FunctionDeclaration", id, params, body })
      }

Signature
    = "(" _ params:IdentifierList? _ ")" { return params ?? [] }

/* Block */

Block "block"
    = "{" _ statements:Statement* _ "}" EOS {
        return makeNode({ type: "Block", statements })
      }

/* Return Statement */

ReturnStatement
    = RETURN_TOKEN _ expression:Expression EOS {
        return makeNode({ type: "ReturnStatement", expression })
      }

/* If Statement */

IfStatement
    = IF_TOKEN _ stmt:IfSimpleStatement? _ cond:Expression _ cons:Block _ alt:ElseBranch? EOS {
        return makeNode({ type: "IfStatement", stmt, cond, cons, alt })
      }

IfSimpleStatement
	= stmt:SimpleStatement ";" { return stmt }

ElseBranch
	= ELSE_TOKEN _ alt:(Block / (IfStatement)) { return alt }

/* For Statement */

ForStatement
    = FOR_TOKEN __ form:ForForm? __ block:Block EOS { return makeNode({ type: "ForStatement", form, block}) }
      
ForForm
	= ForClause
    / ForCondition

ForCondition
	= expression:Expression { return { type: "ForCondition", expression } }

ForClause
    = init:SimpleStatement? __ ";" __ cond:Expression? __ ";" __ post:SimpleStatement? {
        return { type: "ForClause", init, cond, post }
      }

/* Break Statement */

BreakStatement
    = BREAK_TOKEN EOS { return makeNode({ type: "BreakStatement" }) }

/* Continue Statement */

ContinueStatement
    = CONTINUE_TOKEN EOS { return makeNode({ type: "ContinueStatement" }) }

/* Assignment */

Assignment
    = left:ExpressionList _ "=" _ right:ExpressionList EOS {
        return makeNode({ type: "Assignment", left, right })
      }

IdentifierList
    = head:Identifier _ tail:(_ "," _ Identifier)* { return buildList(head, tail, 3); }

ExpressionList
    = head:Expression _ tail:(_ "," _ Expression)* { return buildList(head, tail, 3); }

/* Comments */

Comment "comment"
    = MultiLineComment
    / SingleLineComment

MultiLineComment
    = "/*" (!"*/" .)* "*/"

MultiLineCommentNoLineTerminator
    = "/*" (!"*/" (!LineTerminator .))* "*/"

SingleLineComment
  = "//" (!LineTerminator .)*

/* Separators */

EOS
  = _ SingleLineComment? LineTerminatorSequence?

LineTerminator
  = [\n\r\u2028\u2029]

LineTerminatorSequence "end of line"
  = "\n"
  / "\r\n"
  / "\r"
  / "\u2028"
  / "\u2029"

Whitespace "whitespace"
    = "\t"
    / "\v"
    / "\f"
    / " "
    / "\u00A0"
    / "\uFEFF"

_  = (Whitespace / LineTerminatorSequence / Comment)* // optional whitespace
__ = (Whitespace / MultiLineCommentNoLineTerminator)* // optional whitespace with no newlines

/* Tokens */

BREAK_TOKEN         = "break"          !IdentifierPart
DEFAULT_TOKEN       = "default"        !IdentifierPart
FUNC_TOKEN          = "func"           !IdentifierPart
INTERFACE_TOKEN     = "interface"      !IdentifierPart
SELECT_TOKEN        = "select"         !IdentifierPart
CASE_TOKEN          = "case"           !IdentifierPart
DEFER_TOKEN         = "defer"          !IdentifierPart
GO_TOKEN            = "go"             !IdentifierPart
MAP_TOKEN           = "map"            !IdentifierPart
STRUCT_TOKEN        = "struct"         !IdentifierPart
CHAN_TOKEN          = "chan"           !IdentifierPart
ELSE_TOKEN          = "else"           !IdentifierPart
GOTO_TOKEN          = "goto"           !IdentifierPart
PACKAGE_TOKEN       = "package"        !IdentifierPart
SWITCH_TOKEN        = "switch"         !IdentifierPart
CONST_TOKEN         = "const"          !IdentifierPart
FALLTHROUGH_TOKEN   = "fallthrough"    !IdentifierPart
IF_TOKEN            = "if"             !IdentifierPart
RANGE_TOKEN         = "range"          !IdentifierPart
TYPE_TOKEN          = "type"           !IdentifierPart
CONTINUE_TOKEN      = "continue"       !IdentifierPart
FOR_TOKEN           = "for"            !IdentifierPart
IMPORT_TOKEN        = "import"         !IdentifierPart
RETURN_TOKEN        = "return"         !IdentifierPart
VAR_TOKEN           = "var"            !IdentifierPart

Keyword
    = BREAK_TOKEN 
    / DEFAULT_TOKEN
    / FUNC_TOKEN
    / INTERFACE_TOKEN
    / SELECT_TOKEN
    / CASE_TOKEN
    / DEFER_TOKEN
    / GO_TOKEN
    / MAP_TOKEN
    / STRUCT_TOKEN
    / CHAN_TOKEN
    / ELSE_TOKEN
    / GOTO_TOKEN
    / PACKAGE_TOKEN
    / SWITCH_TOKEN
    / CONST_TOKEN
    / FALLTHROUGH_TOKEN
    / IF_TOKEN
    / RANGE_TOKEN
    / TYPE_TOKEN
    / CONTINUE_TOKEN
    / FOR_TOKEN
    / IMPORT_TOKEN
    / RETURN_TOKEN
    / VAR_TOKEN
