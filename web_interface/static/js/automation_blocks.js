/**
 * Wall-e Robot Webinterface - Blockly Block definitions and code generators
 * dkrey, Feb 2024
 */

/*
 * Wait Block
 */
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

/*
 * Generator for wait block
 */
javascript.javascriptGenerator.forBlock['wait_seconds'] = function (block) {
    const seconds = Number(block.getFieldValue('SECONDS'));
    const code = 'waitForSeconds(' + seconds + ');\n';
    return code;
};

/*
 * Servo animations
 */
Blockly.defineBlocksWithJsonArray([
  {
    "type": "servo",
    "message0": "Servo %1 %2 %3 Angle %4 %5",
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
            "G"
          ],
          [
            "Neck Top",
            "T"
          ],
          [
            "Neck Bottom",
            "B"
          ],
          [
            "Arm Left",
            "L"
          ],
          [
            "Arm Right",
            "R"
          ],
          [
            "Eye Left",
            "E"
          ],
          [
            "Eye Right",
            "U"
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
    "previousStatement": null,
    "nextStatement": null,
    "colour": 230,
    "tooltip": "",
    "helpUrl": ""
  }
]);

/*
 * Servo animations code generator
 */
javascript.javascriptGenerator.forBlock['servo'] = function(block, generator) {
  var dropdown_servo = block.getFieldValue('servo');
  var angle_angle = Number(block.getFieldValue('angle'));
  var code = "";
  code = "blockServo('" + dropdown_servo +"', "+ angle_angle +");\n";
  return code;
};

/*
 * Servo presets
 */
Blockly.defineBlocksWithJsonArray([
{
    "type": "presets",
    "message0": "Servo Presets %1 %2",
    "args0": [
      {
        "type": "field_dropdown",
        "name": "preset",
        "options": [
          [
            "Head Up",
            "f"
          ],
          [
            "Head Down",
            "h"
          ],
          [
            "Head Neutral",
            "g"
          ],
          [
            "Arms Left",
            "m"
          ],
          [
            "Arms Right",
            "b"
          ],
          [
            "Arms Neutral",
            "n"
          ],
          [
            "Eyes Left",
            "j"
          ],
          [
            "Eyes Right",
            "l"
          ],
          [
            "Eyes Neutral",
            "k"
          ],
          [
            "Eyes Sad",
            "i"
          ]
        ]
      },
      {
        "type": "input_end_row"
      }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 230,
    "tooltip": "",
    "helpUrl": ""
  }
]);

/*
 * Servo presets code generator
 */
javascript.javascriptGenerator.forBlock['presets'] = function(block, generator) {
  var dropdown_preset = block.getFieldValue('preset');

  code = "blockServo('" + dropdown_preset +"', 0);\n";
  return code;
};

/*
 * Start block, which doesn't do anything
 */
Blockly.defineBlocksWithJsonArray([{
  "type": "start",
  "message0": "Start",
  "nextStatement": null,
  "colour": 65,
  "tooltip": "",
  "helpUrl": ""
}]);

/*
 * Start block dummy generator
 */
javascript.javascriptGenerator.forBlock['start'] = function(block, generator) {
  return "";
};

/*
 * Stop block
 */
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

/*
 * Stop block generator
 */
javascript.javascriptGenerator.forBlock['stop'] = function(block, generator) {
    var code = 'blockMoveMotor(0.0, 0.0);\n';
    return code;
};

/*
 * Move block
 */
Blockly.defineBlocksWithJsonArray([
{
  "type": "move",
  "message0": "Move %1 Direction %2 %3 Distance  %4 cm",
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

/*
 * Move block generator
 */
javascript.javascriptGenerator.forBlock['move'] = function(block, generator) {
  var dropdown_direction = Number(block.getFieldValue('direction'));
  var value_distance = generator.valueToCode(block, 'distance', javascript.Order.ATOMIC);
  if (value_distance <= 0) return '';

  var code = 'blockMoveMotor( 0.0, ' + code_motorpower * dropdown_direction + ');\n';
  var wait = 'waitForSeconds(' + value_distance / code_motorspeed + ');\n';
  var stop = 'blockMoveMotor( 0.0, 0.0);\n';

  return code + wait + stop;
};

/*
 * Text to Speech block
 */
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

/*
 * Text to Speach generator
 */
javascript.javascriptGenerator.forBlock['speak'] = function(block, generator) {
    var value_text = generator.valueToCode(block, 'text', javascript.Order.ATOMIC) || "''";
    code = 'playTTS(' + value_text + ');\n';
    return code;
};


/*
 * Turn block
 */
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
          "Right 45°",
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

/*
 * Turn block generator
 */
javascript.javascriptGenerator.forBlock['turn'] = function(block, generator) {
  var dropdown_direction = block.getFieldValue('direction');
  var movement = 0.0;
  var wait = 0.0;

  if (dropdown_direction == "left_90") {
    movement = code_turnpower;
    wait = 'waitForSeconds(' + code_turntime + ');\n';
  }
  else if (dropdown_direction == "left_45") {
    movement = code_turnpower;
    wait = 'waitForSeconds(' + code_turntime/2 + ');\n';
  }
  else if (dropdown_direction == "right_90") {
    movement = -code_turnpower;
    wait = 'waitForSeconds(' + code_turntime + ');\n';
  }
  else if (dropdown_direction == "right_45") {
    movement = -code_turnpower;
    wait = 'waitForSeconds(' + code_turntime/2 + ');\n';
  }

  var code = 'blockMoveMotor( ' + movement +', 0.0);\n';
  code += wait;
  code += 'blockMoveMotor( 0.0, 0.0);\n';
  return code;

};


/*
 * Audio / Sound block
 */
Blockly.defineBlocksWithJsonArray([
  {
    "type": "audioplayer",
    "message0": "Audio %1",
    "args0": [
      {
        "type": "input_dummy",
        "name": "AUDIOIN"
      }
    ],
    "extensions": ["dynamic_menu_extension"],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 230,
    "tooltip": "",
    "helpUrl": ""
  }
]);

/*
 * Audio / Sound block dynamic dropdown from the script block in index.html
 */
Blockly.Extensions.register('dynamic_menu_extension',
  function() {
    this.getInput('AUDIOIN')
      .appendField(new Blockly.FieldDropdown(
        function() {
          var options = [];
          var now = Date.now();

          for (let i = 0; i < audio_options.length; i++) {
             option = audio_options[i].split("_");
             options.push([option[1], audio_options[i]]);
          }
          return options;
        }), 'audiofile');
});

/*
 * Audio / Sound block generator
 */
javascript.javascriptGenerator.forBlock['audioplayer'] = function(block, generator) {
    var dropdown_clip = block.getFieldValue('audiofile');

    code = 'blockAudio("' + dropdown_clip + '");\n';
    return code;
};
