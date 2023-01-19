/// <reference path="node_modules/monaco-editor/monaco.d.ts" />
console.log('Start of main.js');


let dbHelper;
const keys = "C#3 D3 D#3 E3 F3 F#3 G3 G#3 A3 A#3 B3 C4 C#4 D4 D#4 E4 F4 F#4 G4 G#4 A4 A#4 B4 C5 C#5 D5 D#5 E5 F5 F#5 G5 G#5 A5 A#5 B5 C6".split(" ");
const swars = "sl Rl rl Gl gl ml Ml pl Dl dl Nl nl s R r G g m M p D d N n su Ru ru Gu gu mu Mu pu Du du Nu nu".split(" ");
const swarsEng = ".S .r .R .g .G .M .m .P .d .D .n .N S r R g G M m P d D n N S. r. R. g. G. M. m. P. d. D. n. N.".split(" ");

var store = {
    state: {
    }
}

Vue.config.productionTip = false;


const Home = Vue.component('Home', {
    template: '#home-template',
    data() {
        return {
            state: store.state,
            compositionId: '',
            title: 'Untitled',
            createdDate: new Date(),
            lastModifiedDate: new Date(),
            showCompositionListDialog: false,
            showDeleteConfirmDialog: false,
            showMessageSnackbar: false,
            messageTxt: '',
            compositionList: [],
            compositionListHeaders: [
                { text: 'Title', value: 'local-title' },
                { text: 'Last Modified', value: 'date' },
                { text: 'Actions', value: 'actions', sortable: false },
            ],
            textPartsTableHeaders: [
                { text: 'Text', value: 'local-selectedtext' },
                // { text: 'Id', value: 'decorationId' },
                // { text: 'Id', value: 'id' },
                // { text: 'Range', value: 'range' },
                { text: 'Actions', value: 'actions', sortable: false, width: '150px' },
            ],
            partCompositionsTableHeaders: [
                { text: 'Note', value: 'local-notes' },
                { text: 'Midi', value: 'hasmidi' },
                { text: 'Audio', value: 'hasaudio' },
                { text: 'Id', value: 'id' },
                { text: 'Actions', value: 'actions', sortable: false },
            ],
            textParts: [],   //Each item has decorationId. And a array of audio and keyStrokes
            // selectedTextPartIndex: null,
            selectedTextPart: null,
            selectedPartComposition: null,
            // selectedPartCompositionMidiData: [],
            recordingInProgress: false,
            discardCurrentRecording: false,
            audioMediaCaptured: false,
            showSwarsEng: false,
            text: ''
        }
    },
    methods: {
        test() {
            // this.textParts.forEach(part => {
            //     let deco = this.editor.getModel().getDecorationRange(part.decorationId);
            //     console.log({ startLineNumber: deco.startLineNumber });
            // });


            let container = this.$refs["text-parts-table"].$el.querySelector('div.v-data-table__wrapper');
            let row = this.$refs["b;10"];
            console.log({ row, container, refs: this.$refs });
            this.$vuetify.goTo(row, { container });
        },
        handlePartCompDrop(e){
            console.log('In handlePartCompDrop');
            let partCompositionId = e.dataTransfer.getData("text/plain")
            let targetPartId = e.target.id;
            console.log({partCompositionId, targetPartId, e});
            this.movePartCompositionToAnotherPart(partCompositionId, targetPartId);
        },
        checkPartCompDrop(e){
            console.log('In checkPartCompDrop');
            e.preventDefault();
        },
        onPartCompositionDragStart(e){
            console.log('In onPartCompositionDragStart');
            console.log(e);
            e.dataTransfer.setData("text/plain", e.target.id);
            console.log(`Setting partCompositionId ${e.target.id}`);
        },
        movePartCompositionToAnotherPart(partCompositionId, targetPartId){ 
            console.log(`Moving ${partCompositionId} to ${targetPartId}`);
            let textPart = this.textParts.find(tp => tp.id == targetPartId);
            let movedToPart = null;
            let movedCompositionIndex = null;
            for (const tp of this.textParts) {
                let index = tp.compositions.findIndex(c => c.id == partCompositionId);
                if(index >= 0 && tp.id != targetPartId){
                    textPart.compositions.push(tp.compositions[index]);
                    tp.compositions.splice(index, 1);
                    movedToPart = textPart;
                    movedCompositionIndex = textPart.compositions.length - 1;
                }
            }
            if(movedToPart){
                this.setSelectedTextPart(movedToPart, movedCompositionIndex);
                // this.setSelectedPartComposition(movedComposition);
                this.showMessage('Moved');
                // this.selec
            }else{
                this.showMessage('NOT Moved');
            }
        },
        // getTextPartById(id){
        //     return this.textParts.findIndex(tp => tp.id == id)
        // },
        // getTextPartCompositionById(id){
        //     return this.textParts.find(tp => tp.id == id)
        // },
        async downloadAllCompositions() {
            //            let zipBlob = await getZippedCompositionBlob(composition);
            // this.compositionList
            let zip = new JSZip();
            console.log('Building zip file...');

            for (const composition of this.compositionList) {
                let compZipBlob = await this.getZippedCompositionBlob(composition);
                console.log(`Adding ${composition.title} to the zip blob`);
                zip.file(composition.compositionId + '-' + composition.title + '.zip', compZipBlob, { base64: true });
            }


            // await this.compositionList.forEach(async composition => {
            //     let compZipBlob = await this.getZippedCompositionBlob(composition);
            //     console.log(`Adding ${composition.title} to the zip blob`);
            //     zip.file(composition.compositionId + '-' + this.title + '.zip', compZipBlob, { base64: true });
            // });
            
            console.log('All added...Creating final zip...');

            var d = new Date();
            let fileName = ['all-compositions_',
                d.getFullYear() + '-',
                d.getMonth() + 1 + '-',
                d.getDate() + '_',
                d.getHours() + '-',
                d.getMinutes() + '-',
                d.getSeconds()].join('') + '.zip';

            let zipBlob = await zip.generateAsync({ type: "blob" });
            saveAs(zipBlob, fileName);
        },
        async getZippedCompositionBlob(composition) {
            let zip = new JSZip();
            zip.file(this.compositionId + '-' + this.title + 'data.json', JSON.stringify(composition, null, 2));

            composition.textParts.forEach(tp => {
                tp.compositions.forEach(cp => {
                    if (cp.audioBlob) {
                        zip.file(cp.id + '-audio.ogg', cp.audioBlob, { base64: true });
                    }
                    if (cp.videoBlob) {
                        zip.file(cp.id + '-video.mp4', cp.videoBlob, { base64: true });
                    }
                });
            });

            let zipBlob = await zip.generateAsync({ type: "blob" });
            return zipBlob;
        },
        async downloadComposition() {
            let composition = this.gatherCompositionForSaving();
            // let zip = new JSZip();
            // zip.file(this.compositionId + '-' + this.title + 'data.json', JSON.stringify(composition, null, 2));

            // composition.textParts.forEach(tp => {
            //     tp.compositions.forEach(cp => {
            //         if (cp.audioBlob) {
            //             zip.file(cp.id + '-audio.ogg', cp.audioBlob, { base64: true });
            //         }
            //         if (cp.videoBlob) {
            //             zip.file(cp.id + '-video.mp4', cp.videoBlob, { base64: true });
            //         }
            //     });
            // });

            let zipBlob = await this.getZippedCompositionBlob(composition);

            // let zipBlob = await zip.generateAsync({ type: "blob" });
            let fileName = name + '.zip';
            saveAs(zipBlob, this.compositionId + '-' + this.title + '.zip');
        },
        deleteTextPart(part) {
            let index = this.textParts.findIndex(tp => tp.id == part.id);
            // let index = this.textParts.findIndex(tp => tp.decorationId == part.decorationId);
            this.editor.removeDecorations([part.decorationId]);

            this.textParts.splice(index, 1);
            //TODO: What is the implication of following
            this.selectedTextPart = null;


        },
        deleteTextPartComposition(composition) {
            let index = this.selectedTextPart.compositions.findIndex(c => c.id == composition.id);
            // console.log({index, composition, tbd: this.selectedTextPart.compositions[index]});
            this.selectedTextPart.compositions.splice(index, 1);

            //Select next best available part composition
            if(this.selectedTextPart.compositions.length > 0){
                let newIndex = index - 1;
                if(newIndex < 0) newIndex = 0;
                this.selectedPartComposition = this.selectedTextPart.compositions[newIndex];
            }else{
                this.selectedPartComposition = null;
            }
        },
        addPartComposition() {
            let composition = {
                createdDate: new Date(),
                lastModifiedDate: new Date(),
                videoBlob: null,
                audioBlob: null,
                notes: '--NO NOTES--',
                midiData: null,
                id: this.generateCompositionId()
            };
            this.selectedTextPart.compositions.push(composition)
            this.setSelectedPartComposition(composition);

            // this.$vuetify.goTo(this.$refs.partCompositionNotes);
            // TODO: Scroll to the row in the table
            // xxx
            Vue.nextTick(() => {
                let container = this.$refs["part-compositions-table"].$el.querySelector('div.v-data-table__wrapper');
                let row = this.$refs[composition.id];
                this.$vuetify.goTo(row, { container });
            });

        },
        scrollToTextPartTableRow(id) {
            let container = this.$refs["text-parts-table"].$el.querySelector('div.v-data-table__wrapper');
            let row = this.$refs[id];
            // console.log({ row, container, refs: this.$refs });
            this.$vuetify.goTo(row, { container });
        },
        getClassForPartsCompositionsTableSelectedRow(item) {
            if (this.selectedPartComposition && item.id == this.selectedPartComposition.id) {
                return 'parts-compositions-table-selected-row'
            }
            return '';
        },
        getClassForTextPartsTableRow(item) {
            // console.log({item});

            // if (this.selectedTextPart && item.decorationId == this.selectedTextPart.decorationId) {
            if (this.selectedTextPart && item.id == this.selectedTextPart.id) {
                    return 'text-parts-table-selected-row'
            }

            // if(this.selectedTextPartIndex && item.decorationId == this.textParts[this.selectedTextPartIndex].decorationId){
            //     return 'text-parts-table-selected-row'
            // }
            return '';
        },
        setSelectedPartComposition(composition) {
            this.selectedPartComposition = composition;
            Vue.nextTick(() => {
                let pianoCanvas = this.$refs.pianoCanvas;
                this.audoiMidi.initPianoRoll(pianoCanvas);
                if (this.selectedPartComposition.audioBlob) {
                    // let audioEle = this.$refs[this.selectedPartComposition.id];
                    let audioPlayer = this.$refs.audioPlayer;
                    // console.log('Converting audio blob to url...');
                    audioPlayer.src = URL.createObjectURL(this.selectedPartComposition.audioBlob);
                    this.selectedPartComposition.audioURL = audioPlayer.src;
                    // console.log('Converting audio blob to url...DONE!');
                    // audioEle.play();
                    // let downloadAudioBtn = this.$refs.downloadAudioBtn;
                    // downloadAudioBtn.href = this.selectedPartComposition.audioURL;
                    // downloadAudioBtn.disabled = false;
                    // downloadAudioBtn.download = this.selectedPartComposition.id + '.mp3';
                }
                let videoEle = this.$refs.captureVideo;
                if (this.selectedPartComposition.videoBlob) {
                    // console.log('Converting video blob to url...');
                    // videoEle.src = URL.createObjectURL(this.selectedPartComposition.videoBlob);
                    // this.selectedPartComposition.videoURL = videoEle.src;
                    this.selectedPartComposition.videoURL = URL.createObjectURL(this.selectedPartComposition.videoBlob);
                    // console.log('Converting video blob to url...DONE!');
                }else{
                    this.selectedPartComposition.videoURL = null;
                }
                videoEle.src = this.selectedPartComposition.videoURL;
            });
        },
        getDownloadVideoBtnHref(){
            let href = ''
            if(this.selectedPartComposition != null && this.selectedPartComposition.videoURL != null){
                href = this.selectedPartComposition.videoURL;
            }
            return href;
        },
        getDownloadAudioBtnHref(){
            let href = '';
            if(this.selectedPartComposition != null && this.selectedPartComposition.audioURL != null){
                href = this.selectedPartComposition.audioURL;
            }
            return href;
        },
        partCompositionTableRowClicked(composition) {
            // console.log({ composition });
            // this.selectedPartComposition = composition;
            this.setSelectedPartComposition(composition);
        },
        setSelectedTextPart(part, selectedPartCompositionIndex){
            if(this.selectedTextPart && this.selectedTextPart.id != part.id){
                this.selectedTextPart = part;
            }else{
                console.log('No action taken in setSelectedTextPart for the Parts table');
            }
            
            //-1 indicate do not select any composition
            let partCompositionIndex = -1;

            if(selectedPartCompositionIndex){       //If asked to select the composition
                partCompositionIndex = selectedPartCompositionIndex;
            }else if(this.selectedTextPart.compositions.length > 0){    //If text part has any composition
                partCompositionIndex = 0;
            }
            if(partCompositionIndex >= 0 && this.selectedPartComposition && this.selectedPartComposition.id != this.selectedTextPart.compositions[ partCompositionIndex].id){
                //If composition is not already selected
                this.setSelectedPartComposition(this.selectedTextPart.compositions[ partCompositionIndex]);
            }else{
                console.log('No action taken in setSelectedTextPart for the Compositions table');
            }
        },
        attachPartToSelectedText(part){
            let selection = this.editor.getSelection();
            if (selection.startLineNumber == selection.endLineNumber && selection.startColumn == selection.endColumn) {
                //Nothing was selected
                this.showMessage('Please select text before switching.')
            }else{
                //Remove current decoration
                this.editor.removeDecorations([part.decorationId]);

                //Attach the text part to new decoration
                let decoration = {
                    range: new monaco.Range(selection.startLineNumber, selection.startColumn, selection.endLineNumber, selection.endColumn),
                    options: { inlineClassName: 'selected-text-part' }
                }
                let decorationsCollection = this.editor.createDecorationsCollection([decoration]);
    
                let selectedText = this.editor.getModel().getValueInRange(selection);
                let decorationId = decorationsCollection._decorationIds[0];
                let decorationRange = this.getDecorationByRangeId(decorationId);
                part.decorationId = decorationId;
                part.selectedText = selectedText;
                part.decorationRange = decorationRange;
            }
        },
        textPartTableRowClicked(part) {
            // console.log({ part });
            this.setSelectedTextPart(part);
            //In the editor revel the selected text
            let range = this.getDecorationByRangeId(part.decorationId);
            this.editor.revealLineInCenter(range.startLineNumber);
        },
        showMessage(msg) {
            this.showMessageSnackbar = true;
            this.messageTxt = msg;
        },
        showDeleteConfirmDialogBox(composition) {
            this.compositionToBeDeleted = composition;
            this.showDeleteConfirmDialog = true;
        },
        async deleteCompositionConfirmed() {
            await dbHelper.deleteComposition(this.compositionToBeDeleted);
            await this.refreshCompositionList();
            this.showDeleteConfirmDialog = false;
            //TODO: What if the current composition is deleted?
        },
        async refreshCompositionList() {
            this.compositionList = await dbHelper.getAllCompositions();
        },
        addIdToTextPartIfMissing(textParts){
            for (const tp of textParts) {
                if(!tp.id){
                    tp.id = this.generateCompositionId();
                }
            }
        }, 
        async openComposition(composition) {
            this.initData();
            console.log('Opening...', composition.title);
            this.compositionId = composition.compositionId;
            this.title = composition.title;
            // this.text = composition.editor.getValue(),
            this.textParts = composition.textParts;

            //Remove following line in future
            this.addIdToTextPartIfMissing(this.textParts);

            if (this.textParts.length > 0) {
                this.selectedTextPart = this.textParts[0];
                if (this.selectedTextPart.compositions.length > 0) {
                    this.setSelectedPartComposition(this.selectedTextPart.compositions[0]);
                    // this.selectedPartComposition = this.selectedTextPart.compositions[0];
                }
            }
            this.createdDate = composition.createdDate;
            this.lastModifiedDate = composition.lastModifiedDate;
            this.editor.setValue(composition.text);

            //TODO: Create decorations from the parts data

            // let decorations = [];
            this.textParts.forEach(part => {
                let selection = part.decorationRange;
                // console.log(selection);
                let decoration = {
                    range: new monaco.Range(selection.startLineNumber, selection.startColumn, selection.endLineNumber, selection.endColumn),
                    options: { inlineClassName: 'selected-text-part' }
                }
                // decorations.push(decoration);
                let decorationsCollection = this.editor.createDecorationsCollection([decoration]);
                part.decorationId = decorationsCollection._decorationIds[0];
                // console.log({decorationsCollection, part});
            });
            // let decorationsCollection = this.editor.createDecorationsCollection(decorations);
            // console.log({loadedTextParts: this.textParts, decorationsCollection});

            this.showCompositionListDialog = false;
        },
        async openCompositionList(composition) {
            await this.refreshCompositionList();
            this.showCompositionListDialog = true;
        },
        updateTextPartPositions() {
            //Store start and end locations for each part as it is appearing now in the editor
            this.textParts.forEach(part => {
                let deco = this.editor.getModel().getDecorationRange(part.decorationId);
                console.log(deco);
                part.decorationRange = deco;
            });
        },
        gatherCompositionForSaving() {
            this.updateTextPartPositions();
            let composition = {
                title: this.title,
                compositionId: this.compositionId,
                text: this.editor.getValue(),
                textParts: this.textParts,
                createdDate: this.createdDate,
                lastModifiedDate: this.lastModifiedDate
            }

            composition.textParts.forEach(tp => {
                tp.compositions.forEach(cp => {
                    if (cp.audioURL) delete cp.audioURL;
                    if (cp.videoURL) delete cp.videoURL;

                    //TODO: Remove following block
                    if (cp.midiData) {
                        if(cp.swarsEng){
                            //We do not need to worry about the midiData, as it is generated when recording is saved
                            console.log('We do not need to worry about the midiData, as it is generated when recording is saved.');
                        }else{
                            cp.swarsEng = cp.midiData.filter(d => d.type == 'noteon').map(d => d.swarEng).join(' ');
                        }
                    }
                });
            });


            return composition;
        },
        async saveComposition() {
            let composition = this.gatherCompositionForSaving();
            await dbHelper.saveComposition(composition);
            this.showMessage('Composition saved');
        },
        initData() {
            this.compositionId = this.generateCompositionId();
            this.title = 'Untitled';
            this.createdDate = new Date();
            this.lastModifiedDate = this.createdDate;
            this.compositionList = [];
            this.textParts = [];
            this.selectedTextPart = null;
            this.text = '';
            this.editor.setValue(this.text);
            this.selectedPartComposition = null;
        },
        addNewComposition() {
            //TODO: Ensure that you save the current work
            this.initData();
        },
        getDecorationByRangeId(decorationId) {
            return this.editor.getModel().getDecorationRange(decorationId);
        },
        recordAudioKeys(part) {
            console.log('recordAudioKeys for...');
            // let deco = this.editor.getModel().getDecorationRange(part.decorationId);
            let deco = this.getDecorationByRangeId(part.decorationId);
            console.log({ part, deco, startLineNumber: deco.startLineNumber });
        },
        startRecording(){
            this.toggleRecording();
        },
        stopRecording(){
            this.toggleRecording();
        },
        discardRecording(){
            this.discardCurrentRecording = true;
            this.recordingInProgress = false;
            this.audoiMidi.stopRecording();
        },
        toggleRecording() {
            this.recordingInProgress = !this.recordingInProgress;
            if (this.recordingInProgress) {
                this.discardCurrentRecording = false;
                let audioEle = this.$refs.audioPlayer;
                let videoEle = this.$refs.captureVideo;

                this.audoiMidi.startRecording(audioEle, videoEle);
                // let pianoEle = this.$refs['piano-roll'];
                // this.audoiMidi.initPianoRoll(pianoEle);               
            } else {
                this.audoiMidi.stopRecording();
            }
        },
        onAudioMidiInit(status) {
            if (status.error) {
                if (status.type == 'midiDeviceNotDetected') {
                    this.audioMediaCaptured = true;
                    this.showMessage('Failed to connect Midi Keyboard.');
                }
            } else {
                if (status.type == 'audioMediaRecorder') {
                    this.audioMediaCaptured = true;
                    this.showMessage('Audio media captured successfully.');
                }
                if (status.type == 'midiDeviceConnected') {
                    this.$router.app.$emit('onMidiCaptured', { deviceId: this.audoiMidi.deviceId, deviceName: this.audoiMidi.deviceName });
                }
            }
        },
        // onMidiNoteOn(data){
        //     let identifier = data.note.identifier;
        //     let index = keys.indexOf(identifier);
        //     // let swar = swarsEng[index];
        //     data.swar = swarsEng[index];

        //     // this.selectedPartCompositionMidiData.push(data);
        // },
        onAudioMidiStop(data) {
            //This method is called 2 time, one for audio and one for video
            if(this.discardCurrentRecording){
                console.log('Discarding the recordings for ' + data.type);
                return;
            }
            if (data.type == 'audioAndMidi') {
                let { audioBlobURL, audioBlob, midiData } = data;
                console.log({ audioBlobURL, midiData });
                let audioEle = this.$refs.audioPlayer;
                this.selectedPartComposition.audioBlob = audioBlob;
                this.selectedPartComposition.midiData = midiData;
                audioEle.src = audioBlobURL;
                // audioEle.play();
                this.selectedPartComposition.swarsEng = midiData.filter(d => d.type == 'noteon').map(d => d.swarEng).join(' ');

                console.table(midiData);
            } else {  //data.type == 'video'
                console.log({ event: 'onAudioMidiStop', data });
                this.selectedPartComposition.videoBlob = data.videoBlob;
            }
        },
        shouldDisableButton(btnName){
            if(btnName == 'Record'){
                return this.recordingInProgress; 
            }
            if(btnName == 'Stop'){
                return !this.recordingInProgress; 
            }
            if(btnName == 'Discard'){
                return !this.recordingInProgress; 
            }
            if(btnName == 'showSwarsEng'){
                return this.selectedPartComposition == null || this.selectedPartComposition.swarsEng == null; 
            }
            return false;
        },
        playVideo(){
            let captureVideo = this.$refs.captureVideo;
            captureVideo.play();
        },
        playAudio(){
            let audioPlayer = this.$refs.audioPlayer;
            audioPlayer.play();
        },
        addNewTextPart() {
            let selection = this.editor.getSelection();
            console.log({ selection });

            if (selection.startLineNumber == selection.endLineNumber && selection.startColumn == selection.endColumn) {
                //Nothing was selected
                this.showMessage('Please select text before adding.')
                return;
            }

            let decoration = {
                range: new monaco.Range(selection.startLineNumber, selection.startColumn, selection.endLineNumber, selection.endColumn),
                options: { inlineClassName: 'selected-text-part' }
            }
            let decorationsCollection = this.editor.createDecorationsCollection([decoration]);

            let selectedText = this.editor.getModel().getValueInRange(selection);
            let decorationId = decorationsCollection._decorationIds[0];
            let decorationRange = this.getDecorationByRangeId(decorationId);


            let id = this.generateCompositionId();
            let newTextPart = { decorationId, selectedText, decorationRange, compositions: [], id };
            this.textParts.push(newTextPart);
            this.selectedTextPart = newTextPart;

            console.log({ selectedText, decorationId, selectedTextPart: this.selectedTextPart });

            //textParts
        },
        registerEditorListeners() {

            // this.editor.onDidChangeCursorPosition((e) => {
            //     console.log({e1: e});
            // });

            // this.editor.onDidChangeCursorSelection((e) => {
            //     console.log(e.reason);
            // });

            this.editor.getModel().onDidChangeContent((e) => {
                //TODO: Re-read the range of all the decorations
                // console.log(e);
            });


            this.editor.onMouseDown((e) => {
                // console.log(e);
                const decorationInRange = this.editor.getModel().getDecorationsInRange(e.target.range)
                let deco = decorationInRange.find((d) => d.options.inlineClassName == "selected-text-part")
                // console.log({ decorationInRange, deco });
                if (deco) {
                    //Make this the selected textPart
                    // this.selectedTextPart = this.textParts.find((tp) => tp.decorationId == deco.id)
                    // console.log(this.selectedTextPart);
                    let selectedTextPartIndex = this.textParts.findIndex((tp) => tp.decorationId == deco.id);
                    this.selectedTextPart = this.textParts[selectedTextPartIndex];
                    this.scrollToTextPartTableRow(this.selectedTextPart.id);


                    // this.$vuetify.goTo('.text-parts-table-selected-row');

                    // console.log({selectedTextPartIndex});
                }
            });






            this.editor.addAction({
                id: 'addTextPart',
                label: 'Add composition',

                // An optional array of keybindings for the action.
                // keybindings: [
                //     monaco.KeyMod.WinCtrl | monaco.KeyCode.KeyA
                // ],

                // A precondition for this action.
                precondition: null,

                // A rule to evaluate on top of the precondition in order to dispatch the keybindings.
                keybindingContext: null,

                contextMenuGroupId: 'navigation',

                contextMenuOrder: 1.5,

                // Method that will be executed when the action is triggered.
                // @param editor The editor instance is passed in as a convenience
                run: (ed) => {
                    console.log("i'm running => " + ed.getPosition());
                    this.addNewTextPart();
                }
            });





            this.editor.createContextKey('add-content', true);
            editor.addCommand(
                monaco.KeyMod.WinCtrl | monaco.KeyCode.KeyA,
                () => {
                    this.addNewTextPart();
                },
                'add-content'
            );
        },
        generateCompositionId() {
            return Math.random().toString(16).slice(2);
        }
    },
    async mounted() {
        console.log('Home mounted');
        let containerEle = this.$refs['editor-container'];

        createEditor(containerEle, this.text, async (editor) => {
            this.editor = editor;
            this.registerEditorListeners();

            // this.initData();

            let compositions = await dbHelper.getAllCompositions();
            let composition = compositions.find((c) => c.title == 'Untitled-n');
            this.openComposition(composition);
        })


        // this.$nextTick(() => this.$refs['title'].focus());


    },
    created() {
        console.log('Home created');
        this.audoiMidi = new AudioMidi(this.onAudioMidiInit, this.onAudioMidiStop);

        // this.compositionId = this.generateCompositionId();
        // this.createdDate = new Date();
        // this.lastModifiedDate = new Date();
    }
})

