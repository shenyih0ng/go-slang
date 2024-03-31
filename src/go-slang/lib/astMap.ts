import { Node } from '../types'

export class AstMap extends Map<number, Node> {
  private nextAstId: number

  constructor(nextAstId: number) {
    super()
    this.nextAstId = nextAstId
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
  public track(node: Node): Node {
    node.uid = node.uid ?? this.nextAstId++
    this.set(node.uid, node)
    return node
  }
}
