export namespace types {
  export interface ParseError {
    kind: string
    subkind: string
    level: int
    context: string
    message: string
  }

  export interface point {
    x: int
    y: int
  } // Point on the Cartesian plane where the node is located. Assumes canonical whitespace delimiters. -Y = Y.

  export declare type something = string | Object | any // TreeNode
  export declare type int = number
  export declare type htmlString = string
  export declare type xmlString = string
  export declare type jsonString = string
  export declare type dataTable = (any[])[]

  export declare type formatString = string // "Hello {name}! You are {age} years old."
  export declare type keywordPath = string // user emailAddress
  export declare type pathVector = int[] // example: [0,1,1]
  export declare type word = string // string that cannot contain the YI, XI or ZI
  export declare type triInt = int // -1 0 1
  export declare type sortFn = (nodeA: any, nodeB: any) => triInt
  export declare type filepath = string
  export declare type filterFn = (node: any, index: int) => boolean
}

export default types
