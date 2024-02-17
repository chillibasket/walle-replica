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

/**
 * Generator for wait block creates call to new method
 * <code>waitForSeconds()</code>.
 */
javascript.javascriptGenerator.forBlock['wait_seconds'] = function (block) {
    const seconds = Number(block.getFieldValue('SECONDS'));
    const code = 'waitForSeconds(' + seconds + ');\n';
    return code;
};

// Servo animations
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
    "previousStatement": null,
    "nextStatement": null,
    "colour": 230,
    "tooltip": "",
    "helpUrl": ""
  }
]);

javascript.javascriptGenerator.forBlock['servo'] = function(block, generator) {
  var dropdown_servo = block.getFieldValue('servo');
  var angle_angle = Number(block.getFieldValue('angle'));
  var code = "";
  //servoControl(item, servo, value);

  if (dropdown_servo == 'head') {
    code = "blockServo('G',"+ angle_angle +");\n";
  }

  else code = '\n';
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
    var code = 'blockMoveMotor(0.0, 0.0);\n';
    return code;
};

// MOVE
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
// MOVE Generator
javascript.javascriptGenerator.forBlock['move'] = function(block, generator) {
  var dropdown_direction = Number(block.getFieldValue('direction'));
  var value_distance = generator.valueToCode(block, 'distance', javascript.Order.ATOMIC);
  if (value_distance <= 0) return '';

  // 17 cm/s at 0.8
  var speed =  17;
  var motor_power = 0.8;
  var code = 'blockMoveMotor( 0.0, ' + motor_power * dropdown_direction + ');\n';
  var wait = 'waitForSeconds(' + value_distance / speed + ');\n';
  var stop = 'blockMoveMotor( 0.0, 0.0);\n';

  return code + wait + stop;
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
    var value_text = generator.valueToCode(block, 'text', javascript.Order.ATOMIC) || "''";
    code = 'playTTS(' + value_text + ');\n';
    return code;
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

javascript.javascriptGenerator.forBlock['turn'] = function(block, generator) {
  var dropdown_direction = block.getFieldValue('direction');
  var movement = 0.0;
  var wait = 0.0;

  if (dropdown_direction == "left_90") {
    movement = 0.5;
    wait = 'waitForSeconds(' + 1.8 + ');\n';
  }
  else if (dropdown_direction == "left_45") {
    movement = 0.5;
    wait = 'waitForSeconds(' + 0.9 + ');\n';
  }
  else if (dropdown_direction == "right_90") {
    movement = -0.5;
    wait = 'waitForSeconds(' + 1.8 + ');\n';
  }
  else if (dropdown_direction == "right_45") {
    movement = -0.5;
    wait = 'waitForSeconds(' + 0.9 + ');\n';
  }

  var code = 'blockMoveMotor( ' + movement +', 0.0);\n';
  code += wait;
  code += 'blockMoveMotor( 0.0, 0.0);\n';
  return code;

};
