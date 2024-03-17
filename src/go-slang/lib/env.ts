type Maybe<T> = T | null

export class Environment {
  private parent: Maybe<Environment> = null
  private bindings: Map<string, any> = new Map()

  constructor(bindings: { [key: string]: any }, parent: Maybe<Environment> = null) {
    this.parent = parent
    this.bindings = new Map(Object.entries(bindings))
  }

  public declare(name: string, value: any) {
    this.bindings.set(name, value)
  }

  public declareZeroValue(name: string) {
    // TEMP: assume all zero values are 0
    this.bindings.set(name, 0)
  }

  public assign(name: string, value: any): boolean {
    if (!this.bindings.has(name)) {
      return this.parent ? this.parent.assign(name, value) : false
    }
    this.bindings.set(name, value)
    return true
  }

  public lookup(name: string): Maybe<any> {
    if (!this.bindings.has(name)) {
      return this.parent ? this.parent.lookup(name) : null
    }
    return this.bindings.get(name)
  }

  public extend(bindings: { [key: string]: any }): Environment {
    return new Environment(bindings, this)
  }
}

const predeclaredIdentifiers = {
  true: true,
  false: false
}

export function createGlobalEnvironment(): Environment {
  return new Environment({ ...predeclaredIdentifiers })
}
