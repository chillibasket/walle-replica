
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

//Start
Blockly.defineBlocksWithJsonArray([{
  "type": "start",
  "message0": "Start",
  "nextStatement": null,
  "colour": 65,
  "tooltip": "",
  "helpUrl": ""
}]);

// MOVE
Blockly.defineBlocksWithJsonArray([{
  "type": "move",
  "message0": "Move: %1 Direction %2 Distance %3 %4",
  "args0": [
    {
      "type": "input_dummy"
    },
    {
      "type": "field_dropdown",
      "name": "NAME",
      "options": [
        [
          "Forward",
          "W"
        ],
        [
          "Backward",
          "S"
        ]
      ]
    },
    {
      "type": "field_input",
      "name": "DIST",
      "text": "5"
    },
    {
      "type": "input_end_row"
    }
  ],
  "previousStatement": null,
  "nextStatement": null,
  "colour": 300,
  "tooltip": "",
  "helpUrl": ""
}]);

// Speak
Blockly.defineBlocksWithJsonArray([
    {
        "type": "speak",
        "message0": "Speak: %1 %2 %3",
        "args0": [
            {
            "type": "input_dummy"
            },
            {
            "type": "field_input",
            "name": "TEXT",
            "text": "         "
            },
            {
            "type": "input_end_row"
            }
        ],
        "previousStatement": null,
        "nextStatement": null,
        "colour": 230,
        "tooltip": "Enter some text",
        "helpUrl": ""
    }
]);


//TURN
Blockly.defineBlocksWithJsonArray([
{
  "type": "turn",
  "message0": "Turn %1 %2 %3",
  "args0": [
    {
      "type": "input_dummy"
    },
    {
      "type": "field_dropdown",
      "name": "direction",
      "options": [
        [
          "Left",
          "A"
        ],
        [
          "Right",
          "D"
        ]
      ]
    },
    {
      "type": "input_end_row"
    }
  ],
  "previousStatement": null,
  "nextStatement": null,
  "colour": 135,
  "tooltip": "Turn",
  "helpUrl": ""
}
]);


Blockly.defineBlocksWithJsonArray([
  {
    "type": 'wait_seconds',
    "message0": ' wait %1 seconds',
    "args0": [
      {
        "type": 'field_number',
        "name": 'SECONDS',
        "min": 0,
        "max": 600,
        "value": 1,
      },
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 135,
  },
]);

// Start Dummy
javascript.javascriptGenerator.forBlock['start'] = function(block, generator) {
  return "";
};

/**
 * Generator for wait block creates call to new method
 * <code>waitForSeconds()</code>.
 */
javascript.javascriptGenerator.forBlock['wait_seconds'] = function (block) {
    const seconds = Number(block.getFieldValue('SECONDS'));
    const code = 'waitForSeconds(' + seconds + ');\n';
    return code;
};

/**
 * Register the interpreter asynchronous function
 * <code>waitForSeconds()</code>.
 */
function initInterpreterWaitForSeconds(interpreter, globalObject) {
    // Ensure function name does not conflict with variable names.
    javascript.javascriptGenerator.addReservedWords('waitForSeconds');

    const wrapper = interpreter.createAsyncFunction(
        function (timeInSeconds, callback) {
            // Delay the call to the callback.
            setTimeout(callback, timeInSeconds * 1000);
        },
    );
    interpreter.setProperty(globalObject, 'waitForSeconds', wrapper);
}

// MOVE Generator
javascript.javascriptGenerator.forBlock['move'] = function(block, generator) {
    var dropdown_name = block.getFieldValue('NAME');
    var text_dist = block.getFieldValue('DIST');

    var wait = 'waitForSeconds(' + text_dist + ');\n';

    return "alert("+ text_dist +"); " + wait;
};


// Speech Generator
javascript.javascriptGenerator.forBlock['speak'] = function(block, generator) {
    var text_text = block.getFieldValue('TEXT');

    return "playTTS(\"" + text_text + "\");";
};


