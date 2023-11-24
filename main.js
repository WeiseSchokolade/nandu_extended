import { Renderer, RRSWJS, Graph, Camera, Mouse } from "./rrswjs.js";

const body = document.body;
const overlayCanvas = document.getElementById("overlayCanvas");
const canvas = document.getElementById("canvas");
const canvasContainer = document.getElementById("canvasContainer");

const tableGenerationButton = document.getElementById("tableGenerationButton");
const tableHideButton = document.getElementById("tableHideButton");
const loadFileButton = document.getElementById("loadFileButton");
const wipeButton = document.getElementById("wipeButton");

const infoContainer = document.getElementById("infoContainer");
const infoLoadingContainer = document.getElementById("infoLoadingContainer");
const tableContainer = document.getElementById("tableContainer");
const table = document.getElementById("truthTable");

const overlayCtx = overlayCanvas.getContext("2d");

function resize() {
    canvas.width = canvasContainer.clientWidth;
    canvas.height = canvasContainer.clientHeight;
}

function overlayResize() {
    overlayCanvas.width = body.clientWidth;
    overlayCanvas.height = body.clientHeight;
}

window.addEventListener("resize", resize);
canvas.addEventListener("resize", resize);
window.addEventListener("resize", overlayResize);
resize();
overlayResize();

class Object {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.output = false;
    }

    copy() {
        return new Object(x, y);
    }

    snap() {
        this.x = Math.round(this.x);
        this.y = Math.round(this.y);
    }

    touched(x, y) {
        return (
            x >= this.x &&
            y >= this.y &&
            x < this.x + this.width &&
            y < this.y + this.height);
    }

    moveToMainSpace(graph, overlayGraph) {
        this.x -= overlayGraph.camera.x;
        this.x += graph.camera.x;
        this.y -= overlayGraph.camera.y;
        this.y += graph.camera.y;
        this.snap();
    }

    moveToOverlaySpace(graph, overlayGraph) {
        this.x += overlayGraph.camera.x;
        this.x -= graph.camera.x;
        this.y += overlayGraph.camera.y;
        this.y -= graph.camera.y;
    }

    calculateOutput() {
        return false;
    }

    resetInputs() {

    }
}

class Input extends Object {
    constructor(name, id, x, y) {
        super(x, y, 1, 1);
        this.name = name;
        this.id = id;
        this.lastGraph = null;
    }

    copy() {
        let copy = new Input(this.name, this.id, this.x, this.y);
        copy.output = this.output;
        return copy;
    }

    draw(graph) {
        this.lastGraph = graph;
        graph.ctx.lineWidth = graph.convSW(0.1);
        if (this.output) {
            graph.fillTriangle(this.x + 0.6, this.y + 0.5, this.x + 1.2, this.y + 0.8, this.x + 1.2, this.y + 0.2, "yellow");
        }
        graph.drawRect(this.x, this.y + 0.25, this.x + 0.9, this.y + 0.75, "black");
        graph.drawTriangle(this.x + 0.1, this.y + 0.5, this.x + 0.9, this.y + 0.9, this.x + 0.9, this.y + 0.1, "black");

        graph.fillRect(this.x, this.y + 0.25, this.x + 0.9, this.y + 0.75, "white");
        graph.fillTriangle(this.x + 0.1, this.y + 0.5, this.x + 0.9, this.y + 0.9, this.x + 0.9, this.y + 0.1, "white");
        
        graph.drawText(this.name, this.x + 0.1, this.y + 0.525, "black", "left");
        graph.drawText("#" + this.id, this.x + 0.1, this.y + 0.325, "black", "left");
        graph.ctx.beginPath();
        graph.ctx.arc(graph.convSX(this.x + 0.75), graph.convSY(this.y + 0.35), graph.convSW(0.1), 0, Math.PI * 2);
        graph.ctx.lineWidth = graph.convSW(0.04);
        graph.ctx.stroke();
        graph.ctx.fillStyle = (this.output) ? "green" : "red";
        graph.ctx.fill();
    }

    toggleTouched(x, y) {
        let toggleX = this.x + 0.75;
        let toggleY = this.y + 0.35;
        let dx = x - toggleX;
        let dy = y - toggleY;
        let distanceSQ = dx * dx + dy * dy;
        let toggleDistance = 0.1;
        return distanceSQ < toggleDistance * toggleDistance;
    }

