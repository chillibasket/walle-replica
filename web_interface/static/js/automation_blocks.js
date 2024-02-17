// Wait Block
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


// Servo animations
Blockly.defineBlocksWithJsonArray([

 {
  "type": "servo",
  "message0": "Animate %1 %2 %3 Servo Angle %4 %5",
  "args0": [
    {
      "type": "input_dummy"
    },
    {
      "type": "field_dropdown",
      "name": "servo",
      "options": [
        [
          "Head Rotation",
          "head"
        ],
        [
          "Neck Top",
          "neck_t"
        ],
        [
          "Neck Bottom",
          "neck_b"
        ],
        [
          "Arm Left",
          "arm_l"
        ],
        [
          "Arm Right",
          "arm_r"
        ],
        [
          "Eye Left",
          "eye_l"
        ],
        [
          "Eye Right",
          "eye_r"
        ]
      ]
    },
    {
      "type": "input_end_row"
    },
    {
      "type": "field_angle",
      "name": "angle",
      "offset": 140,
      "clockwise": true,
      "displayMin": 0,
      "displayMax": 360,
      "minorTick": 15,
      "majorTick": 45,
      "min": 0,
      "max": 100,
      "precision": 10,
      "value": 50,
      "symbol": ""


    },
    {
      "type": "input_end_row"
    }
  ],
  "colour": 230,
  "previousStatement": null,
  "nextStatement": null,
  "tooltip": "",
  "helpUrl": ""
}
]);

javascript.javascriptGenerator.forBlock['servo'] = function(block, generator) {
  var dropdown_name = block.getFieldValue('NAME');
  var value_name = generator.valueToCode(block, 'NAME', javascript.Order.ATOMIC);
  // TODO: Assemble javascript into code variable.
  var code = '...\n';
  return code;
};

/**
 * Register the interpreter asynchronous function
 * <code>waitForSeconds()</code>.
 */
/*
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
*/

/**
 * Generator for wait block creates call to new method
 * <code>waitForSeconds()</code>.
 */
javascript.javascriptGenerator.forBlock['wait_seconds'] = function (block) {
    const seconds = Number(block.getFieldValue('SECONDS'));
    const code = 'waitForSeconds(' + seconds + ');\n';
    return code;
};

//Start
Blockly.defineBlocksWithJsonArray([{
  "type": "start",
  "message0": "Start",
  "nextStatement": null,
  "colour": 65,
  "tooltip": "",
  "helpUrl": ""
}]);
// Start Dummy
javascript.javascriptGenerator.forBlock['start'] = function(block, generator) {
  return "";
};

// Stop
Blockly.defineBlocksWithJsonArray([
  {
    "type": "stop",
    "message0": "Stop",
    "previousStatement": null,
    "colour": 330,
    "tooltip": "Stop",
    "helpUrl": ""
  }
]);
// stop Dummy
javascript.javascriptGenerator.forBlock['stop'] = function(block, generator) {
    var code = 'blockMoveMotor(0.0, 0.0);';
    return code;
};

// MOVE
Blockly.defineBlocksWithJsonArray([{
  "type": "move",
  "message0": "Move %1 Direction %2 %3 Speed %4 %5 Distance %6",
  "args0": [
    {
      "type": "input_end_row"
    },
    {
      "type": "field_dropdown",
      "name": "direction",
      "options": [
        [
          "Forward",
          "1.0"
        ],
        [
          "Backward",
          "-1.0"
        ]
      ]
    },
    {
      "type": "input_end_row"
    },
    {
      "type": "field_dropdown",
      "name": "speed",
      "options": [
        [
          "Slow",
          "0.3"
        ],
        [
          "Fast",
          "0.8"
        ]
      ]
    },
    {
      "type": "input_end_row"
    },
    {
      "type": "input_value",
      "name": "distance",
      "check": "Number"
    }
  ],
  "previousStatement": null,
  "nextStatement": null,
  "colour": 300,
  "tooltip": "",
  "helpUrl": ""
}
]);
// MOVE Generator
javascript.javascriptGenerator.forBlock['move'] = function(block, generator) {
  var dropdown_direction = Number(block.getFieldValue('direction'));
  var dropdown_speed = Number(block.getFieldValue('speed'));
  var value_distance = Number(generator.valueToCode(block, 'distance', javascript.Order.ATOMIC));

  var wait = 'waitForSeconds(' + value_distance + ');\n';
  if (value_distance <= 0) return '';

  var code = 'blockMoveMotor( 0.0, ' + dropdown_speed * dropdown_direction + ');';

  return code + wait;
};

// Speak
Blockly.defineBlocksWithJsonArray([
  {
    "type": "speak",
    "message0": "Speak %1 %2",
    "args0": [
      {
        "type": "input_dummy"
      },
      {
        "type": "input_value",
        "name": "text",
        "check": [
          "String",
          "Number"
        ]
      }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 230,
    "tooltip": "Add Text block for speech",
    "helpUrl": ""
  }
]);
// Speech Generator
javascript.javascriptGenerator.forBlock['speak'] = function(block, generator) {
    var value_text = generator.valueToCode(block, 'text', javascript.Order.ATOMIC);
    //var myvar = Blockly.JavaScript.variableDB_.getName(block.getFieldValue('MYVAR'), Blockly.Variables.NAME_TYPE);

    return "playTTS(\"" + value_text + "\");";
};


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
            "Left 90°",
            "left_90"
          ],
          [
            "Left 45°",
            "left_45"
          ],
          [
            "Right 90°",
            "right_90"
          ],
          [
            "RIght 45°",
            "right_45"
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
