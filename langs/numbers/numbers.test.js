#! /usr/local/bin/node --use_strict

const NumbersProgram = require("./Numbers.js").Program

const testTree = {}

testTree.all = equal => {
  // Arrange
  const program = new NumbersProgram(`+ 2 2 1 2
- 2 2`)

  // Act/Assert
  equal(program.getProgramErrors().length, 0)
  equal(program.executeSync().join(" "), `7 0`)

  // A/A/A
  equal(new NumbersProgram(`+ 2 2 1 1`).executeSync().join(""), `6`)
}

/*NODE_JS_ONLY*/ if (!module.parent) require("../../tests/testTreeRunner.js")(testTree)
module.exports = testTree