    toggle() {
        this.output = !this.output;
    }
}

class Box extends Object {
    constructor(x, y, hasInputOne, hasInputTwo, color) {
        super(x, y, 1, 2);
        this.color = color;
        this.inputOneValue = false;
        this.inputTwoValue = false;
        this.hasInputOne = hasInputOne;
        this.hasInputTwo = hasInputTwo;
        this.outputOne = false;
        this.outputTwo = false;
    }

    copy() {
        return new Box(this.x, this.y, this.hasInputOne, this.hasInputTwo, this.color);
    }

    draw(graph) {
        graph.ctx.lineWidth = graph.convSW(0.05);
        if (this.outputOne) {
            graph.fillTriangle(this.x + 0.6, this.y + 1.5, this.x + 1.2, this.y + 1.8, this.x + 1.2, this.y + 1.2, "yellow");
        }
        if (this.outputTwo) {
            graph.fillTriangle(this.x + 0.6, this.y + 0.5, this.x + 1.2, this.y + 0.8, this.x + 1.2, this.y + 0.2, "yellow");
        }

        graph.fillRect(this.x, this.y, this.x + 1, this.y + 2, this.color);
        graph.drawRect(this.x, this.y, this.x + 1, this.y + 2, "black");

        if (this.hasInputOne) {
            graph.ctx.arc(graph.convSX(this.x), graph.convSY(this.y + 1.5), graph.convSW(0.4), Math.PI * -0.5, Math.PI * 0.5);
            graph.ctx.fillStyle = "black";
            graph.ctx.fill();
        }
        if (this.hasInputTwo) {
            graph.ctx.arc(graph.convSX(this.x), graph.convSY(this.y + 0.5), graph.convSW(0.4), Math.PI * -0.5, Math.PI * 0.5);
            graph.ctx.fillStyle = "black";
            graph.ctx.fill();
        }
    }

    setInput(value, y) {
        if (y > this.y + 1) return false;
        if (y == this.y) {
            this.inputTwoValue = value;
            return true;
        } else if (y > this.y) {
            this.inputOneValue = value;
            return true;
        }
        return false;
    }

    resetInputs() {
        this.inputOneValue = false;
        this.inputTwoValue = false;
        this.outputOne = false;
        this.outputTwo = false;
    }

    getOutputOne() {
        return this.outputOne;
    }

    getOutputTwo() {
        return this.outputTwo;
    }

}

class WhiteBox extends Box {
    constructor(x, y) {
        super(x, y, true, true, "white");
    }

    copy() {
        return new WhiteBox(this.x, this.y);
    }

    recalculate() {
        this.output = !(this.inputOneValue && this.inputTwoValue);
        this.outputOne = this.output;
        this.outputTwo = this.output;
    }
}

class RedTopBox extends Box {
    constructor(x, y) {
        super(x, y, true, false, "red");
    }

    copy() {
        return new RedTopBox(this.x, this.y);
    }

    recalculate() {
        this.outputOne = !this.inputOneValue;
        this.outputTwo = !this.inputOneValue;
    }
}

class RedBottomBox extends Box {
    constructor(x, y) {
        super(x, y, false, true, "red");
    }

    copy() {
        return new RedBottomBox(this.x, this.y);
    }

    recalculate() {
        this.outputOne = !this.inputTwoValue;
        this.outputTwo = !this.inputTwoValue;
    }
}

class BlueBox extends Box {
    constructor(x, y) {
        super(x, y, true, true, "cyan");
    }

    copy() {
        return new BlueBox(this.x, this.y);
    }

    recalculate() {
        this.outputOne = this.inputOneValue;
        this.outputTwo = this.inputTwoValue;
    }
}

class Output extends Object {
    constructor(name, id, x, y) {
        super(x, y, 1, 1);
        this.name = name;
        this.id = id;
        this.input = false;
    }

    copy() {
        return new Output(this.name, this.id, this.x, this.y);
    }

