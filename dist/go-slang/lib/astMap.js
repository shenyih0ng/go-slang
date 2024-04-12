"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AstMap = void 0;
class AstMap extends Map {
    constructor(nextAstId) {
        super();
        this.nextAstId = nextAstId;
    }
    /**
     * Track an AST node
     *
     * If the node already has a unique identifier, it will be returned as is.
     * Otherwise, a new unique identifier will be assigned to the node (in-place).
     *
     * @param node AST node to track
     * @returns AST node with a unique identifier
     */
    track(node) {
        var _a;
        node.uid = (_a = node.uid) !== null && _a !== void 0 ? _a : this.nextAstId++;
        this.set(node.uid, node);
        return node;
    }
    trackM(nodes) {
        return nodes.map(this.track.bind(this));
    }
    get(uid) {
        return super.get(uid);
    }
}
exports.AstMap = AstMap;
//# sourceMappingURL=astMap.js.map