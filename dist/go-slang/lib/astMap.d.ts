import { Node } from '../types';
export declare class AstMap extends Map<number, Node> {
    private nextAstId;
    constructor(nextAstId: number);
    /**
     * Track an AST node
     *
     * If the node already has a unique identifier, it will be returned as is.
     * Otherwise, a new unique identifier will be assigned to the node (in-place).
     *
     * @param node AST node to track
     * @returns AST node with a unique identifier
     */
    track(node: Node): Node;
    trackM(nodes: Node[]): Node[];
    get<T extends Node>(uid: number): T;
}