class AudioMidi {
    /*  
        This class can record Audio and Midi keys. It also shows the piano and animates each key stokes. 
        This class expects following libraries to be loaded
        <script src="https://cdn.jsdelivr.net/npm/webmidi@next/dist/iife/webmidi.iife.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/nexusui@latest/dist/NexusUI.js"></script>
    */

    constructor(onInit, onStop) {
        this.recordedChunks = [];
        this.onStop = onStop;
        this.onInit = onInit;
        // this.onMidiNoteOn = onMidiNoteOn;
        this.mediaRecorder = null;
        this.recordingInProgress = false;
        this.deviceId = null;
        this.deviceName = null;
        this.mySynth = null;
        this.midiData = [];
        this.pianoAnimationMidiDataCurrentIndex = 0;

        navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then((stream) => {
            this.handleSuccess(stream)
        });

        // WebMidi
        //     .enable()
        //     .then(this.onMidiEnabled)
        //     .catch(err => {
        //         //TODO: Show this error
        //         console.log('WemMidi failed to enable!');
        //         console.log({err});
        // });

        WebMidi.enable().then(() => {
            this.onMidiEnabled();
        }).catch(err => {
            //TODO: Show this error
            console.log('WemMidi failed to enable!');
            console.log({ err });
        }, true);

        console.log('AudioMidi created. Capturing media...');
    }
    initPianoRoll(pianoCanvas) {
        // if(this.piano) this.destroy();
        // this.piano = new Nexus.Piano(divEle, {'size': [300,50], 'lowNote': 48, 'highNote': 84});
        if(this.piano){
            console.log('AudioMidi is reusing the existing Piano instance.')
        }else{
            this.piano = new Piano(pianoCanvas, { 'lowNote': 48, 'highNote': 84 });
            console.log('Piano created by AudioMidi')
        }
    }
    onMidiEnabled() {

        if (WebMidi.inputs.length < 1) {
            console.log('No MIDI device detected.');
            this.onInit({ error: true, type: 'midiDeviceNotDetected' });
            //TODO: Show this error
        } else {
            console.log('MIDI device detected.');

            WebMidi.inputs.forEach((device, index) => {
                this.deviceId = index;
                this.deviceName = device.name;
            });
            this.onInit({ type: 'midiDeviceConnected' });

            this.mySynth = WebMidi.inputs[0];
            this.mySynth.channels[1].addListener("noteoff", e => {
                if (this.recordingInProgress) {
                    console.log(e);
                    // let midiData = {message: e.message, note: e.note};
                    // this.onMidiNoteOn(midiData);

                    // let identifier = e.note.identifier;
                    // let index = keys.indexOf(identifier);
                    // let swar = swarsEng[index];
                    // console.log({ identifier, swar });

                    // let data = {message: e.message, note: e.note, timestamp: e.timestamp, type: e.type};
                    // data.swarEng = this.getSwarEngFromIdentifier(e.note.identifier);
                    // this.midiData.push(data);

                    this.addMidiEventData(e);

                    // this.piano.toggleKey(e.note.number, false);
                    this.piano.releaseKey(e.note.number);
                } else {
                    // console.log('Ignoring Midi noteoff.');
                }
            })

            this.mySynth.channels[1].addListener("noteon", e => {
                if (this.recordingInProgress) {
                    // let midiData = {message: e.message, note: e.note};
                    console.log(e);

                    // e.swarEng = this.getSwarEngFromIdentifier(e.note.identifier);
                    // this.midiData.push(e);

                    // let data = {message: e.message, note: e.note, timestamp: e.timestamp, type: e.type};
                    // data.swarEng = this.getSwarEngFromIdentifier(e.note.identifier);
                    // this.midiData.push(data);
                    let data = this.addMidiEventData(e);

                    this.piano.pressKey(e.note.number, data.swarEng);
                    // this.piano.toggleKey(e.note.number, true);
                } else {
                    // console.log('Ignoring Midi noteon.');
                }
            })

        }
    }
    addMidiEventData(e) {
        let data = { message: e.message, note: e.note, timestamp: e.timestamp, type: e.type };
        data.swarEng = this.getSwarEngFromIdentifier(e.note.identifier);
        this.midiData.push(data);
        return data;
    }
    getSwarEngFromIdentifier(identifier) {
        let index = keys.indexOf(identifier);
        return swarsEng[index];
    }
    // onAudioPlayerPlay(e){
    //     console.log({'audio-play-event': e});
    //     //Start loop
    //     // setInterval
    // }

