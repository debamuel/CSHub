<template>
    <!-- Shamelessly stolen from the quilljs homepage -->
    <div class="snow-wrapper" style="height: 100%">
        <div class="snow-container" :id="editorId" style="height: 100%">
            <div class="toolbar" v-show="editorSetup.showToolbar" style="border: none; padding: 1%;">
                <span class="ql-formats">
                    <select class="ql-header" title="Header">
                        <option value="1">Heading</option>
                        <option value="2">Subheading</option>
                        <option selected>Normal</option>
                    </select>
                </span>
                <span class="ql-formats">
                    <button class="ql-bold"></button>
                    <button class="ql-italic"></button>
                    <button class="ql-underline"></button>
                    <button class="ql-clean"></button>
                    <select class="ql-color">
                        <option value="rgb(0, 0, 0)"/>
                        <option value="rgb(230, 0, 0)"/>
                        <option value="rgb(255, 153, 0)"/>
                        <option value="rgb(255, 255, 0)"/>
                        <option value="rgb(0, 138, 0)"/>
                        <option value="rgb(0, 102, 204)"/>
                        <option value="rgb(153, 51, 255)"/>
                        <option value="rgb(255, 255, 255)"/>
                        <option value="rgb(250, 204, 204)"/>
                        <option value="rgb(255, 235, 204)"/>
                        <option value="rgb(204, 224, 245)"/>
                        <option value="rgb(235, 214, 255)"/>
                        <option value="rgb(187, 187, 187)"/>
                        <option value="rgb(102, 185, 102)"/>
                    </select>
                    <select class="ql-background">
                        <option value="rgba(0, 0, 0, 0)"/>
                        <option value="rgb(230, 0, 0)"/>
                        <option value="rgb(255, 153, 0)"/>
                        <option value="rgb(255, 255, 0)"/>
                        <option value="rgb(0, 138, 0)"/>
                        <option value="rgb(0, 102, 204)"/>
                        <option value="rgb(153, 51, 255)"/>
                        <option value="rgb(0, 0, 0)"/>
                        <option value="rgb(250, 204, 204)"/>
                        <option value="rgb(255, 235, 204)"/>
                        <option value="rgb(204, 224, 245)"/>
                        <option value="rgb(235, 214, 255)"/>
                        <option value="rgb(187, 187, 187)"/>
                        <option value="rgb(102, 185, 102)"/>
                    </select>
                </span>
                <span class="ql-formats">
                    <button class="ql-list" value="ordered"></button>
                    <button class="ql-list" value="bullet"></button>
                    <select class="ql-align" title="Alignment">
                        <option label="left" selected></option>
                        <option label="center" value="center"></option>
                        <option label="right" value="right"></option>
                        <option label="justify" value="justify"></option>
                    </select>
                </span>
                <span class="ql-formats">
                <button class="ql-link"></button>
                <button class="ql-image"></button>
                <button class="ql-video"></button>
                </span>
                <span class="ql-formats">
                    <button class="ql-formula"></button>
                    <v-btn
                            slot="activator"
                            dark
                            flat
                            small
                            class="tableButton"
                            @click="setMarkDown"
                            style="margin: 0"
                    >
                        <v-icon color="black tableIcon">fas fa-marker</v-icon>
                    </v-btn>
                </span>
            </div>
            <div class="editor" style="overflow: hidden;">
            </div>
        </div>
        <v-btn fab small depressed color="primary" class="ql-tooltip" id="markdownTooltip" @click="openMarkdownDialog">
            <v-icon>fas fa-edit</v-icon>
        </v-btn>

        <v-dialog v-model="markdownDialogState.open" fullscreen hide-overlay transition="dialog-bottom-transition">
            <v-card>
                <v-toolbar dark color="primary">
                    <v-btn icon dark @click="closeMarkdownDialog">
                        <v-icon>fas fa-times</v-icon>
                    </v-btn>
                    <v-toolbar-title>Markdown preview</v-toolbar-title>
                    <v-spacer></v-spacer>
                </v-toolbar>
                <MarkdownEditor v-if="markdownDialogState"></MarkdownEditor>
            </v-card>
        </v-dialog>
    </div>
</template>

