"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isMake = exports.ForEndMarker = exports.ForPostMarker = exports.ForStartMarker = exports.RetMarker = exports.MarkerType = exports.PopTillM = exports.PopS = exports.ChanSend = exports.ChanRecv = exports.isCommand = exports.CommandType = exports.isTypeLiteral = exports.Type = exports.True = exports.EmptyStmt = exports.ForFormType = exports.isNode = exports.NodeType = void 0;
var NodeType;
(function (NodeType) {
    NodeType["SourceFile"] = "SourceFile";
    NodeType["Block"] = "Block";
    NodeType["VariableDeclaration"] = "VariableDeclaration";
    NodeType["FunctionDeclaration"] = "FunctionDeclaration";
    NodeType["ReturnStatement"] = "ReturnStatement";
    NodeType["IfStatement"] = "IfStatement";
    NodeType["ForStatement"] = "ForStatement";
    NodeType["BreakStatement"] = "BreakStatement";
    NodeType["ContinueStatement"] = "ContinueStatement";
    NodeType["ExpressionStatement"] = "ExpressionStatement";
    NodeType["GoStatement"] = "GoStatement";
    NodeType["SendStatement"] = "SendStatement";
    NodeType["EmptyStatement"] = "EmptyStatement";
    NodeType["Assignment"] = "Assignment";
    NodeType["Operator"] = "Operator";
    NodeType["UnaryExpression"] = "UnaryExpression";
    NodeType["BinaryExpression"] = "BinaryExpression";
    NodeType["Identifier"] = "Identifier";
    NodeType["Literal"] = "Literal";
    NodeType["FunctionLiteral"] = "FunctionLiteral";
    NodeType["TypeLiteral"] = "TypeLiteral";
    NodeType["CallExpression"] = "CallExpression";
})(NodeType = exports.NodeType || (exports.NodeType = {}));
function isNode(v) {
    return v && v.type && NodeType[v.type];
}
exports.isNode = isNode;
var ForFormType;
(function (ForFormType) {
    ForFormType["ForCondition"] = "ForCondition";
    ForFormType["ForClause"] = "ForClause";
})(ForFormType = exports.ForFormType || (exports.ForFormType = {}));
exports.EmptyStmt = { type: NodeType.EmptyStatement };
exports.True = { type: NodeType.Literal, value: true };
var Type;
(function (Type) {
    Type["Channel"] = "chan";
})(Type = exports.Type || (exports.Type = {}));
function isTypeLiteral(v) {
    return v && v.type === NodeType.TypeLiteral;
}
exports.isTypeLiteral = isTypeLiteral;
var CommandType;
(function (CommandType) {
    CommandType["VarDeclOp"] = "VarDeclOp";
    CommandType["AssignOp"] = "AssignOp";
    CommandType["UnaryOp"] = "UnaryOp";
    CommandType["BinaryOp"] = "BinaryOp";
    CommandType["ClosureOp"] = "ClosureOp";
    CommandType["CallOp"] = "CallOp";
    CommandType["GoRoutineOp"] = "GoRoutineOp";
    CommandType["ChanRecvOp"] = "ChanRecvOp";
    CommandType["ChanSendOp"] = "ChanSendOp";
    CommandType["BranchOp"] = "BranchOp";
    CommandType["EnvOp"] = "EnvOp";
    CommandType["PopSOp"] = "PopSOp";
    CommandType["PopTillMOp"] = "PopTillMOp";
    CommandType["BuiltinOp"] = "BuiltinOp";
})(CommandType = exports.CommandType || (exports.CommandType = {}));
function isCommand(v) {
    return v && v.type && CommandType[v.type];
}
exports.isCommand = isCommand;
const ChanRecv = () => ({ type: CommandType.ChanRecvOp });
exports.ChanRecv = ChanRecv;
const ChanSend = () => ({ type: CommandType.ChanSendOp });
exports.ChanSend = ChanSend;
exports.PopS = { type: CommandType.PopSOp };
const PopTillM = (...markers) => ({
    type: CommandType.PopTillMOp,
    markers
});
exports.PopTillM = PopTillM;
var MarkerType;
(function (MarkerType) {
    MarkerType["RetMarker"] = "RetMarker";
    MarkerType["ForStartMarker"] = "ForStartMarker";
    MarkerType["ForPostMarker"] = "ForPostMarker";
    MarkerType["ForEndMarker"] = "ForEndMarker";
})(MarkerType = exports.MarkerType || (exports.MarkerType = {}));
const RetMarker = () => ({ type: MarkerType.RetMarker });
exports.RetMarker = RetMarker;
const ForStartMarker = () => ({ type: MarkerType.ForStartMarker });
exports.ForStartMarker = ForStartMarker;
const ForPostMarker = () => ({ type: MarkerType.ForPostMarker });
exports.ForPostMarker = ForPostMarker;
const ForEndMarker = () => ({ type: MarkerType.ForEndMarker });
exports.ForEndMarker = ForEndMarker;
function isMake(v) {
    return v && v.type && Object.values(Type).includes(v.type);
}
exports.isMake = isMake;
//# sourceMappingURL=types.js.map