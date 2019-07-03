const fs = require("fs")

import jtree from "./jtree"
import jTreeTypes from "./jTreeTypes"
import { GrammarProgram, GrammarBackedRootNode } from "./GrammarLanguage"
import Upgrader from "./tools/Upgrader"

enum CompileTarget {
  nodejs = "nodejs",
  browser = "browser"
}

class jtreeNode extends jtree {
  static Upgrader = Upgrader

  static executeFile = (programPath: jTreeTypes.filepath, grammarPath: jTreeTypes.filepath): Promise<any> =>
    jtreeNode.makeProgram(programPath, grammarPath).execute(programPath)

  static executeFiles = (programPaths: jTreeTypes.filepath[], grammarPath: jTreeTypes.filepath): Promise<any>[] => {
    const programConstructor = jtreeNode.getProgramConstructor(grammarPath)
    return programPaths.map(programPath => new programConstructor(fs.readFileSync(programPath, "utf8")).execute(programPath))
  }

  static executeFileSync = (programPath: jTreeTypes.filepath, grammarPath: jTreeTypes.filepath): any =>
    jtreeNode.makeProgram(programPath, grammarPath).executeSync(programPath)

  static makeProgram = (programPath: jTreeTypes.filepath, grammarPath: jTreeTypes.filepath): GrammarBackedRootNode => {
    const programConstructor = jtreeNode.getProgramConstructor(grammarPath)
    return new programConstructor(fs.readFileSync(programPath, "utf8"))
  }

  static compileGrammarForNodeJs(pathToGrammar: jTreeTypes.absoluteFilePath, outputFolder: jTreeTypes.asboluteFolderPath) {
    return this._compileGrammar(pathToGrammar, outputFolder, CompileTarget.nodejs)
  }

  private static _compileGrammar(pathToGrammar: jTreeTypes.absoluteFilePath, outputFolder: jTreeTypes.asboluteFolderPath, target: CompileTarget) {
    const grammarCode = jtree.TreeNode.fromDisk(pathToGrammar)
    let name = jtree.Utils.ucfirst(grammarCode.get("grammar name"))
    const pathToJtree = __dirname + "/../index.js"
    const outputFilePath = outputFolder + `${name}Language.${target}.js`
    const program = new GrammarProgram(grammarCode.toString(), pathToGrammar)
    const result = target === CompileTarget.nodejs ? program.toNodeJsJavascriptPrettier(pathToJtree) : program.toBrowserJavascriptPrettier()

    fs.writeFileSync(outputFilePath, result, "utf8")
    return outputFilePath
  }

  static compileGrammarForBrowser(pathToGrammar: jTreeTypes.absoluteFilePath, outputFolder: jTreeTypes.asboluteFolderPath) {
    return this._compileGrammar(pathToGrammar, outputFolder, CompileTarget.browser)
  }

  // returns GrammarBackedProgramClass
  static getProgramConstructor = (grammarPath: jTreeTypes.filepath) => {
    const grammarCode = fs.readFileSync(grammarPath, "utf8")
    const grammarProgram = new GrammarProgram(grammarCode, grammarPath)
    return <any>grammarProgram.getRootConstructor()
  }

  static combineFiles = (globPatterns: jTreeTypes.globPattern[]) => {
    const glob = require("glob")
    const files = (<any>globPatterns.map(pattern => glob.sync(pattern))).flat()
    const content = files.map((path: jTreeTypes.filepath) => fs.readFileSync(path, "utf8")).join("\n")

    return new jtree.TreeNode(content)
  }
}

export default jtreeNode
