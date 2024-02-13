// https://developers.google.com/blockly/guides/create-custom-blocks/blockly-developer-tools?hl=de
// https://developers.google.com/blockly/guides/configure/web/toolbox?hl=de

// Block Factory
// https://blockly-demo.appspot.com/static/demos/blockfactory/index.html?hl=de#e693er
// https://blockly-demo.appspot.com/static/demos/blockfactory/index.html?hl=de#pu44ft
var workspace;
var myInterpreter;
var runnerPid;

function init_blocks() {


    const toolbox = {
        // There are two kinds of toolboxes. The simpler one is a flyout toolbox.
        kind: 'flyoutToolbox',
        // The contents is the blocks and other items that exist in your toolbox.
        contents: [
            {
                kind: 'block',
                type: 'move'
            },
            {
                kind: 'block',
                type: 'turn'
            },
            {
                kind: 'block',
                type: 'speak'
            },
            {
                kind: 'block',
                type: 'wait_seconds'
            }
            // You can add more blocks to this array.
        ]
    };

    // Passes the injection div.
    workspace = Blockly.inject(
        document.getElementById('blocklyDiv'), {
            toolbox: toolbox,

            theme: {
                "base": Blockly.Themes.Classic,
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
            }
    });

    $("a[href='#tab5']").on('shown.bs.tab', function(e) {
        Blockly.svgResize(workspace)
    });

    javascript.javascriptGenerator.STATEMENT_PREFIX = 'highlightBlock(%1);\n';
    javascript.javascriptGenerator.addReservedWords('highlightBlock');

    let myInterpreter = null;
    let runnerPid = 0;

    workspace.addChangeListener(function (event) {
        if (!event.isUiEvent) {
        // Something changed.  Interpreter needs to be reloaded.
        resetStepUi(true);
        }
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
    const wrapper = function (id) {
        id = String(id || '');
        return highlightBlock(id);
    };

    interpreter.setProperty(
        globalObject,
        'highlightBlock',
        interpreter.createNativeFunction(wrapper),
    );

    // Add an API for the wait block.  See wait_block
    initInterpreterWaitForSeconds(interpreter, globalObject);

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


