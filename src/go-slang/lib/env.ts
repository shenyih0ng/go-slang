import { Counter } from './utils'

type Maybe<T> = T | null

interface Frame {
  id: number
  bindings: Map<string, any>
  parent: Maybe<Frame>
}

export class Environment {
  private frameMap = new Map<number, Frame>()
  private frameIdCounter = new Counter(0)

  private currFrame: Frame

  constructor(bindings?: { [key: string]: any }) {
    if (bindings) { this.currFrame = this.newFrame(bindings) } // prettier-ignore
  }

  private newFrame(bindings: { [key: string]: any }, parent: Frame | null = null): Frame {
    const frame = {
      id: this.frameIdCounter.next(),
      bindings: new Map(Object.entries(bindings)),
      parent
    }
    this.frameMap.set(frame.id, frame)
    return frame
  }

  public id(): number {
    return this.currFrame.id
  }

  public setId(id: number): Environment {
    this.currFrame = this.frameMap.get(id) as Frame
    return this
  }

  public declare(name: string, value: any) {
    this.currFrame.bindings.set(name, value)
  }

  public declareZeroValue(name: string) {
    this.currFrame.bindings.set(name, 0)
  }

  public assign(name: string, value: any): boolean {
    let frame = this.currFrame
    while (!frame.bindings.has(name)) {
      if (!frame.parent) return false
      frame = frame.parent
    }
    frame.bindings.set(name, value)
    return true
  }

  public lookup(name: string): Maybe<any> {
    let frame = this.currFrame
    while (!frame.bindings.has(name)) {
      if (!frame.parent) return null
      frame = frame.parent
    }
    return frame.bindings.get(name)
  }

  public extend(bindings: { [key: string]: any }): Environment {
    this.currFrame = this.newFrame(bindings, this.currFrame)
    return this
  }

  public copy(): Environment {
    const newEnv = new Environment()
    newEnv.frameMap = this.frameMap
    newEnv.frameIdCounter = this.frameIdCounter
    return newEnv
  }
}