    registerAudioPlayerEvents() {
        // this.audioEle.addEventListener("play", e => {
        //     //Set the pianoAnimationMidiDataCurrentIndex
        // });
        // this.audioEle.addEventListener("playing", e => {
        //     this.onAudioPlayerPlay(e);
        // });

        // this.audioEle.addEventListener("timeupdate", e => {
        //     console.log({timeupdateEvent: e});
        //     this.animatePianoUpToTime(e.timeStamp);
        // });
    }

    // animatePianoUpToTime(timeStamp){
    //     //this.pianoAnimationMidiDataCurrentIndex
    //     //this.midiData
    // }

    startRecording(audioEle, videoEle, keepOldBuffer, keepOldMidiData) {

        this.captureVideo = videoEle;

        this.videoStream = this.piano.canvas.captureStream(60);
        // this.videoStream.addTrack(this.mediaRecorder.captureStream().getAudioTracks()[0]);
        this.videoStream.addTrack(this.audioStream.getAudioTracks()[0]);


        // this.mediaRecorder = new MediaRecorder(this.videoStream);

        this.audioEle = audioEle;
        this.registerAudioPlayerEvents();
        if (!keepOldBuffer) {
            this.recordedChunks = [];
        }
        if (!keepOldMidiData) {
            this.midiData = []
        }

        this.registerVideoCapture();


        console.log('Starting Audio media capture...');
        this.mediaRecorder.start();
        this.videoRecorder.start();
        this.recordingInProgress = true;

        // console.log('startRecording() called');
        // if (this.mediaRecorder != null) {
        //     console.log('Starting Audio media capture...');
        //     this.mediaRecorder.start();
        // } else {
        //     console.log('Waiting to capturing Audio media...');
        //     setTimeout(this.startRecording, 1250);
        // }
    }
    stopRecording() {
        this.videoRecorder.stop();
        this.mediaRecorder.stop();
    }
    registerVideoCapture() {
        this.videoRecorder = new MediaRecorder(this.videoStream);
        this.videoChunks = [];
        this.videoRecorder.ondataavailable = (e) => {
            this.videoChunks.push(e.data);
        };
        this.videoRecorder.onstop = (e) => {
            var blob = new Blob(this.videoChunks, { 'type': 'video/mp4' });
            this.videoChunks = [];
            var videoURL = URL.createObjectURL(blob);
            console.log('Video capture blob:');
            console.log(blob);

            //TODO: How to save?
            this.captureVideo.src = videoURL;
            // this.captureVideo.play();
            this.onStop({ type: 'video', videoURL, videoBlob: blob });
            this.piano.clearSwar();

            // this.videoDownloadURL = videoURL;
        };
        this.videoRecorder.ondataavailable = (e) => {
            this.videoChunks.push(e.data);
        };
    }
    handleSuccess(stream) {
        const options = { mimeType: 'audio/webm' };
        const recordedChunks = [];
        this.audioStream = stream;
        this.mediaRecorder = new MediaRecorder(stream, options);


        this.mediaRecorder.addEventListener('dataavailable', (e) => {
            if (e.data.size > 0) this.recordedChunks.push(e.data);
        });

        this.mediaRecorder.addEventListener('play', () => {
        });


        this.mediaRecorder.addEventListener('stop', () => {
            this.recordingInProgress = false;
            let audioBlob = new Blob(this.recordedChunks);
            let audioBlobURL = URL.createObjectURL(audioBlob);
            // console.log({ xx: this.midiData });

            //Send the data back to the caller of this class
            this.onStop({ type: 'audioAndMidi', audioBlobURL, audioBlob, midiData: this.midiData });

            // timeData = temp1.map(d => {return {timestamp: d.timestamp, type: d.type }}) 
            // downloadLink.download = 'acetest.wav';
        });




        this.onInit({ type: 'audioMediaRecorder' });
        console.log('AudioMidi User Media captured successfully.');
    }
}

