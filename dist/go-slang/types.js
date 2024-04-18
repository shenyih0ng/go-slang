"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isNew = exports.isMake = exports.ForEndMarker = exports.ForPostMarker = exports.ForStartMarker = exports.RetMarker = exports.MarkerType = exports.PopTillM = exports.PopS = exports.WaitGroupWait = exports.WaitGroupDone = exports.WaitGroupAdd = exports.ChanSend = exports.ChanRecv = exports.isCommand = exports.CommandType = exports.isTypeLiteral = exports.MakeType = exports.NewType = exports.EmptyStmt = exports.ForFormType = exports.isNode = exports.NodeType = void 0;
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
    NodeType["QualifiedIdentifier"] = "QualifiedIdentifier";
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
var NewType;
(function (NewType) {
    NewType["WaitGroup"] = "sync.WaitGroup";
    NewType["Mutex"] = "sync.Mutex";
})(NewType = exports.NewType || (exports.NewType = {}));
var MakeType;
(function (MakeType) {
    MakeType["Channel"] = "chan";
})(MakeType = exports.MakeType || (exports.MakeType = {}));
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
    CommandType["WaitGroupAddOp"] = "WaitGroupAddOp";
    CommandType["WaitGroupDoneOp"] = "WaitGroupDoneOp";
    CommandType["WaitGroupWaitOp"] = "WaitGroupWaitOp";
    CommandType["MutexLockOp"] = "MutexLockOp";
    CommandType["MutexUnlockOp"] = "MutexUnlockOp";
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
const WaitGroupAdd = () => ({ type: CommandType.WaitGroupAddOp });
exports.WaitGroupAdd = WaitGroupAdd;
const WaitGroupDone = () => ({ type: CommandType.WaitGroupDoneOp });
exports.WaitGroupDone = WaitGroupDone;
const WaitGroupWait = () => ({ type: CommandType.WaitGroupWaitOp });
exports.WaitGroupWait = WaitGroupWait;
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
    return v && v.type && Object.values(MakeType).includes(v.type);
}
exports.isMake = isMake;
function isNew(v) {
    return v && v.type && Object.values(NewType).includes(v.type);
}
exports.isNew = isNew;
//# sourceMappingURL=types.js.map