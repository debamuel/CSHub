import {getMarkdownParser, MarkdownLatexQuill} from "../../../cshub-shared/src/utilities/MarkdownLatexQuill";
import {JSDOM} from "jsdom";
import QuillDefaultOptions from "../../../cshub-shared/src/utilities/QuillDefaultOptions";
import Delta from "quill-delta/dist/Delta";
import logger from "./Logger";

export const getHTMLFromDelta = (delta: Delta, callback: (html: string) => void) => {

    const jsdom = new JSDOM(`
                            <!DOCTYPE html>
                            <head>
                                <script src="https://cdnjs.cloudflare.com/ajax/libs/webcomponentsjs/0.7.22/MutationObserver.js"></script>
                                <script src="https://unpkg.com/quill@1.3.6/dist/quill.min.js"></script>
                                <script src="https://unpkg.com/katex@0.10.0/dist/katex.min.js"></script>
                            </head>
                            <body><div id="editor-container"></div></body>`, {
        runScripts: "dangerously",
        resources: "usable"
    });

    const window = jsdom.window;
    const document = window.document;

    // @ts-ignore (quill wants to execute but JSDom doesn't have it)
    document.execCommand = () => {
    };

    window.onerror = () => {
        logger.error("JSDOM Save errors");
        logger.error(arguments);
    };

    window.onload = () => {
        const container = document.getElementById("editor-container");

        // @ts-ignore
        document.getSelection = function () {
            return {
                getRangeAt: function () {
                }
            };
        };
        // @ts-ignore
        const quillWindow = window.Quill;

        const options = QuillDefaultOptions;
        delete options.modules.cursors;
        delete options.modules.resize;

        const quill = new quillWindow(container, options);
        const markdownParser = new MarkdownLatexQuill(quillWindow);
        markdownParser.registerQuill();
        quill.setContents(delta);
        const html = getHTML(quill, document, window);
        callback(html);

    }
};


const getHTML = (quillEditor: any, document: Document, window: Window) => {
    const node = quillEditor.container.firstChild;

    // Converts the classes of all the code blocks so that hljs can highlight them properly
    const allNodes: any[] = [...node.getElementsByTagName("*")];

    let prevElement: {
        isMarkdownBlock: boolean,
        lang?: string,
        containerNode?: HTMLElement,
        currString?: string
    } = {
        isMarkdownBlock: false
    };

    const finalizeMarkdownBlock = (document: Document, window: Window) => {
        if (prevElement.isMarkdownBlock) {
            prevElement.currString = prevElement.currString.substr(0, prevElement.currString.length - 1);
            prevElement.currString = prevElement.currString.split("<").join("&lt;");
            prevElement.currString = prevElement.currString.split(">").join("&gt;");
            const newNode = document.createElement("div");
            // To not have a break at the end
            newNode.style.whiteSpace = "normal";
            newNode.classList.add("markdown-body");
            newNode.innerHTML = getMarkdownParser().render(prevElement.currString);

            prevElement.containerNode.before(newNode);

            prevElement = {
                isMarkdownBlock: false
            };
        }
    };

    const toBeDeletedNodes: HTMLElement[] = [];

    for (const domNode of allNodes) {
        if ((domNode.tagName === "PRE" && domNode.classList.contains(MarkdownLatexQuill.blotName))) {
            toBeDeletedNodes.push(domNode);
            if (prevElement.isMarkdownBlock) {
                if (domNode.textContent !== "\n") {
                    prevElement.currString += domNode.textContent;
                }
                prevElement.currString += "\n";
            } else {
                prevElement = {
                    isMarkdownBlock: true,
                    containerNode: domNode,
                    currString: `${domNode.textContent}\n`
                };
            }
        } else if (domNode.tagName === "P" && domNode.innerHTML === "") {
            const br = document.createElement("br");
            domNode.parentNode.replaceChild(br, domNode);

            if (!domNode.classList.contains(MarkdownLatexQuill.blotName)) {
                finalizeMarkdownBlock(document, window);
            }
        } else {
            finalizeMarkdownBlock(document, window);
        }
    }

    finalizeMarkdownBlock(document, window);

    toBeDeletedNodes.forEach((domNode: HTMLElement) => {
        domNode.remove();
    });

    return node.innerHTML; // Doesn't have images replaced
};