class Piano {
    constructor(canvas, options) {
        this.canvas = canvas;
        this.context = canvas.getContext('2d');

        // Following animation is a hack, just to foce the video capture to start immediately
        // If not done the recorder will start on the first pressKey call.
        let toggle = false;
        function animate(context) {
            context.beginPath();
            toggle = !toggle;
            context.strokeStyle = toggle ? "red" : 'green';
            context.fillStyle = "yellow";
            context.rect(0, 0, 1, 1);
            context.stroke();
            context.fill();
            requestAnimationFrame(() => { animate(context); });
        }
        animate(this.context);

        this.options = options;
        this.boxes = [];
        let bBoxWidth = 13;
        let wBoxWidth = 15;
        let pianoHeight = 50;
        let bBoxHight = pianoHeight * 70 / 100;
        let wBoxHight = pianoHeight;
        let margin = 2;
        let X = margin;
        let Y = margin;
        if (this.isBlackKey(this.options.lowNote)) X = X * 1.5;

        for (let i = this.options.lowNote; i <= this.options.highNote; i++) {
            // console.log(i, this.isBlackKey(i));
            let box = {
                keyNum: i,
                isPressed: false,
                x: X,
                y: Y,
                isBlack: this.isBlackKey(i),
            }
            let W, H;
            if (box.isBlack) {
                W = bBoxWidth;
                H = bBoxHight;
                box.x = X - (bBoxWidth) / 2;
            } else {
                W = wBoxWidth;
                H = wBoxHight;
                X = X + W;
            }
            box.w = W;
            box.h = H;
            this.boxes.push(box);
        }
        //Add width space for swarEng 20px?
        this.swarX = X + margin + 4;
        this.context.canvas.width = X + margin + 40;
        this.context.canvas.height = wBoxHight + (margin * 2);
        this.context.font = "32px serif";

        // this.context.fillStyle = "black";
        // this.context.fillRect(0, 0, canvas.width, canvas.height);

        this.drawPiano();
    }
    drawPiano() {
        this.boxes.filter(b => !b.isBlack).forEach(box => {
            this.context.beginPath();
            // console.log(box.x, box.y, box.w, box.h, box.isBlack);
            this.context.strokeStyle = "grey";
            if (box.isPressed) {
                this.context.fillStyle = "rgb(34, 187, 187)";
            } else {
                this.context.fillStyle = "white";
            }
            this.context.rect(box.x, box.y, box.w, box.h);
            this.context.stroke();
            this.context.fill();
        });

        this.boxes.filter(b => b.isBlack).forEach(box => {
            this.context.beginPath();
            // console.log(box.x, box.y, box.w, box.h, box.isBlack);
            this.context.strokeStyle = "white";
            if (box.isPressed) {
                this.context.fillStyle = "rgb(34, 187, 187)";
            } else {
                this.context.fillStyle = "black";
            }
            this.context.rect(box.x, box.y, box.w, box.h);
            this.context.stroke();
            this.context.fill();
        });

    }
    pressKey(keyNum, swarEng) {
        let box = this.boxes.find(b => b.keyNum == keyNum);
        box.isPressed = true;

        this.drawPiano();

        //Draw swarEng
        this.context.clearRect(this.swarX, 0, this.canvas.width - this.swarX, this.canvas.height);
        this.context.fillStyle = 'black';
        this.context.fillText(swarEng, this.swarX, 35);

        console.log(`Drawing ${swarEng} at ${this.swarX}, ${this.margin}`);


    }
    clearSwar(){
        this.context.clearRect(this.swarX, 0, this.canvas.width - this.swarX, this.canvas.height);
    }
    releaseKey(keyNum) {
        let box = this.boxes.find(b => b.keyNum == keyNum);
        box.isPressed = false;
        this.drawPiano();
    }
    isBlackKey(keyNum) {
        var noteMod = keyNum % 12;
        if (noteMod === 1 || noteMod === 3 || noteMod === 6 || noteMod === 8 || noteMod === 10) {
            return true;
        }
        return false;
    }
}