    draw(graph) {
        graph.ctx.lineWidth = graph.convSW(0.05);
        graph.ctx.beginPath();
        graph.ctx.arc(graph.convSX(this.x + 0.5), graph.convSY(this.y + 0.5), graph.convSW(0.3), Math.PI * -0.5, Math.PI * 0.5);
        graph.ctx.fillStyle = (this.input) ? "yellow" : "#333333";
        graph.ctx.fill();
        graph.ctx.strokeStyle = "black";
        graph.ctx.stroke();
        graph.fillRect(this.x, this.y, this.x + 0.6, this.y + 1, "white");
        graph.drawRect(this.x, this.y, this.x + 0.6, this.y + 1, "black");
        graph.ctx.beginPath();
        graph.ctx.arc(graph.convSX(this.x), graph.convSY(this.y + 0.5), graph.convSW(0.4), Math.PI * -0.5, Math.PI * 0.5);
        graph.ctx.fillStyle = "black";
        graph.ctx.fill();

        graph.drawText("LED", this.x + 0.58, this.y + 0.825, "black", "right");
        graph.drawText("#" + this.id, this.x + 0.58, this.y + 0.05, "black", "right");
    }

    resetInputs() {
        this.input = false;
    }
    
    setInput(value, y) {
        if (y == this.y) {
            this.input = value;
            this.output = value;
        }
    }
}

class Render extends Renderer {
    constructor() {
        super();
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.lastScroll = 0;
        this.draggingCamera = false;

        this.templateObjects = [
            new WhiteBox(0.25, -2.25),
            new RedTopBox(0.25, -4.5),
            new RedBottomBox(0.25, -6.75),
            new BlueBox(0.25, -9),
            new Input("Quelle", 0, 0.25, -10.25),
            new Output("LED", 0, 0.25, -11.5)
            ];
        this.draggingObject = null;
        this.objects = [];
    }

    load(rrs) {
        this.hideTruthTable();
        this.mouse = new Mouse(overlayCanvas, null);
        rrs.mouse = this.mouse;
        this.camera = rrs.camera;
        this.camera.x = 0;
        this.camera.y = 0;
        this.tableGenerationButtonEditable = true;

        tableGenerationButton.addEventListener("click", () => {
            this.showTruthTable();
        });
        tableHideButton.addEventListener("click", () => {
            this.hideTruthTable();
        });
        loadFileButton.addEventListener("click", () => {
            let input = document.createElement("input");
            input.type = "file";
            input.addEventListener("change", (event) => {
                let reader = new FileReader();
                let file = event.target.files[0];
                reader.readAsText(file, "UTF-8");
                reader.addEventListener("load", (readEvent) => {
                    let content = readEvent.target.result;
                    this.readIn(content);
                });
            });
            input.click();
        });
        wipeButton.addEventListener("click", () => {
            this.objects = [];
        });
    }