<script lang="ts">
    import Vue from "vue";
    import Delta from "quill-delta/dist/Delta";
    import {Component, Prop} from "vue-property-decorator";
    import {Blot} from "parchment/dist/src/blot/abstract/blot";
    import dayjs from "dayjs";
    import katex from "katex";
    import "katex/dist/katex.min.css";

    import QuillCursors from "../../plugins/cursor/cursors.min.js";
    import "../../plugins/cursor/cursors.min.css";

    import Quill, {RangeStatic, Sources} from "quill";
    import "quill/dist/quill.core.css";
    import "quill/dist/quill.snow.css";

    import {mathquill4quill} from "../../plugins/quill/mathquill4quill.min";
    import {ImageResize} from "../../plugins/quill/ImageResize.min";

    import defaultOptions from "../../../../cshub-shared/src/utilities/QuillDefaultOptions";
    import {IQuillEditSetup} from "./IQuillEditSetup";

    import {logStringConsole} from "../../utilities";
    import {idGenerator} from "../../utilities/id-generator";

    import {MarkdownLatexQuill} from "../../../../cshub-shared/src/utilities/MarkdownLatexQuill";
    import MarkdownEditor from "./MarkdownEditor.vue";

    import {markdownDialogType} from "../../store/ui/state";
    import uiState from "../../store/ui";
    import {
        ClientCursorUpdated,
        ClientDataUpdated,
        IRealtimeEdit, IRealtimeSelect, ServerCursorUpdated, ServerDataUpdated,
        TogglePostJoin
    } from "../../../../cshub-shared/src/api-calls/realtime-edit";
    import {SocketWrapper} from "../../utilities/socket-wrapper";
    import {Routes} from "../../../../cshub-shared/src/Routes";
    import userState from "../../store/user";
    import {getRandomNumberLarge} from "../../../../cshub-shared/src/utilities/Random";
    import {transformFromArray} from "../../../../cshub-shared/src/utilities/DeltaHandler";
    import {CustomTooltip} from "./CustomTooltip";

    (window as any).Quill = Quill;
    (window as any).Quill.register("modules/resize", ImageResize);
    (window as any).Quill.register("modules/cursors", QuillCursors);

    @Component({
        name: "QuillEditor",
        components: {MarkdownEditor}
    })
    export default class QuillEditor extends Vue {


        /**
         * Data
         */
        @Prop({
            type: null,
            required: true,
            default: {allowEdit: true, showToolbar: true, postHash: -1}
        }) private editorSetup: IQuillEditSetup;
        @Prop(null) private initialValueProp: Delta;

        // Editor related options
        private editor: Quill = null;
        private editorOptions: any = defaultOptions;
        private editorId = "";
        private initialValue: Delta;
        private socketTypingTimeout: number = null;
        private currentEdits: Delta[] = [];

        // Realtime edit related variables
        private lastFewEdits: IRealtimeEdit[] = [];
        private myCursor: IRealtimeSelect;

        // Markdown editor related variables
        private markdownTooltip: any;
        private markdownTextString = "";
        private currentlySelectedDomNodes: object[] = [];

        /**
         * Lifecycle hooks
         */
        private mounted() {

            if (this.editorSetup.allowEdit) {
                this.sockets.subscribe(ServerDataUpdated.getURL, (data: ServerDataUpdated) => {

                    if (userState.userModel.id !== data.edit.userId) {
                        if (this.lastFewEdits.length === 1 || this.lastFewEdits[this.lastFewEdits.length - 1].serverGeneratedId === data.edit.prevServerGeneratedId) {
                            this.lastFewEdits.push(data.edit);
                            this.editor.updateContents(data.edit.delta);
                        } else {
                            logStringConsole("Doing operational transform");
                            const delta = transformFromArray(this.lastFewEdits, data.edit, true);
                            data.edit.delta = delta;
                            this.lastFewEdits.push(data.edit);

                            this.editor.updateContents(delta);
                        }

                    } else {
                        for (let i = this.lastFewEdits.length - 1; i >= 0; i--) {
                            if (this.lastFewEdits[i].userGeneratedId === data.edit.userGeneratedId) {
                                logStringConsole("Overwriting right edit");
                                this.lastFewEdits[i] = data.edit;
                            }
                        }
                    }

                    logStringConsole(`Delta ${JSON.stringify(data.edit.delta)}, current server id: ${data.edit.serverGeneratedId}, previous: ${data.edit.prevServerGeneratedId} last few edits server id ${this.lastFewEdits[this.lastFewEdits.length - 1].serverGeneratedId}`, "Quill socket subscribe");

                });

                this.sockets.subscribe(ServerCursorUpdated.getURL, (data: ServerCursorUpdated) => {

                    if (userState.userModel.id !== data.select.userId) {
                        this.editor.getModule("cursors").setCursor(data.select.userId, data.select.selection, data.select.userName, data.select.color);
                    }
                });

                this.myCursor = {
                    color: null,
                    userId: null,
                    userName: null,
                    postHash: this.editorSetup.postHash,
                    selection: null,
                    active: true
                };

                SocketWrapper.emitSocket(new TogglePostJoin(
                    this.editorSetup.postHash,
                    true,
                    (serverData: IRealtimeEdit, selects: IRealtimeSelect[]) => {

                        this.lastFewEdits.push({
                            postHash: this.editorSetup.postHash,
                            delta: serverData.delta,
                            timestamp: serverData.timestamp,
                            serverGeneratedId: serverData.serverGeneratedId,
                            userGeneratedId: serverData.userGeneratedId
                        });

                        this.setupQuill(serverData.delta, selects);

                    }), this.$socket);
            } else {
                this.setupQuill(this.initialValueProp, null);
            }
        }

        private setupQuill(delta: Delta, selects: IRealtimeSelect[]) {
            if (delta === null) {
                this.$router.push(Routes.INDEX);
            } else {
                this.initialValue = delta;

                (window as any).katex = katex;

                logStringConsole("Mounted quillInstance with edit: " + this.editorSetup.allowEdit);

                this.editorId = idGenerator();

                mathquill4quill(Quill, (window as any).MathQuill); // Load mathquill4quillMin after all its dependencies are accounted for

                // setTimeout without timeout magically works, gotta love JS (though with 0 does wait for the next 'JS clock tick', so probably a Vue thing that hasn't been synchronized yet with the DOM and so quillInstance will error)
                setTimeout(() => {
                    logStringConsole("Initializing quillInstance with edit: " + this.editorSetup.allowEdit);
                    this.initQuill(selects); // Actually init quillInstance itself
                });
            }
        }

        private beforeDestroy() {
            // Remove the editor on destroy
            this.editor = null;
            SocketWrapper.emitSocket(new ClientCursorUpdated({...this.myCursor, active: false}), this.$socket);
            this.sockets.unsubscribe(ServerDataUpdated.getURL);
            this.sockets.unsubscribe(ServerCursorUpdated.getURL);
        }

        /**
         * Computed properties
         */
        get markdownDialogState(): markdownDialogType {
            return uiState.mardownDialogState;
        }

        set markdownDialogState(state: markdownDialogType) {
            uiState.setMarkdownDialogState(state);
        }

        get userId() {
            return userState.userModel.id;
        }

        /**
         * Methods
         */
        private setMarkDown(): void {
            const sel = this.editor.getSelection();
            if (sel !== null) {
                const obKeys = Object.keys(this.editor.getFormat(sel));
                if (obKeys.length === 0) {
                    this.editor.format(MarkdownLatexQuill.blotName, true, "user");
                } else if (obKeys[0] === MarkdownLatexQuill.blotName) {
                    this.editor.removeFormat(sel.index, sel.length, "user");
                } else {
                    this.editor.format(MarkdownLatexQuill.blotName, true, "user");
                }
            }

        }

        private getDelta() {
            return this.editor.getContents();
        }

        private initQuill(selects: IRealtimeSelect[]) {
            // Create the editor
            this.editorOptions.bounds = `#${this.editorId} .editor`;
            this.editorOptions.modules.toolbar = `#${this.editorId} .toolbar`;

            if (!this.editorSetup.allowEdit) {
                this.editorOptions.placeholder = "";
            }
            this.editor = new Quill(`#${this.editorId} .editor`, this.editorOptions);

            (this.editor as any).enableMathQuillFormulaAuthoring(); // Enable mathquill4quillMin
            this.editor.enable(false); // Hide it before we set the content

            const markdownLatexQuill = new MarkdownLatexQuill(Quill);
            markdownLatexQuill.registerQuill();

            // Set the content (with input a quillInstance delta object)
            if (this.initialValue) {
                this.editor.setContents(this.initialValue);
            }

            // Show the editor again
            if (this.editorSetup.allowEdit) {
                this.editor.enable(true);
            }

            if (selects !== null) {
                for (const select of selects) {
                    if (select.userId !== userState.userModel.id) {
                        this.editor.getModule("cursors").setCursor(select.userId, select.selection, select.userName, select.color);
                    }
                }
            }

            this.editor.focus();

            this.markdownTooltip = new CustomTooltip(this.editor, null, document.getElementById("markdownTooltip")) as any;

            // Specify function to be called on change
            this.editor.on("text-change", this.textChanged);
            this.editor.on("selection-change", this.selectionChanged);
        }

        private textChanged(delta: Delta, oldContents: Delta, source: Sources) {
            if (source === "user") {
                this.currentEdits.push(delta);
            }

            clearTimeout(this.socketTypingTimeout);
            this.socketTypingTimeout = setTimeout(() => {
                if (this.editor !== null) {
                    if (source === "user") {

                        let edit = new Delta();
                        for (const currentEdit of this.currentEdits) {
                            edit = edit.compose(currentEdit);
                        }

                        const userEdit: IRealtimeEdit = {
                            postHash: this.editorSetup.postHash,
                            delta: edit,
                            timestamp: dayjs(),
                            userId: this.userId,
                            prevServerGeneratedId: this.lastFewEdits[this.lastFewEdits.length - 1].serverGeneratedId,
                            userGeneratedId: getRandomNumberLarge()
                        };

                        this.lastFewEdits.push(userEdit);
                        this.currentEdits = [];
                        logStringConsole(`SENDING edit from ${userEdit.timestamp} with id ${userEdit.userGeneratedId} and delta ${JSON.stringify(userEdit.delta)}`);
                        SocketWrapper.emitSocket(new ClientDataUpdated(userEdit), this.$socket);
                    }
                }
            }, 50);


        }

        private openMarkdownDialog() {
            this.markdownDialogState = {
                open: true,
                blots: this.currentlySelectedDomNodes as Blot[]
            };
        }

        private closeMarkdownDialog() {
            this.markdownDialogState = {
                ...this.markdownDialogState,
                open: false
            };
        }

        private selectionChanged(range: RangeStatic, oldRange: RangeStatic, source: any) {
            SocketWrapper.emitSocket(new ClientCursorUpdated({
                ...this.myCursor,
                selection: range
            }), this.$socket);

            if (range !== null && range.length !== 0) {
                const selection = this.editor.getFormat(range);
                const obKeys = Object.keys(selection);
                if (obKeys[0] === MarkdownLatexQuill.blotName) {

                    const bounds = this.editor.getBounds(range.index, range.length);

                    this.markdownTooltip.show();
                    this.markdownTooltip.position(bounds);

                    const currentLineArray = this.editor.getLines(range);

                    if (currentLineArray.length > 0) {

                        const newLineArray = [];

                        let prev = currentLineArray[0];

                        while (true) {
                            if (prev.domNode.className === MarkdownLatexQuill.blotName) {
                                if (prev.prev !== null && prev.prev.domNode.className === MarkdownLatexQuill.blotName) {
                                    prev = prev.prev;
                                } else {
                                    break;
                                }
                            } else {
                                break;
                            }
                        }

                        while (true) {
                            if (prev !== null && prev.domNode.className === MarkdownLatexQuill.blotName) {
                                newLineArray.push(prev);
                                prev = prev.next;
                            } else {
                                break;
                            }
                        }

                        this.markdownTooltip.show();
                        this.currentlySelectedDomNodes = newLineArray;
                    }

                } else {
                    this.markdownTooltip.hide();
                }
            } else {
                this.markdownTooltip.hide();
            }
        }
    }
</script>

<style scoped>
    .editor {
        min-height: 100px;
        height: 90%;
        border: none;
    }

    .tableButton {
        min-width: 10px;
    }

    .tableButton:focus,
    .tableButton:hover {
        color: white;
    }

    .tableIcon:hover {
        caret-color: #00A6D8 !important;
        color: #00A6D8 !important;
    }

    .editor >>> .ql-code-block-container {
        background-color: #b3b3b3;
    }

    .editor >>> .mklqx {
        white-space: pre-wrap;
        color: black;
        background-color: rgba(182, 182, 182, 0.13);
    }
</style>
