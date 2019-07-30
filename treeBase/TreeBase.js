#! /usr/local/bin/node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const TreeNode_1 = require("../src/base/TreeNode");
const GrammarLanguage_1 = require("../src/GrammarLanguage");
const TreeUtils_1 = require("../src/base/TreeUtils");
const Disk_1 = require("./Disk");
const jtree_node_1 = require("../src/jtree.node");
class TreeBaseFile extends TreeNode_1.default {
    setDiskVersion() {
        this._diskVersion = this.childrenToString();
        return this;
    }
    getDiskVersion() {
        return this._diskVersion;
    }
    _getAsProgram(grammarPath) {
        const tree = new TreeNode_1.default();
        tree.appendLineAndChildren(this._getFilePath(), this.childrenToString());
        return new (jtree_node_1.default.getProgramConstructor(grammarPath))(tree.toString());
    }
    cellCheck(grammarPath) {
        return this._getAsProgram(grammarPath).getAllErrors();
    }
    getOneOf(keys) {
        for (let i = 0; i < keys.length; i++) {
            const value = this.get(keys[i]);
            if (value)
                return value;
        }
        return "";
    }
    toExpandedColumns() {
        // todo: do things like wp_example_2 wp_example_3 ...
    }
    getDoc(terms) {
        return terms
            .map(term => {
            const nodes = this.findNodes(this._getFilePath() + " " + term);
            return nodes.map(node => node.childrenToString()).join("\n");
        })
            .filter(a => a)
            .join("\n");
    }
    set(keywordPath, content) {
        return typeof keywordPath === "object" ? this.setProperties(keywordPath) : super.set(keywordPath, content);
    }
    setPropertyIfMissing(prop, value) {
        if (this.has(prop))
            return true;
        return this.touchNode(prop).setContent(value);
    }
    setProperties(propMap) {
        const props = Object.keys(propMap);
        const values = Object.values(propMap);
        // todo: is there a built in tree method to do this?
        props.forEach((prop, index) => {
            const value = values[index];
            if (!value)
                return true;
            if (this.get(prop) === value)
                return true;
            this.touchNode(prop).setContent(value);
        });
        return this;
    }
    extract(fields) {
        const newTree = new TreeNode_1.default(this.toString()); // todo: why not clone?
        const map = TreeUtils_1.default.arrayToMap(fields);
        newTree.nodeAt(0).forEach(node => {
            if (!map[node.getWord(0)])
                node.destroy();
        });
        return newTree;
    }
    save() {
        const str = this.childrenToString();
        if (this.getDiskVersion() === str)
            return this;
        Disk_1.Disk.write(this._getFilePath(), str);
        this.setDiskVersion();
        return this;
    }
    appendUniqueLine(line) {
        const file = this.toString();
        if (file.match(new RegExp("^" + Disk_1.Disk.escape(line), "m")))
            return true;
        const prefix = !file || file.endsWith("\n") ? "" : "\n";
        return this.appendLine(prefix + line + "\n");
    }
    _getFilePath() {
        return this.getWord(0);
    }
    getFileName() {
        return Disk_1.Disk.getFileName(this._getFilePath());
    }
    createParser() {
        return new TreeNode_1.default.Parser(TreeNode_1.default);
    }
}
exports.TreeBaseFile = TreeBaseFile;
class TreeBaseFolder extends TreeNode_1.default {
    constructor() {
        super(...arguments);
        this._isLoaded = false;
    }
    touch(filename) {
        // todo: throw if its a folder path, has wrong file extension, or other invalid
        return Disk_1.Disk.touch(this._getDir() + filename);
    }
    createParser() {
        return new TreeNode_1.default.Parser(TreeBaseFile);
    }
    // todo: RAII?
    loadFolder(files = undefined, sampleSize = undefined, seed = Date.now()) {
        if (this._isLoaded)
            return this;
        files = files || this._getAndFilterFilesFromFolder();
        if (sampleSize !== undefined)
            files = TreeUtils_1.default._sampleWithoutReplacement(files, sampleSize, seed);
        this.setChildren(this._readFiles(files));
        this._setDiskVersions();
        this._isLoaded = true;
        return this;
    }
    startExpressApp(port = 8887) {
        this.loadFolder();
        this._startListeningForFileChanges();
        this._getExpressApp().listen(port, () => console.log(`TreeBase server running: \ncmd+dblclick: http://localhost:${port}/`));
        return this;
    }
    cellCheckWithProgressBar(printLimit = 100) {
        TreeUtils_1.default._tick("start...");
        const program = this._getAsProgram();
        let lines = this.getNumberOfLines();
        let lps = lines / (TreeUtils_1.default._tick("End parser") / 1000);
        console.log(`Parsed ${lines} line program at ${lps} lines per second`);
        const ProgressBar = require("progress");
        const bar = new ProgressBar(":bar", { total: lines, width: 50 });
        let current = Date.now();
        let inc = 100000;
        let totalErrors = 0;
        for (let err of program.getAllErrorsIterator()) {
            bar.tick();
            if (bar.curr % inc === 0) {
                bar.interrupt(`Lines ${bar.curr - inc}-${bar.curr} at ${10000 / ((Date.now() - current) / 1000)} per second`);
                current = Date.now();
            }
            if (err.length)
                totalErrors += err.length;
            if (printLimit && err) {
                err.forEach(err => console.log(err
                    .getNode()
                    .getParent()
                    .getLine() +
                    ": " +
                    err.getLine() +
                    ": " +
                    err.getMessage()));
                printLimit--;
            }
            //if (!limit) return 0
        }
        return totalErrors;
    }
    _getDir() {
        // todo: cache?
        return this.getWord(0).replace(/\/$/, "") + "/";
    }
    _getGrammarPaths() {
        return Disk_1.Disk.getFiles(this._getDir()).filter(file => file.endsWith(GrammarLanguage_1.GrammarConstants.grammarFileExtension));
    }
    _setDiskVersions() {
        this.forEach(node => {
            node.setDiskVersion();
        });
        return this;
    }
    _getAndFilterFilesFromFolder() {
        return this._filterFiles(Disk_1.Disk.getFiles(this._getDir()));
    }
    // todo: cleanup the filtering here.
    _filterFiles(files) {
        return files.filter(file => !file.endsWith(GrammarLanguage_1.GrammarConstants.grammarFileExtension));
    }
    _getExpressApp() {
        if (!this._app)
            this._app = this._makeApp();
        return this._app;
    }
    _startListeningForFileChanges() {
        const fs = require("fs");
        fs.watch(this._getDir(), (event, filename) => {
            let fullPath = this._getDir() + filename;
            fullPath = this._filterFiles([fullPath])[0];
            if (!fullPath)
                return true;
            const data = Disk_1.Disk.read(fullPath);
            const node = this.getNode(fullPath);
            if (!node)
                this.appendLineAndChildren(fullPath, data);
            else
                node.setChildren(data);
        });
    }
    _getStatusMessage() {
        const paths = this._getExpressApp()
            ._router.stack // registered routes
            .filter(route => route.route && route.route.path.length > 1) // take out all the middleware
            .map(route => `<a href="${route.route.path}">${route.route.path}</a>`); // get all the paths
        return `<div style="white-space:pre;">TreeBase server running:
-- Folder: '${this._getDir()}'
-- Grammars: '${this._getGrammarPaths().join(",")}'
-- Files: ${this.length}
-- Bytes: ${this.toString().length}
-- Routes: ${paths.join("\n ")}</div>`;
    }
    _makeApp() {
        const path = require("path");
        const express = require("express");
        const bodyParser = require("body-parser");
        const app = express();
        app.use(bodyParser.urlencoded({ extended: false }));
        app.use(bodyParser.json());
        app.use((req, res, next) => {
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
            res.setHeader("Access-Control-Allow-Headers", "X-Requested-With,content-type");
            res.setHeader("Access-Control-Allow-Credentials", true);
            next();
        });
        app.get("/list", (req, res) => {
            res.send(this.map(node => `<a href="${node.getFileName()}">${node.getFileName()}</a>`).join("<br>"));
        });
        app.get("/", (req, res) => {
            res.send(this._getStatusMessage());
        });
        app.use(express.static(this._getDir(), {
            setHeaders: (res, requestPath) => {
                res.setHeader("Content-Type", "text/plain");
            }
        }));
        app.get("/cellCheck", (req, res) => {
            let end = TreeUtils_1.default._tick("Loaded collection....");
            let lines = this.getNumberOfLines();
            let lps = lines / (end / 1000);
            const errors = this._getAsProgram().getAllErrors();
            res.setHeader("Content-Type", "text/plain");
            res.send(`Total errors: ${errors.length}\n${errors.join("\n")}`);
        });
        return app;
    }
    _getTreeBaseGrammarCode() {
        const code = new TreeNode_1.default(this._getGrammarPaths()
            .map(Disk_1.Disk.read)
            .join("\n"));
        const rootNodes = code.with("root");
        return (code +
            "\n" +
            `treeBaseFolderNode
 ${GrammarLanguage_1.GrammarConstants.root}
 ${GrammarLanguage_1.GrammarConstants.inScope} ${rootNodes.map(node => node.getWord(0)).join(" ")}
 ${GrammarLanguage_1.GrammarConstants.catchAllNodeType} treeBaseErrorNode
treeBaseErrorNode
 ${GrammarLanguage_1.GrammarConstants.baseNodeType} ${GrammarLanguage_1.GrammarConstants.errorNode}`);
    }
    _getAsProgram() {
        this.loadFolder();
        const grammarProgram = new jtree_node_1.default.GrammarProgram(this._getTreeBaseGrammarCode());
        const programConstructor = grammarProgram.getRootConstructor();
        return new programConstructor(this.toString());
    }
    _readFiles(files) {
        return files
            .map(fullPath => {
            const filename = Disk_1.Disk.getFileName(fullPath);
            const content = Disk_1.Disk.read(fullPath);
            if (content.match(/\r/))
                throw new Error("bad \\r in " + fullPath);
            return content ? fullPath + "\n " + content.trim().replace(/\n/g, "\n ") : fullPath;
        })
            .join("\n");
    }
}
exports.TreeBaseFolder = TreeBaseFolder;
