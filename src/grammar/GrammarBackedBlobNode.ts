import GrammarBackedNonTerminalNode from "./GrammarBackedNonTerminalNode"
import jTreeTypes from "../jTreeTypes"

class GrammarBackedBlobNode extends GrammarBackedNonTerminalNode {
  getFirstWordMap() {
    return {}
  }

  getErrors(): jTreeTypes.TreeError[] {
    return []
  }

  getCatchAllNodeConstructor(line: string) {
    return GrammarBackedBlobNode
  }
}

export default GrammarBackedBlobNode