![gopher](/images/gopher.svg)

# go-slang

An interpreter for a subset of the Go programming language. The interpreter is a [Explicit Control Evaluator (ECE)](https://sourceacademy.org/sicpjs/5.4) implemented in TypeScript. The Go ECE aims to help developers better reason about the behaviour of their Go programs, by making program control explicit.

The Go ECE currently supports commonly used sequential language constructs and widely used concurrent constructs like Channels, Mutexes and WaitGroups. _Check out the grammar below for the full list of constructs supported._

## EBNF Grammar

The grammar is modified subset of the Go programming language ([go1.22 Feb 6 2024](https://go.dev/ref/spec)) specifications.

The parser generated using [peggy.js](https://peggyjs.org/) parser generator by converting the EBNF grammar below to Parsing Expression Grammar (PEG).

The PEG grammar can be found in the [`src/go-slang/parser/go.pegjs`](/src/go-slang/parser/go.pegjs) file.

```ebnf
SourceFile = { TopLevelDeclaration } .

TopLevelDeclaration = Declaration | FunctionDeclaration .
Declaration = VariableDeclaration .

FunctionDeclaration = "func" Identifier Signature Block .
Signature = "(" [ IdentifierList ] ")" .

Block = "{" { Statement } "}" .

Statement = 
        Declaration | SimpleStatement | GoStatement | ReturnStatement |       
        BreakStatement | ContinueStatement | Block | IfStatement |       
        ForStatement .

SimpleStatement = 
        ExpressionStatement | SendStatement | IncDecStatement |         
        Assignment | ShortVariableDeclaration .

// Variable Declarations

VariableDeclaration = "var" VarSpec .
VarSpec = IdentifierList [ "=" ExpressionList ] .

ShortVariableDeclaration = IdentifierList ":=" ExpressionList .

// If Statement

IfStatement = 
        "if" [ SimpleStatement ";" ] Expression Block 
         [ "else" (IfStatement | Block) ] .

// For Statement

ForStatement = "for" [ ForCondition | ForClause ] Block .
ForClause = [ InitStatement ] ";" [ ForCondition ] ";" [ PostStatement ] .
ForCondition = Expression .

// Assignment

Assignment = ExpressionList assign_op ExpressionList .
assign_op = [ add_op | mul_op ] "=" .

// Send Statement

SendStatement = Expression "<-" Expression .

// Increment / Decrement Statement

IncDecStatememt = Expression ( "++" | "--" ) .

// Go Statement

GoStatement = "go" Expression .

// Expressions

Expression = UnaryExpression | Expression binary_op Expression .
ExpressionList = Expression { "," Expression } .

UnaryExpression = PrimaryExpression | unary_op UnaryExpression .
PrimaryExpression = 
        Identifier | QualifiedIdentifier | Literal | "(" Expression ")" .

ExpressionStatement = Expression .

// Break, Continue, Return Statements

BreakStatement = "break" .
ContinueStatement = "continue" .
ReturnStatement = "return" [ ExpressionList ] .

// Identifier

Identifier = Letter { Letter | UnicodeDigit } .
IdentifierList = Identifier { "," Identifier } .

// Qualified Identifier

QualifiedIdentifier = PackageName "." Identifier .
PackageName = Identifier .

// Literals

Literal = BasicLit | FunctionLit .
BasicLit = IntegerLit | StringLit | TypeLit .

IntegerLit = HexInt | OctalInt | BinaryInt | DecimalInt .

TypeLit = ChannelType | WaitGroupType | MutexType .
ChannelType = "chan" .
WaitGroupType = "sync.WaitGroup" .
MutexType = "sync.Mutex" .

FunctionLit = "func" Signature Block .

// Operators

binary_op = "||"| "&&" | rel_op | add_op | mul_op .
rel_op = "==" | "!=" | "<" | "<=" | ">" | ">=" .
add_op = "+" | "-" | "|" | "^" .
mul_op = "*" | "/" | "%" | "<<" | ">>" | "&" | "&^" .
unary_op = "+" | "-" | "!" | "^" | "<-"
```

## Usage

There is a hosted version of the Go ECE at [dub.sh/go-slang](https://dub.sh/go-slang). The hosted version is a web-based Go playground ([fork of Source Academy Frontend](https://github.com/shenyih0ng/go-slang-frontend)) that allows you to write and run Go programs in your browser.

### Local Development

**Prerequisites**

- NodeJS v20
- Python: On MacBook Pro with chip Apple M1 Pro, use python 3.10.12. Here is [the correct way to set Python 3 as default on a Mac](https://opensource.com/article/19/5/python-3-default-mac).

To build,

```bash
git clone --recurse-submodules https://github.com/shenyih0ng/go-slang.git

cd go-slang
yarn install
yarn build
```

Set up a link to the `go-slang` repository to be used in frontend

```bash
yarn link
```

Clone the frontend repository

```bash
cd .. # go back to the parent directory
git clone https://github.com/shenyih0ng/go-slang-frontend.git
```

Link the `js-slang` library to the frontend and install the dependencies

```bash
cd go-slang-frontend
yarn link js-slang
yarn install
```

Start the development server

```bash
# defaults to port 8000
yarn start
```

If there are changes made to `go-slang` during development, a simple rebuild is needed and the frontend will hot reload the updated package without having to restart the server

```bash
# in the go-slang directory
yarn build:slang
```