    draw(graph, deltaTime) {
        // overlay preparing
        let overlayGraph = new Graph(overlayCanvas, overlayCtx, new Camera(overlayCanvas.width / 100, -overlayCanvas.height / 100, 50), false);

        // Mouse
        let newMouseX = this.mouse.screenX / this.camera.zoom;
        let newMouseY = -this.mouse.screenY / this.camera.zoom;
        let scroll = this.mouse.scroll;
        let dx = this.lastMouseX - newMouseX;
        let dy = this.lastMouseY - newMouseY;
        if (this.mouse.startedMobile) {
            dx = 0;
            dy = 0;
        }


        if (this.mouse.recentlyPressed) {
            let targetFound = false;
            // Add code for finding a target here
            let overlayMouseX = overlayGraph.convBackFromSX(this.mouse.screenX);
            let overlayMouseY = overlayGraph.convBackFromSY(this.mouse.screenY);
            for (let i = 0; i < this.templateObjects.length; i++) {
                let object = this.templateObjects[i];
                if (object.touched(overlayMouseX, overlayMouseY)) {
                    targetFound = true;
                    this.draggingObject = object.copy();
                    if (object instanceof Input) {
                        object.id++;
                    }
                    if (object instanceof Output) {
                        object.id++;
                    }
                    break;
                }
            }
            if (!targetFound) {
                for (let i = 0; i < this.objects.length; i++) {
                    let object = this.objects[i];
                    if (object.touched(this.mouse.x, this.mouse.y)) {
                        if (object.toggleTouched) {
                            if (object.toggleTouched(this.mouse.x, this.mouse.y)) {
                                object.toggle();
                                this.calculateOutput();
                                targetFound = true;
                                break;
                            }
                        }
                        object.resetInputs();
                        object.calculateOutput();
                        object.moveToOverlaySpace(graph, overlayGraph);
                        this.draggingObject = object;
                        this.objects.splice(i, 1);
                        targetFound = true;
                        this.calculateOutput();
                        break;
                    }
                }
            }
            if (!targetFound) {
                this.draggingCamera = true;
            }
        }
        if (!this.mouse.pressed) {
            this.draggingCamera = false;
            if (this.draggingObject) {
                if (newMouseX > 1.5) {
                    this.draggingObject.moveToMainSpace(graph, overlayGraph);
                    this.objects.push(this.draggingObject);
                    this.calculateOutput();
                    this.draggingObject = null;
                } else {
                    this.draggingObject = null;
                }
            }
        }
        if (this.draggingObject) {
            this.draggingObject.x -= dx;
            this.draggingObject.y -= dy;
        }
        if (this.draggingCamera) {
            this.camera.x += dx;
            this.camera.y += dy;
        }

        if (scroll != this.lastScroll && false) {
            if (scroll - this.lastScroll > 0) {
                this.camera.zoom *= 0.95;
            } else {
                this.camera.zoom /= 0.95;
            }
            this.camera.zoom = Math.max(Math.min(this.camera.zoom, 500), 25);
        }

        this.lastScroll = scroll;
        this.lastMouseX = newMouseX;
        this.lastMouseY = newMouseY;

        // update dom
        if (this.tableGenerationButtonEditable && (this.getInputs().length == 0 && this.getOutputs().length == 0)) {
            this.tableGenerationButtonEditable = false;
            tableGenerationButton.setAttribute("disabled", "disabled");
        } else if (!this.tableGenerationButtonEditable && (this.getInputs().length > 0 || this.getOutputs().length > 0)) {
            this.tableGenerationButtonEditable = true;
            tableGenerationButton.removeAttribute("disabled");
        }

        // draw main
        for (let i = this.objects.length - 1; i >= 0; i--) {
            this.objects[i].draw(graph);
        }
        graph.drawPoint(0, 0);

        // draw overlay
        overlayGraph.fillRect(0, 0, 1.5, overlayGraph.convSH(overlayCanvas.height), "#b27ae6");
        for (let i = 0; i < this.templateObjects.length; i++) {
            let box = this.templateObjects[i];
            box.draw(overlayGraph);
        }
        if (this.draggingObject) {
            this.draggingObject.draw(overlayGraph);
        }
    }

    /**
     * Assumes object array is sorted by x
     */
    getObjectsAtX(searchedX, minI) {
        let arr = [];
        for (let i = minI; i < this.objects.length; i++) {
            let x = this.objects[i].x;
            if (x == searchedX) {
                arr.push(this.objects[i]);
            }
            if (x > searchedX) {
                break;
            }
        }
        return arr;
    }

    calculateOutput() {
        this.sortObjects();
        if (this.objects.length < 1) return;
        for (let i = 0; i < this.objects.length; i++) {
            this.objects[i].resetInputs();
        }
        let lastX = this.objects[0].x - 1;
        let nextRow = null;
        for (let i = 0; i < this.objects.length; i++) {
            let object = this.objects[i];
            if (object.x != lastX) {
                nextRow = this.getObjectsAtX(object.x + 1, i);
                lastX = object.x;
            }
            if (object instanceof Box) {
                object.recalculate();
            }
            for (let j = 0; j < nextRow.length; j++) {
                let nextObject = nextRow[j];
                if (!(nextObject instanceof Input)) {
                    if (object instanceof Box) {
                        nextObject.setInput(object.getOutputOne(), object.y + 1);
                        nextObject.setInput(object.getOutputTwo(), object.y);
                    } else {
                        nextObject.setInput(object.output, object.y);
                    }
                }
            }
        }
    }

    showTruthTable() {
        tableContainer.style.display = "none";
        infoLoadingContainer.style.display = "initial";
        infoContainer.style.display = "flex";
        tableHideButton.style.display = "none";
        setTimeout(() => {
            this.buildTable();
            tableContainer.style.display = "flex";
            infoLoadingContainer.style.display = "none";    
            tableHideButton.style.display = "initial";
        }, 500);
    }

