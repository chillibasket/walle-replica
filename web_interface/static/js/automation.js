// Block Factory
// https://blockly-demo.appspot.com/static/demos/blockfactory/index.html?hl=de#e693er
// https://blockly-demo.appspot.com/static/demos/blockfactory/index.html?hl=de#pu44ft
var workspace;
var myInterpreter;
var fileSelector;
var runnerPid;

function init_blocks() {

    Blockly.Themes.DarkTheme = Blockly.Theme.defineTheme('dark', {
        'base': Blockly.Themes.Classic,

        "componentStyles": {
            "workspaceBackgroundColour": '#1e1e1e',
            "toolboxBackgroundColour": 'blackBackground',
            "toolboxForegroundColour": '#fff',
            "flyoutBackgroundColour": '#252526',
            "flyoutForegroundColour": '#ccc',
            "flyoutOpacity": 1,
            "scrollbarColour": '#797979',
            "insertionMarkerColour": '#fff',
            "insertionMarkerOpacity": 0.3,
            "scrollbarOpacity": 0.4,
            "cursorColour": '#d0d0d0',
            "blackBackground": '#333'
        },
    });

    // Passes the injection div.
    workspace = Blockly.inject(
        document.getElementById('blocklyDiv'), {
            toolbox: toolbox,
            theme: Blockly.Themes.DarkTheme,
            renderer: "zelos",
            scrollbars: false
    });

    $("a[href='#tab5']").on('shown.bs.tab', function(e) {
        Blockly.svgResize(workspace)
    });

    javascript.javascriptGenerator.STATEMENT_PREFIX = 'highlightBlock(%1);\n';
    javascript.javascriptGenerator.addReservedWords('highlightBlock');

    // Display a start
    var startBlock = workspace.newBlock('start');
    startBlock.initSvg();
    startBlock.render();

    let myInterpreter = null;
    let runnerPid = 0;

    workspace.addChangeListener(function (event) {
        if (!event.isUiEvent) {
            // Something changed.  Interpreter needs to be reloaded.
            resetStepUi(true);
        }
    });

    // Monitor the load file selector
    fileSelector = document.getElementById('customFile');
    fileSelector.addEventListener('change', (event) => {
        var fileToLoad = event.target.files;
        loadFile(fileToLoad[0]);
        $('#loadDialog').modal('hide');
    });


}



function initApi(interpreter, globalObject) {
    // Add an API function for the alert() block, generated for "text_print" blocks.

    const wrapperAlert = function(text) {
        alert(arguments.length ? text : '');
    };

    interpreter.setProperty(
        globalObject,
        'alert',
        interpreter.createNativeFunction(wrapperAlert),
    );

    // Add an API function for the prompt() block.
    const wrapperPrompt = function prompt(text) {
        return window.prompt(text);
    };

    interpreter.setProperty(
        globalObject,
        'prompt',
        interpreter.createNativeFunction(wrapperPrompt),
    );

    // Add an API function for highlighting blocks.
    const wrapperHighlight = function (id) {
        id = String(id || '');
        return highlightBlock(id);
    };

    interpreter.setProperty(
        globalObject,
        'highlightBlock',
        interpreter.createNativeFunction(wrapperHighlight),
    );

    // Add an API for waiting in milliseconds - needed to calculate movement speed
    javascript.javascriptGenerator.addReservedWords('waitForMilliseconds');

    const wrapperWaitMilliseconds = interpreter.createAsyncFunction(
        function (timeInMilliseconds, callback) {
            // Delay the call to the callback.
            setTimeout(callback, timeInMilliseconds);
        }
    );

    interpreter.setProperty(globalObject, 'timeInMilliseconds', wrapperWaitMilliseconds);


    // Add an API for the wait block
    javascript.javascriptGenerator.addReservedWords('waitForSeconds');

    const wrapperWaitSeconds = interpreter.createAsyncFunction(
        function (timeInSeconds, callback) {
            // Delay the call to the callback.
            setTimeout(callback, timeInSeconds * 1000);
        }
    );

    interpreter.setProperty(globalObject, 'waitForSeconds', wrapperWaitSeconds);


    // Add API for TTS
    const wrapperTTS = function(text) {
        text = arguments.length ? text : '';
        return playTTS(text);
    };

    interpreter.setProperty(
        globalObject,
        'playTTS',
        interpreter.createNativeFunction(wrapperTTS),
    );
}


function highlightBlock(id) {
    workspace.highlightBlock(id);
}


function resetStepUi(clearOutput) {
    clearTimeout(runnerPid);
    workspace.highlightBlock(null);
    myInterpreter = null;
}


// Generate JavaScript code and run it.
function runCode() {
    if (!myInterpreter) {
        // First statement of this code.
        // Clear the program output.
        resetStepUi(true);
        const latestCode =
            javascript.javascriptGenerator.workspaceToCode(workspace);
        //runButton.disabled = 'disabled';

        // And then show generated code in an alert.
        // In a timeout to allow the outputArea.value to reset first.
        setTimeout(function () {
            /*
            alert(
                'Ready to execute the following code\n' +
                '===================================\n' +
                latestCode,
            );
            */

            // Begin execution
            myInterpreter = new Interpreter(latestCode, initApi);

            function runner() {
                if (myInterpreter) {
                    const hasMore = myInterpreter.run();
                    if (hasMore) {
                        // Execution is currently blocked by some async call.
                        // Try again later.
                        runnerPid = setTimeout(runner, 10);
                    }
                    else {
                        // Program is complete.
                        resetStepUi(false);
                    }
                }
            }

            runner();
        }, 1);
        return;
    }
}


// Send Motor XY commands via Blcok
function blockMoveMotor(x,y) {
    $.ajax({
        url: "/motor",
        type: "POST",
        data: {"stickX": x, "stickY": y},
        dataType: "json",
        success: function(data){
            if(data.status == "Error"){
                showAlert(1, ' Error!', data.msg, 1);
            }
        },
        error: function(error) {
            showAlert(1, ' Error!', 'Unable to send movement command.', 1);
        }
    });
}

function stopCode() {
    blockMoveMotor(0.0, 0.0);
    resetStepUi(false);
}

function saveFile()
{
    var pom = document.createElement('a');
    var json = Blockly.serialization.workspaces.save(workspace);
    pom.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(json)));
    pom.setAttribute('download', "wall-e.txt")

    if (document.createEvent) {
        var event = document.createEvent('MouseEvents');
        event.initEvent('click', true, true);
        pom.dispatchEvent(event);
    }
    else {
        pom.click();
    }
}


function loadFile(file) {
    // Check if the file is a textfile
    if (file.type && !file.type.startsWith('text/')) {
        showAlert(1, 'File is not a textfile. ', file.type, 1);
        return;
    }

    const reader = new FileReader();

    reader.addEventListener('load', (event) => {
        Blockly.serialization.workspaces.load(JSON.parse(reader.result), workspace);
    });

    if (file) {
        reader.readAsText(file);
    }

}
