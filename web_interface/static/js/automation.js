/**
 * Wall-e Robot Webinterface - Blockly Additions, things from the code tab
 * dkrey, Feb 2024
 */


var workspace;
var myInterpreter;
var fileSelector;
var runnerPid;

/*
 * Init Blockly
 */
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
            media: media_path,
            theme: Blockly.Themes.DarkTheme,
            renderer: "zelos"
    });

    $("a[href='#tab5']").on('shown.bs.tab', function(e) {
        Blockly.svgResize(workspace)
        workspace.setTheme(Blockly.Themes.DarkTheme);
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
        if (fileToLoad[0] != null) loadFile(fileToLoad[0]);
    });


}


/*
 * Create Wrapper functions for JS Interpreter,
 * so the blocks can call external functions
 */
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
    const wrapperTTS = interpreter.createNativeFunction(function(text) {
            text = arguments.length ? text : '';
            return playTTS(text);
        }
    );

    interpreter.setProperty(globalObject, 'playTTS', wrapperTTS);

    // MoveMotor
    const wrapperMove = function(x,y) {
        x = parseFloat(x);
        y = parseFloat(y);
        return blockMoveMotor(x,y);
    };

    interpreter.setProperty(
        globalObject,
        'blockMoveMotor',
        interpreter.createNativeFunction(wrapperMove),
    );

    //  ServoControl
    const wrapperServo = interpreter.createNativeFunction(function(servo, value) {
            return blockServo(servo, value);
        }
    );
    interpreter.setProperty(globalObject,'blockServo', wrapperServo);

    //  Audioplayer
    const wrapperAudio = interpreter.createNativeFunction(function(clip) {
            return blockAudio(clip);
        }
    );
    interpreter.setProperty(globalObject,'blockAudio', wrapperAudio);

}


/*
 * Highlight the current block
 */
function highlightBlock(id) {
    workspace.highlightBlock(id);
}

/*
 * Reset the block editor and stop code execution
 */
function resetStepUi(clearOutput) {
    clearTimeout(runnerPid);
    workspace.highlightBlock(null);
    myInterpreter = null;
}

/*
 * Generate JavaScript code and run it.
 */
function runCode() {
    if (!myInterpreter) {
        // First statement of this code.
        // Clear the program output.
        resetStepUi(true);
        const latestCode =
            javascript.javascriptGenerator.workspaceToCode(workspace);

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


/*
 * Send Motor XY commands via Block
 */
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

/*
 * Send a manual servo control command via Block
 */
function blockServo(servo, value) {
    $.ajax({
        url: "/servoControl",
        type: "POST",
        data: {"servo": servo, "value": value},
        dataType: "json",
        success: function(data){
            // If a response is received from the python backend, but it contains an error
            if(data.status == "Error"){
                showAlert(1, 'Error!', data.msg, 0);
            }
        },
        error: function(error) {
            // If no response was recevied from the python backend, show an "unknown" error
            showAlert(1, 'Unknown Error!', 'Unable to update servo position.', 1);
        }
    });
}

/*
 * Send a manual servo control command via Block
 */
/*
 * Play an audio clip from a blockly block
 */
function blockAudio(clip) {
    $.ajax({
        url: "/audio",
        type: "POST",
        data: {"clip": clip},
        dataType: "json",

        success: function(data){
            // If a response is received from the python backend, but it contains an error
            if(data.status == "Error") showAlert(1, 'Error!', data.msg, 1);
        },
        error: function(error) {
            showAlert(1, 'Unknown Error!', 'Unable to play audio file.', 1);
        }
    });
}

/*
 * Stop the code executions and stop motors
 */
function stopCode() {
    blockMoveMotor(0.0, 0.0);
    resetStepUi(false);
}

/*
 * Export Blockly code as JSON
 */
function saveFile()
{
    var pom = document.createElement('a');
    var json = Blockly.serialization.workspaces.save(workspace);
    var filename = window.prompt("Enter the file name.", "wall-e.txt");
    if (filename === null || filename == "") return false;

    pom.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(json)));
    pom.setAttribute('download', filename)


    if (document.createEvent) {
        var event = document.createEvent('MouseEvents');
        event.initEvent('click', true, true);
        pom.dispatchEvent(event);
    }
    else {
        pom.click();
    }
}

/*
 * Import Blockly code as JSON
 */
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