    hideTruthTable() {
        tableContainer.style.display = "none";
        infoLoadingContainer.style.display = "none";
        infoContainer.style.display = "none";
        tableHideButton.style.display = "none";
    }

    getInputs() {
        let arr = [];
        for (let i = 0; i < this.objects.length; i++) {
            if (this.objects[i] instanceof Input) {
                arr.push(this.objects[i]);
            }
        }
        return arr;
    }

    getOutputs() {
        let arr = [];
        for (let i = 0; i < this.objects.length; i++) {
            if (this.objects[i] instanceof Output) {
                arr.push(this.objects[i]);
            }
        }
        return arr;
    }

    copyObjects() {
        let arr = [];
        for (let i = 0; i < this.objects.length; i++) {
            arr.push(this.objects[i].copy());
        }
        return arr;
    }

    /**
     * @returns Whether an overflow occured 
     */
    increaseInputOutput(inputs, index) {
        let input = inputs[index];
        if (index < 0) return true;
        if (input.output) {
            input.output = false;
            return this.increaseInputOutput(inputs, index - 1);
        } else {
            input.output = true;
        }
        return false;
    }

    buildTable() {
        table.innerHTML = "";
        this.sortObjects();
        let objectsCopy = this.copyObjects();
        let inputs = this.getInputs();
        let outputs = this.getOutputs();
        let labels = [];
        for (let i = 0; i < inputs.length; i++) {
            let input = inputs[i];
            labels.push(input.name + " #" + input.id);
            input.output = false;
        }
        for (let i = 0; i < outputs.length; i++) {
            let output = outputs[i];
            labels.push(output.name + " #" + output.id);
            output.input = false;
        }
        let iterations = 0;
        let stop;
        while (!stop && iterations < 200) {
            iterations++;
            let row = table.insertRow(-1);
            for (let i = 0; i < inputs.length; i++) {
                this.insertCell(row, inputs[i].output);
            }
            this.calculateOutput();
            for (let i = 0; i < outputs.length; i++) {
                this.insertCell(row, outputs[i].input);
            }
            stop = this.increaseInputOutput(inputs, inputs.length - 1);
        }
        let header = table.insertRow(0);
        for (let i = 0; i < labels.length; i++) {
            let cell = header.insertCell(-1);
            cell.textContent = labels[i];
            cell.style.backgroundColor = "#ffcc00";
        }
        this.objects = objectsCopy;
        this.calculateOutput();
    }

    insertCell(tableRow, value) {
        let cell = tableRow.insertCell(-1);
        cell.textContent = value;
        cell.style.backgroundColor = (value) ? "#EEE" : "#888";
    }

    addObject(x, y, index) {
        let object = this.templateObjects[index].copy();
        object.x = x;
        object.y = y;
        this.objects.push(object);
    }
    
    readIn(data) {
        this.objects = [];
        let lines = data.split("\n");
        const spaceRegex = new RegExp("\\s+");
        for (let x = 1; x < lines.length; x++) {
            let values = lines[x].split(spaceRegex);
            for (let y = 0; y < values.length; y++) {
                let value = values[y].trim();
                if (!value) continue;
                if (value == "X") continue;
                if (value.startsWith("Q")) {
                    let id = value.substring(1);
                    this.objects.push(new Input("Quelle", id, x, y));
                    continue;
                }
                if (value == "W") {
                    this.addObject(x, y, 0);
                    y += 1;
                    continue;
                }
                if (value == "r") {
                    this.addObject(x, y, 1);
                    y += 1;
                    continue;
                }
                if (value == "R") {
                    this.addObject(x, y, 2);
                    y += 1;
                    continue;
                }
                if (value == "B") {
                    this.addObject(x, y, 3);
                    y += 1;
                    continue;
                }
                if (value.startsWith("L")) {
                    let id = value.substring(1);
                    this.objects.push(new Output("L", id, x, y));
                    continue;
                }
                console.log("Unknown value found while reading: ", value);
            }
        }
        this.calculateOutput();
    }

    sortObjects() {
        this.objects.sort((a, b) => {
            return a.x - b.x;
        });
    }
}

new RRSWJS(canvas, new Render(), false);
