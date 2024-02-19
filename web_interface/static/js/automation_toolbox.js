/**
 * Wall-e Robot Webinterface - Blockly Toolbox
 * dkrey, Feb 2024
 */
const toolbox = {
  "kind": "categoryToolbox",
  "contents": [
    {
        "kind": "category",
        "name": "Logic",
        "contents": [
            {
                "kind": "block",
                "type": "controls_if"
            },
            {
                "kind": "block",
                "type": "logic_compare"
            },
            {
                "kind": "block",
                "type": "logic_operation"
            },
            {
                "kind": "block",
                "type": "logic_negate"
            },
            {
                "kind": "block",
                "type": "logic_boolean"
            },
            {
                "kind": "block",
                "type": "logic_ternary"
            }
        ],
    },
    {
        "kind": "category",
        "name": "Loops",
        "contents": [
            {
                "kind": "block",
                "type": "controls_repeat_ext"
            },
            {
                "kind": "block",
                "type": "controls_repeat",
            },
            {
                "kind": "block",
                "type": "controls_whileUntil"
            },
            {
                "kind": "block",
                "type": "controls_for"
            },
            {
                "kind": "block",
                "type": "controls_forEach"
            },
            {
                "kind": "block",
                "type": "controls_flow_statements"
            }
        ],
    },
    {
        "kind": "category",
        "name": "Math",
        "contents": [
            {
                "kind": "block",
                "type": "math_number",
            },
            {
                "kind": "block",
                "type": "math_arithmetic"
            },

            {
                "kind": "block",
                "type": "math_random_int"
            },
            {
                "kind": "block",
                "type": "math_on_list"
            },
        ]

    },
    {
        "name": "Text",
        "kind": "category",
        "contents": [
            {
                "kind": "block",
                "type": "text"
            },
            {
                "kind": "block",
                "type": "text_multiline"
            },
            {
                "kind": "block",
                "type": "text_join"
            },
            {
                "kind": "block",
                "type": "text_append"
            },
            {
                "kind": "block",
                "type": "text_length"
            },
            {
                "kind": "block",
                "type": "text_isEmpty"
            },
            {
                "kind": "block",
                "type": "text_indexOf"
            },
            {
                "kind": "block",
                "type": "text_charAt"
            },
            {
                "kind": "block",
                "type": "text_getSubstring"
            },
            {
                "kind": "block",
                "type": "text_changeCase"
            },
            {
                "kind": "block",
                "type": "text_trim"
            },
            {
                "kind": "block",
                "type": "text_count"
            },
            {
                "kind": "block",
                "type": "text_replace"
            },
            {
                "kind": "block",
                "type": "text_reverse"
            },
            {
                "kind": "LABEL",
                "text": "Input/Output:",
                "web-class": "ioLabel"
            },
            {
                "kind": "block",
                "type": "text_print"
            },
            {
                "kind": "block",
                "type": "text_prompt_ext"
            }
        ]
    },
    {
        "kind": "category",
        "name": "Lists",
        "contents": [
            {
                "kind": "block",
                "type": "lists_create_with"
            },
            {
                "kind": "block",
                "type": "lists_create_with"
            },
            {
                "kind": "block",
                "type": "lists_repeat"
            },
            {
                "kind": "block",
                "type": "lists_length"
            },
            {
                "kind": "block",
                "type": "lists_isEmpty"
            },
            {
                "kind": "block",
                "type": "lists_indexOf"
            },
            {
                "kind": "block",
                "type": "lists_getIndex"
            },
            {
                "kind": "block",
                "type": "lists_setIndex"
            },
            {
                "kind": "block",
                "type": "lists_getSublist"
            },
            {
                "kind": "block",
                "type": "lists_split"
            },
            {
                "kind": "block",
                "type": "lists_sort"
            },
            {
                "kind": "block",
                "type": "lists_reverse"
            }
        ],
    },
    {
      "kind": "category",
      "name": "Variables",
      "custom": "VARIABLE_DYNAMIC"
    },
    {
      "kind": "category",
      "name": "Functions",
      "custom": "PROCEDURE"
    },
    {
      "kind": "category",
      "name": "Wall-E",
      "contents": [
        {
            "kind": "label",
            "text": "Generic",
            "web-class": "ioLabel"
        },
        {
            "kind": 'block',
            "type": 'start'
        },
        {
            "kind": 'block',
            "type": 'stop'
        },
        {
            "kind": 'block',
            "type": 'speak'
        },
        {
            "kind": 'block',
            "type": 'audioplayer'
        },
        {
            "kind": 'block',
            "type": 'wait_seconds'
        },
        {
            "kind": "block",
            "type": "math_number",
        },
        {
            "kind": "block",
            "type": "text"
        },
        {
            "kind": "label",
            "text": "Movement",
            "web-class": "ioLabel"
        },
        {
            "kind": 'block',
            "type": 'move'
        },
        {
            "kind": 'block',
            "type": 'turn'
        },
        {
            "kind": "label",
            "text": "Servo",
            "web-class": "ioLabel"
        },
        {
            "kind": "block",
            "type": "servo",
        },
        {
            "kind": "block",
            "type": "presets",
        }
      ]
    },

  ]
};