const Bar = Vue.component('Bar', {
    template: '#bar-template',
    data() {
        return {
            state: store.state
        }
    },
    methods: {
    },
    created() {
        console.log('Bar created');
    }
})


function initVue() {

    const routes = [
        { path: '/', component: Home },
        { path: '/bar', component: Bar }
    ]

    const router = new VueRouter({
        routes
    })


    new Vue({
        data() {
            return {
                state: store.state,
                midiDeviceName: 'Please connect keyboard and reload the page.',
                midiDeviceId: '',
            }
        },
        el: '#app',
        router,
        vuetify: new Vuetify(),
        methods: {
            setMidiStatus(status) {
                console.log('Setting midi status');

                this.midiDeviceId = status.deviceId;
                this.midiDeviceName = status.deviceName;
            }
        },
        created() {
            this.$router.app.$on('onMidiCaptured', this.setMidiStatus);
            console.log('Vue created');

        }
    })


}

function createEditor(container, text, onDone) {
    require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.34.1/min/vs' } });
    require(["vs/editor/editor.main"], () => {
        editor = monaco.editor.create(container, {
            value: text,
            language: 'text',
            theme: 'vs-dark',
            fontSize: "14px",
            selectionHighlight: false,
            minimap: {
                enabled: false
            }
            // lineNumbers: 'off',
            // glyphMargin: false,
            // folding: false
        });

        // console.log({ editor });

        window.addEventListener("resize", () => {
            editor.layout();
        });


        onDone(editor);
    });

}


async function initDB() {
    let dbName = 'quick-composer-db';
    let storeNames = ['Compositions'];
    let db = await openDB(dbName, 1, {
        upgrade(db, oldVersion, newVersion, transaction) {
            console.log({ db, oldVersion, newVersion, transaction });
            if (oldVersion < 1) {
                db.createObjectStore(storeNames[0]);
            }
        },
    });
    console.log('DB is connected');

    dbHelper = {
        saveComposition: async (composition) => {
            console.log('Saving composition', composition);
            await db.put(storeNames[0], composition, composition.compositionId);
        },
        deleteComposition: async (composition) => {
            await db.delete(storeNames[0], composition.compositionId);
        },
        getAllCompositions: async () => {
            return await db.getAll(storeNames[0]);
        },
    }

    isDbReady = true;
    console.log('dbHelper is ready');
}

async function init() {     //THIS METHOD IS CALLED FROM index.html script tag
    await initDB();
    initVue();
}


//================================================================================================
//================================================================================================
//================================================================================================
//================================================================================================


